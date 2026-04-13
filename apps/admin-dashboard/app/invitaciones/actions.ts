'use server';

import { Resend } from 'resend';
import { createClient } from '../../utils/supabase/server';
import { supabaseAdmin } from '../../lib/supabaseAdmin';

const LANDING_URL = 'https://landing-page.guillaumer-orion.workers.dev';

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
  distribuidor: { nombre: string } | null;
};

export type CrearInvitacionResult =
  | { success: true; token: string; comercianteNombre: string }
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
    .select('id')
    .eq('activa', true)
    .single();

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

  // Enviar email si hay correo
  if (email) {
    try {
      const apiKey = process.env.RESEND_API_KEY;
      if (apiKey) {
        const resend = new Resend(apiKey);
        const invUrl = `${LANDING_URL}/invitacion/${inv.token}`;
        await resend.emails.send({
          from: 'La Villa del Millón <onboarding@resend.dev>',
          to: email,
          subject: `Invitación a ${tipoEvento} — La Villa del Millón`,
          html: `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0e1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:520px;margin:0 auto;padding:32px 20px;">
  <div style="text-align:center;margin-bottom:32px;">
    <h1 style="color:#facc15;font-size:22px;font-weight:900;margin:0 0 4px;">La Villa del Millón</h1>
    <p style="color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin:0;">Invitación a evento</p>
  </div>
  <div style="background:#1e293b;border:1px solid #334155;border-radius:16px;padding:24px;margin-bottom:24px;">
    <p style="color:#e2e8f0;font-size:15px;margin:0 0 12px;">Hola <strong style="color:#fff;">${nombre}</strong>,</p>
    <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0;">
      Has sido invitado(a) al evento <strong style="color:#facc15;">${tipoEvento}</strong> de La Villa del Millón.
      Confirma tu asistencia haciendo click en el botón.
    </p>
  </div>
  <a href="${invUrl}" target="_blank" style="display:block;background:#facc15;color:#0a0e1a;text-align:center;padding:16px;border-radius:12px;font-weight:900;font-size:14px;text-transform:uppercase;letter-spacing:1px;text-decoration:none;margin-bottom:24px;">
    Confirmar Asistencia
  </a>
  <p style="color:#475569;font-size:11px;text-align:center;margin:0;">La Villa del Millón · Palmira 2026</p>
</div></body></html>`.trim(),
        });
      }
    } catch { /* best-effort */ }
  }

  return { success: true, token: inv.token, comercianteNombre: nombre };
}

// ── LISTAR INVITACIONES ─────────────────────────────────────────────

export async function getInvitacionesAction(estado?: string, distribuidorId?: string): Promise<InvitacionItem[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  let query = supabaseAdmin
    .from('invitaciones')
    .select('id, tipo_evento, comerciante_nombre, comerciante_tel, comerciante_whatsapp, comerciante_email, token, estado, created_at, distribuidor:perfiles!distribuidor_id(nombre)')
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
      const apiKey = process.env.RESEND_API_KEY;
      if (apiKey) {
        const resend = new Resend(apiKey);
        const invUrl = `${LANDING_URL}/invitacion/${inv.token}`;
        await resend.emails.send({
          from: 'La Villa del Millón <onboarding@resend.dev>',
          to: inv.comerciante_email,
          subject: `Recordatorio: Invitación a ${inv.tipo_evento} — La Villa del Millón`,
          html: `
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
</div></body></html>`.trim(),
        });
      }
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
  created_at: string;
};

export async function getInvitacionDetailAction(id: string): Promise<InvitacionDetail | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabaseAdmin
    .from('invitaciones')
    .select('id, tipo_evento, comerciante_nombre, comerciante_direccion, comerciante_tel, comerciante_whatsapp, comerciante_email, token, token_qr, estado, qr_generado_at, qr_escaneado_at, created_at')
    .eq('id', id)
    .single();

  return data as InvitacionDetail | null;
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
