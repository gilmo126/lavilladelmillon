'use server';

import { createClient } from '../../utils/supabase/server';
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { sendMail } from '../../lib/mailer';

const LANDING_URL = process.env.NEXT_PUBLIC_LANDING_URL || 'https://landing-page.guillaumer-orion.workers.dev';

export type PreRegistroItem = {
  id: string;
  nombre: string;
  nombre_negocio: string;
  tipo_doc: string;
  identificacion: string | null;
  whatsapp: string;
  codigo_influencer: string | null;
  email: string | null;
  direccion: string | null;
  ciudad: string | null;
  como_se_entero: string | null;
  jornadas_seleccionadas: string[] | null;
  estado: string;
  invitacion_id: string | null;
  created_at: string;
};

export type PreRegistrosPage = { items: PreRegistroItem[]; total: number };

async function verificarAdmin(): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Sesión no válida.' };
  const { data: profile } = await supabaseAdmin.from('perfiles').select('rol').eq('id', user.id).single();
  if (!profile || profile.rol !== 'admin') return { ok: false, error: 'Solo el administrador puede acceder.' };
  return { ok: true, userId: user.id };
}

export async function getPreRegistrosAction(
  params: { estado?: string; page?: number; pageSize?: number; busqueda?: string } = {}
): Promise<PreRegistrosPage> {
  const guard = await verificarAdmin();
  if (!guard.ok) return { items: [], total: 0 };

  const page = Math.max(1, params.page || 1);
  const pageSize = Math.max(1, Math.min(100, params.pageSize || 10));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabaseAdmin
    .from('pre_registros')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (params.estado && params.estado !== 'todos') {
    query = query.eq('estado', params.estado);
  }

  if (params.busqueda && params.busqueda.trim()) {
    const term = params.busqueda.trim();
    query = query.or(`nombre.ilike.%${term}%,identificacion.ilike.%${term}%,codigo_influencer.ilike.%${term}%,whatsapp.ilike.%${term}%`);
  }

  const { data, error, count } = await query.range(from, to);
  if (error) return { items: [], total: 0 };

  return { items: (data || []) as PreRegistroItem[], total: count || 0 };
}

export async function getPreRegistrosPendientesCount(): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from('pre_registros')
    .select('*', { count: 'exact', head: true })
    .eq('estado', 'pendiente');

  if (error) return 0;
  return count || 0;
}

