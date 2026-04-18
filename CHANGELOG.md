# Changelog — LavilladelMillon

Historial de fases, fixes y migraciones. Para reglas vigentes ver `CLAUDE.md`; para errores pasados ver `LESSONS_LEARNED.md`.

---

## Rediseño V2 — Todas las fases completadas

**Concepto central:** el modelo logístico cambia de boletas individuales asignadas por rango a **packs de 25 números generados aleatoriamente** que el distribuidor vende directamente a un comerciante. Cada número tiene un link único que el comerciante distribuye a sus clientes.

**Rama activa:** `feature/rediseno-packs-v2`

### Fase 1 — Migraciones de BD (completada)

| Migración | Descripción |
|-----------|-------------|
| `create_packs_table` | Nueva tabla `packs` con enums `tipo_pago_pack` y `estado_pago_pack` |
| `create_activaciones_table` | Nueva tabla `activaciones` para registrar activaciones de números individuales |
| `add_pack_columns_to_boletas` | `pack_id` (FK → packs), `token_link` (text unique) + índices |
| `add_config_campana_columns` | `dias_vencimiento_pago` (default 8), `dias_validez_qr` (default 8), `numeros_por_pack` (default 25) |
| `remove_operativo_from_rol_enum` | Enum `rol_usuario` ahora solo tiene `admin` y `distribuidor` |
| `create_rpc_generar_pack` | RPC que genera 25 números aleatorios únicos y crea el pack |
| `create_rpc_activar_numero` | RPC que activa un número individual vía `token_link` |

### Fase 2 — Limpieza (completada)

Eliminados:
- Rutas y componentes: `/bodega`, `/asignaciones`, `/mis-distribuidores`
- Rol `operativo` de UI, actions, checks de acceso y enum de BD
- RPCs obsoletas: `validar_rango_boletas`, `sugerir_proximo_lote`, `asignar_lote_boletas`

### Fase 3 — Módulo Venta de Packs `/activar` (completada)

La ruta `/activar` fue completamente reemplazada. Vende packs de 25 números a comerciantes.

**Archivos:**
- `app/activar/page.tsx` — Server component: carga perfil del distribuidor y config de campaña
- `app/activar/VenderPackForm.tsx` — Client: máquina de estados `form` → `success`
- `app/activar/actions.ts` — `venderPackAction`: llama RPC `generar_pack`, actualiza pack con datos comerciante

**Flujo `venderPackAction`:**
1. Verifica sesión → rol `distribuidor`
2. Lee `configuracion_campana` (id, dias_vencimiento_pago, dias_validez_qr)
3. Llama RPC `generar_pack(p_dist_id, p_campana_id)` → crea pack + 25 boletas con `token_link` único
4. Actualiza pack: comerciante_nombre, tel, email, whatsapp, tipo_pago, estado_pago, fecha_vencimiento_pago
5. Devuelve: token_pagina, token_qr, qr_valido_hasta, array de 25 números

**Pantalla de confirmación:** grid 5×5, link del comerciante, QR (solo `tipo_pago=inmediato`) vía `api.qrserver.com` codificando `admin-url/validar-qr/[token_qr]`.

### Fase 4 — Comunicación WhatsApp/Email (completada)

- WhatsApp: `wa.me/?text=...` siempre disponible
- Email: `enviarEmailPackAction` con Resend, template HTML dark/dorado con grid 5×5 + CTA
- Estados botón email: idle → sending → sent/error
- Variable runtime: `RESEND_API_KEY` (secret Cloudflare)

### Fase 5 — Página del Comerciante `/pack/[token]` en landing-page (completada)

**Migración:** `fase5_pack_publica`
- `dias_validez_pagina_comerciante int DEFAULT 30` en `configuracion_campana`
- RPC `get_pack_publica(p_token text)` SECURITY DEFINER con `GRANT EXECUTE TO anon`

**Archivos:** `app/pack/[token]/{page,PackPageClient}.tsx`

Grid de números con botón "Compartir" por cada uno + "Copiar todos". URL: `wa.me/?text=...landing-url?numero=XXXXXX`.

### Fase 6 — Módulos actualizados + `/validar-qr` (completada)

**Migración:** `add_qr_usado_at_to_packs`

