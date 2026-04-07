-- =====================================================================
-- Misión: Blindaje Total de Storage (fotos-premios)
-- =====================================================================

-- 1. Asegurar existencia y visibilidad pública del bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('fotos-premios', 'fotos-premios', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Limpieza de Políticas Previas (Evitar solapamientos)
DROP POLICY IF EXISTS "Acceso Público Lectura" ON storage.objects;
DROP POLICY IF EXISTS "Admin Full Access" ON storage.objects;
DROP POLICY IF EXISTS "Fotos Premios Lectura Pública" ON storage.objects;
DROP POLICY IF EXISTS "Admin Upload Fotos" ON storage.objects;

-- 3. POLÍTICA DE INSERCIÓN (UPLOAD):
-- Permite subir archivos a usuarios autenticados (JWT válido) y al rol service_role (Admin Bypass)
CREATE POLICY "Permitir Upload a Admin"
ON storage.objects FOR INSERT
TO authenticated, service_role
WITH CHECK (bucket_id = 'fotos-premios');

-- 4. POLÍTICA DE LECTURA (SELECT):
-- Permite visualización pública universal (Sin Login) para la Landing Page
CREATE POLICY "Permitir Lectura Pública Universal"
ON storage.objects FOR SELECT
USING (bucket_id = 'fotos-premios');

-- 5. POLÍTICA DE GESTIÓN (UPDATE/DELETE):
-- Permite al Admin modificar o borrar fotos existentes
CREATE POLICY "Permitir Gestión Total a Admin"
ON storage.objects FOR ALL
TO authenticated, service_role
USING (bucket_id = 'fotos-premios')
WITH CHECK (bucket_id = 'fotos-premios');
