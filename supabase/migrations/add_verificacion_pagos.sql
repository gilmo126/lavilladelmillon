-- Módulo: Verificación de pagos con soporte fotográfico
-- Fecha: 2026-04-17
--
-- APLICAR EN ORDEN. Revisar cada bloque antes de ejecutar en producción.

-- ─────────────────────────────────────────────────────────────────────
-- 1) Ampliar enum estado_pago_pack con 'comprobante_enviado'
-- ─────────────────────────────────────────────────────────────────────
ALTER TYPE public.estado_pago_pack ADD VALUE IF NOT EXISTS 'comprobante_enviado';

-- ─────────────────────────────────────────────────────────────────────
-- 2) Columnas de verificación en packs
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.packs
  ADD COLUMN IF NOT EXISTS comprobante_url text,
  ADD COLUMN IF NOT EXISTS comprobante_path text, -- path interno en storage (para signed URLs)
  ADD COLUMN IF NOT EXISTS comprobante_subido_at timestamptz,
  ADD COLUMN IF NOT EXISTS comprobante_subido_por uuid REFERENCES public.perfiles(id),
  ADD COLUMN IF NOT EXISTS pago_verificado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pago_verificado_at timestamptz,
  ADD COLUMN IF NOT EXISTS pago_verificado_por uuid REFERENCES public.perfiles(id);

-- Backfill explícito: todos los packs existentes quedan pago_verificado=false
-- (el DEFAULT ya cubre filas nuevas; refuerzo en existentes por si viniera NULL)
UPDATE public.packs SET pago_verificado = false WHERE pago_verificado IS NULL;

CREATE INDEX IF NOT EXISTS idx_packs_pago_verificado_false
  ON public.packs(id) WHERE pago_verificado = false;

-- ─────────────────────────────────────────────────────────────────────
-- 3) Campos de configuración de pago en configuracion_campana
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.configuracion_campana
  ADD COLUMN IF NOT EXISTS nequi_llave text,
  ADD COLUMN IF NOT EXISTS monto_pack integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS instrucciones_pago text;

-- ─────────────────────────────────────────────────────────────────────
-- 4) Bucket de Supabase Storage
-- ─────────────────────────────────────────────────────────────────────
-- Bucket privado 'comprobantes-pago'. Se crea solo si no existe.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'comprobantes-pago',
  'comprobantes-pago',
  false,
  5242880, -- 5 MB
  ARRAY['image/jpeg','image/png','image/webp','application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- RLS: como la app sube y lee vía service_role (server actions con supabaseAdmin),
-- no se necesitan policies explícitas para anon/authenticated.
-- Las signed URLs se generan server-side y expiran en 10 min.
-- Si alguien intenta acceder al objeto sin signed URL, retorna 403.

-- ─────────────────────────────────────────────────────────────────────
-- 5) (Opcional) View de auditoría para arqueo
-- Lista packs con comprobante subido que el admin aún no ha verificado.
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.vw_packs_pendientes_verificacion AS
SELECT
  p.id,
  p.numero_pack,
  p.comerciante_nombre,
  p.comerciante_identificacion,
  p.tipo_pago,
  p.estado_pago,
  p.comprobante_subido_at,
  p.comprobante_url,
  d.nombre AS distribuidor_nombre,
  d.id AS distribuidor_id
FROM public.packs p
LEFT JOIN public.perfiles d ON d.id = p.distribuidor_id
WHERE p.comprobante_url IS NOT NULL
  AND p.pago_verificado = false
  AND p.es_prueba = false;

-- ─────────────────────────────────────────────────────────────────────
-- FIN DE MIGRACIÓN
-- Después de aplicar, recuerda:
--  · Revisar en /configuracion que los campos nequi_llave/monto_pack/
--    instrucciones_pago aparezcan editables.
--  · En el dashboard de Supabase Storage validar que el bucket
--    'comprobantes-pago' esté en modo Private.
-- ─────────────────────────────────────────────────────────────────────
