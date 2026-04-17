'use server';

import { createClient } from '../../utils/supabase/server';
import { supabaseAdmin } from '../../lib/supabaseAdmin';

export type ComercianteItem = {
  comerciante_identificacion: string;
  comerciante_tipo_id: string;
  comerciante_nombre: string;
  comerciante_nombre_comercial: string | null;
  comerciante_ciudad: string | null;
  comerciante_tel: string | null;
  comerciante_whatsapp: string | null;
  comerciante_email: string | null;
  distribuidor_nombre: string | null;
  fecha_primer_pack: string;
  total_packs: number;
  total_invitaciones: number;
  total_pre_registros: number;
  origenes: ('pack' | 'invitacion' | 'pre_registro')[];
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

  // Clave de agrupacion: whatsapp (obligatorio en las 3 fuentes)
  // Fallback: identificacion si whatsapp no existe
  const map = new Map<string, ComercianteItem>();

  function getKey(whatsapp: string | null, identificacion: string | null): string | null {
    if (whatsapp?.trim()) return `wa:${whatsapp.trim()}`;
    if (identificacion?.trim()) return `id:${identificacion.trim()}`;
    return null;
  }

  function upsert(key: string, data: {
    nombre: string; nombreComercial?: string | null; ciudad?: string | null;
    tel?: string | null; whatsapp?: string | null; email?: string | null;
    tipoId?: string; identificacion?: string | null;
    distribuidorNombre?: string | null; fecha?: string | null;
    origen: 'pack' | 'invitacion' | 'pre_registro';
  }) {
    const existing = map.get(key);
    if (existing) {
      if (data.origen === 'pack') existing.total_packs++;
      else if (data.origen === 'invitacion') existing.total_invitaciones++;
      else existing.total_pre_registros++;
      if (!existing.origenes.includes(data.origen)) existing.origenes.push(data.origen);
      if (data.fecha && data.fecha < existing.fecha_primer_pack) existing.fecha_primer_pack = data.fecha;
      // Enriquecer con datos mas completos
      if (data.nombre && !existing.comerciante_nombre) existing.comerciante_nombre = data.nombre;
      if (data.nombreComercial && !existing.comerciante_nombre_comercial) existing.comerciante_nombre_comercial = data.nombreComercial;
      if (data.ciudad && !existing.comerciante_ciudad) existing.comerciante_ciudad = data.ciudad;
      if (data.tel && !existing.comerciante_tel) existing.comerciante_tel = data.tel;
      if (data.whatsapp && !existing.comerciante_whatsapp) existing.comerciante_whatsapp = data.whatsapp;
      if (data.email && !existing.comerciante_email) existing.comerciante_email = data.email;
      if (data.identificacion && !existing.comerciante_identificacion) existing.comerciante_identificacion = data.identificacion;
      if (data.distribuidorNombre && !existing.distribuidor_nombre) existing.distribuidor_nombre = data.distribuidorNombre;
    } else {
      map.set(key, {
        comerciante_identificacion: data.identificacion || '',
        comerciante_tipo_id: data.tipoId || 'CC',
        comerciante_nombre: data.nombre || '',
        comerciante_nombre_comercial: data.nombreComercial || null,
        comerciante_ciudad: data.ciudad || null,
        comerciante_tel: data.tel || null,
        comerciante_whatsapp: data.whatsapp || null,
        comerciante_email: data.email || null,
        distribuidor_nombre: data.distribuidorNombre || null,
        fecha_primer_pack: data.fecha || '',
        total_packs: data.origen === 'pack' ? 1 : 0,
        total_invitaciones: data.origen === 'invitacion' ? 1 : 0,
        total_pre_registros: data.origen === 'pre_registro' ? 1 : 0,
        origenes: [data.origen],
      });
    }
  }

  // ── 1. Packs ──────────────────────────────────────────────────────
  let packQuery = supabaseAdmin
    .from('packs')
    .select('comerciante_identificacion, comerciante_tipo_id, comerciante_nombre, comerciante_nombre_comercial, comerciante_ciudad, comerciante_tel, comerciante_whatsapp, comerciante_email, fecha_venta, distribuidor:perfiles!distribuidor_id(nombre), estado_pago')
    .eq('es_prueba', false)
    .order('fecha_venta', { ascending: false });

  if (filtros?.distribuidorId) packQuery = packQuery.eq('distribuidor_id', filtros.distribuidorId);
  if (filtros?.estadoPago) packQuery = packQuery.eq('estado_pago', filtros.estadoPago);

  const { data: packsData } = await packQuery.limit(500);
  for (const p of (packsData || []) as any[]) {
    const key = getKey(p.comerciante_whatsapp, p.comerciante_identificacion);
    if (!key) continue;
    const dist = Array.isArray(p.distribuidor) ? p.distribuidor[0] : p.distribuidor;
    upsert(key, {
      nombre: p.comerciante_nombre, nombreComercial: p.comerciante_nombre_comercial,
      ciudad: p.comerciante_ciudad, tel: p.comerciante_tel, whatsapp: p.comerciante_whatsapp,
      email: p.comerciante_email, tipoId: p.comerciante_tipo_id,
      identificacion: p.comerciante_identificacion, distribuidorNombre: dist?.nombre,
      fecha: p.fecha_venta, origen: 'pack',
    });
  }

  // ── 2. Invitaciones ───────────────────────────────────────────────
  const { data: invsData } = await supabaseAdmin
    .from('invitaciones')
    .select('comerciante_nombre, comerciante_nombre_comercial, comerciante_ciudad, comerciante_tel, comerciante_whatsapp, comerciante_email, created_at, distribuidor:perfiles!distribuidor_id(nombre)')
    .eq('es_prueba', false)
    .order('created_at', { ascending: false })
    .limit(500);

  for (const inv of (invsData || []) as any[]) {
    const key = getKey(inv.comerciante_whatsapp, null);
    if (!key) continue;
    const dist = Array.isArray(inv.distribuidor) ? inv.distribuidor[0] : inv.distribuidor;
    upsert(key, {
      nombre: inv.comerciante_nombre, nombreComercial: inv.comerciante_nombre_comercial,
      ciudad: inv.comerciante_ciudad, tel: inv.comerciante_tel, whatsapp: inv.comerciante_whatsapp,
      email: inv.comerciante_email, distribuidorNombre: dist?.nombre,
      fecha: inv.created_at, origen: 'invitacion',
    });
  }

  // ── 3. Pre-registros virtuales ────────────────────────────────────
  const { data: preData } = await supabaseAdmin
    .from('pre_registros')
    .select('nombre, nombre_negocio, tipo_doc, identificacion, whatsapp, email, ciudad, direccion, created_at')
    .order('created_at', { ascending: false })
    .limit(500);

  for (const pr of (preData || []) as any[]) {
    const key = getKey(pr.whatsapp, pr.identificacion);
    if (!key) continue;
    upsert(key, {
      nombre: pr.nombre, nombreComercial: pr.nombre_negocio,
      ciudad: pr.ciudad, whatsapp: pr.whatsapp, email: pr.email,
      tipoId: pr.tipo_doc, identificacion: pr.identificacion,
      fecha: pr.created_at, origen: 'pre_registro',
    });
  }

  const result = Array.from(map.values());
  result.sort((a, b) => (b.fecha_primer_pack || '').localeCompare(a.fecha_primer_pack || ''));
  return result;
}

export async function actualizarComercianteAction(
  identificacion: string,
  datos: {
    comerciante_nombre?: string;
    comerciante_nombre_comercial?: string;
    comerciante_ciudad?: string;
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
  if (datos.comerciante_nombre_comercial !== undefined) payload.comerciante_nombre_comercial = datos.comerciante_nombre_comercial?.trim() || '';
  if (datos.comerciante_ciudad !== undefined) payload.comerciante_ciudad = datos.comerciante_ciudad?.trim() || '';
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
