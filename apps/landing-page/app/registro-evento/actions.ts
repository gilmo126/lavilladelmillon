'use server';

import { supabaseAdmin } from '../../lib/supabaseAdmin';

const CELULAR_REGEX = /^3[0-9]{9}$/;

export async function registrarPreRegistroAction(formData: FormData): Promise<{ success: boolean; error?: string }> {
  const nombre = (formData.get('nombre') as string)?.trim();
  const nombreNegocio = (formData.get('nombre_negocio') as string)?.trim();
  const tipoDoc = (formData.get('tipo_doc') as string)?.trim() || 'CC';
  const identificacion = (formData.get('identificacion') as string)?.trim() || null;
  const codigoInfluencer = (formData.get('codigo_influencer') as string)?.trim().toUpperCase() || null;
  const whatsapp = (formData.get('whatsapp') as string)?.trim();
  const email = (formData.get('email') as string)?.trim() || null;
  const direccion = (formData.get('direccion') as string)?.trim() || null;
  const ciudad = (formData.get('ciudad') as string)?.trim() || null;
  const comoSeEntero = (formData.get('como_se_entero') as string)?.trim() || null;
  const jornadasRaw = (formData.get('jornadas_seleccionadas') as string)?.trim() || null;
  let jornadasSeleccionadas: string[] | null = null;
  if (jornadasRaw) {
    try { jornadasSeleccionadas = JSON.parse(jornadasRaw); } catch { /* ignore */ }
  }

  if (!nombre || !nombreNegocio || !whatsapp) {
    return { success: false, error: 'Nombre, nombre del negocio y WhatsApp son obligatorios.' };
  }

  if (!CELULAR_REGEX.test(whatsapp)) {
    return { success: false, error: 'WhatsApp debe ser un celular colombiano de 10 dígitos que inicie con 3.' };
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: 'El formato del email no es válido.' };
  }

  const { error } = await supabaseAdmin
    .from('pre_registros')
    .insert({
      nombre,
      nombre_negocio: nombreNegocio,
      tipo_doc: tipoDoc,
      identificacion,
      whatsapp,
      codigo_influencer: codigoInfluencer,
      email,
      direccion,
      ciudad,
      como_se_entero: comoSeEntero,
      jornadas_seleccionadas: jornadasSeleccionadas,
    });

  if (error) return { success: false, error: error.message };
  return { success: true };
}
