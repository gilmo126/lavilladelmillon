'use server';

import { createClient } from '../../utils/supabase/server';

export async function buscarTrazabilidadAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Sesión no válida.', results: [] };

  const { data: me } = await supabase.from('perfiles').select('id, rol, nombre').eq('id', user.id).single();
  if (!me || !['admin', 'operativo', 'distribuidor'].includes(me.rol)) {
    return { success: false, error: 'Acceso denegado.', results: [] };
  }

  const query = (formData.get('query') as string || '').trim();
  if (!query || (me.rol !== 'distribuidor' && query.length < 2)) {
    return { success: false, error: 'Ingrese un criterio válido.', results: [] };
  }

  const { data, error } = await supabase.rpc('buscar_trazabilidad', { p_query: query });
  if (error) return { success: false, error: error.message, results: [] };

  let results = data || [];
  
  // FILTRO ESTRICTO PARA DISTRIBUIDORES
  if (me.rol === 'distribuidor') {
    // El distribuidor solo ve boletas que él mismo tiene o tuvo asignadas
    results = results.filter((r: any) => r.distribuidor_nombre === me.nombre);
  }

  return { success: true, results: data || [] };
}
