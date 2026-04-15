'use server';

import { createClient } from '../../utils/supabase/server';
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { sendMail } from '../../lib/mailer';

const LANDING_URL = process.env.NEXT_PUBLIC_LANDING_URL || 'https://landing-page.guillaumer-orion.workers.dev';

// ── TIPOS ───────────────────────────────────────────────────────────

export type InvitacionItem = {
  id: string;
  tipo_evento: string;
  comerciante_nombre: string;
  comerciante_tel: string | null;
  comerciante_whatsapp: string | null;
  comerciante_email: string | null;
  token: string;
  estado: string;
  created_at: string;
  jornadas_seleccionadas: string[] | null;
  distribuidor: { nombre: string } | null;
};

export type CrearInvitacionResult =
  | { success: true; token: string; comercianteNombre: string; comercianteWhatsapp: string | null; comercianteEmail: string | null; tipoEvento: string }
  | { success: false; error: string };

// ── CREAR INVITACIÓN ────────────────────────────────────────────────

export async function crearInvitacionAction(formData: FormData): Promise<CrearInvitacionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Sesión no válida.' };

  const { data: profile } = await supabaseAdmin.from('perfiles').select('rol, nombre, email:id').eq('id', user.id).single();
  if (!profile || !['admin', 'distribuidor'].includes(profile.rol)) {
    return { success: false, error: 'Sin permisos.' };
  }

  const tipoEvento = (formData.get('tipo_evento') as string)?.trim() || 'Lanzamiento';
  const nombre = (formData.get('comerciante_nombre') as string)?.trim();
  const direccion = (formData.get('comerciante_direccion') as string)?.trim() || null;
  const tel = (formData.get('comerciante_tel') as string)?.trim() || null;
  const whatsapp = (formData.get('comerciante_whatsapp') as string)?.trim() || null;
  const email = (formData.get('comerciante_email') as string)?.trim() || null;

  if (!nombre) return { success: false, error: 'El nombre del comerciante es obligatorio.' };

  const { data: config } = await supabaseAdmin
    .from('configuracion_campana')
    .select('id, evento_titulo, evento_subtitulo, evento_mensaje, evento_auspiciantes, evento_logo_url, ubicacion_evento, ubicacion_maps_url')
    .eq('activa', true)
    .single();

  const eventoTitulo = config?.evento_titulo || '¡Bienvenidos a La Villa del Millón!';
  const eventoSubtitulo = config?.evento_subtitulo || 'El escenario donde tu esfuerzo encuentra su recompensa.';
  const eventoMensaje = config?.evento_mensaje || '';
  const eventoAuspiciantes: string[] = config?.evento_auspiciantes || ['KIA', 'YAMAHA', 'ODONTO PROTECT'];
  const eventoLogoUrl = config?.evento_logo_url || null;
  const ubicacionEvento = config?.ubicacion_evento || null;
  const ubicacionMapsUrl = config?.ubicacion_maps_url || null;

  const { data: inv, error: insertErr } = await supabaseAdmin
    .from('invitaciones')
    .insert({
      distribuidor_id: user.id,
      campana_id: config?.id || null,
      tipo_evento: tipoEvento,
      comerciante_nombre: nombre,
      comerciante_direccion: direccion,
      comerciante_tel: tel,
      comerciante_whatsapp: whatsapp,
      comerciante_email: email,
    })
    .select('token')
    .single();

  if (insertErr || !inv) {
    return { success: false, error: insertErr?.message || 'Error al crear invitación.' };
  }

  // Enviar email si hay correo — usa contenido dinámico de configuración
  if (email) {
    try {
      const invUrl = `${LANDING_URL}/invitacion/${inv.token}`;

      // Resaltar auspiciantes en el mensaje
      let mensajeHtml = '';
      if (eventoMensaje) {
        let texto = eventoMensaje;
        for (const a of eventoAuspiciantes) {
          if (a.trim()) {
            texto = texto.replace(new RegExp(a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
              `<strong style="color:#facc15;font-weight:900;">${a}</strong>`);
          }
        }
        mensajeHtml = texto.split('\n').filter(Boolean)
          .map((p: string) => `<p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 12px;">${p}</p>`)
          .join('');
      }

      const auspiciantesHtml = eventoAuspiciantes.filter(Boolean)
        .map(a => `<span style="display:inline-block;background:rgba(250,204,21,0.1);border:1px solid rgba(250,204,21,0.3);color:#facc15;font-weight:900;font-size:12px;padding:6px 14px;border-radius:20px;margin:4px;">${a}</span>`)
        .join(' ');

      await sendMail(email, `Invitación a ${tipoEvento} — La Villa del Millón`, `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0e1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:32px 20px;">
  ${eventoLogoUrl ? `<div style="text-align:center;margin-bottom:16px;"><img src="${eventoLogoUrl}" alt="Logo" style="height:60px;width:auto;" /></div>` : ''}
  <div style="text-align:center;margin-bottom:32px;">
    <h1 style="color:#facc15;font-size:24px;font-weight:900;margin:0 0 8px;">${eventoTitulo}</h1>
    <p style="color:rgba(250,204,21,0.7);font-size:14px;font-style:italic;margin:0;">${eventoSubtitulo}</p>
  </div>
  <div style="background:#1e293b;border:1px solid #334155;border-radius:16px;padding:24px;margin-bottom:24px;">
    <p style="color:#e2e8f0;font-size:15px;margin:0 0 16px;">Hola <strong style="color:#fff;">${nombre}</strong>,</p>
    <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 16px;">
      Has sido invitado(a) al evento <strong style="color:#facc15;">${tipoEvento}</strong> de La Villa del Millón.
    </p>
    ${mensajeHtml}
  </div>
  ${auspiciantesHtml ? `<div style="text-align:center;margin-bottom:24px;">${auspiciantesHtml}</div>` : ''}
  ${ubicacionEvento ? `
  <div style="background:#1e293b;border:1px solid #334155;border-radius:16px;padding:20px;margin-bottom:16px;">
    <p style="color:#64748b;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:2px;margin:0 0 8px;">📍 Ubicación</p>
    <p style="color:#fff;font-size:14px;font-weight:700;margin:0 0 6px;">${ubicacionEvento}</p>
    ${ubicacionMapsUrl ? `<a href="${ubicacionMapsUrl}" style="color:#facc15;font-size:12px;font-weight:700;text-decoration:none;">Ver en Google Maps →</a>` : ''}
  </div>` : ''}
  <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin:0 0 16px;text-align:center;">Al confirmar podrás elegir a cuál jornada asistirás.</p>
  <a href="${invUrl}" target="_blank" style="display:block;background:#facc15;color:#0a0e1a;text-align:center;padding:16px;border-radius:12px;font-weight:900;font-size:14px;text-transform:uppercase;letter-spacing:1px;text-decoration:none;margin-bottom:24px;">
    Confirmar Asistencia
  </a>
  <p style="color:#475569;font-size:11px;text-align:center;margin:0;">La Villa del Millón · Palmira 2026</p>
</div></body></html>`.trim());
    } catch { /* best-effort */ }
  }

  return { success: true, token: inv.token, comercianteNombre: nombre, comercianteWhatsapp: whatsapp, comercianteEmail: email, tipoEvento };
}

