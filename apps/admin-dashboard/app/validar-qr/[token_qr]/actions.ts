'use server';

import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export type AnularQrResult = { success: boolean; error?: string };

export async function anularQrAction(tokenQr: string): Promise<AnularQrResult> {
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
