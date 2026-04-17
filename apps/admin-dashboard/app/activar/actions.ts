'use server';

import { createClient } from '../../utils/supabase/server';
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { sendMail } from '../../lib/mailer';

const LANDING_URL = process.env.NEXT_PUBLIC_LANDING_URL || 'https://landing-page.guillaumer-orion.workers.dev';

export type VenderPackResult =
  | { success: false; error: string }
  | {
      success: true;
      packId: string;
      numeroPack: number;
      tipoPago: 'inmediato' | 'pendiente';
      comercianteNombre: string;
      comercianteEmail: string | null;
      comercianteWhatsapp: string | null;
      // Solo presente si pago inmediato
      tokenPagina?: string;
      tokenQr?: string;
      qrValidoHasta?: string | null;
      numeros?: number[];
      // Solo presente si pago pendiente
      fechaVencimientoPago?: string | null;
    };

export async function venderPackAction(formData: FormData): Promise<VenderPackResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Sesión no válida.' };

  const { data: profile } = await supabaseAdmin
    .from('perfiles')
    .select('rol')
    .eq('id', user.id)
    .single();

  if (!profile || !['admin', 'distribuidor'].includes(profile.rol)) {
    return { success: false, error: 'Solo administradores y distribuidores pueden vender packs.' };
  }

  const comercianteNombre   = (formData.get('comerciante_nombre') as string)?.trim();
  const comercianteNombreComercial = (formData.get('comerciante_nombre_comercial') as string)?.trim() || null;
  const comercianteCiudad   = (formData.get('comerciante_ciudad') as string)?.trim() || null;
  const comercianteTipoId   = (formData.get('comerciante_tipo_id') as string)?.trim() || 'CC';
  const comercianteIdent    = (formData.get('comerciante_identificacion') as string)?.trim();
  const comercianteTel      = (formData.get('comerciante_tel') as string)?.trim();
  const comercianteEmail    = (formData.get('comerciante_email') as string)?.trim() || null;
  const comercianteWa       = (formData.get('comerciante_whatsapp') as string)?.trim() || null;
  const tipoPago            = formData.get('tipo_pago') as 'inmediato' | 'pendiente';

  if (!comercianteNombre || !comercianteIdent || !comercianteWa) {
    return { success: false, error: 'Nombre, identificación y WhatsApp del comerciante son obligatorios.' };
  }
  const celularRegex = /^3[0-9]{9}$/;
  if (!celularRegex.test(comercianteWa)) {
    return { success: false, error: 'WhatsApp debe ser un celular colombiano de 10 dígitos que inicie con 3.' };
  }
  if (comercianteTel && !celularRegex.test(comercianteTel)) {
    return { success: false, error: 'Teléfono debe ser un celular colombiano de 10 dígitos que inicie con 3.' };
  }
  if (!['inmediato', 'pendiente'].includes(tipoPago)) {
    return { success: false, error: 'Tipo de pago inválido.' };
  }

  const { data: config } = await supabaseAdmin
    .from('configuracion_campana')
    .select('id, dias_vencimiento_pago, dias_validez_qr')
    .eq('activa', true)
    .single();

  if (!config) return { success: false, error: 'No hay campaña activa configurada.' };

  // ── PAGO INMEDIATO: genera pack + 25 números + QR ──────────────────
  if (tipoPago === 'inmediato') {
    const { data: packId, error: rpcError } = await supabaseAdmin.rpc('generar_pack', {
      p_dist_id: user.id,
      p_campana_id: config.id,
    });

    if (rpcError || !packId) {
      return { success: false, error: rpcError?.message || 'Error al generar el pack.' };
    }

    const { error: updateError } = await supabaseAdmin
      .from('packs')
      .update({
        comerciante_nombre: comercianteNombre,
        comerciante_nombre_comercial: comercianteNombreComercial,
        comerciante_ciudad: comercianteCiudad,
        comerciante_tipo_id: comercianteTipoId,
        comerciante_identificacion: comercianteIdent,
        comerciante_tel: comercianteTel,
        comerciante_email: comercianteEmail,
        comerciante_whatsapp: comercianteWa,
        tipo_pago: 'inmediato',
        estado_pago: 'pagado',
        fecha_venta: new Date().toISOString(),
      })
      .eq('id', packId);

    if (updateError) {
      return { success: false, error: `Error al registrar datos: ${updateError.message}` };
    }

    const { data: pack } = await supabaseAdmin
      .from('packs')
      .select('token_pagina, token_qr, qr_valido_hasta, numero_pack')
      .eq('id', packId)
      .single();

    const { data: boletas } = await supabaseAdmin
      .from('boletas')
      .select('id_boleta')
      .eq('pack_id', packId)
      .order('id_boleta', { ascending: true });

    return {
      success: true,
      packId,
      numeroPack: pack?.numero_pack || 0,
      tipoPago: 'inmediato',
      comercianteNombre,
      comercianteEmail,
      comercianteWhatsapp: comercianteWa,
      tokenPagina: pack?.token_pagina,
      tokenQr: pack?.token_qr,
      qrValidoHasta: pack?.qr_valido_hasta,
      numeros: (boletas || []).map((b: any) => Number(b.id_boleta)),
    };
  }

  // ── PAGO PENDIENTE: solo guarda datos, sin números ni QR ───────────
  const fechaVencimientoPago = new Date(
    Date.now() + config.dias_vencimiento_pago * 24 * 60 * 60 * 1000
  ).toISOString();

  const tokenPagina = crypto.randomUUID();
  const tokenQr = crypto.randomUUID();

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('packs')
    .insert({
      campana_id: config.id,
      distribuidor_id: user.id,
      comerciante_nombre: comercianteNombre,
      comerciante_nombre_comercial: comercianteNombreComercial,
      comerciante_ciudad: comercianteCiudad,
      comerciante_tipo_id: comercianteTipoId,
      comerciante_identificacion: comercianteIdent,
      comerciante_tel: comercianteTel,
      comerciante_email: comercianteEmail,
      comerciante_whatsapp: comercianteWa,
      tipo_pago: 'pendiente',
      estado_pago: 'pendiente',
      fecha_venta: new Date().toISOString(),
      fecha_vencimiento_pago: fechaVencimientoPago,
      token_pagina: tokenPagina,
      token_qr: tokenQr,
    })
    .select('id, numero_pack')
    .single();

  if (insertError || !inserted) {
    return { success: false, error: insertError?.message || 'Error al registrar reserva.' };
  }

  return {
    success: true,
    packId: inserted.id,
    numeroPack: inserted.numero_pack || 0,
    tipoPago: 'pendiente',
    comercianteNombre,
    comercianteEmail,
    comercianteWhatsapp: comercianteWa,
    fechaVencimientoPago,
  };
}

