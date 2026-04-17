# LavilladelMillon — Guía del proyecto

> 📚 **Archivos complementarios:**
> - [`LESSONS_LEARNED.md`](./LESSONS_LEARNED.md) — errores ya pagados (Next.js 16, Supabase, RLS, etc.)
> - [`CHANGELOG.md`](./CHANGELOG.md) — historial de fases V2, fixes y migraciones

---

## ARQUITECTURA

Monorepo con dos apps Next.js desplegadas en Cloudflare Workers:

| App | Directorio | URL Producción | URL Dev |
|-----|-----------|---------------|---------|
| Admin Dashboard | `apps/admin-dashboard` | https://admin.lavilladelmillon.com | https://lavilladelmillon-admin.guillaumer-orion.workers.dev |
| Landing Page | `apps/landing-page` | https://lavilladelmillon.com | https://landing-page.guillaumer-orion.workers.dev |

---

## STACK TECNOLÓGICO

- **Next.js 16.2.x** con **OpenNext** (`@opennextjs/cloudflare`) para edge
- **Supabase** — auth, PostgreSQL, storage
- **Cloudflare Workers** — runtime de producción
- **GitHub Actions** — CI/CD por ruta de archivos
- **Email:** Resend SDK (`lib/mailer.ts` en ambas apps). From: `"La Villa del Millón" <noreply@lavilladelmillon.com>`. Secret runtime: `RESEND_API_KEY`.

---

## DEPLOY

### Pipeline automático (GitHub Actions) — Dev/Prod por rama

| Rama | Trigger | URLs inyectadas |
|------|---------|----------------|
| `main` | Push con cambios en la app | `lavilladelmillon.com` / `admin.lavilladelmillon.com` |
| `dev` | Push con cambios en la app | `*.guillaumer-orion.workers.dev` |

Las URLs se inyectan en build-time con condicional por rama:
```yaml
NEXT_PUBLIC_LANDING_URL: ${{ github.ref == 'refs/heads/main' && 'https://lavilladelmillon.com' || 'https://landing-page.guillaumer-orion.workers.dev' }}
NEXT_PUBLIC_ADMIN_URL: ${{ github.ref == 'refs/heads/main' && 'https://admin.lavilladelmillon.com' || 'https://lavilladelmillon-admin.guillaumer-orion.workers.dev' }}
```

**Flujo:** Desarrollar en `dev` → probar → merge a `main` → producción.

### Comandos locales

```bash
npm run build:cf   # build para Cloudflare (dentro de cada app)
npm run dev        # servidor de desarrollo local
```

### Variables de entorno — Runtime vs Build-time

| Tipo | Ejemplo | Lectura | Inyección |
|------|---------|---------|-----------|
| `NEXT_PUBLIC_*` | `NEXT_PUBLIC_SUPABASE_URL` | Build-time | GitHub Secret → `env:` en step de **build** |
| Sin prefijo | `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY` | Runtime | GitHub Secret → `wrangler secret put` en step **antes del deploy** |

**Regla crítica:** pasar variable runtime solo como `env:` al step de `wrangler deploy` la deja en el proceso de deploy, **no en el Worker**. Causa 500. Ver workflow correcto en `LESSONS_LEARNED.md`.

---

## REGLAS CRÍTICAS (resumen)

Detalle y ejemplos completos en [`LESSONS_LEARNED.md`](./LESSONS_LEARNED.md).

- **Next.js 16:** usar `proxy.ts`, no `middleware.ts`. Matcher no debe excluir `/login`.
- **Cloudflare adapter:** `@opennextjs/cloudflare` (el otro está deprecado).
- **Supabase v2 query builder es inmutable** — siempre reasignar: `query = query.eq(...)`.
- **Joins Supabase retornan arrays**, no objetos — mapear con `[0]`.
- **Server Components:** siempre `supabaseAdmin` para `perfiles` y datos internos. `supabase` falla silencioso con RLS post-redirect.
- **Cloudflare vars:** no mezclar `[vars]` en wrangler.toml y `wrangler secret put` con el mismo nombre — error 10053.
- **Enums:** al eliminar un valor, actualizar todas las RPCs que hagan `enum::TEXT`.
- **V1/V2:** boletas V2 tienen `pack_id NOT NULL`, V1 `pack_id=null`. En esta campaña las V1 fueron eliminadas.
- **Porcentajes:** usar `toFixed(1)`, no `Math.round()`.

---

## BASE DE DATOS

### Estados de boletas V2

| Valor | Estado | Descripción |
|-------|--------|-------------|
| `0` | GENERADO | Número creado, asignado a un pack |
| `1` | ACTIVADO | Cliente activó el número vía link individual |
| `2` | REGISTRADO | Cliente registró datos completos |
| `3` | ANULADO | Anulado por admin |
| `4` | SORTEADO | Ganador del sorteo |

