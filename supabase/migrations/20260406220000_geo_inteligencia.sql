-- =====================================================================
-- Migración: Inteligencia Geográfica y Trazabilidad Geo-Espacial
-- =====================================================================

-- 1. Tabla de Catálogo de Territorios (Barrios/Corregimientos)
CREATE TABLE IF NOT EXISTS public.territorios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(255) UNIQUE NOT NULL,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('Barrio', 'Corregimiento', 'Municipio')),
    padre_id UUID REFERENCES public.territorios(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Territorios: Lectura Pública
ALTER TABLE public.territorios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lectura publica de territorios" ON public.territorios FOR SELECT USING (true);

-- 2. Evolución de la Tabla Boletas
ALTER TABLE public.boletas 
    ADD COLUMN IF NOT EXISTS ubicacion_cliente_id UUID REFERENCES public.territorios(id),
    ADD COLUMN IF NOT EXISTS zona_id UUID REFERENCES public.zonas(id);

-- Índices Geo
CREATE INDEX IF NOT EXISTS idx_boletas_territorio ON public.boletas(ubicacion_cliente_id);
CREATE INDEX IF NOT EXISTS idx_boletas_zona_id ON public.boletas(zona_id);

-- 3. Tabla de Trazabilidad Geográfica (Bitácora de Movimiento)
CREATE TABLE IF NOT EXISTS public.trazabilidad_geografica (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    boleta_id BIGINT REFERENCES public.boletas(id_boleta),
    estado_destino SMALLINT NOT NULL,
    ubicacion_nombre VARCHAR(255),
    zona_id UUID REFERENCES public.zonas(id),
    distribuidor_id UUID REFERENCES public.perfiles(id),
    ip_evento INET,
    fecha_evento TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Trazabilidad: Solo Admin e Internal
ALTER TABLE public.trazabilidad_geografica ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin lee trazabilidad" ON public.trazabilidad_geografica FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'admin')
);

-- 4. Funión Auditora Mejorada (Historial Automático)
CREATE OR REPLACE FUNCTION auditar_estado_boleta()
RETURNS TRIGGER AS $$
DECLARE
    v_zona_id UUID;
    v_ubicacion_text VARCHAR;
BEGIN
    -- BLOQUEO TOTAL: Inmutabilidad Estados Finales
    IF OLD.estado IN (4, 5) AND NEW.estado != OLD.estado THEN
        RAISE EXCEPTION 'BLOQUEO DE SEGURIDAD: Boleta % ya está en estado final (%).', OLD.id_boleta, OLD.estado;
    END IF;

    -- REGISTRO DE TRAZABILIDAD GEOGRÁFICA (Bitácora automática)
    -- Si el estado cambió, insertamos el "salto" de ubicación
    IF (NEW.estado != OLD.estado) OR (OLD.estado IS NULL) THEN
        
        -- Definir contexto de ubicación para el log
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
            boleta_id,
            estado_destino,
            ubicacion_nombre,
            zona_id,
            distribuidor_id,
            ip_evento
        ) VALUES (
            NEW.id_boleta,
            NEW.estado,
            v_ubicacion_text,
            COALESCE(NEW.zona_id, (SELECT zona_id FROM perfiles WHERE id = NEW.distribuidor_id)),
            NEW.distribuidor_id,
            NEW.ip_registro
        );
    END IF;

    -- Lógica de transición a SORTEADA (5)
    IF NEW.estado = 5 AND OLD.estado != 3 THEN
        RAISE EXCEPTION 'MÁQUINA DE ESTADOS: Requiere estar REGISTRADA (3).';
    END IF;

    -- Estado 2 (Activa): Viene de 1
    IF NEW.estado = 2 AND OLD.estado != 1 THEN
        -- Nota: activar_boleta_comercio ya se encarga de setear zona_id y comercio_nombre
    END IF;

    -- Estado 3 (Registrada): Viene de 2
    IF NEW.estado = 3 THEN
        IF OLD.estado != 2 THEN
            RAISE EXCEPTION 'Violación de SEGURIDAD: Requiere estar previamente ACTIVA.';
        END IF;
        IF NEW.habeas_data_aceptado IS NOT TRUE THEN
            RAISE EXCEPTION 'Habeas Data obligatorio.';
        END IF;
        IF NEW.premio_seleccionado IS NULL THEN
            RAISE EXCEPTION 'Premio obligatorio.';
        END IF;
        IF NEW.ubicacion_cliente_id IS NULL THEN
            RAISE EXCEPTION 'Territorio (Barrio) de residencia obligatorio.';
        END IF;
        NEW.fecha_registro = NOW();
    END IF;

    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Actualizar RPC activar_boleta_comercio
CREATE OR REPLACE FUNCTION activar_boleta_comercio(p_dist_id UUID, p_boleta_id BIGINT, p_nombre_comercio VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    filas_afectadas INTEGER;
    v_zona_id UUID;
    v_zona_nombre VARCHAR;
BEGIN
    -- Capturar Zona del Distribuidor
    SELECT z.id, z.nombre INTO v_zona_id, v_zona_nombre 
    FROM public.perfiles p
    JOIN public.zonas z ON p.zona_id = z.id
    WHERE p.id = p_dist_id LIMIT 1;

    UPDATE public.boletas 
    SET 
        estado = 2,
        comercio_nombre = p_nombre_comercio,
        zona_comercio = v_zona_nombre, -- Mantenemos por compatibilidad visual actual
        zona_id = v_zona_id
    WHERE id_boleta = p_boleta_id
      AND distribuidor_id = p_dist_id
      AND estado = 1;

    GET DIAGNOSTICS filas_afectadas = ROW_COUNT;
    
    IF filas_afectadas = 0 THEN
        RAISE EXCEPTION 'No se pudo activar la boleta.';
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
