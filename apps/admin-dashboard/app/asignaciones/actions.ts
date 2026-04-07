'use server';

import { createClient } from '../../utils/supabase/server';
import { revalidatePath } from 'next/cache';

// ── Validar Disponibilidad de Rango ──────────────────────────────────────────
export async function validarRangoAction(inicio: number, fin: number) {
  const supabase = await createClient();
  
  if (isNaN(inicio) || isNaN(fin) || inicio > fin) {
    return { success: false, error: 'Rango inválido' };
  }

  const { data, error } = await supabase.rpc('validar_rango_boletas', {
    p_inicio: inicio,
    p_fin: fin
  });

  if (error || !data?.[0]) return { success: false, error: error?.message || 'Fallo de consulta' };

  return { 
    success: true, 
    total: data[0].total_solicitado,
    disponibles: data[0].disponibles_en_rango,
    no_aptas: data[0].no_aptas,
    es_valido: data[0].es_valido
  };
}

// ── Sugerir Próximo Lote ──────────────────────────────────────────────────────
export async function sugerirLoteAction() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('sugerir_proximo_lote', { p_tamano: 100 });

  if (error || !data?.[0]) return { success: false, error: error?.message || 'No hay lotes disponibles' };

  return { 
    success: true, 
    inicio: data[0].sugerido_inicio, 
    fin: data[0].sugerido_fin 
  };
}

// ── Asignar Boletas (Ejecutar Lote) ───────────────────────────────────────────
export async function asignarBoletasAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { success: false, error: 'Sesión no válida.' };

  const distribuidor_id = formData.get('distribuidor_id') as string;
  const zona_id = formData.get('zona_id') as string;
  const rango_inicio = parseInt(formData.get('rango_inicio') as string);
  const rango_fin = parseInt(formData.get('rango_fin') as string);

  if (!distribuidor_id) return { success: false, error: 'Debe seleccionar un distribuidor.' };
  if (!zona_id) return { success: false, error: 'Debe seleccionar la zona de destino para este lote.' };
  if (isNaN(rango_inicio) || isNaN(rango_fin)) return { success: false, error: 'Los rangos deben ser números.' };
  
  // DOBLE CANDADO: Re-validar antes de ejecutar para evitar condiciones de carrera
  const { data: vData } = await supabase.rpc('validar_rango_boletas', { p_inicio: rango_inicio, p_fin: rango_fin });
  if (!vData?.[0]?.es_valido) {
    return { success: false, error: `Error Crítico: El rango contiene ${vData?.[0]?.no_aptas} boletas no aptas.` };
  }

  // Ejecutar Mutación Auditada con Zona de Destino
  const { data, error } = await supabase.rpc('asignar_lote_boletas', {
    p_admin_id: user.id,
    p_dist_id: distribuidor_id,
    p_rango_inicio: rango_inicio,
    p_rango_fin: rango_fin,
    p_zona_id: zona_id
  });

  if (error) return { success: false, error: error.message };

  revalidatePath('/asignaciones');
  revalidatePath('/distribuidores');
  revalidatePath('/'); // Refresh dashboard counters
  return { success: true, count: data };
}
