-- =====================================================================
-- Migración: Módulo de Sorteos e Inmutabilidad de Participación
-- =====================================================================

-- 1. Evolución de la Tabla Boletas (Estado 5)
-- Modificar el constraint existente para permitir el estado 5 (Sorteada)
ALTER TABLE public.boletas DROP CONSTRAINT IF EXISTS boletas_estado_check;
ALTER TABLE public.boletas ADD CONSTRAINT boletas_estado_check CHECK (estado BETWEEN 0 AND 5);

-- 2. Nueva Tabla de Sorteos
CREATE TABLE IF NOT EXISTS public.sorteos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    premio_id UUID REFERENCES public.premios(id) ON DELETE CASCADE,
    fecha_sorteo TIMESTAMPTZ NOT NULL,
    estado TEXT NOT NULL DEFAULT 'programado' CHECK (estado IN ('programado', 'finalizado')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS en sorteos
ALTER TABLE public.sorteos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lectura publica de sorteos" ON public.sorteos FOR SELECT USING (true);
CREATE POLICY "Admin gestiona sorteos" ON public.sorteos FOR ALL USING (
    EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'admin')
);

-- 3. Máquina de Estados Estricta (Blindaje Final)
CREATE OR REPLACE FUNCTION auditar_estado_boleta()
RETURNS TRIGGER AS $$
BEGIN
    -- BLOQUEO TOTAL: Si una boleta ya fue SORTEADA (5) o ANULADA (4), es inmutable.
    IF OLD.estado IN (4, 5) AND NEW.estado != OLD.estado THEN
        RAISE EXCEPTION 'BLOQUEO DE SEGURIDAD: La boleta % ya está en un estado final (%) y no puede ser modificada.', OLD.id_boleta, OLD.estado;
    END IF;

    -- Lógica de transición a SORTEADA (5): Solo viene de REGISTRADA (3)
    IF NEW.estado = 5 THEN
        IF OLD.estado != 3 THEN
            RAISE EXCEPTION 'MÁQUINA DE ESTADOS: Boleta % no puede marcarse como SORTEADA si no estaba REGISTRADA (3).', NEW.id_boleta;
        END IF;
    END IF;

    -- Lógica de transición a ANULADA (4): Se permite desde cualquier estado previo (0-3)
    IF NEW.estado = 4 AND OLD.estado NOT IN (4, 5) THEN
        -- Permitir anulación
    END IF;

    -- Estado 1 (Despachada): Viene de 0
    IF NEW.estado = 1 THEN
        IF OLD.estado != 0 AND OLD.estado != 1 THEN
            RAISE EXCEPTION 'MÁQUINA DE ESTADOS: Boleta % no puede ser DESPACHADA si no estaba en BODEGA (0).', NEW.id_boleta;
        END IF;
        IF NEW.distribuidor_id IS NULL THEN
            RAISE EXCEPTION 'LOGÍSTICA: Boleta % despachada sin distribuidor asignado.', NEW.id_boleta;
        END IF;
    END IF;

    -- Estado 2 (Activa): Viene de 1
    IF NEW.estado = 2 THEN
        IF OLD.estado != 1 AND OLD.estado != 2 THEN
            RAISE EXCEPTION 'MÁQUINA DE ESTADOS: Boleta % no puede ser ACTIVA sin haber sido despachada previamente (Estado 1).', NEW.id_boleta;
        END IF;
    END IF;

    -- Estado 3 (Registrada): Viene de 2
    IF NEW.estado = 3 THEN
        IF OLD.estado != 2 THEN
            RAISE EXCEPTION 'Violación de SEGURIDAD: La boleta % no puede ser REGISTRADA sin estar previamente ACTIVA. Estado anterior: %', NEW.id_boleta, OLD.estado;
        END IF;
        IF NEW.habeas_data_aceptado IS NOT TRUE THEN
            RAISE EXCEPTION 'Violación de POLÍTICA DE DATOS: Aceptación de Habeas Data requerida.';
        END IF;
        IF NEW.premio_seleccionado IS NULL THEN
            RAISE EXCEPTION 'Violación de REGLA NEGOCIO: Selección de premio obligatoria.';
        END IF;
        NEW.fecha_registro = NOW();
    END IF;

    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. RPC para Cierre de Sorteo Masivo
CREATE OR REPLACE FUNCTION cerrar_sorteo_campana(p_admin_id UUID, p_campana_id UUID)
RETURNS INTEGER AS $$
DECLARE
    tiene_permiso BOOLEAN;
    filas_afectadas INTEGER;
BEGIN
    -- Auditoría DB-First: Solo admin puede cerrar sorteos
    SELECT EXISTS (
        SELECT 1 FROM public.perfiles 
        WHERE id = p_admin_id AND rol = 'admin'
    ) INTO tiene_permiso;
    
    IF NOT tiene_permiso THEN
        RAISE EXCEPTION 'SEGURIDAD: Operación denegada. Sin permisos de cierre de sorteo.';
    END IF;

    -- Mover todas las boletas registradas (3) al estado final (5)
    UPDATE public.boletas 
    SET 
        estado = 5 -- SORTEADA
    WHERE campana_id = p_campana_id
      AND estado = 3;

    GET DIAGNOSTICS filas_afectadas = ROW_COUNT;
    RETURN filas_afectadas;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
