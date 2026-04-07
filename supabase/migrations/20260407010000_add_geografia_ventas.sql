-- =====================================================================
-- Migración: Adición de Campos Geográficos a Ventas (Dirección y Barrio)
-- =====================================================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ventas_clientes' AND column_name = 'cliente_direccion'
    ) THEN
        ALTER TABLE public.ventas_clientes ADD COLUMN cliente_direccion VARCHAR(255);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ventas_clientes' AND column_name = 'cliente_barrio'
    ) THEN
        ALTER TABLE public.ventas_clientes ADD COLUMN cliente_barrio VARCHAR(255);
    END IF;
END $$;

COMMENT ON COLUMN public.ventas_clientes.cliente_direccion IS 'Dirección de residencia del comprador final.';
COMMENT ON COLUMN public.ventas_clientes.cliente_barrio IS 'Barrio o corregimiento del comprador final (mapeado desde tabla territorios).';
