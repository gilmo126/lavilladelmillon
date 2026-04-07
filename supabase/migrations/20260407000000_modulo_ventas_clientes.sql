-- =====================================================================
-- Migración: Módulo de Ventas y Cumplimiento Legal (Habeas Data)
-- =====================================================================

-- 1. Tabla: Ventas a Clientes Finales
CREATE TABLE IF NOT EXISTS public.ventas_clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    boleta_id BIGINT UNIQUE REFERENCES public.boletas(id_boleta),
    cliente_id VARCHAR(50) NOT NULL, -- Cédula/DNI
    cliente_nombre VARCHAR(255) NOT NULL,
    cliente_movil VARCHAR(50) NOT NULL,
    comercio_nombre VARCHAR(255) NOT NULL,
    distribuidor_id UUID REFERENCES public.perfiles(id),
    
    -- Cumplimiento Legal
    acepta_tratamiento_datos BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_consentimiento TIMESTAMPTZ DEFAULT NOW(),
    canal_consentimiento TEXT DEFAULT 'App Distribuidor',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices para auditoría veloz
CREATE INDEX idx_ventas_cliente_id ON public.ventas_clientes(cliente_id);
CREATE INDEX idx_ventas_distribuidor ON public.ventas_clientes(distribuidor_id);
CREATE INDEX idx_ventas_boleta ON public.ventas_clientes(boleta_id);

-- 2. RLS: Reporte de Ventas
ALTER TABLE public.ventas_clientes ENABLE ROW LEVEL SECURITY;

-- Los administradores y operativos pueden ver todo el reporte
CREATE POLICY "Admin/Operativo pueden ver todas las ventas" 
ON public.ventas_clientes FOR SELECT 
USING ((SELECT rol FROM perfiles WHERE id = auth.uid()) IN ('admin', 'operativo'));

-- Los distribuidores pueden ver sus propias ventas realizadas
CREATE POLICY "Distribuidores ven sus propias ventas" 
ON public.ventas_clientes FOR SELECT 
USING (distribuidor_id = auth.uid());

-- 3. Auditoría: Sincronización con Trazabilidad (Trigger Opcional)
-- Nota: La acción de servidor insertará aquí directamente tras activar.

COMMENT ON TABLE public.ventas_clientes IS 'Registro de compradores finales y consentimiento de Habeas Data recolectado en campo.';
