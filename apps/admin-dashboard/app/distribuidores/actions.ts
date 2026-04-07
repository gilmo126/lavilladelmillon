'use server';

import { createClient } from '../../utils/supabase/server';
import { createAdminClient } from '../../utils/supabase/admin';
import { revalidatePath } from 'next/cache';

// ── Crear Personal (Gerencia: Distribuidor u Operativo) ───────────────────────
export async function createPersonalAction(formData: FormData) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Acceso Denegado' };

    const { data: profile } = await supabase.from('perfiles').select('rol').eq('id', user.id).single();
    if (profile?.rol !== 'admin') return { success: false, error: 'Solo la gerencia puede crear personal.' };

    const rol      = formData.get('rol') as string; // 'distribuidor' | 'operativo'
    const email    = formData.get('email') as string;
    const password = formData.get('password') as string;
    const nombre   = formData.get('nombre') as string;
    const cedula   = formData.get('cedula') as string;
    const movil    = formData.get('movil') as string;
    const direccion = formData.get('direccion') as string;
    
    const zona_id = formData.get('zona_id') as string;
    const zona_ids = formData.getAll('zona_id') as string[];

    if (!rol || !email || !password || !nombre || !cedula || !movil || !direccion) {
      return { success: false, error: 'Debe rellenar todos los campos del nuevo agente.' };
    }
    
    // Si es distribuidor, la zona es obligatoria
    if (rol === 'distribuidor' && !zona_id) {
      return { success: false, error: 'Los distribuidores requieren una zona territorial asignada.' };
    }

    if (password.length < 6) return { success: false, error: 'La contraseña debe tener mínimo 6 caracteres.' };

    const adminAuthClient = createAdminClient();

    // 1. Crear en Auth (Bóveda Identidad)
    const { data: authData, error: authError } = await adminAuthClient.auth.admin.createUser({
      email, 
      password, 
      email_confirm: true,
      user_metadata: { nombre, rol }
    });

    if (authError || !authData?.user) {
      console.error('❌ Error GoTrue (IAM):', authError);
      return { success: false, error: `Fallo en Identity: ${authError?.message || 'Error desconocido'}` };
    }

    const newUserId = authData.user.id;

    // 2. Crear en Perfiles (Base de Datos)
    const { error: dbError } = await adminAuthClient.from('perfiles').insert({
      id: newUserId,
      nombre,
      rol: rol as any,
      cedula,
      movil,
      direccion,
      zona_id: zona_id || null
    });

    if (dbError) {
      console.error('❌ Error DB (perfiles):', dbError);
      await adminAuthClient.auth.admin.deleteUser(newUserId);
      return { success: false, error: `Error DB (${dbError.code}): ${dbError.message}` };
    }

    // 3. Vincular Zonas N:N (Misión de Estabilización)
    if (zona_ids.length > 0) {
      try {
        const zonePayload = zona_ids.map(zid => ({ perfil_id: newUserId, zona_id: zid }));
        await adminAuthClient.from('perfil_zonas').insert(zonePayload);
      } catch (e) {
        console.warn("⚠️ Tabla perfil_zonas no disponible. Usando zona única.");
      }
    }

    revalidatePath('/distribuidores');
    revalidatePath('/asignaciones');
    return { success: true };

  } catch (err: any) {
    console.error('🔥 Error Crítico en createPersonalAction:', err);
    return { success: false, error: `Error de Sistema: ${err.message || 'Error inesperado durante el reclutamiento.'}` };
  }
}

// ── Editar Perfil (Admin: cualquiera; Operativo: solo Distribuidores) ─────────
export async function updatePerfilAction(formData: FormData) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Acceso Denegado' };

    const { data: me } = await supabase.from('perfiles').select('rol').eq('id', user.id).single();
    const isAdmin     = me?.rol === 'admin';
    const isOperativo = me?.rol === 'operativo';
    if (!isAdmin && !isOperativo) return { success: false, error: 'Sin permisos.' };

    const target_id = formData.get('target_id') as string;
    const nombre    = formData.get('nombre') as string;
    const movil     = formData.get('movil') as string;
    const direccion = formData.get('direccion') as string;
    const zona_id   = formData.get('zona_id') as string;
    const zona_ids  = formData.getAll('zona_ids') as string[];

    if (!target_id) return { success: false, error: 'ID de perfil inválido.' };

    const { data: target } = await supabase.from('perfiles').select('rol').eq('id', target_id).single();
    if (target?.rol === 'admin') return { success: false, error: 'No se puede editar una cuenta de Gerencia.' };
    

    const payload: Record<string, any> = {};
    if (movil)    payload.movil = movil;
    if (direccion) payload.direccion = direccion;
    if (isAdmin && nombre)   payload.nombre = nombre;
    if (isAdmin && zona_id)  payload.zona_id = zona_id;

    const { error } = await supabase.from('perfiles').update(payload).eq('id', target_id);
    if (error) throw error;

    // Sincronización Directa y N:N (Misión de Estabilización)
    if (isAdmin && target?.rol === 'distribuidor') {
      try {
        // 1. Borrar anteriores
        await supabase.from('perfil_zonas').delete().eq('perfil_id', target_id);
        // 2. Insertar nuevas si existen
        if (zona_ids.length > 0) {
            const zonePayload = zona_ids.map(zid => ({ perfil_id: target_id, zona_id: zid }));
            await supabase.from('perfil_zonas').insert(zonePayload);
        }
      } catch (e) {
        console.warn("⚠️ Fallo en sincronización N:N. Usando zona única.");
      }
    }

    revalidatePath('/distribuidores');
    return { success: true };
  } catch (err: any) {
    console.error('🔥 Error en updatePerfilAction:', err);
    return { success: false, error: err.message };
  }
}

// ── Dar de Baja (solo Admin) ──────────────────────────────────────────────────
export async function deleteDistribuidorAction(id: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Acceso Denegado' };

    const { data: profile } = await supabase.from('perfiles').select('rol').eq('id', user.id).single();
    if (profile?.rol !== 'admin') return { success: false, error: 'Permisos insuficientes.' };

    const adminAuthClient = createAdminClient();
    const { error } = await adminAuthClient.auth.admin.deleteUser(id);
    if (error) throw error;

    revalidatePath('/distribuidores');
    return { success: true };
  } catch (err: any) {
    console.error('🔥 Error en deleteDistribuidorAction:', err);
    return { success: false, error: err.message };
  }
}
