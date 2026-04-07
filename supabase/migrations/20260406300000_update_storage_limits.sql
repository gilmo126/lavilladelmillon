-- =====================================================================
-- Migración: Límites y Políticas de Storage (Producción)
-- Contenido consolidado para asegurar integridad en despliegue.
-- =====================================================================

-- 1. Asegurar existencia y configuración del bucket 'fotos-premios'
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('fotos-premios', 'fotos-premios', true, 5242880, '{image/*}')
ON CONFLICT (id) DO UPDATE SET 
    public = true, 
    file_size_limit = 5242880, 
    allowed_mime_types = '{image/*}';

-- 2. Limpieza de Políticas Previas (Evitar conflictos en despliegue)
DROP POLICY IF EXISTS "Acceso Total fotos-premios" ON storage.objects;
DROP POLICY IF EXISTS "Permitir Upload a Admin" ON storage.objects;
DROP POLICY IF EXISTS "Permitir Lectura Pública Universal" ON storage.objects;
DROP POLICY IF EXISTS "Permitir Gestión Total a Admin" ON storage.objects;
DROP POLICY IF EXISTS "Public Full Access" ON storage.objects;

-- 3. POLÍTICA DE LECTURA PÚBLICA (SELECT)
-- Crucial para que la Landing Page visualice las imágenes sin login.
CREATE POLICY "Lectura Pública Premios"
ON storage.objects FOR SELECT
USING (bucket_id = 'fotos-premios');

-- 4. POLÍTICAS DE GESTIÓN ADMINISTRATIVA (INSERT, UPDATE, DELETE)
-- Restringido a usuarios autenticados (Dashboard Admin) o service_role.

-- Inserción (Subida)
CREATE POLICY "Admin Subida Premios"
ON storage.objects FOR INSERT
TO authenticated, service_role
WITH CHECK (bucket_id = 'fotos-premios');

-- Actualización (Reemplazo)
CREATE POLICY "Admin Actualización Premios"
ON storage.objects FOR UPDATE
TO authenticated, service_role
USING (bucket_id = 'fotos-premios')
WITH CHECK (bucket_id = 'fotos-premios');

-- Eliminación (Borrado)
CREATE POLICY "Admin Eliminación Premios"
ON storage.objects FOR DELETE
TO authenticated, service_role
USING (bucket_id = 'fotos-premios');