// ── CONFIRMAR PAGO Y GENERAR NÚMEROS ────────────────────────────────

export type ConfirmarPagoResult =
  | { success: false; error: string }
  | {
      success: true;
      numeros: number[];
      tokenPagina: string;
      tokenQr: string;
      qrValidoHasta: string | null;
    };

export async function confirmarPagoAction(packId: string, datosActualizados?: {
  comerciante_nombre?: string;
  comerciante_nombre_comercial?: string;
  comerciante_ciudad?: string;
  comerciante_tipo_id?: string;
  comerciante_identificacion?: string;
  comerciante_tel?: string;
  comerciante_whatsapp?: string;
  comerciante_email?: string;
}): Promise<ConfirmarPagoResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Sesión no válida.' };

  const { data: profile } = await supabaseAdmin.from('perfiles').select('rol').eq('id', user.id).single();
  if (!profile || !['distribuidor', 'admin'].includes(profile.rol)) {
    return { success: false, error: 'Sin permisos.' };
  }

  // Verificar pack
  const { data: pack, error: packErr } = await supabaseAdmin
    .from('packs')
    .select('id, distribuidor_id, campana_id, estado_pago')
    .eq('id', packId)
    .single();

  if (packErr || !pack) return { success: false, error: 'Pack no encontrado.' };
  if (pack.estado_pago === 'pagado') return { success: false, error: 'Este pack ya tiene los números generados.' };
  if (pack.estado_pago === 'vencido') return { success: false, error: 'El plazo de pago de este pack venció.' };
  if (pack.estado_pago !== 'pendiente' && pack.estado_pago !== 'comprobante_enviado') {
    return { success: false, error: `Estado no válido para generar números: ${pack.estado_pago}` };
  }

  // Distribuidor solo puede confirmar sus propios packs
  if (profile.rol === 'distribuidor' && pack.distribuidor_id !== user.id) {
    return { success: false, error: 'No puedes confirmar packs de otro distribuidor.' };
  }

  // Actualizar datos del comerciante si se proporcionaron
  if (datosActualizados) {
    const updatePayload: Record<string, string> = {};
    if (datosActualizados.comerciante_nombre?.trim()) updatePayload.comerciante_nombre = datosActualizados.comerciante_nombre.trim();
    if (datosActualizados.comerciante_tipo_id?.trim()) updatePayload.comerciante_tipo_id = datosActualizados.comerciante_tipo_id.trim();
    if (datosActualizados.comerciante_identificacion?.trim()) updatePayload.comerciante_identificacion = datosActualizados.comerciante_identificacion.trim();
    if (datosActualizados.comerciante_tel?.trim()) updatePayload.comerciante_tel = datosActualizados.comerciante_tel.trim();
    if (datosActualizados.comerciante_whatsapp !== undefined) updatePayload.comerciante_whatsapp = datosActualizados.comerciante_whatsapp?.trim() || '';
    if (datosActualizados.comerciante_email !== undefined) updatePayload.comerciante_email = datosActualizados.comerciante_email?.trim() || '';

    if (Object.keys(updatePayload).length > 0) {
      await supabaseAdmin.from('packs').update(updatePayload).eq('id', packId);
    }
  }

  // Config para dias_validez_qr
  const { data: config } = await supabaseAdmin
    .from('configuracion_campana')
    .select('dias_validez_qr')
    .eq('activa', true)
    .single();

  // Pre-check de ocupación: si el rango numérico está sobre el 80%, abortar
  // antes de entrar al loop de generación (evita fallas silenciosas por colisiones).
  const { RANGO_TOTAL_CAPACIDAD, UMBRAL_BLOQUEO_GENERACION, generarCandidatoAleatorio } = await import('../../lib/numeroBoleta');
  const { count: ocupacion } = await supabaseAdmin
    .from('boletas')
    .select('*', { count: 'exact', head: true });
  if ((ocupacion || 0) >= RANGO_TOTAL_CAPACIDAD * UMBRAL_BLOQUEO_GENERACION) {
    return {
      success: false,
      error: `Rango numérico agotado (${ocupacion}/${RANGO_TOTAL_CAPACIDAD}). Inicie una nueva campaña para liberar espacio de boletas.`,
    };
  }

  // Generar 25 números aleatorios únicos (rango nuevo 1.000.000-9.999.999)
  const numerosGenerados: number[] = [];
  const maxIntentos = 200;
  let intentos = 0;

  while (numerosGenerados.length < 25 && intentos < maxIntentos) {
    const candidatos: number[] = [];
    for (let i = 0; i < 25 - numerosGenerados.length; i++) {
      candidatos.push(generarCandidatoAleatorio());
    }

    // Verificar que no existan en BD
    const { data: existentes } = await supabaseAdmin
      .from('boletas')
      .select('id_boleta')
      .in('id_boleta', candidatos);

    const existentesSet = new Set((existentes || []).map((b: any) => b.id_boleta));
    for (const n of candidatos) {
      if (!existentesSet.has(n) && !numerosGenerados.includes(n)) {
        numerosGenerados.push(n);
        if (numerosGenerados.length >= 25) break;
      }
    }
    intentos++;
  }

  if (numerosGenerados.length < 25) {
    return {
      success: false,
      error: `No se pudieron generar 25 números únicos tras ${maxIntentos} intentos (ocupación ≈${ocupacion}/${RANGO_TOTAL_CAPACIDAD}). Contacte soporte.`,
    };
  }

  // Insertar boletas (token_integridad sigue el formato del número: 6 o 7 dígitos)
  const { formatearNumeroBoleta } = await import('../../lib/numeroBoleta');
  const boletasPayload = numerosGenerados.map((n) => ({
    id_boleta: n,
    campana_id: pack.campana_id,
    estado: 0,
    token_integridad: `TKN-${formatearNumeroBoleta(n)}`,
    pack_id: pack.id,
    token_link: crypto.randomUUID(),
    distribuidor_id: pack.distribuidor_id,
  }));

  const { error: boletasErr } = await supabaseAdmin.from('boletas').insert(boletasPayload);
  if (boletasErr) return { success: false, error: `Error al generar números: ${boletasErr.message}` };

  // Actualizar pack
  const qrValidoHasta = config?.dias_validez_qr
    ? new Date(Date.now() + config.dias_validez_qr * 24 * 60 * 60 * 1000).toISOString()
    : null;

  // Confirmar pago implica verificación: deja traza de quién y cuándo
  const { error: updateErr } = await supabaseAdmin
    .from('packs')
    .update({
      tipo_pago: 'inmediato',
      estado_pago: 'pagado',
      qr_valido_hasta: qrValidoHasta,
      pago_verificado: true,
      pago_verificado_at: new Date().toISOString(),
      pago_verificado_por: user.id,
    })
    .eq('id', packId);

  if (updateErr) return { success: false, error: updateErr.message };

  // Leer tokens + datos del comerciante para el email
  const { data: updatedPack } = await supabaseAdmin
    .from('packs')
    .select('token_pagina, token_qr, qr_valido_hasta, comerciante_nombre, comerciante_email')
    .eq('id', packId)
    .single();

  // Best-effort: avisar al comerciante que sus números ya están listos
  if (updatedPack?.comerciante_email && updatedPack?.token_pagina) {
    try {
      const { data: campana } = await supabaseAdmin
        .from('configuracion_campana')
        .select('nombre_campana')
        .eq('activa', true)
        .maybeSingle();
      const nombreCampana = campana?.nombre_campana || 'La Villa del Millón';
      const packUrl = `${LANDING_URL}/pack/${updatedPack.token_pagina}`;
      await sendMail(
        updatedPack.comerciante_email,
        `✅ Tus números ya están listos — ${nombreCampana}`,
        `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0e1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:32px 20px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="color:#facc15;font-size:22px;font-weight:900;margin:0 0 4px;">${nombreCampana}</h1>
      <p style="color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin:0;">Tu pago fue verificado</p>
    </div>
    <div style="background:#1e293b;border:1px solid #334155;border-radius:16px;padding:24px;margin-bottom:24px;">
      <p style="color:#e2e8f0;font-size:15px;margin:0 0 12px;">Hola <strong style="color:#fff;">${updatedPack.comerciante_nombre}</strong>,</p>
      <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 12px;">
        ✅ Verificamos tu pago y <strong style="color:#facc15;">tus 25 números ya están disponibles</strong>.
      </p>
      <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0;">
        Abre tu link de comerciante para ver y compartir los números con tus clientes.
      </p>
    </div>
    <div style="text-align:center;margin-bottom:16px;">
      <a href="${packUrl}" style="display:inline-block;background:#facc15;color:#0f172a;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:900;font-size:13px;text-transform:uppercase;letter-spacing:1px;">Ver mis números</a>
    </div>
    <p style="color:#475569;font-size:11px;text-align:center;margin:24px 0 0;">${nombreCampana} · Verificación de pagos</p>
  </div>
</body></html>`.trim()
      );
    } catch {
      /* best-effort: si falla email no rompemos flujo */
    }
  }

  return {
    success: true,
    numeros: numerosGenerados.sort((a, b) => a - b),
    tokenPagina: updatedPack?.token_pagina || '',
    tokenQr: updatedPack?.token_qr || '',
    qrValidoHasta: updatedPack?.qr_valido_hasta || null,
  };
}

