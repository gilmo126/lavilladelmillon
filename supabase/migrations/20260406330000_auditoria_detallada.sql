-- =====================================================================
-- Migración: Auditoría Detallada e Información Bajo Demanda
-- =====================================================================

-- 1. Evolución de la Tabla Boletas: Responsable de Origen
ALTER TABLE public.boletas ADD COLUMN IF NOT EXISTS asignado_por UUID REFERENCES public.perfiles(id);

-- 2. Actualizar Función Auditora: Sincronizar Asignado Por
CREATE OR REPLACE FUNCTION auditar_estado_boleta_v2()
RETURNS TRIGGER AS $$
DECLARE
    v_zona_id UUID;
    v_ubicacion_text VARCHAR;
BEGIN
    -- [MÁQUINA DE ESTADOS ORIGINAL]
    IF OLD.estado IN (4, 5) AND NEW.estado != OLD.estado THEN
        RAISE EXCEPTION 'BLOQUEO DE SEGURIDAD: Boleta % ya está en estado final.', OLD.id_boleta;
    END IF;

    -- Si se asigna un distribuidor (Paso a Estado 1), capturar quién lo hizo
    -- Nota: asignar_lote_boletas ya setea asignado_por, pero por si acaso lo reforzamos.
    
    -- [TRAZABILIDAD GEOGRÁFICA]
    IF (NEW.estado != OLD.estado) OR (OLD.estado IS NULL) THEN
        CASE NEW.estado
            WHEN 0 THEN v_ubicacion_text := 'Bodega Central Palmira';
            WHEN 1 THEN v_ubicacion_text := 'En Tránsito (Distribuidor)';
            WHEN 2 THEN v_ubicacion_text := COALESCE(NEW.comercio_nombre, 'Punto de Venta');
            WHEN 3 THEN v_ubicacion_text := 'Registrada por Cliente';
            WHEN 4 THEN v_ubicacion_text := 'Anulada Administrativamente';
            WHEN 5 THEN v_ubicacion_text := 'Participó en Sorteo';
            ELSE v_ubicacion_text := 'Trazabilidad Interna';
        END CASE;

        INSERT INTO public.trazabilidad_geografica (
            boleta_id, estado_destino, ubicacion_nombre, zona_id, distribuidor_id, ip_evento
        ) VALUES (
            NEW.id_boleta, NEW.estado, v_ubicacion_text, 
            COALESCE(NEW.zona_id, (SELECT zona_id FROM perfiles WHERE id = NEW.distribuidor_id)),
            NEW.distribuidor_id, NEW.ip_registro
        );
    END IF;

    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. RPC para Resumen de Inventario por Distribuidor
CREATE OR REPLACE FUNCTION get_resumen_inventario_distribuidor(p_dist_id UUID)
RETURNS TABLE (
    total_asignado BIGINT,
    total_activado BIGINT,
    total_registrado BIGINT,
    p_conversion NUMERIC
) AS $$
BEGIN
    RETURN QUERY 
    SELECT 
        COUNT(*) as total_asignado,
        COUNT(*) FILTER (WHERE estado >= 2) as total_activado,
        COUNT(*) FILTER (WHERE estado >= 3) as total_registrado,
        CASE 
            WHEN COUNT(*) FILTER (WHERE estado >= 2) = 0 THEN 0.0
            ELSE ROUND((COUNT(*) FILTER (WHERE estado >= 3)::NUMERIC / COUNT(*) FILTER (WHERE estado >= 2)::NUMERIC) * 100, 1)
        END as p_conversion
    FROM public.boletas
    WHERE distribuidor_id = p_dist_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RPC para Agrupación de Lotes (Rangos)
CREATE OR REPLACE FUNCTION get_lotes_distribuidor(p_dist_id UUID)
RETURNS TABLE (
    rango_inicio BIGINT,
    rango_fin BIGINT,
    cantidad BIGINT,
    fecha_asignacion TIMESTAMPTZ
) AS $$
BEGIN
    -- Agrupamos trazabilidad por saltos de ID o tiempo similar
    -- Para este demo, usaremos una lógica de islas y huecos simplificada
    RETURN QUERY
    WITH diffs AS (
        SELECT 
            boleta_id,
            fecha_evento,
            boleta_id - ROW_NUMBER() OVER (ORDER BY boleta_id) as grp
        FROM public.trazabilidad_geografica
        WHERE distribuidor_id = p_dist_id AND estado_destino = 1
    )
    SELECT 
        MIN(boleta_id) as rango_inicio,
        MAX(boleta_id) as rango_fin,
        COUNT(*) as cantidad,
        MIN(fecha_evento) as fecha_asignacion
    FROM diffs
    GROUP BY grp
    ORDER BY fecha_asignacion DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
