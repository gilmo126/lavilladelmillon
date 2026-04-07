UPDATE storage.buckets 
SET file_size_limit = 5242880 -- 5MB en bytes
WHERE id = 'fotos-premios';