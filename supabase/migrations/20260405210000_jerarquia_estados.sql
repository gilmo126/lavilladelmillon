-- 1. Definición de Rol e Instanciación de Perfiles
CREATE TYPE rol_usuario AS ENUM ('admin', 'distribuidor', 'operativo');

CREATE TABLE public.perfiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre VARCHAR(255) NOT NULL,
    rol rol_usuario NOT NULL DEFAULT 'distribuidor',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS en perfiles
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;

-- Policy simplificada para evitar infinite recursion y devolver su propio perfil de forma segura
-- Policy ampliada para que la UI operativa de Asignaciones pueda leer los perfiles (Distribuidores)
CREATE POLICY "Visibilidad Publica Autenticada de Perfiles"
ON public.perfiles FOR SELECT USING (auth.role() = 'authenticated');

-- 2. Evolución de la Tabla Boletas (Logística y Trazabilidad)
ALTER TABLE public.boletas 
ADD COLUMN distribuidor_id UUID REFERENCES public.perfiles(id),
ADD COLUMN comercio_nombre VARCHAR(255),
ADD COLUMN fecha_despacho TIMESTAMPTZ;

-- 3. Máquina de Estados Estricta (Evolución de auditar_estado_boleta)
CREATE OR REPLACE FUNCTION auditar_estado_boleta()
RETURNS TRIGGER AS $$
BEGIN
    -- Estado 1 (Despachada al Distribuidor): Viene de 0
    IF NEW.estado = 1 THEN
        IF OLD.estado != 0 THEN
            RAISE EXCEPTION 'MÁQUINA DE ESTADOS: Boleta % no puede ser DESPACHADA si no estaba en BODEGA (0).', NEW.id_boleta;
        END IF;
        IF NEW.distribuidor_id IS NULL THEN
            RAISE EXCEPTION 'LOGÍSTICA: Boleta % despachada sin distribuidor asignado.', NEW.id_boleta;
        END IF;
        -- Registrar fecha de despacho
        IF OLD.estado != 1 THEN
            NEW.fecha_despacho = NOW();
        END IF;
    END IF;

    -- Estado 2 (Activa en Comercio): Viene de 1
    IF NEW.estado = 2 THEN
        IF OLD.estado != 1 THEN
            RAISE EXCEPTION 'MÁQUINA DE ESTADOS: Boleta % no puede ser ACTIVA en punto de venta sin haber sido despachada previamente al distribuidor (Estado 1).', NEW.id_boleta;
        END IF;
        IF NEW.comercio_nombre IS NULL THEN
            RAISE EXCEPTION 'LOGÍSTICA: Falta el nombre del comercio final para activar boleta %.', NEW.id_boleta;
        END IF;
        -- Registrar fecha si es la primera vez que se activa
        IF OLD.estado != 2 THEN
            NEW.fecha_activacion = NOW();
        END IF;
    END IF;

    -- Lógica de transición de estado hacia REGISTRADA (3)
    IF NEW.estado = 3 THEN
        -- Candado 1: El estado inmediatamente anterior DEBE ser ACTIVA (2)
        IF OLD.estado != 2 THEN
            RAISE EXCEPTION 'Violación de SEGURIDAD: La boleta % no puede ser REGISTRADA sin estar previamente ACTIVA en punto de venta. Estado anterior: %', NEW.id_boleta, OLD.estado;
        END IF;

        -- Candado 2: Cumplimiento Ley 1581 (Habeas Data) obligatorio
        IF NEW.habeas_data_aceptado IS NOT TRUE THEN
            RAISE EXCEPTION 'Violación de POLÍTICA DE DATOS: La boleta % requiere la aceptación expresa de las políticas de privacidad y tratamiento de datos (Ley 1581).', NEW.id_boleta;
        END IF;

        -- Candado 3: Selección de premio obligatoria (consulta al menú desplegable)
        IF NEW.premio_seleccionado IS NULL THEN
            RAISE EXCEPTION 'Violación de REGLA NEGOCIO: La boleta % no ha seleccionado un premio dinámico.', NEW.id_boleta;
        END IF;

        -- Setear el timestamp exacto del registro
        NEW.fecha_registro = NOW();
    END IF;

    -- Actualización de último cambio
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Funciones Operativas Aseguradas por Base de Datos

-- RPC Para Asignar Masivamente (Auditado DB-First)
CREATE OR REPLACE FUNCTION asignar_lote_boletas(p_admin_id UUID, p_dist_id UUID, p_rango_inicio BIGINT, p_rango_fin BIGINT)
RETURNS INTEGER AS $$
DECLARE
    tiene_permiso BOOLEAN;
    filas_afectadas INTEGER;
BEGIN
    -- Auditoría DB-First: Permite rol 'admin' u 'operativo' asignar lotes
    SELECT EXISTS (
        SELECT 1 FROM public.perfiles 
        WHERE id = p_admin_id AND rol IN ('admin', 'operativo')
    ) INTO tiene_permiso;
    
    IF NOT tiene_permiso THEN
        RAISE EXCEPTION 'SEGURIDAD: Operación denegada. El ID proporcionado no posee permisos de asignación (admin u operativo).';
    END IF;

    -- Mutación masiva usando la máquina de estados. Modifica solo las de estado 0.
    UPDATE public.boletas 
    SET 
        estado = 1,
        distribuidor_id = p_dist_id
    WHERE id_boleta BETWEEN p_rango_inicio AND p_rango_fin
      AND estado = 0;

    GET DIAGNOSTICS filas_afectadas = ROW_COUNT;
    RETURN filas_afectadas;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- RPC Para Activar Unitaria en Punto Venta
CREATE OR REPLACE FUNCTION activar_boleta_comercio(p_dist_id UUID, p_boleta_id BIGINT, p_nombre_comercio VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    filas_afectadas INTEGER;
BEGIN
    UPDATE public.boletas 
    SET 
        estado = 2,
        comercio_nombre = p_nombre_comercio,
        zona_comercio = (SELECT zona FROM public.perfiles WHERE id = p_dist_id LIMIT 1) -- Opcional: auto heredar zona
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


-- 5. RLS Distribuidor
CREATE POLICY "Distribuidor puede leer su propio inventario de boletas" 
ON public.boletas FOR SELECT USING (distribuidor_id = auth.uid());
