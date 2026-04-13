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
  numero_pack: number | null;
  comerciante_nombre: string;
  comerciante_tel: string | null;
  comerciante_whatsapp: string | null;
  qr_usado_at: string;
  distribuidor: { nombre: string } | null;
};

export async function getAsistenciaAction(): Promise<AsistenciaItem[]> {
  const rol = await verificarRolScannerAction();
  if (!rol) return [];

  const { data, error } = await supabaseAdmin
    .from('packs')
    .select('id, numero_pack, comerciante_nombre, comerciante_tel, comerciante_whatsapp, qr_usado_at, distribuidor:perfiles!distribuidor_id(nombre)')
    .not('qr_usado_at', 'is', null)
    .order('qr_usado_at', { ascending: false })
    .limit(200);

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

  // Buscar primero en packs (QR de beneficio recreativo)
  const { data: pack } = await supabaseAdmin
    .from('packs')
    .select('id, comerciante_nombre, qr_usado_at, qr_valido_hasta, estado_pago')
    .eq('token_qr', tokenQr)
    .maybeSingle();

  if (pack) {
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
    if (updateError) return { success: false, error: updateError.message };
    return { success: true, comercianteNombre: pack.comerciante_nombre };
  }

  // Si no está en packs, buscar en invitaciones
  const { data: inv } = await supabaseAdmin
    .from('invitaciones')
    .select('id, comerciante_nombre, estado, qr_generado_at, qr_escaneado_at')
    .eq('token_qr', tokenQr)
    .maybeSingle();

  if (inv) {
    if (inv.estado !== 'aceptada') {
      return { success: false, error: 'Esta invitación no ha sido aceptada aún.' };
    }
    if (inv.qr_escaneado_at) {
      return { success: false, error: `QR de invitación ya escaneado el ${new Date(inv.qr_escaneado_at).toLocaleString('es-CO')}.` };
    }
    await supabaseAdmin
      .from('invitaciones')
      .update({ qr_escaneado_at: new Date().toISOString() })
      .eq('id', inv.id);
    return { success: true, comercianteNombre: `${inv.comerciante_nombre} (Invitación)` };
  }

  return { success: false, error: 'QR no encontrado en el sistema.' };
}

// ── BUSCAR PACKS POR CÉDULA ─────────────────────────────────────────

export type PackCedulaItem = {
  id: string;
  comerciante_nombre: string;
  fecha_venta: string;
  token_qr: string;
  qr_usado_at: string | null;
  qr_valido_hasta: string | null;
};

export async function buscarPacksPorCedulaAction(cedula: string): Promise<PackCedulaItem[]> {
  const rol = await verificarRolScannerAction();
  if (!rol) return [];

  const cleaned = cedula.trim();
  if (!cleaned) return [];

  const { data, error } = await supabaseAdmin
    .from('packs')
    .select('id, comerciante_nombre, fecha_venta, token_qr, qr_usado_at, qr_valido_hasta')
    .eq('comerciante_identificacion', cleaned)
    .eq('estado_pago', 'pagado')
    .order('fecha_venta', { ascending: false });

  if (error) return [];
  return (data || []) as PackCedulaItem[];
}

// ── ASISTENCIA DE INVITACIONES A EVENTOS ────────────────────────────

export type InvitacionAsistenciaItem = {
  id: string;
  comerciante_nombre: string;
  tipo_evento: string;
  qr_generado_at: string;
  qr_escaneado_at: string | null;
};

export async function getInvitacionesAsistenciaAction(): Promise<InvitacionAsistenciaItem[]> {
  const rol = await verificarRolScannerAction();
  if (!rol) return [];

  const { data, error } = await supabaseAdmin
    .from('invitaciones')
    .select('id, comerciante_nombre, tipo_evento, qr_generado_at, qr_escaneado_at')
    .eq('estado', 'aceptada')
    .not('qr_generado_at', 'is', null)
    .order('qr_generado_at', { ascending: false })
    .limit(200);

  if (error) return [];
  return (data || []) as InvitacionAsistenciaItem[];
}
