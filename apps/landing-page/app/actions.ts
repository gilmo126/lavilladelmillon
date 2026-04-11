'use server';

import { Resend } from 'resend';
import { supabaseAdmin } from '../lib/supabaseAdmin';

// ── TIPOS ───────────────────────────────────────────────────────────

export type RegistrarResult =
  | { success: true; data: ConfirmacionData }
  | { success: false; error: string };

export type ConfirmacionData = {
  numero: string;
  nombre: string;
  premio: string;
  fechaSorteo: string;
  fechaRegistro: string;
};

export type VerificarResult =
  | { estado: 'registrado'; data: ConfirmacionData }
  | { estado: 'disponible' }
  | { estado: 'no_encontrado' };

// ── VERIFICAR BOLETA ────────────────────────────────────────────────

export async function verificarBoletaAction(numero: string): Promise<VerificarResult> {
  const idBoleta = parseInt(numero.replace(/\D/g, ''), 10);
  if (isNaN(idBoleta)) return { estado: 'no_encontrado' };

  const { data: boleta } = await supabaseAdmin
    .from('boletas')
    .select('id_boleta, estado, nombre_usuario, premio_seleccionado, fecha_aceptacion_terminos')
    .eq('id_boleta', idBoleta)
    .maybeSingle();

  if (!boleta) return { estado: 'no_encontrado' };

  if (boleta.estado === 2 && boleta.nombre_usuario) {
    let premioNombre = '';
    let fechaSorteo = '';

    if (boleta.premio_seleccionado) {
      const { data: premio } = await supabaseAdmin
        .from('premios')
        .select('nombre_premio, sorteos(fecha_sorteo)')
        .eq('id', boleta.premio_seleccionado)
        .maybeSingle();

      if (premio) {
        premioNombre = premio.nombre_premio;
        const sorteos = premio.sorteos as any[];
        if (sorteos?.[0]?.fecha_sorteo) {
          fechaSorteo = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(sorteos[0].fecha_sorteo));
        }
      }
    }

    return {
      estado: 'registrado',
      data: {
        numero: String(boleta.id_boleta).padStart(6, '0'),
        nombre: boleta.nombre_usuario,
        premio: premioNombre,
        fechaSorteo,
        fechaRegistro: boleta.fecha_aceptacion_terminos
          ? new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(boleta.fecha_aceptacion_terminos))
          : '',
      },
    };
  }

  return { estado: 'disponible' };
}

// ── REGISTRAR BOLETA ────────────────────────────────────────────────