// ── SUBIR COMPROBANTE DE PAGO ────────────────────────────────────────

export type SubirComprobanteResult =
  | { success: false; error: string }
  | { success: true; signedUrl: string; path: string };

export async function subirComprobantePackAction(formData: FormData): Promise<SubirComprobanteResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Sesión no válida.' };

  const { data: profile } = await supabaseAdmin.from('perfiles').select('rol').eq('id', user.id).single();
  if (!profile || !['distribuidor', 'admin'].includes(profile.rol)) {
    return { success: false, error: 'Sin permisos.' };
  }

  const archivo = formData.get('archivo') as File | null;
  const packId = formData.get('packId') as string | null;
  if (!archivo || !packId) return { success: false, error: 'Faltan datos.' };

  const { validarArchivoComprobante, subirComprobanteStorage } = await import('../../lib/comprobantes');
  const valid = validarArchivoComprobante(archivo);
  if (!valid.ok) return { success: false, error: valid.error };

  const { data: pack } = await supabaseAdmin
    .from('packs')
    .select('id, distribuidor_id, estado_pago, comprobante_path')
    .eq('id', packId)
    .single();
  if (!pack) return { success: false, error: 'Pack no encontrado.' };

  if (profile.rol === 'distribuidor' && pack.distribuidor_id !== user.id) {
    return { success: false, error: 'No puedes subir comprobantes a packs de otro distribuidor.' };
  }

  // Si ya había un comprobante previo, borrarlo del storage (evita basura)
  if (pack.comprobante_path) {
    await supabaseAdmin.storage.from('comprobantes-pago').remove([pack.comprobante_path]);
  }

  const upload = await subirComprobanteStorage(archivo, packId, archivo.name);
  if ('error' in upload) return { success: false, error: upload.error };

  // Actualizar pack con nueva URL y metadatos
  const updatePayload: Record<string, any> = {
    comprobante_url: upload.signedUrl,
    comprobante_path: upload.path,
    comprobante_subido_at: new Date().toISOString(),
    comprobante_subido_por: user.id,
  };

  // Si el pack estaba pendiente, pasa a 'comprobante_enviado' (notifica a distribuidor)
  if (pack.estado_pago === 'pendiente') {
    updatePayload.estado_pago = 'comprobante_enviado';
  }

  const { error: updErr } = await supabaseAdmin.from('packs').update(updatePayload).eq('id', packId);
  if (updErr) return { success: false, error: updErr.message };

  return { success: true, signedUrl: upload.signedUrl, path: upload.path };
}

