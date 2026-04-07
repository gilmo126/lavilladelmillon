-- Política temporal para visualización por Websocket en Frontend
CREATE POLICY "Dashboard puede leer boletas" 
ON public.boletas FOR SELECT USING (true);

-- Habilitar Supabase Realtime para la tabla
ALTER PUBLICATION supabase_realtime ADD TABLE public.boletas;
