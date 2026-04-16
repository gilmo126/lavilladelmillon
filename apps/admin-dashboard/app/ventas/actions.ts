'use server';

import { createClient } from '../../utils/supabase/server';
import { supabaseAdmin } from '../../lib/supabaseAdmin';

async function verificarAdmin(): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Sesión no válida.' };
  const { data: profile } = await supabaseAdmin.from('perfiles').select('rol').eq('id', user.id).single();
  if (!profile || profile.rol !== 'admin') return { ok: false, error: 'Solo el administrador puede realizar esta acción.' };
  return { ok: true };
}

export async function marcarPackPruebaAction(packId: string, esPrueba: boolean): Promise<{ success: boolean; error?: string }> {
  const guard = await verificarAdmin();
  if (!guard.ok) return { success: false, error: guard.error };

  const { error } = await supabaseAdmin
    .from('packs')
    .update({ es_prueba: esPrueba, updated_at: new Date().toISOString() })
    .eq('id', packId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