// ── LISTAR INVITACIONES ─────────────────────────────────────────────

export async function getInvitacionesAction(estado?: string, distribuidorId?: string): Promise<InvitacionItem[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  let query = supabaseAdmin
    .from('invitaciones')
    .select('id, tipo_evento, comerciante_nombre, comerciante_tel, comerciante_whatsapp, comerciante_email, token, estado, created_at, jornadas_seleccionadas, distribuidor:perfiles!distribuidor_id(nombre)')
    .order('created_at', { ascending: false });

  if (distribuidorId) {
    query = query.eq('distribuidor_id', distribuidorId);
  }
  if (estado && estado !== 'todas') {
    query = query.eq('estado', estado);
  }

  const { data, error } = await query.limit(100);
  if (error) return [];

  return (data || []).map((i: any) => ({
    ...i,
    distribuidor: Array.isArray(i.distribuidor) ? i.distribuidor[0] || null : i.distribuidor,
  })) as InvitacionItem[];
}

// ── REENVIAR INVITACIÓN ─────────────────────────────────────────────

export async function reenviarInvitacionAction(invitacionId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Sesión no válida.' };

  const { data: inv } = await supabaseAdmin
    .from('invitaciones')
    .select('token, comerciante_nombre, comerciante_email, tipo_evento')
    .eq('id', invitacionId)
    .single();

  if (!inv) return { success: false, error: 'Invitación no encontrada.' };

  if (inv.comerciante_email) {
    try {
      const invUrl = `${LANDING_URL}/invitacion/${inv.token}`;
      await sendMail(inv.comerciante_email, `Recordatorio: Invitación a ${inv.tipo_evento} — La Villa del Millón`, `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0e1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:520px;margin:0 auto;padding:32px 20px;">
  <div style="text-align:center;margin-bottom:32px;">
    <h1 style="color:#facc15;font-size:22px;font-weight:900;margin:0;">La Villa del Millón</h1>
  </div>
  <div style="background:#1e293b;border:1px solid #334155;border-radius:16px;padding:24px;margin-bottom:24px;">
    <p style="color:#e2e8f0;font-size:15px;margin:0 0 12px;">Hola <strong style="color:#fff;">${inv.comerciante_nombre}</strong>,</p>
    <p style="color:#94a3b8;font-size:14px;">Recordatorio: estás invitado(a) al evento <strong style="color:#facc15;">${inv.tipo_evento}</strong>.</p>
  </div>
  <a href="${invUrl}" target="_blank" style="display:block;background:#facc15;color:#0a0e1a;text-align:center;padding:16px;border-radius:12px;font-weight:900;font-size:14px;text-transform:uppercase;text-decoration:none;margin-bottom:24px;">Confirmar Asistencia</a>
</div></body></html>`.trim());
    } catch { /* best-effort */ }
  }

  // Reset estado si fue rechazada
  await supabaseAdmin
    .from('invitaciones')
    .update({ estado: 'pendiente', updated_at: new Date().toISOString() })
    .eq('id', invitacionId)
    .eq('estado', 'rechazada');

  return { success: true };
}

