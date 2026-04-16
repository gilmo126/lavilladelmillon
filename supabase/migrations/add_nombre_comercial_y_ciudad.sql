-- Agregar campos nombre_comercial y ciudad a packs e invitaciones
-- Aplicar manualmente en Supabase SQL Editor

ALTER TABLE public.packs ADD COLUMN IF NOT EXISTS comerciante_nombre_comercial text;
ALTER TABLE public.packs ADD COLUMN IF NOT EXISTS comerciante_ciudad text;

ALTER TABLE public.invitaciones ADD COLUMN IF NOT EXISTS comerciante_nombre_comercial text;
ALTER TABLE public.invitaciones ADD COLUMN IF NOT EXISTS comerciante_ciudad text;