### Tabla `packs`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | uuid PK | Identificador |
| `numero_pack` | serial | Secuencial, se muestra `PACK-001` |
| `campana_id` | uuid FK | Campaña |
| `distribuidor_id` | uuid FK | Distribuidor vendedor |
| `comerciante_nombre` | text | Nombre comerciante |
| `comerciante_tipo_id` | text | CC/CE/NIT/PP |
| `comerciante_identificacion` | text | Número identificación |
| `comerciante_tel` | text | Teléfono |
| `comerciante_email` | text | Email |
| `comerciante_whatsapp` | text | WhatsApp |
| `tipo_pago` | `tipo_pago_pack` | `inmediato` \| `pendiente` |
| `estado_pago` | `estado_pago_pack` | `pagado` \| `pendiente` \| `vencido` |
| `fecha_venta` | timestamptz | |
| `fecha_vencimiento_pago` | timestamptz | Límite pago pendiente |
| `token_qr` | text UNIQUE | QR de beneficio |
| `qr_valido_hasta` | timestamptz | Expiración QR (default 8d) |
| `qr_usado_at` | timestamptz | Cuando se canjeó |
| `token_pagina` | text UNIQUE | Página temporal comerciante |

### Tabla `activaciones`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | uuid PK | |
| `boleta_id` | bigint FK | Número activado |
| `pack_id` | uuid FK | Pack al que pertenece |
| `nombre_cliente` | text | |
| `movil_cliente` | text | |
| `acepta_datos` | boolean | Habeas data |
| `fecha_activacion` | timestamptz | |

### Tabla `invitaciones`

Invitaciones a eventos con `token` único, `token_qr`, `estado` (pendiente/aceptada/rechazada), `qr_escaneado_at` (uso único), `jornadas_seleccionadas` (jsonb).

### Tabla `pre_registros`

Pre-registros de evento vía formulario público. Columnas principales: `nombre`, `nombre_negocio`, `tipo_doc`, `identificacion`, `whatsapp`, `email`, `ciudad`, `direccion`, `como_se_entero`, `jornadas_seleccionadas` (jsonb), `estado` (pendiente/invitacion_enviada/rechazado), `invitacion_id` (FK a invitaciones, se llena al aprobar), `codigo_influencer` (text, alfanumérico libre).

### Enums

| Enum | Valores |
|------|---------|
| `tipo_pago_pack` | `inmediato`, `pendiente` |
| `estado_pago_pack` | `pagado`, `pendiente`, `vencido` |
| `rol_usuario` | `admin`, `distribuidor`, `asistente` |

### Políticas RLS

**Acceso público (`anon`) para la landing:** `configuracion_campana`, `premios`, `sorteos`, `territorios`.
**Todo lo demás:** requiere sesión activa de Supabase Auth.

---

## FLUJOS DE NEGOCIO (vigentes)

### Venta de packs (`/activar` — distribuidor)

El distribuidor vende un pack de 25 números a un comerciante. Formulario captura datos del comerciante (incluyendo identificación) y tipo de pago.

- **Pago Inmediato:** `venderPackAction` → RPC `generar_pack` → crea pack + 25 boletas + `token_qr`/`token_pagina`. Confirma muestra grid 5×5, link, QR (vía `api.qrserver.com` codificando `admin-url/validar-qr/[token_qr]`), botones WhatsApp + Email.
- **Pago Pendiente:** inserta pack sin boletas (`estado_pago=pendiente`), tokens generados con `crypto.randomUUID()` para futuro. Confirma con fecha límite + WhatsApp informativo.
- **Confirmar pago** (`confirmarPagoAction`): genera 25 números aleatorios únicos (100000-999999), inserta boletas, actualiza pack a `pagado/inmediato`, genera `qr_valido_hasta` según config.

### Página pública del comerciante (`/pack/[token]` — landing)

Sin auth. RPC `get_pack_publica(p_token)` (SECURITY DEFINER, EXECUTE a `anon`) retorna `numeros` como `[{numero, estado}]` y valida expiración por `fecha_venta + dias_validez_pagina_comerciante`. Grid con botón "Compartir" por número (WhatsApp al cliente final con link `landing-url?numero=XXXXXX`). Números `estado>=2` muestran badge deshabilitado.

### Landing de registro (`/` con `?numero=XXXXXX`)

- Número pre-cargado readonly. `registrarBoletaAction` valida rango (100000-999999), inserta datos, opcional email.
- Boleta ya registrada → pantalla confirmación sin formulario (privacidad).
- Email opcional con confirmación Resend.

### Detalle de pack (`/ventas` — admin y distribuidor)

