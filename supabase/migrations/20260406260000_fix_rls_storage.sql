-- =====================================================================
-- Corrección: Políticas RLS de Storage para fotos-premios
-- =====================================================================

-- 1. Eliminar políticas previas para evitar conflictos
DROP POLICY IF EXISTS "Fotos Premios Lectura Pública" ON storage.objects;
DROP POLICY IF EXISTS "Admin Upload Fotos" ON storage.objects;

-- 2. Política de Lectura Pública Universal
CREATE POLICY "Acceso Público Lectura"
ON storage.objects FOR SELECT
USING (bucket_id = 'fotos-premios');

-- 3. Política de Gestión Total para Usuarios Autenticados (Admins)
-- Se usa FOR ALL para permitir INSERT, UPDATE y DELETE
CREATE POLICY "Admin Full Access"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'fotos-premios')
WITH CHECK (bucket_id = 'fotos-premios');

-- 4. Asegurar que el bucket sea público y activo
UPDATE storage.buckets 
SET public = true 
WHERE id = 'fotos-premios';
