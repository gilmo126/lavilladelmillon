-- =====================================================================
-- Migración: Zona Operativa Central
-- =====================================================================

INSERT INTO public.zonas (nombre, descripcion, activa)
VALUES ('Nacional / Bodega Central', 'Zona logística maestra para personal operativo y administrativo central.', true)
ON CONFLICT (nombre) DO NOTHING;