// ── MARCAR PAGO VERIFICADO (solo admin) ──────────────────────────────

export async function marcarPagoVerificadoAction(
  packId: string,
  verificado: boolean = true,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Sesión no válida.' };

  const { data: profile } = await supabaseAdmin.from('perfiles').select('rol').eq('id', user.id).single();
  if (!profile || profile.rol !== 'admin') {
    return { success: false, error: 'Solo el administrador puede verificar pagos.' };
  }

  const payload: Record<string, any> = {
    pago_verificado: verificado,
    pago_verificado_at: verificado ? new Date().toISOString() : null,
    pago_verificado_por: verificado ? user.id : null,
  };

  const { error } = await supabaseAdmin.from('packs').update(payload).eq('id', packId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ── ACTUALIZAR DATOS COMERCIANTE EN PACK ────────────────────────────

export async function actualizarDatosPackAction(
  packId: string,
  datos: {
    comerciante_nombre?: string;
    comerciante_nombre_comercial?: string;
    comerciante_ciudad?: string;
    comerciante_tipo_id?: string;
    comerciante_identificacion?: string;
    comerciante_tel?: string;
    comerciante_whatsapp?: string;
    comerciante_email?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Sesión no válida.' };

  const { data: profile } = await supabaseAdmin.from('perfiles').select('rol').eq('id', user.id).single();
  if (!profile || !['admin', 'distribuidor'].includes(profile.rol)) {
    return { success: false, error: 'Sin permisos.' };
  }

  // Distribuidor solo puede editar sus propios packs
  if (profile.rol === 'distribuidor') {
    const { data: pack } = await supabaseAdmin.from('packs').select('distribuidor_id').eq('id', packId).single();
    if (!pack || pack.distribuidor_id !== user.id) {
      return { success: false, error: 'No puedes editar packs de otro distribuidor.' };
    }
  }

  const payload: Record<string, string> = {};
  if (datos.comerciante_nombre?.trim()) payload.comerciante_nombre = datos.comerciante_nombre.trim();
  if (datos.comerciante_nombre_comercial !== undefined) payload.comerciante_nombre_comercial = datos.comerciante_nombre_comercial?.trim() || '';
  if (datos.comerciante_ciudad !== undefined) payload.comerciante_ciudad = datos.comerciante_ciudad?.trim() || '';
  if (datos.comerciante_tipo_id?.trim()) payload.comerciante_tipo_id = datos.comerciante_tipo_id.trim();
  if (datos.comerciante_identificacion?.trim()) payload.comerciante_identificacion = datos.comerciante_identificacion.trim();
  if (datos.comerciante_tel !== undefined) payload.comerciante_tel = datos.comerciante_tel?.trim() || '';
  if (datos.comerciante_whatsapp !== undefined) payload.comerciante_whatsapp = datos.comerciante_whatsapp?.trim() || '';
  if (datos.comerciante_email !== undefined) payload.comerciante_email = datos.comerciante_email?.trim() || '';

  if (Object.keys(payload).length === 0) return { success: true };

  const { error } = await supabaseAdmin.from('packs').update(payload).eq('id', packId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ── CONFIRMAR WHATSAPP ENTREGADO ────────────────────────────────────

export async function confirmarWhatsappPackAction(packId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Sesión no válida.' };

  const { error } = await supabaseAdmin
    .from('packs')
    .update({ whatsapp_confirmado: true, whatsapp_confirmado_at: new Date().toISOString() })
    .eq('id', packId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ── ENVIAR EMAIL AL COMERCIANTE ─────────────────────────────────────

export type EnviarEmailResult = { success: boolean; error?: string };

export async function enviarEmailPackAction(data: {
  comercianteNombre: string;
  comercianteEmail: string;
  numeros: number[];
  tokenPagina: string;
  tokenQr?: string;
  qrValidoHasta?: string | null;
}): Promise<EnviarEmailResult> {
  const supabaseAuth = await createClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return { success: false, error: 'Sesión no válida.' };

  const packUrl = `${LANDING_URL}/pack/${data.tokenPagina}`;
  const { formatearNumeroBoleta: formatearN } = await import('../../lib/numeroBoleta');
  const numerosHtml = data.numeros
    .map((n) => {
      const s = formatearN(n);
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
        Aquí están tus <strong style="color:#fff;">${data.numeros.length} números</strong> para participar en el sorteo.
        Comparte cada número con tus clientes para que registren sus datos.
      </p>
    </div>
    <div style="background:#1e293b;border:1px solid #334155;border-radius:16px;padding:24px;margin-bottom:24px;">
      <p style="color:#facc15;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:2px;margin:0 0 16px;">Tus ${data.numeros.length} números</p>
      <table style="width:100%;border-collapse:separate;border-spacing:6px;" cellpadding="0" cellspacing="0">
        ${numerosHtml}
      </table>
    </div>
    <a href="${packUrl}" target="_blank" style="display:block;background:#facc15;color:#0a0e1a;text-align:center;padding:16px;border-radius:12px;font-weight:900;font-size:14px;text-transform:uppercase;letter-spacing:1px;text-decoration:none;margin-bottom:24px;">
      Ver mis números y compartir
    </a>${data.tokenQr ? `
    <div style="background:#1e293b;border:1px solid #facc15;border-radius:16px;padding:24px;margin-bottom:24px;text-align:center;">
      <p style="color:#facc15;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:2px;margin:0 0 16px;">QR de Beneficio Recreativo</p>
      <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${process.env.NEXT_PUBLIC_ADMIN_URL || 'https://lavilladelmillon-admin.guillaumer-orion.workers.dev'}/validar-qr/${data.tokenQr}`)}" alt="QR de beneficio" width="180" height="180" style="border-radius:8px;background:#fff;padding:8px;" />
      <p style="color:#94a3b8;font-size:12px;margin:16px 0 0;">Presenta este QR en el evento recreativo.${data.qrValidoHasta ? ` Válido hasta el ${new Date(data.qrValidoHasta).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}.` : ''}</p>
    </div>` : ''}
    <p style="color:#475569;font-size:11px;text-align:center;margin:0;">
      La Villa del Millón · Distribución autorizada
    </p>
  </div>
</body>
</html>`.trim();

  try {
    await sendMail(data.comercianteEmail, `Tus ${data.numeros.length} números — La Villa del Millón`, html);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error al enviar email' };
  }
}
