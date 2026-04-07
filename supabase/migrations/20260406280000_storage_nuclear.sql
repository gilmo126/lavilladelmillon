-- =====================================================================
-- Reparación Nuclear: Configuración Total de Storage (fotos-premios)
-- =====================================================================

-- 1. Asegurar existencia y configuración pública absoluta del bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES ('fotos-premios', 'fotos-premios', true, 5242880, '{image/*}')
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 5242880, allowed_mime_types = '{image/*}';

-- 2. Limpieza Radical de Políticas (Eliminar cualquier rastro de conflictos)
DROP POLICY IF EXISTS "Permitir Upload a Admin" ON storage.objects;
DROP POLICY IF EXISTS "Permitir Lectura Pública Universal" ON storage.objects;
DROP POLICY IF EXISTS "Permitir Gestión Total a Admin" ON storage.objects;
DROP POLICY IF EXISTS "Acceso Público Lectura" ON storage.objects;
DROP POLICY IF EXISTS "Admin Full Access" ON storage.objects;
DROP POLICY IF EXISTS "Fotos Premios Lectura Pública" ON storage.objects;
DROP POLICY IF EXISTS "Admin Upload Fotos" ON storage.objects;
DROP POLICY IF EXISTS "Acceso Público Universal" ON storage.objects;

-- 3. POLÍTICA DE ACCESO TOTAL (SELECT, INSERT, UPDATE, DELETE)
-- Se permite a TODOS los roles (public, authenticated, service_role)
-- Esto garantiza que la subida funcione en desarrollo local sin importar el estado de la sesión
CREATE POLICY "Acceso Total fotos-premios"
ON storage.objects FOR ALL
USING (bucket_id = 'fotos-premios')
WITH CHECK (bucket_id = 'fotos-premios');

-- Fin del script de reparación nuclear
