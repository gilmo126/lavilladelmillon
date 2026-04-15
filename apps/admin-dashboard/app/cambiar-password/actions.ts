'use server';

import { createClient } from '../../utils/supabase/server';
import { createAdminClient } from '../../utils/supabase/admin';
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { redirect } from 'next/navigation';

export async function cambiarPasswordAction(newPassword: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Sesión no válida.' };

  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: 'La contraseña debe tener mínimo 6 caracteres.' };
  }

  const adminAuthClient = createAdminClient();

  // 1. Actualizar contraseña en Auth + limpiar flag en user_metadata
  const { error: authError } = await adminAuthClient.auth.admin.updateUserById(user.id, {
    password: newPassword,
    user_metadata: { ...user.user_metadata, debe_cambiar_password: false },
  });

  if (authError) {
    return { success: false, error: `Error al actualizar contraseña: ${authError.message}` };
  }

  // 2. Marcar debe_cambiar_password = false en perfiles
  await supabaseAdmin.from('perfiles').update({ debe_cambiar_password: false }).eq('id', user.id);

  // 3. Redirigir según rol
  const { data: profile } = await supabaseAdmin.from('perfiles').select('rol').eq('id', user.id).single();

  if (profile?.rol === 'asistente') {
    redirect('/scanner');
  }
  redirect('/');
}