Distribuidor ve sus packs (filtrado por `distribuidor_id`), admin ve todos. Click en fila → drawer con datos, link comerciante, QR, grid 5×5 con estado individual. Reenvío WhatsApp/Copiar URL QR solo si `tipo_pago=inmediato` y `qr_usado_at IS NULL`. Datos del comerciante editables (cascada actualiza todos los packs del comerciante vía `actualizarDatosPackAction`).

### Comerciantes (`/comerciantes` — solo admin)

Directorio unificado de comerciantes consolidando 3 fuentes: packs, invitaciones y pre-registros virtuales. Agrupación por WhatsApp como clave primaria (campo obligatorio en las 3 tablas), fallback a identificación. Tabla muestra badges de origen (Pack dorado, Invitación morado, Virtual cyan) con conteos independientes. Búsqueda por nombre, identificación o WhatsApp. Export CSV incluye columnas de las 3 fuentes. Drawer editable (cascada a todos sus packs). Eliminar: activaciones → boletas → packs.

### Scanner + Asistencia (`/scanner` — admin/asistente, `/asistencia` — admin)

- **Tabs Scanner:** Escanear QR (cámara) / Buscar por Cédula (alternativa).
- `validarQrInlineAction` valida tanto QRs de pack como de invitación.
- `buscarPacksPorCedulaAction` busca por `comerciante_identificacion` packs pagados con QR vigente.
- Dos listas paginadas de 10: Evento Recreativo (verde) + Invitaciones (purple). Asistencia Admin: tabla completa, sin filtro fecha, export CSV.
- **Ruta `/validar-qr/[token_qr]`:** detalle + anular. Valida expiración, pago y canje único.

### Invitaciones a eventos (admin y distribuidor `/invitaciones`, landing `/invitacion/[token]`)

- Admin/distribuidor crea invitación (tipos parametrizables en `configuracion_campana.tipos_evento`). Envío inmediato email + botón WhatsApp post-creación.
- Landing pública: Acepto/No puedo. Al aceptar: selección obligatoria de al menos una jornada (checkboxes de `jornadas_evento`). Genera QR, envía email al comerciante y notifica distribuidor.
- Retrofit: invitaciones aceptadas pre-feature sin jornadas muestran pantalla de confirmación de jornadas (`actualizarJornadasAction`) sin regenerar QR.
- Editor contenido landing en `/configuracion`: logo, título, subtítulo, mensaje (auspiciantes resaltados en dorado), ubicación + maps URL.
- QRs de invitación con `qr_escaneado_at` — uso único.

### Pre-registros virtuales (`/registro-evento` — landing, `/pre-registros` — admin)

- **Landing pública** (`/registro-evento`): formulario sin auth. Campos: nombre*, negocio*, tipo_doc, identificación, WhatsApp*, email, ciudad, dirección, cómo se enteró, jornada (radio), **código influencer** (alfanumérico opcional, se guarda en mayúsculas).
- **Action** `registrarPreRegistroAction` inserta en `pre_registros` con `estado='pendiente'`. Columna `codigo_influencer` almacena el código libre ingresado.
- **Admin** `/pre-registros`: tabs por estado (Pendiente/Invitación Enviada/Rechazado/Todos). Búsqueda en tiempo real (debounce 400ms) por nombre, cédula, WhatsApp o código influencer. Columna "Cod. Influencer" en tabla y drawer. Botón exportar CSV con filtros aplicados.
- **Aprobar** crea invitación y envía email. **Rechazar** actualiza estado.
- Badge con conteo de pendientes en sidebar.

### Reporte de invitaciones (`/invitaciones/reporte` — solo admin)

Tabla resumen por distribuidor: total, aceptadas, pendientes, rechazadas, % conversión, jornadas escogidas. Export CSV. Alertas de actividad sospechosa (WhatsApp no confirmado, baja conversión, teléfono repetido). **Filas clickeables**: al hacer click en un distribuidor se abre drawer lateral con todas sus invitaciones individuales (comerciante, negocio, WhatsApp, email, ciudad, origen, jornada, estado, fecha).

### Dashboard Principal (`/` — admin y distribuidor)

KPIs interactivos en 3 filas de cards clickeables con link directo al módulo:
- **Fila 1 (boletas):** Campaña Activa, Total Inventario, En Punto (Activas), Convertidas (Reg)
- **Fila 2 (operación):** Total Packs, Total Invitaciones, Invitaciones Aceptadas, Asistencias Evento
- **Fila 3 (solo admin):** Pre-Registros Pendientes, Packs Pago Pendiente, Comerciantes, Personal Activo

Panel lateral: Desempeño Geográfico (ranking zonas) + Embudo de Conversión (conic-gradient). Realtime via Supabase channels (boletas, packs, invitaciones).

### Credenciales — Distribuidores y Asistentes

