-- Módulo Zonas y Migración Relacional de Perfiles

-- 1. Tabla de Catálogo de Zonas
CREATE TABLE public.zonas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(255) UNIQUE NOT NULL,
    descripcion TEXT,
    activa BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Zonas: Solo lectura pública para usuarios autenticados, y gestión de admin real si fuesen a insertarla (desde app)
ALTER TABLE public.zonas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lectura Autenticada Zonas" ON public.zonas FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Gestión Admin Zonas" ON public.zonas 
  FOR ALL USING ((SELECT rol FROM public.perfiles WHERE id = auth.uid()) = 'admin');

-- 2. Modificación Estructural de Perfiles
-- Se agrega en bloque y se migra:
ALTER TABLE public.perfiles 
  ADD COLUMN cedula VARCHAR(50) UNIQUE,
  ADD COLUMN movil VARCHAR(50),
  ADD COLUMN direccion TEXT,
  ADD COLUMN zona_id UUID REFERENCES public.zonas(id) ON DELETE SET NULL;

-- 3. Transición de Datos (zona_id es la nueva fuente de verdad. La columna texto 'zona' ya fue eliminada del schema original.)


-- 4. Modificar RPC activar_boleta_comercio (Si dependía de la zona heredada)
CREATE OR REPLACE FUNCTION activar_boleta_comercio(p_dist_id UUID, p_boleta_id BIGINT, p_nombre_comercio VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    filas_afectadas INTEGER;
    v_zona_nombre VARCHAR;
BEGIN
    -- Capturar nombre de la zona relacionada antes de la activación heredada
    SELECT z.nombre INTO v_zona_nombre 
    FROM public.perfiles p
    JOIN public.zonas z ON p.zona_id = z.id
    WHERE p.id = p_dist_id LIMIT 1;

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
