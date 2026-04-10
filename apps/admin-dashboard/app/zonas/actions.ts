'use server';

import { createClient } from '../../utils/supabase/server';
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { revalidatePath } from 'next/cache';

export async function createZonaAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Acceso Denegado' };

  // Verificar admin
  const { data: profile } = await supabaseAdmin.from('perfiles').select('rol').eq('id', user.id).single();
  if (profile?.rol !== 'admin') return { success: false, error: 'Operación denegada.' };

  const nombre = formData.get('nombre') as string;
  const descripcion = formData.get('descripcion') as string;

  if (!nombre) return { success: false, error: 'El nombre de la zona es obligatorio.' };

  const { error } = await supabase.from('zonas').insert({
    nombre,
    descripcion
  });

  if (error) {
     if (error.code === '23505') {
         return { success: false, error: 'Ya existe una zona operativa con este nombre.' };
     }
     return { success: false, error: error.message };
  }

  revalidatePath('/zonas');
  revalidatePath('/distribuidores');
  return { success: true };
}

export async function deleteZonaAction(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Acceso Denegado' };

  const { data: profile } = await supabaseAdmin.from('perfiles').select('rol').eq('id', user.id).single();
  if (profile?.rol !== 'admin') return { success: false, error: 'Permisos insuficientes.' };

  // El borrado solo debe proceder si no hay distribuidores en la zona (la constraint SET NULL igual lo permite, pero mejor validar)
  const { count, error: countErr } = await supabaseAdmin.from('perfiles').select('id', { count: 'exact', head: true }).eq('zona_id', id);
  if (count && count > 0) {
      return { success: false, error: 'No se puede eliminar la zona porque tiene agentes logísticos asignados. Reasígnales una nueva zona primero.' };
  }

  const { error } = await supabase.from('zonas').delete().eq('id', id);
  if (error) return { success: false, error: error.message };

  revalidatePath('/zonas');
  revalidatePath('/distribuidores');
  return { success: true };
}
