'use server';

import { supabaseAdmin } from './supabaseAdmin';

// ==========================================
// Módulo: BOLETAS (Estabilización Misión)
// ==========================================
export async function getBoletasPaged(page: number, limit: number, query: string, range?: { desde?: number, hasta?: number }, distribuidorId?: string) {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // Consulta 1: Boletas con relaciones estables (perfiles, premios)
  // Usamos el set de tablas confirmado por el usuario: boletas, perfiles, premios, zonas.
  let queryBuilder = supabaseAdmin.from('boletas').select(`
    *, 
    premios(nombre_premio), 
    distribuidor:perfiles!distribuidor_id(nombre), 
    despachador:perfiles!asignado_por(nombre)
  `, { count: 'exact' });

  if (distribuidorId) {
    queryBuilder = queryBuilder.eq('distribuidor_id', distribuidorId);
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
      const paddedId = query.padStart(6, '0');
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

  // Mapeo Resiliente: Usar zona_destino_id con fallback a zona_id
  const mappedData = (data || []).map(b => ({
      ...b,
      zonas: { 
          nombre: zonasMap[b.zona_destino_id || b.zona_id || ''] || 'BODEGA / SIN ZONA' 
      }
  }));

  return {
    data: mappedData,
    total: count || 0,
    totalPages: count ? Math.ceil(count / limit) : 0
  };
}

// ── Auditoría por Lote Logístico ──────────────────────────────────────────
export async function getLotesLogisticos() {
  const { data, error } = await supabaseAdmin
    .from('lotes_logisticos')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
}

export async function getInventarioDistribuidorAction(distId: string) {
  try {
    // Usamos las tablas reales confirmadas: lotes_logisticos y trazabilidad_geografica
    const { data: resumen, error: rError } = await supabaseAdmin.rpc('get_resumen_inventario_distribuidor', { p_dist_id: distId });
    if (rError) throw rError;

    const { data: lotes, error: lError } = await supabaseAdmin.rpc('get_lotes_distribuidor', { p_dist_id: distId });
    if (lError) throw lError;

    const { data: frentes, error: fError } = await supabaseAdmin.rpc('get_resumen_multizona', { p_dist_id: distId });
    if (fError) throw fError;

    return { 
      success: true, 
      resumen: resumen?.[0] || { total_asignado: 0, total_activado: 0, total_registrado: 0, p_conversion: 0 }, 
      lotes: lotes || [],
      frentes: frentes || []
    };
  } catch (error: any) {
    return { success: false, error: error.message };
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

    if (curr.estado === 2) acc[zonaName].activadas++;
    if (curr.estado === 3) acc[zonaName].registradas++;

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

export async function getVentasPaged(page: number, limit: number, query: string) {
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  let queryBuilder = supabaseAdmin.from('ventas_clientes').select('*, boleta:boletas(token_integridad), distribuidor:perfiles(nombre)', { count: 'exact' });
  if (query) queryBuilder = queryBuilder.or(`cliente_id.ilike.%${query}%,cliente_nombre.ilike.%${query}%`);
  const { data, count, error } = await queryBuilder.order('created_at', { ascending: false }).range(from, to);
  if (error) throw error;
  return { data, total: count || 0, totalPages: count ? Math.ceil(count / limit) : 0 };
}

// ==========================================
// Módulo: BODEGA (Ingreso de Lotes)
// ==========================================
export async function verificarRangoBodegaAction(inicio: number, fin: number) {
  try {
    const { count, error } = await supabaseAdmin
      .from('boletas')
      .select('id_boleta', { count: 'exact', head: true })
      .gte('id_boleta', inicio)
      .lte('id_boleta', fin);
    
    if (error) throw error;
    return { success: true, count: count || 0 };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function crearLoteBodegaAction(inicio: number, fin: number, campanaId: string) {
  try {
    const boletas = [];
    for (let i = inicio; i <= fin; i++) {
        const paddedId = String(i).padStart(6, '0');
        boletas.push({
            id_boleta: i,
            campana_id: campanaId,
            estado: 0, // En Bodega
            token_integridad: `TKN-${paddedId}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });
    }

    // Usamos upsert para ser resilientes si el usuario confirma saltar existentes
    const { error } = await supabaseAdmin
        .from('boletas')
        .upsert(boletas, { onConflict: 'id_boleta' });

    if (error) throw error;
    return { success: true, count: boletas.length };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
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

export async function cerrarSorteoAction(adminId: string, campanaId: string) {
  try {
    // 1. Auditamos cuántas boletas pasarán a Estado 5
    const { count, error: cError } = await supabaseAdmin
      .from('boletas')
      .select('*', { count: 'exact', head: true })
      .eq('campana_id', campanaId)
      .eq('estado', 3); // Registradas
    
    if (cError) throw cError;

    // 2. Ejecutar actualización masiva
    const { error: uError } = await supabaseAdmin
      .from('boletas')
      .update({ estado: 5, updated_at: new Date().toISOString() })
      .eq('campana_id', campanaId)
      .eq('estado', 3);
    
    if (uError) throw uError;

    return { success: true, count: count || 0 };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getDashboardCounts(distribuidorId?: string) {
  let baseQuery = supabaseAdmin.from('boletas').select('*', { count: 'exact', head: true });
  if (distribuidorId) baseQuery = baseQuery.eq('distribuidor_id', distribuidorId);

  const [t, a, r] = await Promise.all([
    baseQuery,
    supabaseAdmin.from('boletas').select('*', { count: 'exact', head: true }).eq('estado', 2).match(distribuidorId ? { distribuidor_id: distribuidorId } : {}),
    supabaseAdmin.from('boletas').select('*', { count: 'exact', head: true }).eq('estado', 3).match(distribuidorId ? { distribuidor_id: distribuidorId } : {}),
  ]);

  return {
    total: t.count || 0,
    activas: a.count || 0,
    registradas: r.count || 0
  };
}