- **Creación:** `createPersonalAction` crea Auth user con `user_metadata.debe_cambiar_password=true` y `perfiles.debe_cambiar_password=true`. Email de bienvenida con credenciales temporales.
- **Primer login:** redirect a `/cambiar-password`. Middleware bloquea toda otra ruta vía `user_metadata`.
- **Reset por admin:** drawer en `/distribuidores` → `resetPasswordAction` actualiza password + ambos flags + email notificación.
- **Sincronización dual:** el flag vive en `user_metadata` (leído por middleware sin query extra) Y en `perfiles` (leído por login y page). Ambos se actualizan juntos en las 3 actions.

### Auto-logout por inactividad

**Problema:** refresh_token de Supabase persiste 7 días en localStorage.

**Solución dos capas:**
1. **Idle timeout client-side** (`app/components/IdleLogout.tsx`): monitorea `mousedown/keydown/touchstart/scroll/click`. 60s antes del timeout → modal con countdown. Configurable vía `configuracion_campana.sesion_timeout_minutos` (default 30, rango 5-240). Se monta en `layout.tsx` solo con usuario.
2. **Cota dura server-side** (`lib/sessionConfig.ts` + middleware): `MAX_SESSION_HOURS=8`. Cookie `lvm_session_start` creada en `login()` action **sin maxAge** (session cookie httpOnly) → muere al cerrar navegador. Middleware verifica edad y existencia; si vencida/ausente → `signOut()` + redirect.

| Capa | Dispara en | Fuente |
|------|-----------|--------|
| Idle timeout (30 min) | inactividad | cliente |
| Browser close | cierre navegador | cookie session-only |
| Absolute max (8h) | edad de la sesión | middleware |

### Rol Asistente

Acceso limitado solo a `/scanner` y `/validar-qr/[token_qr]`. Login redirige a `/scanner`. Sidebar muestra solo "Scanner QR" con badge purple.

---

## MCP CONFIGURADOS (`.claude.json` del proyecto)

| MCP | Uso |
|-----|-----|
| **Cloudflare MCP** | Workers, env vars, secrets, dominios |
| **Supabase MCP** | Consultas SQL, migraciones, revisión esquema |

---

## SOFT-DELETE DE PACKS E INVITACIONES DE PRUEBA

Flag `es_prueba boolean default false` en `packs`, `invitaciones` y `boletas`. Sólo el admin puede marcar/desmarcar desde los drawers de `/ventas` y `/invitaciones`.

- **Trigger `sync_boletas_es_prueba`:** al marcar un pack, sus boletas heredan el flag. Evita joins en queries de conteo.
- **Filtros aplicados:** listados de packs/invitaciones, reporte por distribuidor, comerciantes, asistencia, scanner (QRs de prueba no canjeables), dashboard root, cerrar sorteo. Default excluye prueba.
- **Bypass admin:** checkbox "Incluir pruebas" en `/ventas` (query string `?pruebas=1`) y `/invitaciones` (estado cliente). Distribuidor nunca ve la opción.
- **Landing pública:** `/pack/[token]` y `/invitacion/[token]` retornan "no encontrado" si el registro es prueba. El RPC `get_pack_publica` no se tocó; el check se hace en la page después del RPC vía `supabaseAdmin.from('packs').select('es_prueba')`.
- **RPCs pendientes:** `buscar_trazabilidad` aún no filtra por `es_prueba`. Si se marcan packs viejos, sus boletas pueden aparecer en trazabilidad hasta que la RPC se recree con el filtro. Incluido como paso manual en `supabase/migrations/add_es_prueba_soft_delete.sql`.
- **Actions admin-only:** `marcarPackPruebaAction` (`app/ventas/actions.ts`) y `marcarInvitacionPruebaAction` (`app/invitaciones/actions.ts`) con guard estricto `rol === 'admin'`.

## PENDIENTES ACTIVOS

Mejoras de seguridad futuras (ver contexto en `CHANGELOG.md`):
- Rate limiting en registro de boletas y scanner (Upstash/Cloudflare)
- Headers de seguridad (CSP, CORS) en Cloudflare Workers
- Validación de formato colombiano: cédula (5-11 dígitos), celular (10 dígitos)

---

## MANTENIMIENTO DE ESTOS ARCHIVOS

Fuente de verdad para agentes de IA.

**Regla:** al finalizar cualquier sesión que introduzca cambios arquitecturales, lecciones, pipeline, BD, MCPs o RLS:

- **Reglas y flujos vigentes** → actualizar `CLAUDE.md`
- **Errores ya pagados, gotchas** → agregar a `LESSONS_LEARNED.md`
- **Historial, fixes puntuales, migraciones aplicadas** → agregar a `CHANGELOG.md`

Hacer esto ANTES del commit final.
