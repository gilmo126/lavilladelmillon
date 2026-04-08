-- ==========================================================
-- COMBO LOGÍSTICO: MOTOR DE INVENTARIO PARA PERSONAL
-- ==========================================================
-- Ejecutar este bloque completo en el SQL Editor de Supabase.

-- 1. RESUMEN GLOBAL (Cabecera del Dashboard)
CREATE OR REPLACE FUNCTION public.get_resumen_inventario_distribuidor(p_dist_id UUID)
RETURNS TABLE (
    total_asignado BIGINT,
    total_activado BIGINT,
    total_registrado BIGINT,
    p_conversion NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_asignado,
        COUNT(*) FILTER (WHERE estado >= 2)::BIGINT as total_activado,
        COUNT(*) FILTER (WHERE estado >= 3)::BIGINT as total_registrado,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                ROUND((COUNT(*) FILTER (WHERE estado >= 3)::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
            ELSE 0 
        END as p_conversion
    FROM public.boletas
    WHERE distribuidor_id = p_dist_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. RESUMEN POR FRENTES (Zonas asignadas)
CREATE OR REPLACE FUNCTION public.get_resumen_multizona(p_dist_id UUID)
RETURNS TABLE (
    zona_nombre VARCHAR,
    total_asignado BIGINT,
    total_activado BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(z.nombre, 'BODEGA / SIN ZONA') as zona_nombre,
        COUNT(*)::BIGINT as total_asignado,
        COUNT(*) FILTER (WHERE b.estado >= 2)::BIGINT as total_activado
    FROM public.boletas b
    LEFT JOIN public.zonas z ON b.zona_destino_id = z.id
    WHERE b.distribuidor_id = p_dist_id
    GROUP BY z.nombre;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. HISTORIAL DE LOTES (Detalle técnico y progreso)
CREATE OR REPLACE FUNCTION public.get_lotes_distribuidor(p_dist_id UUID)
RETURNS TABLE (
    rango_inicio BIGINT,
    rango_fin BIGINT,
    cantidad BIGINT,
    activadas BIGINT,
    fecha_asignacion TIMESTAMPTZ,
    zona_nombre VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        MIN(b.id_boleta) as rango_inicio,
        MAX(b.id_boleta) as rango_fin,
        COUNT(*)::BIGINT as cantidad,
        COUNT(*) FILTER (WHERE b.estado >= 2)::BIGINT as activadas,
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

-- RECARGA DE CACHÉ
NOTIFY pgrst, 'reload schema';
