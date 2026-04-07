-- =====================================================================
-- Migración: Branding Dinámico (Llaves Maestras)
-- =====================================================================

-- 1. Evolución de la Tabla Configuración
ALTER TABLE public.configuracion_campana 
    ADD COLUMN IF NOT EXISTS slogan_principal TEXT DEFAULT 'Blindaje Legal y Transparencia: Registra tus datos para participar oficialmente.',
    ADD COLUMN IF NOT EXISTS logo_url TEXT;

COMMENT ON COLUMN public.configuracion_campana.slogan_principal IS 'Slogan o bajada legal que aparece en el Hero de la Landing Page.';
COMMENT ON COLUMN public.configuracion_campana.logo_url IS 'URL pública del logotipo de la campaña alojado en Supabase Storage.';
