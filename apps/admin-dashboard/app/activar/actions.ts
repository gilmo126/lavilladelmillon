'use server';

import { Resend } from 'resend';
import { createClient } from '../../utils/supabase/server';
import { supabaseAdmin } from '../../lib/supabaseAdmin';

const LANDING_URL = 'https://landing-page.guillaumer-orion.workers.dev';

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
      comercianteEmail: string | null;
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
    comercianteEmail:     comercianteEmail,
    tipoPago,
    fechaVencimientoPago,
  };
}

// ── ENVIAR EMAIL AL COMERCIANTE ─────────────────────────────────────

export type EnviarEmailResult = { success: boolean; error?: string };

export async function enviarEmailPackAction(data: {
  comercianteNombre: string;
  comercianteEmail: string;
  numeros: number[];
  tokenPagina: string;
}): Promise<EnviarEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { success: false, error: 'RESEND_API_KEY no configurada.' };

  const packUrl = `${LANDING_URL}/pack/${data.tokenPagina}`;
  const numerosHtml = data.numeros
    .map((n) => {
      const s = String(n).padStart(6, '0');
      return `<td style="background:#0f172a;border:1px solid #334155;border-radius:8px;padding:8px 4px;text-align:center;font-family:monospace;font-weight:900;font-size:14px;color:#fff;">${s}</td>`;
    })
    .reduce<string[][]>((rows, cell, i) => {
      if (i % 5 === 0) rows.push([]);
      rows[rows.length - 1].push(cell);
      return rows;
    }, [])
    .map((row) => `<tr>${row.join('')}</tr>`)
    .join('');

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0e1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px;">

    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="color:#facc15;font-size:22px;font-weight:900;margin:0 0 4px;">La Villa del Millón</h1>
      <p style="color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin:0;">Pack de números</p>
    </div>

    <div style="background:#1e293b;border:1px solid #334155;border-radius:16px;padding:24px;margin-bottom:24px;">
      <p style="color:#e2e8f0;font-size:15px;margin:0 0 12px;">
        Hola <strong style="color:#fff;">${data.comercianteNombre}</strong>,
      </p>
      <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0;">
        Aquí están tus <strong style="color:#fff;">25 números</strong> para participar en el sorteo.
        Comparte cada número con tus clientes para que registren sus datos.
      </p>
    </div>

    <div style="background:#1e293b;border:1px solid #334155;border-radius:16px;padding:24px;margin-bottom:24px;">
      <p style="color:#facc15;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:2px;margin:0 0 16px;">Tus 25 números</p>
      <table style="width:100%;border-collapse:separate;border-spacing:6px;" cellpadding="0" cellspacing="0">
        ${numerosHtml}
      </table>
    </div>

    <a href="${packUrl}" target="_blank" style="display:block;background:#facc15;color:#0a0e1a;text-align:center;padding:16px;border-radius:12px;font-weight:900;font-size:14px;text-transform:uppercase;letter-spacing:1px;text-decoration:none;margin-bottom:24px;">
      Ver mis números y compartir
    </a>

    <p style="color:#475569;font-size:11px;text-align:center;margin:0;">
      La Villa del Millón · Distribución autorizada
    </p>
  </div>
</body>
</html>`.trim();

  const resend = new Resend(apiKey);

  const { error } = await resend.emails.send({
    from: 'La Villa del Millón <onboarding@resend.dev>',
    to: data.comercianteEmail,
    subject: 'Tus 25 números — La Villa del Millón',
    html,
  });

  if (error) return { success: false, error: error.message };
  return { success: true };
}