// ── DETALLE DE INVITACIÓN ───────────────────────────────────────────

export type InvitacionDetail = {
  id: string;
  tipo_evento: string;
  comerciante_nombre: string;
  comerciante_direccion: string | null;
  comerciante_tel: string | null;
  comerciante_whatsapp: string | null;
  comerciante_email: string | null;
  token: string;
  token_qr: string;
  estado: string;
  qr_generado_at: string | null;
  qr_escaneado_at: string | null;
  jornadas_seleccionadas: string[] | null;
  created_at: string;
};

export async function getInvitacionDetailAction(id: string): Promise<InvitacionDetail | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabaseAdmin
    .from('invitaciones')
    .select('id, tipo_evento, comerciante_nombre, comerciante_direccion, comerciante_tel, comerciante_whatsapp, comerciante_email, token, token_qr, estado, qr_generado_at, qr_escaneado_at, jornadas_seleccionadas, created_at')
    .eq('id', id)
    .single();

  return data as InvitacionDetail | null;
}

// ── REPORTE POR DISTRIBUIDOR (solo admin) ───────────────────────────

export type ReporteDistribuidorItem = {
  distribuidor_id: string;
  distribuidor: string;
  total: number;
  aceptadas: number;
  pendientes: number;
  rechazadas: number;
  conversion: number;
  jornadas: { id: string; count: number }[];
};

export async function getReporteInvitacionesAction(): Promise<ReporteDistribuidorItem[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabaseAdmin.from('perfiles').select('rol').eq('id', user.id).single();
  if (!profile || profile.rol !== 'admin') return [];

  const { data, error } = await supabaseAdmin
    .from('invitaciones')
    .select('distribuidor_id, estado, jornadas_seleccionadas, distribuidor:perfiles!distribuidor_id(nombre)');

  if (error || !data) return [];

  const map = new Map<string, ReporteDistribuidorItem & { _jornadasMap: Map<string, number> }>();

  for (const row of data as any[]) {
    const dId = row.distribuidor_id;
    if (!dId) continue;
    const nombre = Array.isArray(row.distribuidor) ? row.distribuidor[0]?.nombre : row.distribuidor?.nombre;

    if (!map.has(dId)) {
      map.set(dId, {
        distribuidor_id: dId,
        distribuidor: nombre || 'Sin nombre',
        total: 0,
        aceptadas: 0,
        pendientes: 0,
        rechazadas: 0,
        conversion: 0,
        jornadas: [],
        _jornadasMap: new Map(),
      });
    }
    const entry = map.get(dId)!;
    entry.total++;
    if (row.estado === 'aceptada') entry.aceptadas++;
    else if (row.estado === 'pendiente') entry.pendientes++;
    else if (row.estado === 'rechazada') entry.rechazadas++;

    if (Array.isArray(row.jornadas_seleccionadas)) {
      for (const jId of row.jornadas_seleccionadas) {
        entry._jornadasMap.set(jId, (entry._jornadasMap.get(jId) || 0) + 1);
      }
    }
  }

  const result = Array.from(map.values()).map((e) => ({
    distribuidor_id: e.distribuidor_id,
    distribuidor: e.distribuidor,
    total: e.total,
    aceptadas: e.aceptadas,
    pendientes: e.pendientes,
    rechazadas: e.rechazadas,
    conversion: e.total > 0 ? (e.aceptadas / e.total) * 100 : 0,
    jornadas: Array.from(e._jornadasMap.entries()).map(([id, count]) => ({ id, count })),
  }));

  result.sort((a, b) => b.total - a.total);
  return result;
}

// ── ACTUALIZAR DATOS DEL COMERCIANTE ────────────────────────────────

export async function actualizarInvitacionAction(
  id: string,
  datos: {
    comerciante_nombre?: string;
    comerciante_direccion?: string;
    comerciante_tel?: string;
    comerciante_whatsapp?: string;
    comerciante_email?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Sesión no válida.' };

  const payload: Record<string, string> = {};
  if (datos.comerciante_nombre?.trim()) payload.comerciante_nombre = datos.comerciante_nombre.trim();
  if (datos.comerciante_direccion !== undefined) payload.comerciante_direccion = datos.comerciante_direccion?.trim() || '';
  if (datos.comerciante_tel !== undefined) payload.comerciante_tel = datos.comerciante_tel?.trim() || '';
  if (datos.comerciante_whatsapp !== undefined) payload.comerciante_whatsapp = datos.comerciante_whatsapp?.trim() || '';
  if (datos.comerciante_email !== undefined) payload.comerciante_email = datos.comerciante_email?.trim() || '';

  if (Object.keys(payload).length === 0) return { success: true };

  payload.updated_at = new Date().toISOString();

  const { error } = await supabaseAdmin.from('invitaciones').update(payload).eq('id', id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}
