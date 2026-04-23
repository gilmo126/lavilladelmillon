-- Módulo: Bienvenida parametrizable para landing de pago pendiente
-- Fecha: 2026-04-22
--
-- Separa el contenido del landing de evento (campos evento_*) del nuevo
-- landing de "bienvenida" que se muestra al comerciante cuando entra a
-- /pack/[token] con estado_pago=pendiente.
--
-- Por qué se separa:
--   · Los eventos terminaron y su contenido sigue cargado para historial /
--     futuras ediciones, pero NO debe aplicarse al flujo de pago pendiente.
--   · En el futuro se podrán agregar más "landings" parametrizables sin
--     mezclar contenidos.

ALTER TABLE public.configuracion_campana
  ADD COLUMN IF NOT EXISTS bienvenida_pago_logo_url text,
  ADD COLUMN IF NOT EXISTS bienvenida_pago_titulo text,
  ADD COLUMN IF NOT EXISTS bienvenida_pago_subtitulo text,
  ADD COLUMN IF NOT EXISTS bienvenida_pago_mensaje text,
  ADD COLUMN IF NOT EXISTS bienvenida_pago_auspiciantes jsonb DEFAULT '[]'::jsonb;

-- ─────────────────────────────────────────────────────────────────────
-- FIN DE MIGRACIÓN
-- Después de aplicar:
--  · /configuracion expone la nueva sección "Bienvenida Pago Pendiente".
--  · El contenido se renderiza en /pack/[token] cuando el pack está
--    en estado_pago='pendiente' o 'comprobante_enviado'.
-- ─────────────────────────────────────────────────────────────────────
