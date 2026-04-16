-- Origen de la invitación: 'distribuidor' (creada manualmente) o 'pre_registro' (desde landing pública)
-- Aplicar manualmente en Supabase SQL Editor

ALTER TABLE public.invitaciones ADD COLUMN IF NOT EXISTS origen text DEFAULT 'distribuidor';
