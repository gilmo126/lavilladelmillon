'use server';

import { supabaseAdmin } from './supabaseAdmin';

// ==========================================
// Módulo: BOLETAS (Estabilización Misión)
// ==========================================
export async function getBoletasPaged(page: number, limit: number, query: string, range?: { desde?: number, hasta?: number }, distribuidorId?: string, soloRegistrados?: boolean, incluirPruebas?: boolean) {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // Consulta 1: Boletas con relaciones estables (perfiles, premios)
  // Usamos el set de tablas confirmado por el usuario: boletas, perfiles, premios, zonas.
  let queryBuilder = supabaseAdmin.from('boletas').select(`
    *,
    premios(nombre_premio),
    distribuidor:perfiles!distribuidor_id(nombre)
  `, { count: 'exact' });

  if (!incluirPruebas) {
    queryBuilder = queryBuilder.eq('es_prueba', false);
  }

  if (distribuidorId) {
    queryBuilder = queryBuilder.eq('distribuidor_id', distribuidorId);
  }

  if (soloRegistrados) {
    queryBuilder = queryBuilder.eq('estado', 2);
  }

  if (range?.desde) queryBuilder = queryBuilder.gte('id_boleta', range.desde);
  if (range?.hasta) queryBuilder = queryBuilder.lte('id_boleta', range.hasta);

  if (query) {
    const isNum = !isNaN(Number(query));
    let extraFilters = '';

    // 1. Búsqueda de IDs de distribuidores que coincidan con el nombre
    const { data: matchedProfiles } = await supabaseAdmin
      .from('perfiles')
      .select('id')
      .ilike('nombre', `%${query}%`)
      .limit(10);
    
    const distIds = (matchedProfiles || []).map(p => p.id);
    if (distIds.length > 0) {
      extraFilters = `,distribuidor_id.in.(${distIds.join(',')})`;
    }

    if (isNum) {
      const numQ = Number(query);
      const paddedId = numQ < 1_000_000 ? query.padStart(6, '0') : query;
      queryBuilder = queryBuilder.or(`id_boleta.eq.${query},identificacion_usuario.ilike.%${query}%,token_integridad.eq.TKN-${paddedId}${extraFilters}`);
    } else {
      queryBuilder = queryBuilder.or(`token_integridad.ilike.%${query}%,identificacion_usuario.ilike.%${query}%${extraFilters}`);
    }
  }

  // Atomic Join para evitar errores 500 de PostgREST
  const [resData, resZonas] = await Promise.all([
    queryBuilder.order('id_boleta', { ascending: true }).range(from, to),
    supabaseAdmin.from('zonas').select('id, nombre')
  ]);

  const { data, count, error } = resData;
  if (error) throw new Error(error.message);

  const zonasMap = (resZonas.data || []).reduce((acc: any, z) => {
      acc[z.id] = z.nombre;
      return acc;
  }, {});

  // Lookup de packs para numero_pack (join en memoria para evitar error PostgREST)
  const packIds = Array.from(new Set((data || []).map((b: any) => b.pack_id).filter(Boolean)));
  let packsMap: Record<string, { numero_pack: number; comerciante_nombre: string }> = {};
  if (packIds.length > 0) {
    const { data: packs } = await supabaseAdmin
      .from('packs')
      .select('id, numero_pack, comerciante_nombre')
      .in('id', packIds);
    packsMap = (packs || []).reduce((acc: any, p: any) => {
      acc[p.id] = { numero_pack: p.numero_pack, comerciante_nombre: p.comerciante_nombre };
      return acc;
    }, {});
  }

  const mappedData = (data || []).map(b => ({
      ...b,
      zonas: {
          nombre: zonasMap[b.zona_destino_id || b.zona_id || ''] || 'BODEGA / SIN ZONA'
      },
      pack: b.pack_id ? packsMap[b.pack_id] || null : null,
  }));

  return {
    data: mappedData,
    total: count || 0,
    totalPages: count ? Math.ceil(count / limit) : 0
  };
}