- Nueva ruta `/validar-qr/[token_qr]` protegida: muestra datos, valida expiración/pago/canje, botón anular
- `/boletas`: estados V2 (0=GENERADO, 1=ACTIVADO, 2=REGISTRADO, 3=ANULADO, 4=SORTEADO), columna `pack_id`, timeline simplificado
- `/ventas` reescrito: muestra packs (tabla `packs`) con columnas comerciante/distribuidor/tipo-pago/estado-pago/fechas/#números
- `/trazabilidad`: cadena 3 pasos (Generado → Activado → Registrado), sección "Pack / Distribuidor"
- `lib/actions.ts`: eliminadas `getLotesLogisticos`, `getInventarioDistribuidorAction`, `verificarRangoBodegaAction`, `crearLoteBodegaAction`; agregadas `getPacksPaged`, `getPacksDistribuidorAction`

### Identificador PACK-XXX (completada)

Secuencial auto-incremental `numero_pack serial` en `packs`, formateado `PACK-001`. Visible en confirmación venta, tabla ventas, drawer, trazabilidad, asistencia, landing comerciante. RPCs `buscar_trazabilidad` y `get_pack_publica` retornan `numero_pack`.

### Módulo Comerciantes `/comerciantes` (solo admin)

Directorio centralizado. Tabla con Nombre/Identificación/Teléfono/Distribuidor/#Packs/Fecha. Drawer editable actualiza TODOS los packs del comerciante. Eliminar en cascada: activaciones → boletas → packs. Distribuidor puede editar desde `/ventas` vía `actualizarDatosPackAction`.

### Control de duplicados y estado visual por número

RPC `get_pack_publica` retorna `numeros` como JSON `[{numero, estado}]`. Números con `estado>=2` muestran badge "✅ Registrado" deshabilitado. Landing `?numero=XXXXXX` con número registrado muestra pantalla genérica sin datos personales (privacidad).

### Lógica Pago Inmediato vs Pendiente

**Inmediato:** `venderPackAction` → RPC `generar_pack` → pack `pagado`, QR/tokens generados.
**Pendiente:** inserta directo en `packs` sin RPC → `estado_pago=pendiente`, sin boletas. Tokens generados con `crypto.randomUUID()` para futuro.
**Confirmar Pago:** `confirmarPagoAction` genera 25 números aleatorios únicos (100000-999999), inserta boletas, actualiza pack a `pagado/inmediato`, genera `qr_valido_hasta`.

### Post-Fase 6 — Detalle de Pack y Reenvío de QR

- Drawer en `/ventas`: datos, link, QR, grid 5×5 con estado individual. `getPackDetail(packId)`
- Reenvío QR: "Reenviar WhatsApp" + "Copiar URL QR" si `tipo_pago=inmediato` y `qr_usado_at IS NULL`
- `/ventas` accesible para distribuidores (filtrado por `distribuidor_id`)

### Módulo Invitaciones a Eventos

Tabla `invitaciones` (estado, token único, token_qr). Admin ve todas, distribuidor las suyas. Formulario con tipos parametrizables. Envío WhatsApp+email. Editor de contenido landing en `configuracion_campana` (logo, titulo, subtitulo, mensaje, auspiciantes). Landing `/invitacion/[token]` pública: Acepto/No puedo. Scanner valida QRs de pack Y de invitación.

### Scanner — Búsqueda por Cédula

Tabs "Escanear QR" / "Buscar por Cédula". `buscarPacksPorCedulaAction` busca packs pagados por `comerciante_identificacion`, muestra estado QR y permite canjear inline.

### Módulo Asistencia Evento

`/scanner` (Asistente+Admin): `validarQrInlineAction` sin redirect, toast, lista hoy con recarga. `/asistencia` (Admin): tabla completa con filtro fecha y export CSV.

### Rol Asistente

Acceso solo a `/scanner` y `/validar-qr/[token_qr]`. Admin lo crea desde `/distribuidores`. Login redirige por rol. Sidebar con solo "Scanner QR".

---

## Fixes Post-Implementación V2

### 2026-04-10

