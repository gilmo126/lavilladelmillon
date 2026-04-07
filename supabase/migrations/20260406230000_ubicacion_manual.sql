-- Migración: Soporte para Ubicación Manual (Campo OTRO)
ALTER TABLE public.boletas 
    ADD COLUMN IF NOT EXISTS ubicacion_manual TEXT;

COMMENT ON COLUMN public.boletas.ubicacion_manual IS 'Almacena el nombre del barrio cuando el usuario selecciona la opción OTRO.';
