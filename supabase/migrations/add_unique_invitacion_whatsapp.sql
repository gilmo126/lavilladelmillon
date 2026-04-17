-- Previene duplicados de invitación por WhatsApp a nivel BD (elimina race conditions)
-- Fecha: 2026-04-17
--
-- Contexto: la app tenía validación en crearInvitacionAction ("si ya existe invitación
-- pendiente o aceptada con el mismo WhatsApp, rechazar") pero era check-then-insert
-- NO atómico. Dos requests concurrentes podían colarse en la ventana entre SELECT e
-- INSERT y generar duplicados. Ya pasó en producción (28 filas detectadas en 14 grupos).
--
-- Solución: índice único parcial sobre comerciante_whatsapp donde el registro esté
-- vigente (pendiente o aceptada) y no sea prueba. Postgres garantiza la unicidad a
-- nivel de storage, imposible de saltarse por concurrencia.

-- IMPORTANTE: Antes de aplicar esta migración ejecutar la limpieza de duplicados
-- existentes. Si hay duplicados, la creación del índice falla.

CREATE UNIQUE INDEX IF NOT EXISTS uq_invitacion_activa_whatsapp
ON public.invitaciones (comerciante_whatsapp)
WHERE estado IN ('pendiente', 'aceptada')
  AND es_prueba = false
  AND comerciante_whatsapp IS NOT NULL;

-- El código del lado app seguirá ejecutando su check previo (mensaje amigable normal);
-- la capa BD actúa como red de seguridad contra race conditions. Los server actions
-- capturan el error 23505 (unique_violation) y lo traducen al mismo mensaje que ya
-- mostraba la validación aplicativa.
