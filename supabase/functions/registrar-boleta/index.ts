import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { token, identificacion, nombre, celular, premioId, aceptaTerminos, territorioId, ubicacionManual } = await req.json();

    if (!token || !aceptaTerminos || !territorioId) {
      throw new Error("Faltan parámetros críticos (Token, Aceptación Legal o Ubicación).");
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. NORMALIZACIÓN ESTRICTA (6 Dígitos)
    let tokenLimpio = token.toString().replace(/\s+/g, '').toUpperCase();
    const numericPart = tokenLimpio.replace('TKN-', '');
    if (/^\d+$/.test(numericPart)) {
      tokenLimpio = `TKN-${numericPart.padStart(6, '0')}`;
    } else if (!tokenLimpio.startsWith('TKN-')) {
      tokenLimpio = `TKN-${tokenLimpio}`;
    }

    // 2. DIAGNÓSTICO: Buscar la boleta
    const { data: boletaExistente, error: searchError } = await supabaseClient
      .from('boletas')
      .select('id_boleta, estado, token_integridad')
      .eq('token_integridad', tokenLimpio)
      .maybeSingle();

    if (searchError) throw searchError;

    // MENSAJE DE SEGURIDAD GENÉRICO (Misión previa)
    const genericError = "Boleta no disponible para registro. Verifica el número o contacta a soporte.";

    if (!boletaExistente) {
      throw new Error(genericError);
    }

    // 3. VALIDAR ESTADO 5 (Sorteo Pasado) - Mensaje Específico solicitado ahora
    if (boletaExistente.estado === 5) {
      throw new Error("Esta boleta ya participó en un sorteo previo y no es válida para esta fecha.");
    }

    if (boletaExistente.estado === 3) {
      throw new Error(genericError);
    }

    if (boletaExistente.estado < 2) {
      throw new Error(genericError);
    }

    if (boletaExistente.estado === 4) {
      throw new Error(genericError);
    }

    // 4. VALIDAR VIGENCIA DEL SORTEO
    const { data: sorteo, error: sorteoError } = await supabaseClient
      .from('sorteos')
      .select('fecha_sorteo, estado')
      .eq('premio_id', premioId)
      .eq('estado', 'programado')
      .maybeSingle();

    if (sorteoError) throw sorteoError;

    if (!sorteo) {
      throw new Error("El sorteo para este premio ya finalizó o no está programado.");
    }

    const now = new Date();
    const fechaSorteo = new Date(sorteo.fecha_sorteo);

    if (now > fechaSorteo) {
      throw new Error("El tiempo de registro para este sorteo ha expirado.");
    }

    // 5. ACTUALIZACIÓN (Ahora incluye Ubicación del Cliente)
    const { data: updatedData, error: updateError } = await supabaseClient
      .from('boletas')
      .update({
        estado: 3, // REGISTRADA
        identificacion_usuario: identificacion,
        nombre_usuario: nombre,
        celular_usuario: celular,
        premio_seleccionado: premioId,
        acepta_terminos: aceptaTerminos,
        fecha_aceptacion_terminos: new Date().toISOString(),
        version_terminos: 'v1.0-abril-2026',
        ubicacion_cliente_id: territorioId,
        ubicacion_manual: ubicacionManual,
        ip_registro: req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for') // Captura de IP para auditoría de fraude
      })
      .eq('id_boleta', boletaExistente.id_boleta)
      .select();

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ success: true, message: "¡Boleta registrada! Ya estás participando.", boleta: updatedData[0] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }
});
