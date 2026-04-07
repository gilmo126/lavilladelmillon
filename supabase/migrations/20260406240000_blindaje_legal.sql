-- =====================================================================
-- Migración: Blindaje Legal (Ley 1581) y Términos y Condiciones
-- =====================================================================

-- 1. Evolución de la Tabla Boletas con Campos Legales
ALTER TABLE public.boletas 
    ADD COLUMN IF NOT EXISTS acepta_terminos BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS fecha_aceptacion_terminos TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS version_terminos TEXT DEFAULT 'v1.0-abril-2026';

-- Nota: ip_registro ya existe de migraciones previas (geo_inteligencia)

-- 2. Actualización de Comentarios para Auditoría
COMMENT ON COLUMN public.boletas.acepta_terminos IS 'Indica si el usuario aceptó debidamente los T&C y Habeas Data.';
COMMENT ON COLUMN public.boletas.fecha_aceptacion_terminos IS 'Marca de tiempo del servidor al momento del registro.';
COMMENT ON COLUMN public.boletas.version_terminos IS 'Versión inmutable de los términos vigentes al momento del registro.';

-- 3. Refuerzo de la Función Auditora (Triggers de Seguridad)
CREATE OR REPLACE FUNCTION auditar_estado_boleta()
RETURNS TRIGGER AS $$
DECLARE
    v_zona_id UUID;
    v_ubicacion_text VARCHAR;
BEGIN
    -- BLOQUEO TOTAL: Inmutabilidad Estados Finales (4: ANULADA, 5: SORTEADA)
    IF OLD.estado IN (4, 5) AND NEW.estado != OLD.estado THEN
        RAISE EXCEPTION 'BLOQUEO DE SEGURIDAD: Boleta % ya está en estado final (%).', OLD.id_boleta, OLD.estado;
    END IF;

    -- REGISTRO DE TRAZABILIDAD GEOGRÁFICA (Bitácora automática)
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

    -- MÁQUINA DE ESTADOS: Lógica de Negocio
    IF NEW.estado = 3 THEN
        IF OLD.estado != 2 THEN
            RAISE EXCEPTION 'Violación de SEGURIDAD: Requiere estar previamente ACTIVA en punto de venta.';
        END IF;

        -- BLINDAJE LEGAL: Validaciones Ley 1581 (Habeas Data)
        IF NEW.acepta_terminos IS NOT TRUE THEN
            RAISE EXCEPTION 'BLOQUEO LEGAL: El registro requiere la aceptación explícita de los Términos y Condiciones.';
        END IF;
        
        IF NEW.fecha_aceptacion_terminos IS NULL THEN
            NEW.fecha_aceptacion_terminos = NOW();
        END IF;

        IF NEW.premio_seleccionado IS NULL THEN
            RAISE EXCEPTION 'Requisito comercial: Debe seleccionar un premio de la lista.';
        END IF;

        IF NEW.ubicacion_cliente_id IS NULL THEN
            RAISE EXCEPTION 'Error de ubicación: El barrio o corregimiento de residencia es obligatorio.';
        END IF;

        -- Registro de fecha de conversión
        NEW.fecha_registro = NOW();
    END IF;

    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
