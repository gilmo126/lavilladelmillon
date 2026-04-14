'use server';

import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { sendMail } from '../../../lib/mailer';

const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL || 'https://lavilladelmillon-admin.guillaumer-orion.workers.dev';

export type AccionResult = { success: boolean; error?: string };

export async function aceptarInvitacionAction(token: string): Promise<AccionResult> {
  const { data: inv, error: fetchErr } = await supabaseAdmin
    .from('invitaciones')
    .select('id, estado, comerciante_nombre, comerciante_email, tipo_evento, token_qr, distribuidor_id')
    .eq('token', token)
    .single();

  if (fetchErr || !inv) return { success: false, error: 'Invitación no encontrada.' };
  if (inv.estado === 'aceptada') return { success: false, error: 'Esta invitación ya fue aceptada.' };

  const { error: updateErr } = await supabaseAdmin
    .from('invitaciones')
    .update({
      estado: 'aceptada',
      qr_generado_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', inv.id);

  if (updateErr) return { success: false, error: updateErr.message };

  const qrDataUrl = `${ADMIN_URL}/validar-qr-inv/${inv.token_qr}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrDataUrl)}`;

  // Email con QR al comerciante
  if (inv.comerciante_email) {
    try {
      await sendMail(inv.comerciante_email, `Tu QR de asistencia — ${inv.tipo_evento}`, `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0e1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:520px;margin:0 auto;padding:32px 20px;">
  <div style="text-align:center;margin-bottom:32px;">
    <h1 style="color:#facc15;font-size:22px;font-weight:900;margin:0 0 4px;">La Villa del Millón</h1>
    <p style="color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin:0;">Confirmación de asistencia</p>
  </div>
  <div style="background:#1e293b;border:1px solid #334155;border-radius:16px;padding:24px;margin-bottom:24px;">
    <p style="color:#e2e8f0;font-size:15px;margin:0 0 12px;">Hola <strong style="color:#fff;">${inv.comerciante_nombre}</strong>,</p>
    <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0;">
      Tu asistencia al evento <strong style="color:#facc15;">${inv.tipo_evento}</strong> ha sido confirmada.
      Presenta este QR en la entrada del evento.
    </p>
  </div>
  <div style="background:#1e293b;border:1px solid #facc15;border-radius:16px;padding:24px;margin-bottom:24px;text-align:center;">
    <img src="${qrImageUrl}" alt="QR de asistencia" width="180" height="180" style="border-radius:8px;background:#fff;padding:8px;" />
  </div>
  <p style="color:#475569;font-size:11px;text-align:center;margin:0;">La Villa del Millón · Palmira 2026</p>
</div></body></html>`.trim());
    } catch { /* best-effort */ }
  }

  // Notificar al distribuidor
  if (inv.distribuidor_id) {
    try {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(inv.distribuidor_id);
      if (authUser?.user?.email) {
        await sendMail(authUser.user.email, `${inv.comerciante_nombre} aceptó la invitación`, `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0e1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:520px;margin:0 auto;padding:32px 20px;">
  <div style="text-align:center;margin-bottom:24px;">
    <h1 style="color:#facc15;font-size:20px;font-weight:900;margin:0;">La Villa del Millón</h1>
  </div>
  <div style="background:#1e293b;border:1px solid #22c55e;border-radius:16px;padding:24px;">
    <p style="color:#22c55e;font-size:16px;font-weight:900;margin:0 0 8px;">✅ Invitación aceptada</p>
    <p style="color:#e2e8f0;font-size:14px;margin:0 0 8px;"><strong>${inv.comerciante_nombre}</strong> confirmó su asistencia al evento <strong style="color:#facc15;">${inv.tipo_evento}</strong>.</p>
    <p style="color:#94a3b8;font-size:12px;margin:0;">Fecha: ${new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
  </div>
</div></body></html>`.trim());
      }
    } catch { /* best-effort */ }
  }

  return { success: true };
}

export async function rechazarInvitacionAction(token: string): Promise<AccionResult> {
  const { error } = await supabaseAdmin
    .from('invitaciones')
    .update({ estado: 'rechazada', updated_at: new Date().toISOString() })
    .eq('token', token)
    .eq('estado', 'pendiente');

  if (error) return { success: false, error: error.message };
  return { success: true };
}
