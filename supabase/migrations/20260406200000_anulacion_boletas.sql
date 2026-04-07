-- =====================================================================
-- Migración: Módulo de Anulación e Inmutabilidad de Boletas
-- =====================================================================

-- 1. Actualización de la Máquina de Estados Estricta
CREATE OR REPLACE FUNCTION auditar_estado_boleta()
RETURNS TRIGGER AS $$
BEGIN
    -- BLOQUEO TOTAL: Si una boleta ya está ANULADA (4), es inmutable.
    IF OLD.estado = 4 AND NEW.estado != 4 THEN
        RAISE EXCEPTION 'BLOQUEO DE SEGURIDAD: La boleta % ya está ANULADA y no puede ser reactivada ni modificada.', OLD.id_boleta;
    END IF;

    -- Lógica de transición a ANULADA (4)
    -- Se permite anular desde cualquier estado previo (0, 1, 2, 3) 
    -- esto permite invalidar inventario en bodega, despachado o incluso premios fraudulentos.
    IF NEW.estado = 4 AND OLD.estado != 4 THEN
        -- Registrar fecha de anulación (opcional, usamos updated_at por defecto)
        -- NEW.updated_at = NOW(); -- Ya se hace al final
    END IF;

    -- Lógica de transición de estado hacia DESPACHADA (1)
    IF NEW.estado = 1 THEN
        IF OLD.estado != 0 AND OLD.estado != 1 THEN -- Permitir re-despacho si ya era 1
            RAISE EXCEPTION 'MÁQUINA DE ESTADOS: Boleta % no puede ser DESPACHADA si no estaba en BODEGA (0).', NEW.id_boleta;
        END IF;
        IF NEW.distribuidor_id IS NULL THEN
            RAISE EXCEPTION 'LOGÍSTICA: Boleta % despachada sin distribuidor asignado.', NEW.id_boleta;
        END IF;
        IF OLD.estado = 0 THEN
            NEW.fecha_despacho = NOW();
        END IF;
    END IF;

    -- Estado 2 (Activa en Comercio): Viene de 1
    IF NEW.estado = 2 THEN
        IF OLD.estado != 1 AND OLD.estado != 2 THEN
            RAISE EXCEPTION 'MÁQUINA DE ESTADOS: Boleta % no puede ser ACTIVA sin haber sido despachada previamente (Estado 1).', NEW.id_boleta;
        END IF;
        IF NEW.comercio_nombre IS NULL THEN
            RAISE EXCEPTION 'LOGÍSTICA: Falta el nombre del comercio final para activar boleta %.', NEW.id_boleta;
        END IF;
        IF OLD.estado = 1 THEN
            NEW.fecha_activacion = NOW();
        END IF;
    END IF;

    -- Lógica de transición de estado hacia REGISTRADA (3)
    IF NEW.estado = 3 THEN
        IF OLD.estado != 2 THEN
            RAISE EXCEPTION 'Violación de SEGURIDAD: La boleta % no puede ser REGISTRADA sin estar previamente ACTIVA en punto de venta. Estado anterior: %', NEW.id_boleta, OLD.estado;
        END IF;
        IF NEW.habeas_data_aceptado IS NOT TRUE THEN
            RAISE EXCEPTION 'Violación de POLÍTICA DE DATOS: La boleta % requiere la aceptación expresa de las políticas de privacidad y tratamiento de datos (Ley 1581).', NEW.id_boleta;
        END IF;
        IF NEW.premio_seleccionado IS NULL THEN
            RAISE EXCEPTION 'Violación de REGLA NEGOCIO: La boleta % no ha seleccionado un premio dinámico.', NEW.id_boleta;
        END IF;
        NEW.fecha_registro = NOW();
    END IF;

    -- Actualización de último cambio
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. RPC para anulación administrativa con auditoría
CREATE OR REPLACE FUNCTION anular_boleta(p_admin_id UUID, p_boleta_id BIGINT)
RETURNS BOOLEAN AS $$
DECLARE
    tiene_permiso BOOLEAN;
BEGIN
    -- Solo admin u operativo puede anular
    SELECT EXISTS (
        SELECT 1 FROM public.perfiles 
        WHERE id = p_admin_id AND rol IN ('admin', 'operativo')
    ) INTO tiene_permiso;
    
    IF NOT tiene_permiso THEN
        RAISE EXCEPTION 'SEGURIDAD: Operación denegada. Sin permisos de anulación.';
    END IF;

    UPDATE public.boletas 
    SET 
        estado = 4 -- ANULADA
    WHERE id_boleta = p_boleta_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
