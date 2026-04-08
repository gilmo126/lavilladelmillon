'use server';

import { createClient } from '../../utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function activarBoletaAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: 'Sesión no válida.' };
  }

  // Verificar que es distribuidor
  const { data: profile } = await supabase.from('perfiles').select('*').eq('id', user.id).single();
  if (!profile || profile.rol !== 'distribuidor') {
    return { success: false, error: 'Solo los distribuidores pueden activar boletas en comercios.' };
  }

  const boleta_id_raw = formData.get('boleta_id') as string;
  const comercio_nombre = formData.get('comercio_nombre') as string;
  
  // Datos del Cliente y Ubicación
  const cliente_id = formData.get('cliente_id') as string;
  const cliente_nombre = formData.get('cliente_nombre') as string;
  const cliente_movil = formData.get('cliente_movil') as string;
  const cliente_direccion = formData.get('cliente_direccion') as string;
  let cliente_barrio = formData.get('cliente_barrio') as string;
  const cliente_barrio_otro = formData.get('cliente_barrio_otro') as string;
  
  // Priorizar el barrio manual si se seleccionó 'OTRO'
  if (cliente_barrio === 'OTRO' && cliente_barrio_otro) {
    cliente_barrio = cliente_barrio_otro;
  }

  const acepta_hd = formData.get('habeas_data') === 'on';

  if (!boleta_id_raw || !comercio_nombre || !cliente_id || !cliente_nombre || !cliente_movil || !cliente_direccion || !cliente_barrio) {
    return { success: false, error: 'Todos los campos de cliente, ubicación y comercio son obligatorios.' };
  }

  if (!acepta_hd) {
    return { success: false, error: 'Es obligatorio aceptar el tratamiento de datos para registrar la venta.' };
  }

  const boleta_id = parseInt(boleta_id_raw);
  if (isNaN(boleta_id)) {
    return { success: false, error: 'ID de boleta no válido.' };
  }

  // 1. Activar Boleta (Logística)
  const { data: actOk, error: actError } = await supabase.rpc('activar_boleta_comercio', {
    p_dist_id: user.id,
    p_boleta_id: boleta_id,
    p_nombre_comercio: comercio_nombre,
    p_cliente_nombre: cliente_nombre,
    p_cliente_id: cliente_id,
    p_cliente_movil: cliente_movil,
  });

  if (actError || !actOk) {
    return { success: false, error: actError?.message || 'La boleta no pudo ser activada. Verifique su inventario.' };
  }

  // 2. Registrar Venta de Cliente (Auditoría y CRM)
  const { error: saleError } = await supabase.from('ventas_clientes').insert({
    boleta_id: boleta_id,
    cliente_id,
    cliente_nombre,
    cliente_movil,
    cliente_direccion,
    cliente_barrio,
    comercio_nombre,
    distribuidor_id: user.id,
    acepta_tratamiento_datos: true,
    canal_consentimiento: 'App Distribuidor'
  });

  if (saleError) {
    // Nota: La boleta quedó activada pero el registro de cliente falló. 
    // En producción se buscaría atomicidad, pero aquí priorizamos la activación técnica.
    console.error("Venta no registrada en tabla auxiliar:", saleError);
  }

  revalidatePath('/activar');
  return { success: true, boleta_code: `TKN-${String(boleta_id).padStart(6, '0')}` };
}

export async function obtenerBarriosAction() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('obtener_barrios_sugeridos');
  if (error) return [];
  return (data || []).map((b: any) => b.barrio);
}
