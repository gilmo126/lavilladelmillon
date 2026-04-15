'use server';

import { createClient } from '../../utils/supabase/server';
import { createAdminClient } from '../../utils/supabase/admin';
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { revalidatePath } from 'next/cache';
import { sendMail } from '../../lib/mailer';

const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL || 'https://admin.lavilladelmillon.com';

// ── Crear Personal (Gerencia: Distribuidor u Operativo) ───────────────────────
export async function createPersonalAction(formData: FormData) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Acceso Denegado' };

    const { data: profile } = await supabaseAdmin.from('perfiles').select('rol').eq('id', user.id).single();
    if (profile?.rol !== 'admin') return { success: false, error: 'Solo la gerencia puede crear personal.' };

    const rol      = formData.get('rol') as string;
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
      user_metadata: { nombre, rol, debe_cambiar_password: true }
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
      zona_id: zona_id || null,
      debe_cambiar_password: true
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

    // 4. Enviar email de bienvenida con credenciales temporales
    try {
      const rolLabel = rol === 'distribuidor' ? 'Distribuidor' : 'Asistente';
      await sendMail(email, 'Tus credenciales — La Villa del Millón', `
<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:32px 24px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="color:#fcd34d;font-size:22px;margin:0;">LA VILLA DEL MILLÓN</h1>
      <p style="color:#94a3b8;font-size:12px;margin:4px 0 0;">Panel de Administración</p>
    </div>
    <div style="background:#1e293b;border:1px solid #334155;border-radius:16px;padding:28px;margin-bottom:20px;">
      <p style="color:#ffffff;font-size:16px;margin:0 0 8px;">Hola <strong>${nombre}</strong>,</p>
      <p style="color:#94a3b8;font-size:14px;margin:0 0 24px;">Tu cuenta de <span style="color:#fcd34d;font-weight:bold;">${rolLabel}</span> ha sido creada. Aquí están tus credenciales de acceso:</p>
      <div style="background:#0f172a;border:1px solid #475569;border-radius:12px;padding:20px;margin-bottom:20px;">
        <p style="color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:2px;margin:0 0 12px;font-weight:bold;">Credenciales de Acceso</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="color:#64748b;font-size:13px;padding:6px 0;">Email:</td><td style="color:#ffffff;font-size:13px;padding:6px 0;font-weight:bold;">${email}</td></tr>
          <tr><td style="color:#64748b;font-size:13px;padding:6px 0;">Contraseña:</td><td style="color:#fcd34d;font-size:13px;padding:6px 0;font-weight:bold;font-family:monospace;">${password}</td></tr>
        </table>
      </div>
      <a href="${ADMIN_URL}" style="display:block;text-align:center;background:#fcd34d;color:#0f172a;font-weight:900;font-size:14px;padding:14px 24px;border-radius:12px;text-decoration:none;text-transform:uppercase;letter-spacing:1px;">Ingresar al Panel</a>
    </div>
    <div style="background:#fbbf24;background:rgba(251,191,36,0.1);border:1px solid rgba(251,191,36,0.3);border-radius:12px;padding:16px;margin-bottom:20px;">
      <p style="color:#fbbf24;font-size:13px;margin:0;font-weight:bold;">⚠️ Al ingresar por primera vez deberás cambiar tu contraseña por una personal.</p>
    </div>
    <p style="color:#475569;font-size:11px;text-align:center;margin:0;">La Villa del Millón · Distribución autorizada</p>
  </div>
</body></html>`.trim());
    } catch (emailErr) {
      console.warn('⚠️ Email de bienvenida no enviado:', emailErr);
    }

    revalidatePath('/distribuidores');
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

    const { data: me } = await supabaseAdmin.from('perfiles').select('rol').eq('id', user.id).single();
    const isAdmin = me?.rol === 'admin';
    if (!isAdmin) return { success: false, error: 'Sin permisos.' };

    const target_id = formData.get('target_id') as string;
    const nombre    = formData.get('nombre') as string;
    const movil     = formData.get('movil') as string;
    const direccion = formData.get('direccion') as string;
    const zona_id   = formData.get('zona_id') as string;
    const zona_ids  = formData.getAll('zona_ids') as string[];

    if (!target_id) return { success: false, error: 'ID de perfil inválido.' };

    const { data: target } = await supabaseAdmin.from('perfiles').select('rol').eq('id', target_id).single();
    if (target?.rol === 'admin') return { success: false, error: 'No se puede editar una cuenta de Gerencia.' };
    

    const payload: Record<string, any> = {};
    if (movil)    payload.movil = movil;
    if (direccion) payload.direccion = direccion;
    if (isAdmin && nombre)   payload.nombre = nombre;
    if (isAdmin && zona_id)  payload.zona_id = zona_id;

    const { error } = await supabaseAdmin.from('perfiles').update(payload).eq('id', target_id);
    if (error) throw error;

    // Sincronización Directa y N:N (Misión de Estabilización)
    if (target?.rol === 'distribuidor') {
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

// ── Resetear Contraseña (solo Admin) ─────────────────────────────────────────
export async function resetPasswordAction(targetId: string, newPassword: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Acceso Denegado' };

    const { data: profile } = await supabaseAdmin.from('perfiles').select('rol').eq('id', user.id).single();
    if (profile?.rol !== 'admin') return { success: false, error: 'Solo la gerencia puede resetear contraseñas.' };

    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'La contraseña debe tener mínimo 6 caracteres.' };
    }

    // Obtener datos del usuario objetivo
    const { data: target } = await supabaseAdmin
      .from('perfiles')
      .select('nombre, rol')
      .eq('id', targetId)
      .single();
    if (!target) return { success: false, error: 'Usuario no encontrado.' };

    const adminAuthClient = createAdminClient();

    // 1. Obtener usuario actual de Auth
    const { data: authUser, error: authGetError } = await adminAuthClient.auth.admin.getUserById(targetId);
    if (authGetError || !authUser?.user) {
      return { success: false, error: `No se pudo obtener el usuario de Auth: ${authGetError?.message || 'usuario no encontrado'}` };
    }

    // 2. Actualizar contraseña en Auth + marcar debe_cambiar_password en metadata
    const { error: authError } = await adminAuthClient.auth.admin.updateUserById(targetId, {
      password: newPassword,
      user_metadata: { ...authUser.user.user_metadata, debe_cambiar_password: true },
    });

    if (authError) {
      return { success: false, error: `Error al resetear contraseña: ${authError.message}` };
    }

    // 3. Marcar debe_cambiar_password = true en perfiles
    await supabaseAdmin.from('perfiles').update({ debe_cambiar_password: true }).eq('id', targetId);

    // 3. Enviar email de notificación
    try {
      const email = authUser.user.email;
      if (email) {
        const rolLabel = target.rol === 'distribuidor' ? 'Distribuidor' : 'Asistente';
        await sendMail(email, 'Contraseña actualizada — La Villa del Millón', `
<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:32px 24px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="color:#fcd34d;font-size:22px;margin:0;">LA VILLA DEL MILLÓN</h1>
      <p style="color:#94a3b8;font-size:12px;margin:4px 0 0;">Panel de Administración</p>
    </div>
    <div style="background:#1e293b;border:1px solid #334155;border-radius:16px;padding:28px;margin-bottom:20px;">
      <p style="color:#ffffff;font-size:16px;margin:0 0 8px;">Hola <strong>${target.nombre}</strong>,</p>
      <p style="color:#94a3b8;font-size:14px;margin:0 0 24px;">Tu contraseña de <span style="color:#fcd34d;font-weight:bold;">${rolLabel}</span> ha sido reseteada por el administrador.</p>
      <div style="background:#0f172a;border:1px solid #475569;border-radius:12px;padding:20px;margin-bottom:20px;">
        <p style="color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:2px;margin:0 0 12px;font-weight:bold;">Nueva Contraseña Temporal</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="color:#64748b;font-size:13px;padding:6px 0;">Email:</td><td style="color:#ffffff;font-size:13px;padding:6px 0;font-weight:bold;">${email}</td></tr>
          <tr><td style="color:#64748b;font-size:13px;padding:6px 0;">Contraseña:</td><td style="color:#fcd34d;font-size:13px;padding:6px 0;font-weight:bold;font-family:monospace;">${newPassword}</td></tr>
        </table>
      </div>
      <a href="${ADMIN_URL}" style="display:block;text-align:center;background:#fcd34d;color:#0f172a;font-weight:900;font-size:14px;padding:14px 24px;border-radius:12px;text-decoration:none;text-transform:uppercase;letter-spacing:1px;">Ingresar al Panel</a>
    </div>
    <div style="background:rgba(251,191,36,0.1);border:1px solid rgba(251,191,36,0.3);border-radius:12px;padding:16px;margin-bottom:20px;">
      <p style="color:#fbbf24;font-size:13px;margin:0;font-weight:bold;">⚠️ Al ingresar deberás cambiar esta contraseña por una personal.</p>
    </div>
    <p style="color:#475569;font-size:11px;text-align:center;margin:0;">La Villa del Millón · Distribución autorizada</p>
  </div>
</body></html>`.trim());
      }
    } catch (emailErr) {
      console.warn('⚠️ Email de reset no enviado:', emailErr);
    }

    return { success: true };
  } catch (err: any) {
    console.error('🔥 Error en resetPasswordAction:', err);
    return { success: false, error: err.message || 'Error inesperado.' };
  }
}

// ── Dar de Baja (solo Admin) ──────────────────────────────────────────────────
export async function deleteDistribuidorAction(id: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Acceso Denegado' };

    const { data: profile } = await supabaseAdmin.from('perfiles').select('rol').eq('id', user.id).single();
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
