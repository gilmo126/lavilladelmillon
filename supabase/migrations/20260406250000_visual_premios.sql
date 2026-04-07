-- =====================================================================
-- Migración: Identidad Visual (Fotos de Premios)
-- =====================================================================

-- 1. Evolución de la Tabla Premios
ALTER TABLE public.premios 
    ADD COLUMN IF NOT EXISTS imagen_url TEXT;

COMMENT ON COLUMN public.premios.imagen_url IS 'URL pública de la fotografía oficial del premio en Supabase Storage.';

-- 2. Infraestructura de Storage (Bucket)
-- Nota: Supabase requiere políticas RLS para lectura pública
INSERT INTO storage.buckets (id, name, public) 
VALUES ('fotos-premios', 'fotos-premios', true)
ON CONFLICT (id) DO NOTHING;

-- Política de Lectura Pública (Permite que cualquier usuario vea las fotos)
CREATE POLICY "Fotos Premios Lectura Pública"
ON storage.objects FOR SELECT
USING (bucket_id = 'fotos-premios');

-- Política de Inserción para Administradores (vía Service Role o Autenticados)
CREATE POLICY "Admin Upload Fotos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'fotos-premios');
