-- Flag de confirmación de envío WhatsApp
-- Aplicar manualmente en Supabase SQL Editor

ALTER TABLE public.packs ADD COLUMN IF NOT EXISTS whatsapp_confirmado boolean DEFAULT false;
ALTER TABLE public.packs ADD COLUMN IF NOT EXISTS whatsapp_confirmado_at timestamptz;

ALTER TABLE public.invitaciones ADD COLUMN IF NOT EXISTS whatsapp_confirmado boolean DEFAULT false;
ALTER TABLE public.invitaciones ADD COLUMN IF NOT EXISTS whatsapp_confirmado_at timestamptz;
