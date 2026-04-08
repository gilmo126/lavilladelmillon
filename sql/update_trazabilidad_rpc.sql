-- ==========================================================
-- SUPER-BUSCADOR DE TRAZABILIDAD (VERSIÓN 3.0)
-- Búsqueda por ID, Token, Cédula, Distribuidor o Comercio
-- ==========================================================

CREATE OR REPLACE FUNCTION public.buscar_trazabilidad(p_query TEXT)
RETURNS TABLE (
  id_boleta             BIGINT,
  token_boleta          TEXT,
  estado                SMALLINT,
  estado_label          TEXT,
  asignado_por_nombre   TEXT,
  asignado_por_rol      TEXT,
  distribuidor_nombre   TEXT,
  distribuidor_zona     TEXT,
  distribuidor_movil    TEXT,
  comercio_nombre       TEXT,
  zona_comercio         TEXT,
  fecha_despacho       TIMESTAMPTZ,
  fecha_activacion      TIMESTAMPTZ,
  nombre_cliente        TEXT,
  cedula_cliente        TEXT,
  telefono_cliente      TEXT,
  fecha_registro        TIMESTAMPTZ,
  premio_nombre         TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id_boleta,
    ('TKN-' || LPAD(b.id_boleta::TEXT, 6, '0'))::TEXT AS token_boleta,
    b.estado::SMALLINT,
    CASE b.estado
      WHEN 0 THEN '📦 Bodega Central'
      WHEN 1 THEN '🚚 Despachada'
      WHEN 2 THEN '🏪 Activa en Comercio'
      WHEN 3 THEN '✅ Registrada'
      WHEN 4 THEN '❌ Anulada / Fraude'
      ELSE '❓ Desconocido'
    END::TEXT AS estado_label,
    pa.nombre::TEXT AS asignado_por_nombre,
    pa.rol::TEXT AS asignado_por_rol,
    pd.nombre::TEXT AS distribuidor_nombre,
    z.nombre::TEXT AS distribuidor_zona,
    pd.movil::TEXT AS distribuidor_movil,
    b.comercio_nombre::TEXT AS comercio_nombre,
    b.zona_comercio::TEXT AS zona_comercio,
    b.fecha_despacho,
    b.fecha_activacion,
    b.nombre_usuario::TEXT AS nombre_cliente,
    b.identificacion_usuario::TEXT AS cedula_cliente,
    b.celular_usuario::TEXT AS telefono_cliente,
    b.fecha_registro,
    pr.nombre_premio::TEXT AS premio_nombre
  FROM public.boletas b
  LEFT JOIN public.perfiles pa ON b.asignado_por = pa.id
  LEFT JOIN public.perfiles pd ON b.distribuidor_id = pd.id
  LEFT JOIN public.zonas z ON b.zona_destino_id = z.id
  LEFT JOIN public.premios pr ON b.premio_seleccionado = pr.id
  WHERE
    -- Búsqueda Universal (Potenciada)
    b.id_boleta::TEXT ILIKE '%' || p_query || '%'
    OR b.token_integridad ILIKE '%' || p_query || '%'
    OR b.identificacion_usuario ILIKE '%' || p_query || '%'
    OR pd.nombre ILIKE '%' || p_query || '%'
    OR b.comercio_nombre ILIKE '%' || p_query || '%'
  ORDER BY b.id_boleta ASC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- REFRESCAR ESQUEMA
NOTIFY pgrst, 'reload schema';
