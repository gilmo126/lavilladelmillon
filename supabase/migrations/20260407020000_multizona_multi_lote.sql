-- =====================================================================
-- Migración: Arquitectura Multizona y Multi-lote (N:N y Trazabilidad)
-- =====================================================================

-- 1. Tabla Intermedia: Perfil - Zonas (Muchos a Muchos)
CREATE TABLE IF NOT EXISTS public.perfil_zonas (
    perfil_id UUID REFERENCES public.perfiles(id) ON DELETE CASCADE,
    zona_id UUID REFERENCES public.zonas(id) ON DELETE CASCADE,
    PRIMARY KEY (perfil_id, zona_id)
);

-- 2. Evolución de Boletas: Trazabilidad por Destino Específico
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'boletas' AND column_name = 'zona_destino_id'
    ) THEN
        ALTER TABLE public.boletas ADD COLUMN zona_destino_id UUID REFERENCES public.zonas(id);
    END IF;
END $$;

-- 3. Migración de Datos (Legacy to Modern)
-- Mover la zona_id actual de perfiles a la nueva tabla perfil_zonas
INSERT INTO public.perfil_zonas (perfil_id, zona_id)
SELECT id, zona_id FROM public.perfiles 
WHERE zona_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 4. Actualizar asignar_lote_boletas para registrar Zona de Destino
CREATE OR REPLACE FUNCTION asignar_lote_boletas(
    p_admin_id UUID, 
    p_dist_id UUID, 
    p_rango_inicio BIGINT, 
    p_rango_fin BIGINT,
    p_zona_id UUID -- Nueva variable obligatoria
)
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
        asignado_por = p_admin_id,
        zona_destino_id = p_zona_id -- Registrar destino estratégico
    WHERE id_boleta BETWEEN p_rango_inicio AND p_rango_fin
      AND estado = 0;

    GET DIAGNOSTICS filas_afectadas = ROW_COUNT;
    RETURN filas_afectadas;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Actualizar activar_boleta_comercio para usar la Zona de Destino
CREATE OR REPLACE FUNCTION activar_boleta_comercio(p_dist_id UUID, p_boleta_id BIGINT, p_nombre_comercio VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    filas_afectadas INTEGER;
    v_zona_nombre VARCHAR;
BEGIN
    -- Priorizar la zona de destino grabada en la boleta; fallback a la primera zona del perfil
    SELECT z.nombre INTO v_zona_nombre 
    FROM public.boletas b
    JOIN public.zonas z ON b.zona_destino_id = z.id
    WHERE b.id_boleta = p_boleta_id 
    LIMIT 1;

    -- Si no hay zona_destino (legacy), buscar herencia del perfil
    IF v_zona_nombre IS NULL THEN
        SELECT z.nombre INTO v_zona_nombre 
        FROM public.perfil_zonas pz
        JOIN public.zonas z ON pz.zona_id = z.id
        WHERE pz.perfil_id = p_dist_id 
        LIMIT 1;
    END IF;

    UPDATE public.boletas 
    SET 
        estado = 2,
        comercio_nombre = p_nombre_comercio,
        zona_comercio = v_zona_nombre
    WHERE id_boleta = p_boleta_id
      AND distribuidor_id = p_dist_id
      AND estado = 1;

    GET DIAGNOSTICS filas_afectadas = ROW_COUNT;
    
    IF filas_afectadas = 0 THEN
        RAISE EXCEPTION 'No se pudo activar la boleta. Verifique que no haya sido activada ya, o que usted sea su propietario.';
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE public.perfil_zonas IS 'Relación N:N para permitir que agentes cubran múltiples zonas territoriales.';
COMMENT ON COLUMN public.boletas.zona_destino_id IS 'ID de la zona específica para la cual se despachó este lote físico.';

-- 6. Consultas de Auditoría Multizona
CREATE OR REPLACE FUNCTION get_lotes_distribuidor(p_dist_id UUID)
RETURNS TABLE (
    rango_inicio BIGINT,
    rango_fin BIGINT,
    cantidad BIGINT,
    fecha_asignacion TIMESTAMPTZ,
    zona_nombre VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        MIN(b.id_boleta) as rango_inicio,
        MAX(b.id_boleta) as rango_fin,
        COUNT(*)::BIGINT as cantidad,
        MIN(b.updated_at) as fecha_asignacion,
        z.nombre as zona_nombre
    FROM public.boletas b
    LEFT JOIN public.zonas z ON b.zona_destino_id = z.id
    WHERE b.distribuidor_id = p_dist_id
      AND b.estado >= 1
    GROUP BY b.distribuidor_id, b.zona_destino_id, z.nombre, b.asignado_por, date_trunc('minute', b.updated_at)
    ORDER BY fecha_asignacion DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_resumen_multizona(p_dist_id UUID)
RETURNS TABLE (
    zona_nombre VARCHAR,
    total_asignado BIGINT,
    total_activado BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        z.nombre as zona_nombre,
        COUNT(*)::BIGINT as total_asignado,
        COUNT(*) FILTER (WHERE b.estado >= 2)::BIGINT as total_activado
    FROM public.boletas b
    JOIN public.zonas z ON b.zona_destino_id = z.id
    WHERE b.distribuidor_id = p_dist_id
    GROUP BY z.nombre;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
