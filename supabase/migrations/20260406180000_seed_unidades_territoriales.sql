-- ── SEMILLAS DE UNIDADES TERRITORIALES (COMUNAS) ──
-- Misión: Robustez Geográfica Comunas 1-7

-- Insertar Comunas si no existen
INSERT INTO zonas (nombre)
VALUES 
  ('Comuna 1'),
  ('Comuna 2'),
  ('Comuna 3'),
  ('Comuna 4'),
  ('Comuna 5'),
  ('Comuna 6'),
  ('Comuna 7')
ON CONFLICT (nombre) DO NOTHING;

-- Nota: Si la tabla 'zonas' tiene una restricción UNIQUE en 'nombre', el ON CONFLICT funcionará.
-- Si el ID es serial, se autogenerará. 
