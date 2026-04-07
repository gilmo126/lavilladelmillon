-- =====================================================================
-- Migración: Blindaje de Inventario y Validación en Tiempo Real
-- =====================================================================

-- 1. Función para validar disponibilidad de un rango (Auditada)
CREATE OR REPLACE FUNCTION validar_rango_boletas(p_inicio BIGINT, p_fin BIGINT)
RETURNS TABLE (
    total_solicitado BIGINT,
    disponibles_en_rango BIGINT,
    no_aptas BIGINT,
    es_valido BOOLEAN
) AS $$
DECLARE
    v_total BIGINT;
    v_disp BIGINT;
BEGIN
    -- Validar rangos básicos
    IF p_inicio > p_fin THEN
        v_total := 0;
        v_disp := 0;
    ELSE
        v_total := (p_fin - p_inicio) + 1;
        
        -- Contar boletas que están físicamente en bodega (0) y sin dueño
        SELECT COUNT(*) INTO v_disp
        FROM public.boletas
        WHERE id_boleta BETWEEN p_inicio AND p_fin
          AND estado = 0
          AND distribuidor_id IS NULL;
    END IF;

    RETURN QUERY SELECT 
        v_total, 
        v_disp, 
        (v_total - v_disp) as no_aptas,
        (v_total > 0 AND v_total = v_disp) as es_valido;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Función para sugerir el próximo bloque disponible
CREATE OR REPLACE FUNCTION sugerir_proximo_lote(p_tamano INTEGER DEFAULT 100)
RETURNS TABLE (
    sugerido_inicio BIGINT,
    sugerido_fin BIGINT
) AS $$
DECLARE
    v_inicio BIGINT;
BEGIN
    -- Encontrar el ID de boleta más bajo que aún esté en bodega y libre
    SELECT id_boleta INTO v_inicio
    FROM public.boletas
    WHERE estado = 0 AND distribuidor_id IS NULL
    ORDER BY id_boleta ASC
    LIMIT 1;

    IF v_inicio IS NOT NULL THEN
        -- Sugerir un bloque del tamaño solicitado (default 100)
        RETURN QUERY SELECT v_inicio, v_inicio + p_tamano - 1;
    ELSE
        RETURN QUERY SELECT NULL::BIGINT, NULL::BIGINT;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Comentario de Auditoría
COMMENT ON FUNCTION validar_rango_boletas IS 'Verifica disponibilidad física de boletas en bodega antes de asignar.';
COMMENT ON FUNCTION sugerir_proximo_lote IS 'Busca el primer hueco virgen en el inventario para sugerir al operador.';
