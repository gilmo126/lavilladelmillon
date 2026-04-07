-- =====================================================================
-- Fix: RLS para Tabla Perfil-Zonas y Acceso de Red Logística
-- =====================================================================

-- 1. Habilitar RLS en la tabla intermedia
ALTER TABLE public.perfil_zonas ENABLE ROW LEVEL SECURITY;

-- 2. Políticas de Lectura
-- Todos los usuarios autenticados pueden ver las asignaciones de zona (necesario para joins en el dashboard)
CREATE POLICY "Lectura Autenticada Perfil Zonas" 
ON public.perfil_zonas FOR SELECT 
USING (auth.role() = 'authenticated');

-- 3. Políticas de Gestión (Solo Admin)
CREATE POLICY "Gestión Admin Perfil Zonas" 
ON public.perfil_zonas FOR ALL 
USING ((SELECT rol FROM public.perfiles WHERE id = auth.uid()) = 'admin');

COMMENT ON POLICY "Lectura Autenticada Perfil Zonas" ON public.perfil_zonas IS 'Permite que distribuidores y operativos consulten su propia red de zonas asignadas.';
