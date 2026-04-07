-- =====================================================================
-- Migración: Módulo de Ingreso Masivo a Bodega
-- =====================================================================

-- RPC para crear lotes de boletas de forma eficiente en el servidor
-- p_inicio y p_fin definen el rango numérico (ej: 1 a 100,000)
CREATE OR REPLACE FUNCTION crear_lote_bodega(
  p_inicio BIGINT, 
  p_fin BIGINT, 
  p_campana_id UUID
)
RETURNS INTEGER AS $$
DECLARE
    filas_creadas INTEGER;
BEGIN
    -- Validación de seguridad básica en los argumentos
    IF p_inicio < 0 OR p_fin <= p_inicio THEN
        RAISE EXCEPTION 'PARÁMETROS INVÁLIDOS: El rango debe ser positivo y el fin mayor al inicio.';
    END IF;

    -- Inserción masiva optimizada: generate_series es órdenes de magnitud más rápido que 
    -- realizar múltiples llamadas individuales desde la API de Edge Functions/Actions.
    INSERT INTO public.boletas (
      id_boleta, 
      token_integridad, 
      campana_id, 
      estado,
      -- Forzamos limpieza de campos logísticos y de cliente por seguridad
      distribuidor_id,
      comercio_nombre,
      identificacion_usuario,
      nombre_usuario,
      celular_usuario,
      habeas_data_aceptado,
      premio_seleccionado,
      fecha_activacion,
      fecha_registro
    )
    SELECT 
        s.val,
        'TKN-' || LPAD(s.val::TEXT, 6, '0'), -- 6 dígitos: 000001
        p_campana_id,
        0, -- Estado Inicial Obligatorio: 0 (Bodega)
        NULL, NULL, NULL, NULL, NULL, FALSE, NULL, NULL, NULL
    FROM generate_series(p_inicio, p_fin) AS s(val)
    ON CONFLICT (id_boleta) DO NOTHING; -- Inserción resiliente: Ignorar existentes
    
    GET DIAGNOSTICS filas_creadas = ROW_COUNT;
    RETURN filas_creadas;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentario de auditoría para el dashboard
COMMENT ON FUNCTION crear_lote_bodega IS 'Genera masivamente boletas en Estado 0 para carga inicial de inventario.';
