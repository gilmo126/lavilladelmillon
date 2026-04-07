-- ── MOTORES LOGÍSTICOS (RPC) ──
-- Misión: Automatización y Control de Bodega

-- 1. VALIDAR RANGO DE BOLETAS
-- Verifica que un bloque esté íntegramente en Bodega (Estado 0)
CREATE OR REPLACE FUNCTION public.validar_rango_boletas(p_inicio integer, p_fin integer)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total integer;
    v_disponibles integer;
    v_no_aptas integer;
    v_es_valido boolean;
BEGIN
    v_total := (p_fin - p_inicio) + 1;
    
    SELECT count(*) INTO v_disponibles
    FROM boletas
    WHERE id_boleta BETWEEN p_inicio AND p_fin
    AND estado = 0;
    
    v_no_aptas := v_total - v_disponibles;
    v_es_valido := (v_no_aptas = 0);
    
    RETURN json_build_object(
        'total_solicitado', v_total,
        'disponibles_en_rango', v_disponibles,
        'no_aptas', v_no_aptas,
        'es_valido', v_es_valido
    );
END;
$$;

-- 2. SUGERIR PRÓXIMO LOTE
-- Encuentra el primer bloque continuo disponible de tamaño X
CREATE OR REPLACE FUNCTION public.sugerir_proximo_lote(p_tamano integer DEFAULT 100)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_inicio integer;
    v_fin integer;
BEGIN
    -- Buscamos el ID inicial más bajo que esté en estado 0
    SELECT min(id_boleta) INTO v_inicio
    FROM boletas
    WHERE estado = 0;
    
    IF v_inicio IS NULL THEN
        RETURN json_build_object('success', false);
    END IF;
    
    v_fin := v_inicio + p_tamano - 1;
    
    RETURN json_build_object(
        'success', true,
        'sugerido_inicio', v_inicio,
        'sugerido_fin', v_fin
    );
END;
$$;

-- 3. ASIGNAR LOTE DE BOLETAS (TRANSACCIONAL)
-- Ejecuta el despacho masivo y registra el lote logístico
CREATE OR REPLACE FUNCTION public.asignar_lote_boletas(
    p_admin_id uuid,
    p_dist_id uuid,
    p_rango_inicio integer,
    p_rango_fin integer,
    p_zona_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_rows_affected integer;
    v_campana_id text;
BEGIN
    -- Obtenemos el ID de campaña de la primera boleta del rango (asumiendo homogeneidad)
    SELECT campana_id INTO v_campana_id
    FROM boletas
    WHERE id_boleta = p_rango_inicio
    LIMIT 1;

    -- A. Actualizar Estado de Boletas (Estado 1: Despachada)
    UPDATE boletas
    SET 
        estado = 1,
        perfil_id = p_dist_id,
        zona_id = p_zona_id,
        updated_at = now()
    WHERE id_boleta BETWEEN p_rango_inicio AND p_rango_fin
    AND estado = 0;
    
    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    
    -- B. Registrar Lote Logístico (Auditoría de Despacho)
    IF v_rows_affected > 0 THEN
        INSERT INTO lotes_logisticos (
            admin_id,
            distribuidor_id,
            rango_inicio,
            rango_fin,
            cantidad,
            estado_lote,
            zona_id,
            campana_id
        ) VALUES (
            p_admin_id,
            p_dist_id,
            p_rango_inicio,
            p_rango_fin,
            v_rows_affected,
            'despachado',
            p_zona_id,
            v_campana_id
        );
    END IF;
    
    RETURN v_rows_affected;
END;
$$;
