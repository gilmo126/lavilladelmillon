-- =====================================================================
-- Migración: Auditoría de Personal y Trazabilidad Completa
-- =====================================================================

-- 1. Agregar campo de trazabilidad de quién despachó la boleta
ALTER TABLE public.boletas
  ADD COLUMN IF NOT EXISTS asignado_por UUID REFERENCES public.perfiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_boletas_asignado_por ON public.boletas(asignado_por);
CREATE INDEX IF NOT EXISTS idx_boletas_distribuidor ON public.boletas(distribuidor_id);

-- 2. RLS: Permitir lectura de boletas para usuarios autenticados con rol admin/operativo
--    (La policy original bloquea todo con USING(false); la reemplazamos con una más inteligente)
DROP POLICY IF EXISTS "Boletas bloqueadas a lectura anonima" ON public.boletas;

CREATE POLICY "Lectura de boletas para personal autorizado"
ON public.boletas FOR SELECT USING (
  auth.role() = 'authenticated' AND (
    EXISTS (
      SELECT 1 FROM public.perfiles
      WHERE id = auth.uid() AND rol IN ('admin', 'operativo')
    )
    OR distribuidor_id = auth.uid()
  )
);

CREATE POLICY "Escritura controlada por Service Role y RPC"
ON public.boletas FOR ALL USING (auth.role() = 'service_role');

-- 3. RPC Buscador de Trazabilidad Completa
-- Acepta: número de boleta (ej. "5005") o cédula del cliente (ej. "1144000111")
CREATE OR REPLACE FUNCTION buscar_trazabilidad(p_query TEXT)
RETURNS TABLE (
  id_boleta             BIGINT,
  token_boleta          TEXT,
  estado                SMALLINT,
  estado_label          TEXT,
  -- Quién despachó
  asignado_por_nombre   TEXT,
  asignado_por_rol      TEXT,
  -- Distribuidor
  distribuidor_nombre   TEXT,
  distribuidor_zona     TEXT,
  distribuidor_movil    TEXT,
  -- Comercio
  comercio_nombre       TEXT,
  zona_comercio         TEXT,
  fecha_despacho       TIMESTAMPTZ,
  fecha_activacion      TIMESTAMPTZ,
  -- Cliente final (Landing)
  nombre_cliente        TEXT,
  cedula_cliente        TEXT,
  telefono_cliente      TEXT,
  fecha_registro        TIMESTAMPTZ,
  -- Premio
  premio_nombre         TEXT
) AS $$
DECLARE
  v_is_boleta BOOLEAN;
  v_boleta_id BIGINT;
BEGIN
  -- Determinar si la búsqueda es un número (boleta) o texto (cédula)
  v_is_boleta := (p_query ~ '^\d+$');

  IF v_is_boleta THEN
    v_boleta_id := p_query::BIGINT;
  END IF;

  RETURN QUERY
  SELECT
    b.id_boleta,
    ('TKN-' || LPAD(b.id_boleta::TEXT, 6, '0'))::TEXT AS token_boleta,
    b.estado::SMALLINT,
    CASE b.estado
      WHEN 0 THEN '📦 Bodega'
      WHEN 1 THEN '🚚 Despachada al Distribuidor'
      WHEN 2 THEN '🏪 Activa en Comercio'
      WHEN 3 THEN '✅ Registrada por Cliente'
      WHEN 4 THEN '❌ Anulada / Fraude'
      ELSE '❓ Desconocido'
    END::TEXT AS estado_label,
    -- Quién despachó
    pa.nombre::TEXT AS asignado_por_nombre,
    pa.rol::TEXT AS asignado_por_rol,
    -- Distribuidor
    pd.nombre::TEXT AS distribuidor_nombre,
    z.nombre::TEXT AS distribuidor_zona,
    pd.movil::TEXT AS distribuidor_movil,
    -- Comercio
    b.comercio_nombre::TEXT AS comercio_nombre,
    b.zona_comercio::TEXT AS zona_comercio,
    b.fecha_despacho,
    b.fecha_activacion,
    -- Cliente (campos existentes de la tabla boletas)
    b.nombre_usuario::TEXT AS nombre_cliente,
    b.identificacion_usuario::TEXT AS cedula_cliente,
    b.celular_usuario::TEXT AS telefono_cliente,
    b.fecha_registro,
    -- Premio
    pr.nombre_premio::TEXT AS premio_nombre
  FROM public.boletas b
  LEFT JOIN public.perfiles pa ON b.asignado_por = pa.id
  LEFT JOIN public.perfiles pd ON b.distribuidor_id = pd.id
  LEFT JOIN public.zonas z ON pd.zona_id = z.id
  LEFT JOIN public.premios pr ON b.premio_seleccionado = pr.id
  WHERE
    (v_is_boleta AND (
      b.id_boleta = v_boleta_id 
      OR b.token_integridad = ('TKN-' || LPAD(p_query, 6, '0'))
    ))
    OR
    (NOT v_is_boleta AND (
      b.token_integridad ILIKE '%' || p_query || '%'
      OR b.identificacion_usuario ILIKE '%' || p_query || '%'
    ))
  ORDER BY b.id_boleta
  LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Actualizar asignar_lote_boletas para registrar quién asignó
CREATE OR REPLACE FUNCTION asignar_lote_boletas(p_admin_id UUID, p_dist_id UUID, p_rango_inicio BIGINT, p_rango_fin BIGINT)
RETURNS INTEGER AS $$
DECLARE
    tiene_permiso BOOLEAN;
    filas_afectadas INTEGER;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM public.perfiles 
        WHERE id = p_admin_id AND rol IN ('admin', 'operativo')
    ) INTO tiene_permiso;
    
    IF NOT tiene_permiso THEN
        RAISE EXCEPTION 'SEGURIDAD: Operación denegada. Sin permisos de asignación.';
    END IF;

    UPDATE public.boletas 
    SET 
        estado = 1,
        distribuidor_id = p_dist_id,
        asignado_por = p_admin_id       -- Trazabilidad: registrar quién despachó
    WHERE id_boleta BETWEEN p_rango_inicio AND p_rango_fin
      AND estado = 0;

    GET DIAGNOSTICS filas_afectadas = ROW_COUNT;
    RETURN filas_afectadas;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
