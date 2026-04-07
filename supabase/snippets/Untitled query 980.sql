-- 1. Asegurar que el bucket exista y sea público
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('fotos-premios', 'fotos-premios', true, 5242880) -- 5MB límite
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 5242880;

-- 2. Limpieza total de políticas antiguas para evitar conflictos
DROP POLICY IF EXISTS "Acceso Público de Lectura" ON storage.objects;
DROP POLICY IF EXISTS "Admin puede subir fotos" ON storage.objects;
DROP POLICY IF EXISTS "Admin puede actualizar fotos" ON storage.objects;
DROP POLICY IF EXISTS "Admin puede borrar fotos" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects; -- Por si el agente creó una genérica
DROP POLICY IF EXISTS "Admin Access" ON storage.objects;

-- 3. Crear política de LECTURA (Pública para la Landing)
CREATE POLICY "Acceso Público de Lectura"
ON storage.objects FOR SELECT
USING (bucket_id = 'fotos-premios');

-- 4. Crear política de INSERCIÓN (Para que el Admin suba fotos)
CREATE POLICY "Admin puede subir fotos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'fotos-premios');

-- 5. Crear política de ACTUALIZACIÓN (Para que el Admin reemplace fotos)
CREATE POLICY "Admin puede actualizar fotos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'fotos-premios');

-- 6. Crear política de ELIMINACIÓN (Para que el Admin borre fotos)
CREATE POLICY "Admin puede borrar fotos"
ON storage.objects FOR DELETE
USING (bucket_id = 'fotos-premios');