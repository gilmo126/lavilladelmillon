'use server';

import { supabaseAdmin } from '../lib/supabaseAdmin';

export type RegistrarResult =
  | { success: true; message: string }
  | { success: false; error: string };

export async function registrarBoletaAction(data: {
  numero: string;
  identificacion: string;
  nombre: string;
  celular: string;
  premioId: string;
  aceptaTerminos: boolean;
  territorioId: string;
  ubicacionManual: string | null;
}): Promise<RegistrarResult> {
  const { numero, identificacion, nombre, celular, premioId, aceptaTerminos, territorioId, ubicacionManual } = data;

  if (!numero || !aceptaTerminos || !territorioId) {
    return { success: false, error: 'Faltan datos obligatorios (número, aceptación legal o ubicación).' };
  }

  // Buscar boleta por id_boleta numérico
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

  // V2: 0=Generado, 1=Activado, 2=Registrado, 3=Anulado, 4=Sorteado
  if (boleta.estado === 2) return { success: false, error: 'Esta boleta ya fue registrada anteriormente.' };
  if (boleta.estado === 3) return { success: false, error: genericError };
  if (boleta.estado === 4) return { success: false, error: 'Esta boleta ya participó en un sorteo previo.' };

  // Solo se puede registrar si está en estado 0 (Generado) o 1 (Activado)
  if (boleta.estado > 1) return { success: false, error: genericError };

  // Validar vigencia del sorteo
  const { data: sorteo, error: sorteoError } = await supabaseAdmin
    .from('sorteos')
    .select('fecha_sorteo, estado')
    .eq('premio_id', premioId)
    .eq('estado', 'programado')
    .maybeSingle();

  if (sorteoError) return { success: false, error: sorteoError.message };
  if (!sorteo) return { success: false, error: 'El sorteo para este premio ya finalizó o no está programado.' };

  if (new Date() > new Date(sorteo.fecha_sorteo)) {
    return { success: false, error: 'El tiempo de registro para este sorteo ha expirado.' };
  }

  // Registrar boleta → estado 2 (Registrado)
  const { error: updateError } = await supabaseAdmin
    .from('boletas')
    .update({
      estado: 2,
      identificacion_usuario: identificacion,
      nombre_usuario: nombre,
      celular_usuario: celular,
      premio_seleccionado: premioId,
      acepta_terminos: aceptaTerminos,
      fecha_aceptacion_terminos: new Date().toISOString(),
      version_terminos: 'v2.0-abril-2026',
      ubicacion_cliente_id: territorioId,
      ubicacion_manual: ubicacionManual,
    })
    .eq('id_boleta', boleta.id_boleta);

  if (updateError) return { success: false, error: updateError.message };

  return { success: true, message: '¡Registrada con éxito! Ya estás participando.' };
}
