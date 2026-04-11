'use server';

import { createClient } from '../../utils/supabase/server';
import { supabaseAdmin } from '../../lib/supabaseAdmin';

async function verificarRolScannerAction(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabaseAdmin.from('perfiles').select('rol').eq('id', user.id).single();
  if (!profile || !['admin', 'asistente'].includes(profile.rol)) return null;
  return profile.rol;
}

export type AsistenciaItem = {
  id: string;
  comerciante_nombre: string;
  comerciante_tel: string | null;
  comerciante_whatsapp: string | null;
  qr_usado_at: string;
  distribuidor: { nombre: string } | null;
};

export async function getAsistenciaAction(fecha?: string): Promise<AsistenciaItem[]> {
  const rol = await verificarRolScannerAction();
  if (!rol) return [];

  const dia = fecha || new Date().toISOString().split('T')[0];
  const inicio = `${dia}T00:00:00.000Z`;
  const fin = `${dia}T23:59:59.999Z`;

  const { data, error } = await supabaseAdmin
    .from('packs')
    .select('id, comerciante_nombre, comerciante_tel, comerciante_whatsapp, qr_usado_at, distribuidor:perfiles!distribuidor_id(nombre)')
    .not('qr_usado_at', 'is', null)
    .gte('qr_usado_at', inicio)
    .lte('qr_usado_at', fin)
    .order('qr_usado_at', { ascending: false });

  if (error) return [];
  return (data || []).map((p: any) => ({
    ...p,
    distribuidor: Array.isArray(p.distribuidor) ? p.distribuidor[0] || null : p.distribuidor,
  })) as AsistenciaItem[];
}

export type ValidarQrResult =
  | { success: true; comercianteNombre: string }
  | { success: false; error: string };

export async function validarQrInlineAction(tokenQr: string): Promise<ValidarQrResult> {
  const rol = await verificarRolScannerAction();
  if (!rol) return { success: false, error: 'Sesión no válida o sin permisos.' };

  const { data: pack, error: fetchError } = await supabaseAdmin
    .from('packs')
    .select('id, comerciante_nombre, qr_usado_at, qr_valido_hasta, estado_pago')
    .eq('token_qr', tokenQr)
    .single();

  if (fetchError || !pack) {
    return { success: false, error: 'QR no encontrado en el sistema.' };
  }

  if (pack.qr_usado_at) {
    return { success: false, error: `QR ya canjeado el ${new Date(pack.qr_usado_at).toLocaleString('es-CO')}.` };
  }

  if (pack.qr_valido_hasta && new Date(pack.qr_valido_hasta) < new Date()) {
    return { success: false, error: 'El plazo de validez de este QR ha vencido.' };
  }

  if (pack.estado_pago !== 'pagado') {
    return { success: false, error: 'Pago no confirmado. El QR se activa al confirmar el pago.' };
  }

  const { error: updateError } = await supabaseAdmin
    .from('packs')
    .update({ qr_usado_at: new Date().toISOString() })
    .eq('id', pack.id);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  return { success: true, comercianteNombre: pack.comerciante_nombre };
}
