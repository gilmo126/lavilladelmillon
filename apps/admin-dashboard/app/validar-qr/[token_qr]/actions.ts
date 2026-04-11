'use server';

import { createClient } from '../../../utils/supabase/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export type AnularQrResult = { success: boolean; error?: string };

export async function anularQrAction(tokenQr: string): Promise<AnularQrResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Sesión no válida.' };

  const { data: profile } = await supabaseAdmin.from('perfiles').select('rol').eq('id', user.id).single();
  if (!profile || !['admin', 'asistente'].includes(profile.rol)) {
    return { success: false, error: 'Sin permisos para validar QR.' };
  }

  const { data: pack, error: fetchError } = await supabaseAdmin
    .from('packs')
    .select('id, qr_usado_at')
    .eq('token_qr', tokenQr)
    .single();

  if (fetchError || !pack) {
    return { success: false, error: 'QR no encontrado.' };
  }

  if (pack.qr_usado_at) {
    return { success: false, error: 'Este QR ya fue canjeado anteriormente.' };
  }

  const { error: updateError } = await supabaseAdmin
    .from('packs')
    .update({ qr_usado_at: new Date().toISOString() })
    .eq('id', pack.id);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  return { success: true };
}
