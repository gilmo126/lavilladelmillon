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
    .select('id, qr_usado_at, qr_usos, qr_valido_hasta, estado_pago, es_prueba')
    .eq('token_qr', tokenQr)
    .single();

  if (fetchError || !pack) {
    return { success: false, error: 'QR no encontrado.' };
  }

  if (pack.es_prueba) {
    return { success: false, error: 'Pack de prueba, no canjeable.' };
  }
  if (pack.estado_pago !== 'pagado') {
    return { success: false, error: 'Pago no confirmado.' };
  }
  if (pack.qr_valido_hasta && new Date(pack.qr_valido_hasta) < new Date()) {
    return { success: false, error: 'El plazo de validez de este QR ha vencido.' };
  }

  const { count: totalBoletas } = await supabaseAdmin
    .from('boletas')
    .select('*', { count: 'exact', head: true })
    .eq('pack_id', pack.id);
  const maxUsos = totalBoletas || 25;
  const usosActuales = pack.qr_usos || 0;

  if (usosActuales >= maxUsos) {
    return { success: false, error: `QR agotado: ${usosActuales}/${maxUsos} usos completados.` };
  }

  const { error: updateError } = await supabaseAdmin
    .from('packs')
    .update({ qr_usos: usosActuales + 1, qr_usado_at: new Date().toISOString() })
    .eq('id', pack.id);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  return { success: true };
}
