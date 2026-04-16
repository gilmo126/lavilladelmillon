'use server';

import { createClient } from '../../utils/supabase/server';
import { supabaseAdmin } from '../../lib/supabaseAdmin';

export type ComercianteItem = {
  comerciante_identificacion: string;
  comerciante_tipo_id: string;
  comerciante_nombre: string;
  comerciante_tel: string | null;
  comerciante_whatsapp: string | null;
  comerciante_email: string | null;
  distribuidor_nombre: string | null;
  fecha_primer_pack: string;
  total_packs: number;
};

export async function getComerciantesAction(filtros?: {
  distribuidorId?: string;
  estadoPago?: string;
}): Promise<ComercianteItem[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabaseAdmin.from('perfiles').select('rol').eq('id', user.id).single();
  if (!profile || profile.rol !== 'admin') return [];

  let query = supabaseAdmin
    .from('packs')
    .select('comerciante_identificacion, comerciante_tipo_id, comerciante_nombre, comerciante_tel, comerciante_whatsapp, comerciante_email, fecha_venta, distribuidor:perfiles!distribuidor_id(nombre), estado_pago')
    .eq('es_prueba', false)
    .not('comerciante_identificacion', 'is', null)
    .order('fecha_venta', { ascending: false });

  if (filtros?.distribuidorId) {
    query = query.eq('distribuidor_id', filtros.distribuidorId);
  }
  if (filtros?.estadoPago) {
    query = query.eq('estado_pago', filtros.estadoPago);
  }

  const { data, error } = await query.limit(500);
  if (error || !data) return [];

  // Agrupar por identificación
  const map = new Map<string, ComercianteItem>();
  for (const p of data as any[]) {
    const id = p.comerciante_identificacion;
    if (!id) continue;
    const existing = map.get(id);
    const dist = Array.isArray(p.distribuidor) ? p.distribuidor[0] : p.distribuidor;
    if (existing) {
      existing.total_packs++;
      if (p.fecha_venta && p.fecha_venta < existing.fecha_primer_pack) {
        existing.fecha_primer_pack = p.fecha_venta;
      }
      // Actualizar con datos más recientes
      if (p.comerciante_nombre) existing.comerciante_nombre = p.comerciante_nombre;
      if (p.comerciante_tel) existing.comerciante_tel = p.comerciante_tel;
      if (p.comerciante_whatsapp) existing.comerciante_whatsapp = p.comerciante_whatsapp;
      if (p.comerciante_email) existing.comerciante_email = p.comerciante_email;
    } else {
      map.set(id, {
        comerciante_identificacion: id,
        comerciante_tipo_id: p.comerciante_tipo_id || 'CC',
        comerciante_nombre: p.comerciante_nombre || '',
        comerciante_tel: p.comerciante_tel || null,
        comerciante_whatsapp: p.comerciante_whatsapp || null,
        comerciante_email: p.comerciante_email || null,
        distribuidor_nombre: dist?.nombre || null,
        fecha_primer_pack: p.fecha_venta || '',
        total_packs: 1,
      });
    }
  }

  return Array.from(map.values());
}

export async function actualizarComercianteAction(
  identificacion: string,
  datos: {
    comerciante_nombre?: string;
    comerciante_tipo_id?: string;
    comerciante_tel?: string;
    comerciante_whatsapp?: string;
    comerciante_email?: string;
  }
): Promise<{ success: boolean; error?: string; updated?: number }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Sesión no válida.' };

  const { data: profile } = await supabaseAdmin.from('perfiles').select('rol').eq('id', user.id).single();
  if (!profile || profile.rol !== 'admin') return { success: false, error: 'Sin permisos.' };

  const payload: Record<string, string> = {};
  if (datos.comerciante_nombre?.trim()) payload.comerciante_nombre = datos.comerciante_nombre.trim();
  if (datos.comerciante_tipo_id?.trim()) payload.comerciante_tipo_id = datos.comerciante_tipo_id.trim();
  if (datos.comerciante_tel !== undefined) payload.comerciante_tel = datos.comerciante_tel?.trim() || '';
  if (datos.comerciante_whatsapp !== undefined) payload.comerciante_whatsapp = datos.comerciante_whatsapp?.trim() || '';
  if (datos.comerciante_email !== undefined) payload.comerciante_email = datos.comerciante_email?.trim() || '';

  if (Object.keys(payload).length === 0) return { success: true, updated: 0 };

  const { count, error } = await supabaseAdmin
    .from('packs')
    .update(payload, { count: 'exact' })
    .eq('comerciante_identificacion', identificacion);

  if (error) return { success: false, error: error.message };
  return { success: true, updated: count || 0 };
}

export async function eliminarComercianteAction(identificacion: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Sesión no válida.' };

  const { data: profile } = await supabaseAdmin.from('perfiles').select('rol').eq('id', user.id).single();
  if (!profile || profile.rol !== 'admin') return { success: false, error: 'Sin permisos.' };

  // Obtener pack_ids del comerciante
  const { data: packs } = await supabaseAdmin
    .from('packs')
    .select('id')
    .eq('comerciante_identificacion', identificacion);

  const packIds = (packs || []).map((p: any) => p.id);

  if (packIds.length === 0) return { success: true };

  // Cascada: activaciones → boletas → packs
  await supabaseAdmin.from('activaciones').delete().in('pack_id', packIds);
  await supabaseAdmin.from('boletas').delete().in('pack_id', packIds);
  const { error } = await supabaseAdmin.from('packs').delete().in('id', packIds);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