export async function aprobarPreRegistroAction(id: string): Promise<{ success: boolean; error?: string; token?: string; comercianteWhatsapp?: string }> {
  const guard = await verificarAdmin();
  if (!guard.ok) return { success: false, error: guard.error };

  const { data: reg } = await supabaseAdmin
    .from('pre_registros')
    .select('*')
    .eq('id', id)
    .single();

  if (!reg) return { success: false, error: 'Pre-registro no encontrado.' };
  if (reg.estado !== 'pendiente') return { success: false, error: 'Este pre-registro ya fue procesado.' };

  const { data: config } = await supabaseAdmin
    .from('configuracion_campana')
    .select('id, evento_titulo, evento_subtitulo, evento_mensaje, evento_auspiciantes, evento_logo_url, ubicacion_evento, ubicacion_maps_url')
    .eq('activa', true)
    .single();

  const eventoTitulo = config?.evento_titulo || 'La Villa del Millón';
  const eventoSubtitulo = config?.evento_subtitulo || '';
  const eventoMensaje = config?.evento_mensaje || '';
  const eventoAuspiciantes: string[] = config?.evento_auspiciantes || [];
  const eventoLogoUrl = config?.evento_logo_url || null;
  const ubicacionEvento = config?.ubicacion_evento || null;
  const ubicacionMapsUrl = config?.ubicacion_maps_url || null;

  const tipoEvento = 'Evento La Villa del Millón';

  const { data: inv, error: insertErr } = await supabaseAdmin
    .from('invitaciones')
    .insert({
      distribuidor_id: guard.userId,
      campana_id: config?.id || null,
      tipo_evento: tipoEvento,
      comerciante_nombre: reg.nombre,
      comerciante_nombre_comercial: reg.nombre_negocio,
      comerciante_ciudad: reg.ciudad,
      comerciante_direccion: reg.direccion,
      comerciante_tel: reg.telefono,
      comerciante_whatsapp: reg.whatsapp,
      comerciante_email: reg.email,
      jornadas_seleccionadas: reg.jornadas_seleccionadas,
      origen: 'pre_registro',
    })
    .select('id, token')
    .single();

  if (insertErr || !inv) {
    return { success: false, error: insertErr?.message || 'Error al crear invitación.' };
  }

  await supabaseAdmin
    .from('pre_registros')
    .update({ estado: 'invitacion_enviada', invitacion_id: inv.id })
    .eq('id', id);

  if (reg.email) {
    try {
      const invUrl = `${LANDING_URL}/invitacion/${inv.token}`;

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

      await sendMail(reg.email, `Invitación a ${tipoEvento} — La Villa del Millón`, `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0e1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:32px 20px;">
  ${eventoLogoUrl ? `<div style="text-align:center;margin-bottom:16px;"><img src="${eventoLogoUrl}" alt="Logo" style="height:60px;width:auto;" /></div>` : ''}
  <div style="text-align:center;margin-bottom:32px;">
    <h1 style="color:#facc15;font-size:24px;font-weight:900;margin:0 0 8px;">${eventoTitulo}</h1>
    <p style="color:rgba(250,204,21,0.7);font-size:14px;font-style:italic;margin:0;">${eventoSubtitulo}</p>
  </div>
  <div style="background:#1e293b;border:1px solid #334155;border-radius:16px;padding:24px;margin-bottom:24px;">
    <p style="color:#e2e8f0;font-size:15px;margin:0 0 16px;">Hola <strong style="color:#fff;">${reg.nombre}</strong>,</p>
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

  return { success: true, token: inv.token, comercianteWhatsapp: reg.whatsapp };
}

export async function rechazarPreRegistroAction(id: string): Promise<{ success: boolean; error?: string }> {
  const guard = await verificarAdmin();
  if (!guard.ok) return { success: false, error: guard.error };

  const { error } = await supabaseAdmin
    .from('pre_registros')
    .update({ estado: 'rechazado' })
    .eq('id', id)
    .eq('estado', 'pendiente');

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function exportarPreRegistrosCsvAction(
  params: { estado?: string; busqueda?: string } = {}
): Promise<{ success: boolean; csv?: string; error?: string }> {
  const guard = await verificarAdmin();
  if (!guard.ok) return { success: false, error: guard.error };

  let query = supabaseAdmin
    .from('pre_registros')
    .select('*')
    .order('created_at', { ascending: false });

  if (params.estado && params.estado !== 'todos') {
    query = query.eq('estado', params.estado);
  }

  if (params.busqueda && params.busqueda.trim()) {
    const term = params.busqueda.trim();
    query = query.or(`nombre.ilike.%${term}%,identificacion.ilike.%${term}%,codigo_influencer.ilike.%${term}%,whatsapp.ilike.%${term}%`);
  }

  const { data, error } = await query;
  if (error) return { success: false, error: error.message };

  const rows = (data || []) as PreRegistroItem[];
  const headers = ['Nombre', 'Negocio', 'Tipo Doc', 'Identificacion', 'WhatsApp', 'Email', 'Ciudad', 'Direccion', 'Como se entero', 'Codigo Influencer', 'Jornadas', 'Estado', 'Fecha'];
  const csvRows = rows.map(r => [
    r.nombre,
    r.nombre_negocio,
    r.tipo_doc,
    r.identificacion || '',
    r.whatsapp,
    r.email || '',
    r.ciudad || '',
    r.direccion || '',
    r.como_se_entero || '',
    r.codigo_influencer || '',
    (r.jornadas_seleccionadas || []).join('; '),
    r.estado,
    new Date(r.created_at).toLocaleDateString('es-CO'),
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));

  const csv = [headers.join(','), ...csvRows].join('\n');
  return { success: true, csv };
}
