-- Soft-delete de packs e invitaciones de prueba
-- Aplicar manualmente en Supabase (SQL Editor) en este orden.

-- 1) Columnas es_prueba con default false
ALTER TABLE public.packs          ADD COLUMN IF NOT EXISTS es_prueba boolean NOT NULL DEFAULT false;
ALTER TABLE public.invitaciones   ADD COLUMN IF NOT EXISTS es_prueba boolean NOT NULL DEFAULT false;
ALTER TABLE public.boletas        ADD COLUMN IF NOT EXISTS es_prueba boolean NOT NULL DEFAULT false;

-- 2) Índices parciales — optimizan "sólo registros reales" (caso 99%)
CREATE INDEX IF NOT EXISTS idx_packs_es_prueba_false        ON public.packs(id)        WHERE es_prueba = false;
CREATE INDEX IF NOT EXISTS idx_invitaciones_es_prueba_false ON public.invitaciones(id) WHERE es_prueba = false;
CREATE INDEX IF NOT EXISTS idx_boletas_es_prueba_false      ON public.boletas(id)      WHERE es_prueba = false;

-- 3) Trigger: al marcar/desmarcar un pack como prueba, sincroniza sus boletas
CREATE OR REPLACE FUNCTION public.sync_boletas_es_prueba()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.es_prueba IS DISTINCT FROM NEW.es_prueba THEN
    UPDATE public.boletas SET es_prueba = NEW.es_prueba WHERE pack_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_boletas_es_prueba ON public.packs;
CREATE TRIGGER trg_sync_boletas_es_prueba
AFTER UPDATE ON public.packs
FOR EACH ROW
EXECUTE FUNCTION public.sync_boletas_es_prueba();

-- 4) get_pack_publica — devolver "no encontrado" si pack es de prueba
-- (Se agrega AND p.es_prueba = false en el WHERE principal)
-- Recreación manual: usa el definition actual de la RPC y agrega la condición.
-- Si quieres que lo regenere Claude Code, pega aquí el pg_get_functiondef.

-- 5) buscar_trazabilidad — excluir packs de prueba
-- Mismo criterio: recrear con AND pk.es_prueba = false