export async function exportarParticipantesAction(distribuidorId?: string) {
  const { data, error } = await supabaseAdmin
    .from('boletas')
    .select('id_boleta, nombre_usuario, identificacion_usuario, celular_usuario, email_usuario, premio_seleccionado, fecha_aceptacion_terminos, pack_id')
    .eq('estado', 2)
    .eq('es_prueba', false)
    .not('nombre_usuario', 'is', null)
    .match(distribuidorId ? { distribuidor_id: distribuidorId } : {})
    .order('fecha_aceptacion_terminos', { ascending: false })
    .limit(5000);

  if (error || !data) return [];

  // Lookup packs y premios
  const packIds = Array.from(new Set(data.map((b: any) => b.pack_id).filter(Boolean)));
  const premioIds = Array.from(new Set(data.map((b: any) => b.premio_seleccionado).filter(Boolean)));

  let packsMap: Record<string, number> = {};
  if (packIds.length > 0) {
    const { data: packs } = await supabaseAdmin.from('packs').select('id, numero_pack').in('id', packIds);
    packsMap = (packs || []).reduce((acc: any, p: any) => { acc[p.id] = p.numero_pack; return acc; }, {});
  }

  let premiosMap: Record<string, string> = {};
  if (premioIds.length > 0) {
    const { data: premios } = await supabaseAdmin.from('premios').select('id, nombre_premio').in('id', premioIds);
    premiosMap = (premios || []).reduce((acc: any, p: any) => { acc[p.id] = p.nombre_premio; return acc; }, {});
  }

  return data.map((b: any) => ({
    numero: b.id_boleta < 1_000_000 ? String(b.id_boleta).padStart(6, '0') : String(b.id_boleta),
    nombre: b.nombre_usuario || '',
    identificacion: b.identificacion_usuario || '',
    celular: b.celular_usuario || '',
    email: b.email_usuario || '',
    premio: premiosMap[b.premio_seleccionado] || '',
    pack: packsMap[b.pack_id] ? `PACK-${String(packsMap[b.pack_id]).padStart(3, '0')}` : '',
    fecha_registro: b.fecha_aceptacion_terminos || '',
  }));
}

export async function getPacksDistribuidorAction(distId: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('packs')
      .select('id, comerciante_nombre, tipo_pago, estado_pago, fecha_venta')
      .eq('distribuidor_id', distId)
      .eq('es_prueba', false)
      .order('fecha_venta', { ascending: false, nullsFirst: false });

    if (error) throw error;
    return { success: true as const, packs: data || [] };
  } catch (error: any) {
    return { success: false as const, error: error.message, packs: [] };
  }
}