- Encoding UTF-8 roto en `/distribuidores/page.tsx` (mojibake `GestiÃ³n`) → Corregidos 5 strings
- Queries de perfiles y zonas en `/distribuidores` retornaban vacío por RLS → `supabaseAdmin`
- Sidebar "GUEST - Cargando..." post-login → perfil y config en layout a `supabaseAdmin`
- Dashboard "Rendering..." indefinido para distribuidores → `supabaseAdmin` en page.tsx
- Loop infinito `GET /` en dashboard → `fetchPagedData` tenía `total` en deps de `useCallback` → removido
- `/activar` "Módulo exclusivo" al distribuidor → perfil a `supabaseAdmin`
- Pages con guard de rol fallaban por RLS post-redirect → migradas a `supabaseAdmin` (`boletas`, `trazabilidad`, `ventas`, `zonas`)
- Estados de boletas viejos en `RealtimeDashboard.tsx` y `page.tsx` → actualizados a V2
- Server actions fallaban por RLS al verificar rol → queries de `perfiles` en actions a `supabaseAdmin`
- Encoding UTF-8 roto en `/configuracion/page.tsx` → corregido
- Configuración sin campos V2 → agregada sección "Plazos y Vencimientos" (`dias_validez_pagina_comerciante`, `dias_validez_qr`, `dias_vencimiento_pago`)
- Boletas antiguas V1 (pack_id NULL) eliminadas: 1050 registros + cascada activaciones/ventas_clientes/trazabilidad_geografica
- `PackDetailDrawer` error "Cannot update component while rendering" → `useState` → `useEffect` con `[packId]`
- Formulario Vender Pack no capturaba identificación → agregado tipo doc (CC/CE/NIT/PP) + número
- Drawer de detalle no mostraba identificación → agregado
- Landing: "Failed to send request to Edge Function" → Edge Function `registrar-boleta` reemplazada por Server Action `registrarBoletaAction` con estados V2 + `supabaseAdmin`
- Landing: campo número no se pre-cargaba con `?numero=` → `useSearchParams` + readonly dorado

### 2026-04-11

- Landing: email opcional + confirmación Resend tras registro
- Landing: pantalla confirmación post-registro (número, nombre, premio, fechas)
- Landing: boleta ya registrada muestra confirmación al acceder con `?numero=` → `verificarBoletaAction`
- Migración: `ALTER TABLE boletas ADD COLUMN email_usuario text`
- Workflow deploy-landing: agregado `RESEND_API_KEY` como Cloudflare secret
- Gestión de Personal no mostraba asistentes → tabs Distribuidores/Asistentes con contadores
- Drawer mostraba packs para asistentes → diferenciado: asistente datos básicos, distribuidor ve packs
- Encoding UTF-8 roto en `/zonas/page.tsx` → 8 strings corregidos
- Territorios sin botón editar → EditButton + `editZonaAction`
- Queries de zonas con RLS → `supabaseAdmin`
- Scroll perdido en iOS Safari → `overflow-hidden` doble → `overflow-y-auto` en contenedor
- Botón hamburguesa se superponía al sidebar → se oculta al abrir, botón ✕ dentro del sidebar
- Login no scrolleable en pantallas pequeñas → `overflow-y-auto`
- Login descentrado en móvil → removido `mx-4` de LoginBox
- Botón hamburguesa esquina izquierda tapaba contenido → movido a `right-4`

### 2026-04-13

- URLs hardcodeadas de workers.dev → `NEXT_PUBLIC_LANDING_URL` y `NEXT_PUBLIC_ADMIN_URL` (11 archivos)
- CI/CD solo main → Workflows `main` (prod) y `dev` con URLs condicionales
- Nodemailer + SMTP Titan falló → revertido a Resend SDK
- Email invitación template simple → contenido dinámico de `configuracion_campana`
- Formulario invitación permitía doble envío → se oculta tras éxito, botón WhatsApp + "Nueva Invitación"
- WhatsApp no reseteaba formulario → reset tras 500ms
- Teléfono obligatorio invertido: WhatsApp obligatorio, Teléfono opcional (5 archivos)
- Explorador boletas sin filtro participantes → "Solo Registrados" + exportar CSV
- Comerciantes sin paginación → 10 items + CSV
- QR invitaciones re-usable → `qr_escaneado_at`, validación única, estado visual
- Scanner sin invitaciones → dos listas: Evento Recreativo (verde) + Invitaciones (purple), paginadas 10
- Asistencia admin con filtro fecha → removido, todos paginados 10

### 2026-04-17

- Botón "Compartir por WhatsApp" en drawer de invitación abría selector de contactos → agregado `comerciante_whatsapp || comerciante_tel` al `wa.me` (`InvitacionesClient.tsx:273`).
- Feature emergencia: envío masivo WhatsApp en cola secuencial (`/invitaciones`). Dos fases — selección con checkboxes + buscador → cola con abrir `wa.me`/confirmar enviado/saltar. Reutiliza flag existente `whatsapp_confirmado` para no duplicar entre sesiones. No altera `estado` de la invitación (sigue dependiendo de la respuesta del comerciante en la landing).
- Action `getPendientesEnvioWhatsappAction` filtra por `estado=pendiente`, `whatsapp_confirmado=false`, `es_prueba=false` y WhatsApp válido 10 dígitos. Admin ve todas; distribuidor solo las suyas.
- Componente `EnvioMasivoWhatsApp.tsx` reusa helper `formatWhatsAppNumber` (prefijo 57).