export async function registrarBoletaAction(data: {
  numero: string;
  identificacion: string;
  nombre: string;
  celular: string;
  email: string;
  premioId: string;
  aceptaTerminos: boolean;
  territorioId: string;
  ubicacionManual: string | null;
}): Promise<RegistrarResult> {
  const { numero, identificacion, nombre, celular, email, premioId, aceptaTerminos, territorioId, ubicacionManual } = data;

  if (!numero || !aceptaTerminos || !territorioId) {
    return { success: false, error: 'Faltan datos obligatorios (número, aceptación legal o ubicación).' };
  }

  const idBoleta = parseInt(numero.replace(/\D/g, ''), 10);
  if (isNaN(idBoleta)) {
    return { success: false, error: 'Número de boleta inválido.' };
  }

  const { data: boleta, error: searchError } = await supabaseAdmin
    .from('boletas')
    .select('id_boleta, estado')
    .eq('id_boleta', idBoleta)
    .maybeSingle();

  if (searchError) return { success: false, error: searchError.message };

  const genericError = 'Boleta no disponible para registro. Verifica el número o contacta a soporte.';

  if (!boleta) return { success: false, error: genericError };

  if (boleta.estado === 2) return { success: false, error: 'Esta boleta ya fue registrada anteriormente.' };
  if (boleta.estado === 3) return { success: false, error: genericError };
  if (boleta.estado === 4) return { success: false, error: 'Esta boleta ya participó en un sorteo previo.' };
  if (boleta.estado > 1) return { success: false, error: genericError };

  // Validar vigencia del sorteo y obtener datos del premio
  const { data: premio } = await supabaseAdmin
    .from('premios')
    .select('nombre_premio, sorteos(fecha_sorteo, estado)')
    .eq('id', premioId)
    .maybeSingle();

  if (!premio) return { success: false, error: 'Premio no encontrado.' };

  const sorteos = premio.sorteos as any[];
  const sorteo = sorteos?.find((s: any) => s.estado === 'programado');

  if (!sorteo) return { success: false, error: 'El sorteo para este premio ya finalizó o no está programado.' };
  if (new Date() > new Date(sorteo.fecha_sorteo)) {
    return { success: false, error: 'El tiempo de registro para este sorteo ha expirado.' };
  }

  const ahora = new Date().toISOString();

  const { error: updateError } = await supabaseAdmin
    .from('boletas')
    .update({
      estado: 2,
      identificacion_usuario: identificacion,
      nombre_usuario: nombre,
      celular_usuario: celular,
      email_usuario: email || null,
      premio_seleccionado: premioId,
      acepta_terminos: aceptaTerminos,
      fecha_aceptacion_terminos: ahora,
      version_terminos: 'v2.0-abril-2026',
      ubicacion_cliente_id: territorioId,
      ubicacion_manual: ubicacionManual,
    })
    .eq('id_boleta', boleta.id_boleta);

  if (updateError) return { success: false, error: updateError.message };

  const fechaSorteoStr = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(sorteo.fecha_sorteo));
  const numStr = String(idBoleta).padStart(6, '0');

  // Enviar email de confirmación si hay email
  if (email) {
    try {
      const apiKey = process.env.RESEND_API_KEY;
      if (apiKey) {
        const resend = new Resend(apiKey);
        await resend.emails.send({
          from: 'La Villa del Millón <onboarding@resend.dev>',
          to: email,
          subject: `Confirmación #${numStr} — La Villa del Millón`,
          html: `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0e1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:32px 20px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="color:#facc15;font-size:22px;font-weight:900;margin:0 0 4px;">La Villa del Millón</h1>
      <p style="color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin:0;">Confirmación de registro</p>
    </div>
    <div style="background:#1e293b;border:1px solid #334155;border-radius:16px;padding:24px;margin-bottom:24px;">
      <p style="color:#e2e8f0;font-size:15px;margin:0 0 12px;">
        Hola <strong style="color:#fff;">${nombre}</strong>,
      </p>
      <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0;">
        Tu número <strong style="color:#facc15;font-size:18px;">${numStr}</strong> está registrado y participando.
      </p>
    </div>
    <div style="background:#1e293b;border:1px solid #334155;border-radius:16px;padding:24px;margin-bottom:24px;">
      <table style="width:100%;border-collapse:collapse;" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:8px 0;color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;">Premio</td>
          <td style="padding:8px 0;color:#fff;font-size:14px;font-weight:700;text-align:right;">${premio.nombre_premio}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;border-top:1px solid #334155;">Fecha sorteo</td>
          <td style="padding:8px 0;color:#facc15;font-size:14px;font-weight:700;text-align:right;border-top:1px solid #334155;">${fechaSorteoStr}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;border-top:1px solid #334155;">Cédula</td>
          <td style="padding:8px 0;color:#94a3b8;font-size:14px;text-align:right;border-top:1px solid #334155;">${identificacion}</td>
        </tr>
      </table>
    </div>
    <p style="color:#475569;font-size:11px;text-align:center;margin:0;">
      La Villa del Millón · Palmira 2026
    </p>
  </div>
</body>
</html>`.trim(),
        });
      }
    } catch {
      // Email is best-effort, don't fail the registration
    }
  }

  return {
    success: true,
    data: {
      numero: numStr,
      nombre,
      premio: premio.nombre_premio,
      fechaSorteo: fechaSorteoStr,
      fechaRegistro: new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(ahora)),
    },
  };
}
