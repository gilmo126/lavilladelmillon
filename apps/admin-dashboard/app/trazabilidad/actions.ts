'use server';

import { createClient } from '../../utils/supabase/server';
import { supabaseAdmin } from '../../lib/supabaseAdmin';

export async function buscarTrazabilidadAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Sesión no válida.', results: [] };

  const { data: me } = await supabaseAdmin.from('perfiles').select('id, rol, nombre').eq('id', user.id).single();
  if (!me || !['admin', 'distribuidor'].includes(me.rol)) {
    return { success: false, error: 'Acceso denegado.', results: [] };
  }

  const query = (formData.get('query') as string || '').trim();
  if (!query || (me.rol !== 'distribuidor' && query.length < 1)) {
    return { success: false, error: 'Ingrese un criterio válido.', results: [] };
  }

  const { data, error } = await supabase.rpc('buscar_trazabilidad', { 
    p_query: query,
    p_user_id: user.id 
  });

  if (error) return { success: false, error: error.message, results: [] };

  return { success: true, results: data || [] };
}