---

## Auditoría de Seguridad Pre-Merge (2026-04-11)

**Pages sin auth — CORREGIDO:** `/configuracion`, `/premios`, `/sorteos` sin verificación → guards `getUser()` + rol admin con `supabaseAdmin` + redirect.

**Server Actions sin auth — CORREGIDO:**
- `enviarEmailPackAction` → check sesión
- `validarQrInlineAction`, `getAsistenciaAction` → sesión + rol via `verificarRolScannerAction()`
- `anularQrAction` → sesión + rol admin/asistente

**Validación inputs landing-page — CORREGIDO:**
- Número boleta: rango 6 dígitos (100000-999999)
- `premioId`, `territorioId`: UUID regex
- `ubicacionManual`: máx 255 chars
- `email`: regex server-side
- Token `/pack/[token]`: alfanumérico, máx 64 chars

**Hardcoded fallback — CORREGIDO:** `lib/supabaseAdmin.ts` tenía URL como fallback → removida.

**RPC buscar_trazabilidad — CORREGIDO:** referenciaba enum `operativo` → estados V2, `COALESCE` en `pa.rol`, sin `fecha_despacho`. Action pasaba `p_user_id` que no aceptaba → corregido.

**Verificado seguro:** `.env.local` en `.gitignore`; service role solo en server; RLS activo; tokens con `gen_random_uuid()`; middleware redirige no autenticados; distribuidor filtrado por `distribuidor_id`.

**Pendiente (mejoras futuras):**
- Rate limiting en registro boletas y scanner (Upstash/Cloudflare)
- Headers de seguridad (CSP, CORS)
- Validación formato colombiano: cédula (5-11 dígitos), celular (10 dígitos)

---

## Migraciones BD aplicadas manualmente

```sql
ALTER TYPE rol_usuario ADD VALUE 'asistente';
ALTER TABLE packs ADD COLUMN comerciante_tipo_id text DEFAULT 'CC';
ALTER TABLE packs ADD COLUMN comerciante_identificacion text;
ALTER TABLE packs ADD COLUMN qr_usado_at timestamptz DEFAULT NULL;
ALTER TABLE packs ADD COLUMN numero_pack serial;
ALTER TABLE boletas ADD COLUMN email_usuario text;
ALTER TABLE invitaciones ADD COLUMN qr_escaneado_at timestamptz;
ALTER TABLE configuracion_campana ADD COLUMN tipos_evento text[] DEFAULT ARRAY['Lanzamiento','Capacitación','Feria Comercial','Premiación','Networking'];
ALTER TABLE configuracion_campana ADD COLUMN evento_logo_url text;
ALTER TABLE configuracion_campana ADD COLUMN evento_titulo text;
ALTER TABLE configuracion_campana ADD COLUMN evento_subtitulo text;
ALTER TABLE configuracion_campana ADD COLUMN evento_mensaje text;
ALTER TABLE configuracion_campana ADD COLUMN evento_auspiciantes text[];
DROP FUNCTION buscar_trazabilidad(text);
-- + CREATE OR REPLACE FUNCTION buscar_trazabilidad con estados V2 + numero_pack
DROP FUNCTION get_pack_publica(text);
-- + CREATE OR REPLACE FUNCTION get_pack_publica con numeros_detalle + token_qr + numero_pack
CREATE TABLE invitaciones (...);
ALTER TABLE perfiles ADD COLUMN debe_cambiar_password boolean DEFAULT false;
ALTER TABLE invitaciones ADD COLUMN jornadas_seleccionadas jsonb DEFAULT NULL;
ALTER TABLE configuracion_campana ADD COLUMN jornadas_evento jsonb DEFAULT '[...]'::jsonb;
ALTER TABLE configuracion_campana ADD COLUMN ubicacion_evento text;
ALTER TABLE configuracion_campana ADD COLUMN ubicacion_maps_url text;
ALTER TABLE configuracion_campana ADD COLUMN sesion_timeout_minutos int DEFAULT 30;
```
