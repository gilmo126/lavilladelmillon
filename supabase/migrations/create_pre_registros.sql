-- Tabla de pre-registros de evento (registro público)
-- Aplicar manualmente en Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.pre_registros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  nombre_negocio text NOT NULL,
  tipo_doc text DEFAULT 'CC',
  identificacion text,
  telefono text,
  whatsapp text NOT NULL,
  email text,
  direccion text,
  ciudad text,
  como_se_entero text,
  jornadas_seleccionadas jsonb DEFAULT NULL,
  estado text DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobado', 'rechazado', 'invitacion_enviada')),
  invitacion_id uuid REFERENCES public.invitaciones(id) DEFAULT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pre_registros_estado ON public.pre_registros(estado);