export async function anularBoletaAction(adminId: string, idBoleta: number) {
  try {
    const { data: success, error } = await supabaseAdmin.rpc('anular_boleta', {
      p_admin_id: adminId,
      p_boleta_id: idBoleta
    });
    if (error) throw error;
    return { success };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ==========================================
// Módulo: GEOGRAFÍA Y RANKING
// ==========================================
export async function getRankingZonas(distribuidorId?: string) {
  // Atomic Join para evitar errores 500 de PostgREST
  const [resBoletas, resZonas] = await Promise.all([
      (() => {
        let q = supabaseAdmin.from('boletas').select('zona_id, zona_destino_id, estado');
        if (distribuidorId) q = q.eq('distribuidor_id', distribuidorId);
        return q;
      })(),
      supabaseAdmin.from('zonas').select('id, nombre')
  ]);

  if (resBoletas.error) throw resBoletas.error;

  const zonasMap = (resZonas.data || []).reduce((acc: any, z) => {
    acc[z.id] = z.nombre;
    return acc;
  }, {});

  const ranking = (resBoletas.data || []).reduce((acc: any, curr: any) => {
    // Fallback de zona para boletas históricas o de nuevos lotes
    const zId = curr.zona_destino_id || curr.zona_id;
    if (!zId) return acc;

    const zonaName = zonasMap[zId] || 'Otras';
    if (!acc[zonaName]) acc[zonaName] = { nombre: zonaName, activadas: 0, registradas: 0 };

    if (curr.estado === 1) acc[zonaName].activadas++;
    if (curr.estado === 2) acc[zonaName].registradas++;

    return acc;
  }, {});

  return Object.values(ranking).map((z: any) => ({
    ...z,
    conversion: z.activadas > 0 ? ((z.registradas / z.activadas) * 100).toFixed(1) : 0
  })).sort((a: any, b: any) => b.activadas - a.activadas);
}

// ==========================================
// Módulo: RECURSOS COMPARTIDOS (Tablas Reales)
// ==========================================
export async function getTerritorios() {
  const { data, error } = await supabaseAdmin.from('territorios').select('*').order('nombre', { ascending: true });
  if (error) throw error;
  return data;
}

export async function getPremios(campanaId: string) {
  const { data, error } = await supabaseAdmin.from('premios').select('*').eq('campana_id', campanaId).order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function uploadPublicImagenAction(formData: FormData, folder: string = 'premios') {
  try {
    const file = formData.get('file') as File;
    if (!file) throw new Error('No se recibió ningún archivo.');

    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const buffer = await file.arrayBuffer();

    const { data, error } = await supabaseAdmin.storage
      .from('fotos-premios')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('fotos-premios')
      .getPublicUrl(filePath);

    return { success: true, url: publicUrl };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function upsertPremio(payload: { id?: string, campana_id: string, nombre_premio: string, descripcion: string, cantidad_disponible: number, imagen_url: string | null }) {
  try {
    const { id, ...data } = payload;
    let res;
    if (id) {
      res = await supabaseAdmin.from('premios').update(data).eq('id', id);
    } else {
      res = await supabaseAdmin.from('premios').insert(data);
    }
    if (res.error) throw res.error;
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deletePremio(id: string) {
  try {
    const { error } = await supabaseAdmin.from('premios').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getConfiguracion() {
  const { data, error } = await supabaseAdmin.from('configuracion_campana').select('*').limit(1).single();
  if (error) throw error;
  return data;
}

export async function updateConfiguracion(id: string, updates: any) {
  const { error } = await supabaseAdmin.from('configuracion_campana').update(updates).eq('id', id);
  if (error) throw error;
  return { success: true };
}

export async function getPacksPaged(page: number, limit: number, query: string, distribuidorId?: string, incluirPruebas?: boolean) {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let queryBuilder = supabaseAdmin.from('packs').select(
    '*, distribuidor:perfiles!distribuidor_id(nombre)',
    { count: 'exact' }
  );

  if (!incluirPruebas) {
    queryBuilder = queryBuilder.eq('es_prueba', false);
  }

  if (distribuidorId) {
    queryBuilder = queryBuilder.eq('distribuidor_id', distribuidorId);
  }

  if (query) {
    const q = query.replace(/[,()]/g, '');
    queryBuilder = queryBuilder.or(
      `comerciante_nombre.ilike.%${q}%,comerciante_nombre_comercial.ilike.%${q}%,comerciante_whatsapp.ilike.%${q}%,comerciante_tel.ilike.%${q}%,comerciante_identificacion.ilike.%${q}%`
    );
  }

  const { data, count, error } = await queryBuilder
    .order('fecha_venta', { ascending: false, nullsFirst: false })
    .range(from, to);

  if (error) throw error;

  // Count boletas per pack
  const packIds = (data || []).map((p: any) => p.id);
  let boletaCounts: Record<string, number> = {};
  if (packIds.length > 0) {
    const { data: counts } = await supabaseAdmin
      .from('boletas')
      .select('pack_id', { count: 'exact', head: false })
      .in('pack_id', packIds);

    boletaCounts = (counts || []).reduce((acc: Record<string, number>, b: any) => {
      acc[b.pack_id] = (acc[b.pack_id] || 0) + 1;
      return acc;
    }, {});
  }

  const mapped = (data || []).map((p: any) => ({
    ...p,
    numeros_count: boletaCounts[p.id] || 0,
  }));

  return { data: mapped, total: count || 0, totalPages: count ? Math.ceil(count / limit) : 0 };
}

export async function getPackDetail(packId: string) {
  const [{ data: pack, error: packErr }, { data: boletas, error: bolErr }] = await Promise.all([
    supabaseAdmin
      .from('packs')
      .select('*, distribuidor:perfiles!distribuidor_id(nombre)')
      .eq('id', packId)
      .single(), // incluye es_prueba al usar *
    supabaseAdmin
      .from('boletas')
      .select('id_boleta, estado')
      .eq('pack_id', packId)
      .order('id_boleta', { ascending: true }),
  ]);

  if (packErr || !pack) throw new Error(packErr?.message || 'Pack no encontrado');

  return { pack, boletas: boletas || [] };
}


// ==========================================
// Módulo: SORTEOS Y PREMIACIÓN
// ==========================================
export async function getPremiosConSorteo(campanaId: string) {
  try {
    // Atomic Join: Premios + Sorteos (Para evitar errores 500 de PostgREST)
    const [resPremios, resSorteos] = await Promise.all([
      supabaseAdmin.from('premios').select('*').eq('campana_id', campanaId).order('created_at', { ascending: false }),
      supabaseAdmin.from('sorteos').select('*'),
    ]);

    if (resPremios.error) throw resPremios.error;

    // Unir en memoria
    const mapped = (resPremios.data || []).map(p => ({
        ...p,
        sorteos: (resSorteos.data || []).filter(s => s.premio_id === p.id)
    }));

    return mapped;
  } catch (error: any) {
    console.error('Error en getPremiosConSorteo:', error);
    return [];
  }
}

export async function upsertSorteo(payload: { id?: string, premio_id: string, fecha_sorteo: string, estado: string }) {
  try {
    const { id, ...data } = payload;
    let res;
    if (id) {
       res = await supabaseAdmin.from('sorteos').update(data).eq('id', id);
    } else {
       res = await supabaseAdmin.from('sorteos').insert(data);
    }
    if (res.error) throw res.error;
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function cerrarSorteoAction(adminId: string, campanaId: string, premioId?: string) {
  try {
    // 1. Auditar cuántas boletas pasarán a estado 4 (Sorteado) — solo las del premio indicado
    let countQuery = supabaseAdmin
      .from('boletas')
      .select('*', { count: 'exact', head: true })
      .eq('campana_id', campanaId)
      .eq('estado', 2)
      .eq('es_prueba', false);
    if (premioId) countQuery = countQuery.eq('premio_seleccionado', premioId);

    const { count, error: cError } = await countQuery;
    if (cError) throw cError;

    // 2. Actualización masiva filtrada por premio
    let updateQuery = supabaseAdmin
      .from('boletas')
      .update({ estado: 4, updated_at: new Date().toISOString() })
      .eq('campana_id', campanaId)
      .eq('estado', 2)
      .eq('es_prueba', false);
    if (premioId) updateQuery = updateQuery.eq('premio_seleccionado', premioId);

    const { error: uError } = await updateQuery;
    if (uError) throw uError;

    // 3. Marcar el sorteo asociado como finalizado
    if (premioId) {
      await supabaseAdmin
        .from('sorteos')
        .update({ estado: 'finalizado', updated_at: new Date().toISOString() })
        .eq('premio_id', premioId)
        .eq('estado', 'programado');
    }

    return { success: true, count: count || 0 };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getDashboardCounts(distribuidorId?: string) {
  const soloReales = { es_prueba: false as const };
  let baseQuery = supabaseAdmin.from('boletas').select('*', { count: 'exact', head: true }).match(soloReales);
  if (distribuidorId) baseQuery = baseQuery.eq('distribuidor_id', distribuidorId);

  const [t, a, r] = await Promise.all([
    baseQuery,
    supabaseAdmin.from('boletas').select('*', { count: 'exact', head: true }).eq('estado', 1).match({ ...soloReales, ...(distribuidorId ? { distribuidor_id: distribuidorId } : {}) }),
    supabaseAdmin.from('boletas').select('*', { count: 'exact', head: true }).eq('estado', 2).match({ ...soloReales, ...(distribuidorId ? { distribuidor_id: distribuidorId } : {}) }),
  ]);

  return {
    total: t.count || 0,
    activas: a.count || 0,
    registradas: r.count || 0
  };
}

export async function getDashboardExtendedCounts(distribuidorId?: string) {
  const distFilter = distribuidorId ? { distribuidor_id: distribuidorId } : {};

  const { data: invsPrueba } = await supabaseAdmin
    .from('invitaciones')
    .select('id')
    .eq('es_prueba', true);
  const idsPrueba = (invsPrueba || []).map((i: any) => i.id);

  let preRegPendientesQuery = supabaseAdmin
    .from('pre_registros')
    .select('*', { count: 'exact', head: true })
    .eq('estado', 'pendiente');
  if (idsPrueba.length > 0) {
    preRegPendientesQuery = preRegPendientesQuery.or(
      `invitacion_id.is.null,invitacion_id.not.in.(${idsPrueba.join(',')})`
    );
  }

  let packsWaQuery = supabaseAdmin
    .from('packs')
    .select('comerciante_whatsapp, comerciante_identificacion')
    .eq('es_prueba', false);
  if (distribuidorId) packsWaQuery = packsWaQuery.eq('distribuidor_id', distribuidorId);

  let invsWaQuery = supabaseAdmin
    .from('invitaciones')
    .select('comerciante_whatsapp')
    .eq('es_prueba', false);
  if (distribuidorId) invsWaQuery = invsWaQuery.eq('distribuidor_id', distribuidorId);

  const [
    packs, packsPendientes,
    invitaciones, invAceptadas, invPendientes, invRechazadas, asistencias,
    preRegistros,
    personal,
    packsWa, invsWa, preRegWa,
  ] = await Promise.all([
    supabaseAdmin.from('packs').select('*', { count: 'exact', head: true }).eq('es_prueba', false).match(distFilter),
    supabaseAdmin.from('packs').select('*', { count: 'exact', head: true }).eq('es_prueba', false).eq('estado_pago', 'pendiente').match(distFilter),
    supabaseAdmin.from('invitaciones').select('*', { count: 'exact', head: true }).eq('es_prueba', false).match(distFilter),
    supabaseAdmin.from('invitaciones').select('*', { count: 'exact', head: true }).eq('es_prueba', false).eq('estado', 'aceptada').match(distFilter),
    supabaseAdmin.from('invitaciones').select('*', { count: 'exact', head: true }).eq('es_prueba', false).eq('estado', 'pendiente').match(distFilter),
    supabaseAdmin.from('invitaciones').select('*', { count: 'exact', head: true }).eq('es_prueba', false).eq('estado', 'rechazada').match(distFilter),
    supabaseAdmin.from('invitaciones').select('*', { count: 'exact', head: true }).eq('es_prueba', false).not('qr_escaneado_at', 'is', null).match(distFilter),
    preRegPendientesQuery,
    supabaseAdmin.from('perfiles').select('*', { count: 'exact', head: true }).in('rol', ['distribuidor', 'asistente']),
    packsWaQuery,
    invsWaQuery,
    distribuidorId
      ? Promise.resolve({ data: [] as any[] })
      : supabaseAdmin.from('pre_registros').select('whatsapp, identificacion'),
  ]);

  const comerciantesSet = new Set<string>();
  const addKey = (wa: string | null | undefined, id: string | null | undefined) => {
    if (wa && wa.trim()) comerciantesSet.add(`wa:${wa.trim()}`);
    else if (id && id.trim()) comerciantesSet.add(`id:${id.trim()}`);
  };
  for (const p of ((packsWa as any).data || []) as any[]) addKey(p.comerciante_whatsapp, p.comerciante_identificacion);
  for (const i of ((invsWa as any).data || []) as any[]) addKey(i.comerciante_whatsapp, null);
  for (const pr of ((preRegWa as any).data || []) as any[]) addKey(pr.whatsapp, pr.identificacion);

  return {
    totalPacks: packs.count || 0,
    packsPendientes: packsPendientes.count || 0,
    totalInvitaciones: invitaciones.count || 0,
    invAceptadas: invAceptadas.count || 0,
    invPendientes: invPendientes.count || 0,
    invRechazadas: invRechazadas.count || 0,
    asistencias: asistencias.count || 0,
    preRegistrosPendientes: preRegistros.count || 0,
    personalActivo: personal.count || 0,
    comerciantesCount: comerciantesSet.size,
  };
}
