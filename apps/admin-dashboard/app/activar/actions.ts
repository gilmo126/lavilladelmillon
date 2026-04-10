'use server';

import { createClient } from '../../utils/supabase/server';
import { supabaseAdmin } from '../../lib/supabaseAdmin';

export type VenderPackResult =
  | { success: false; error: string }
  | {
      success: true;
      packId: string;
      tokenPagina: string;
      tokenQr: string;
      qrValidoHasta: string | null;
      numeros: number[];
      comercianteNombre: string;
      tipoPago: 'inmediato' | 'pendiente';
      fechaVencimientoPago: string | null;
    };

export async function venderPackAction(formData: FormData): Promise<VenderPackResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Sesión no válida.' };

  const { data: profile } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user.id)
    .single();

  if (!profile || profile.rol !== 'distribuidor') {
    return { success: false, error: 'Solo distribuidores pueden vender packs.' };
  }

  const comercianteNombre = (formData.get('comerciante_nombre') as string)?.trim();
  const comercianteTel    = (formData.get('comerciante_tel') as string)?.trim();
  const comercianteEmail  = (formData.get('comerciante_email') as string)?.trim() || null;
  const comercianteWa     = (formData.get('comerciante_whatsapp') as string)?.trim() || null;
  const tipoPago          = formData.get('tipo_pago') as 'inmediato' | 'pendiente';

  if (!comercianteNombre || !comercianteTel) {
    return { success: false, error: 'Nombre y teléfono del comerciante son obligatorios.' };
  }
  if (!['inmediato', 'pendiente'].includes(tipoPago)) {
    return { success: false, error: 'Tipo de pago inválido.' };
  }

  // Config de campaña activa
  const { data: config } = await supabaseAdmin
    .from('configuracion_campana')
    .select('id, dias_vencimiento_pago, dias_validez_qr')
    .eq('activa', true)
    .single();

  if (!config) return { success: false, error: 'No hay campaña activa configurada.' };

  // Generar pack + 25 números aleatorios via RPC
  const { data: packId, error: rpcError } = await supabaseAdmin.rpc('generar_pack', {
    p_dist_id:    user.id,
    p_campana_id: config.id,
  });

  if (rpcError || !packId) {
    return { success: false, error: rpcError?.message || 'Error al generar el pack.' };
  }

  const fechaVencimientoPago = tipoPago === 'pendiente'
    ? new Date(Date.now() + config.dias_vencimiento_pago * 24 * 60 * 60 * 1000).toISOString()
    : null;

  // Completar el pack con datos del comerciante y pago
  const { error: updateError } = await supabaseAdmin
    .from('packs')
    .update({
      comerciante_nombre:      comercianteNombre,
      comerciante_tel:         comercianteTel,
      comerciante_email:       comercianteEmail,
      comerciante_whatsapp:    comercianteWa,
      tipo_pago:               tipoPago,
      estado_pago:             tipoPago === 'inmediato' ? 'pagado' : 'pendiente',
      fecha_venta:             new Date().toISOString(),
      fecha_vencimiento_pago:  fechaVencimientoPago,
    })
    .eq('id', packId);

  if (updateError) {
    return { success: false, error: `Error al registrar datos del comerciante: ${updateError.message}` };
  }

  // Leer tokens generados por la RPC
  const { data: pack } = await supabaseAdmin
    .from('packs')
    .select('token_pagina, token_qr, qr_valido_hasta')
    .eq('id', packId)
    .single();

  if (!pack) return { success: false, error: 'Error al obtener datos del pack generado.' };

  // Leer los 25 números creados
  const { data: boletas } = await supabaseAdmin
    .from('boletas')
    .select('id_boleta')
    .eq('pack_id', packId)
    .order('id_boleta', { ascending: true });

  const numeros = (boletas || []).map((b: any) => Number(b.id_boleta));

  return {
    success: true,
    packId,
    tokenPagina:          pack.token_pagina,
    tokenQr:              pack.token_qr,
    qrValidoHasta:        pack.qr_valido_hasta,
    numeros,
    comercianteNombre,
    tipoPago,
    fechaVencimientoPago,
  };
}
