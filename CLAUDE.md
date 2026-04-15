# LavilladelMillon — Guía del proyecto

## ARQUITECTURA

Monorepo con dos aplicaciones Next.js desplegadas en Cloudflare Workers:

| App | Directorio | URL Producción | URL Dev |
|-----|-----------|---------------|---------|
| Admin Dashboard | `apps/admin-dashboard` | https://admin.lavilladelmillon.com | https://lavilladelmillon-admin.guillaumer-orion.workers.dev |
| Landing Page | `apps/landing-page` | https://lavilladelmillon.com | https://landing-page.guillaumer-orion.workers.dev |

---

## STACK TECNOLÓGICO

- **Next.js 16.2.x** con **OpenNext** (`@opennextjs/cloudflare`) para deploy en edge
- **Supabase** — autenticación, base de datos PostgreSQL y storage
- **Cloudflare Workers** — runtime de producción
- **GitHub Actions** — CI/CD automático por ruta de archivos modificados

---

## DEPLOY

### Pipeline automático (GitHub Actions) — Dev/Prod por rama

| Rama | Trigger | URLs inyectadas |
|------|---------|----------------|
| `main` | Push con cambios en la app | `lavilladelmillon.com` / `admin.lavilladelmillon.com` |
| `dev` | Push con cambios en la app | `*.guillaumer-orion.workers.dev` |

Las URLs se inyectan en build-time con condicional por rama en el workflow:
```yaml
NEXT_PUBLIC_LANDING_URL: ${{ github.ref == 'refs/heads/main' && 'https://lavilladelmillon.com' || 'https://landing-page.guillaumer-orion.workers.dev' }}
NEXT_PUBLIC_ADMIN_URL: ${{ github.ref == 'refs/heads/main' && 'https://admin.lavilladelmillon.com' || 'https://lavilladelmillon-admin.guillaumer-orion.workers.dev' }}
```

**Flujo de trabajo:** Desarrollar en `dev` → probar → merge a `main` → producción.

No requieren GitHub Secrets — están hardcodeadas en los workflows por rama.

### Comandos locales

```bash
npm run build:cf   # build para Cloudflare (dentro de cada app)
npm run dev        # servidor de desarrollo local
```

### Variables de entorno — Runtime vs Build-time

| Tipo | Ejemplo | Cuándo se lee | Cómo inyectar |
|------|---------|--------------|----------------|
| `NEXT_PUBLIC_*` | `NEXT_PUBLIC_SUPABASE_URL` | Build-time (baked en bundle) | GitHub Secret → `env:` en step de **build** |
| Sin prefijo | `SUPABASE_SERVICE_ROLE_KEY` | Runtime (en el Worker) | GitHub Secret → `wrangler secret put` en step **antes del deploy** |

**Regla crítica:** pasar una variable runtime solo como `env:` en el step de `wrangler deploy`
la hace disponible para el proceso de deploy, **no para el Worker en producción**. Causa error 500.

El workflow correcto para variables runtime:
```yaml
- name: Set Cloudflare secrets
  run: echo "$SUPABASE_SERVICE_ROLE_KEY" | npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
  env:
    CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}

- name: Deploy to Cloudflare Workers
  run: npx wrangler deploy
  env:
    CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

---

## LECCIONES APRENDIDAS — NO REPETIR ESTOS ERRORES

### Next.js 16

- Usa **`proxy.ts`**, no `middleware.ts` — la API cambió en Next.js 16.

### Adapter de Cloudflare

- **`@cloudflare/next-on-pages` está deprecado.** Siempre usar **`@opennextjs/cloudflare`**.

### SDK de Supabase v2 — query builder inmutable

El query builder es **inmutable**: cada método devuelve un *nuevo* objeto.
Nunca mutar el builder original; siempre reasignar el resultado:

```typescript
// MAL — el filtro .eq() se pierde, query no se modifica
let query = supabase.from('boletas').select('*')
if (distribuidorId) {
  query.eq('distribuidor_id', distribuidorId)  // ← resultado descartado
}

// BIEN — reasignar siempre
let query = supabase.from('boletas').select('*')
if (distribuidorId) {
  query = query.eq('distribuidor_id', distribuidorId)
}
```

### Variables de entorno en Cloudflare Workers — no mezclar [vars] y secrets

Si una variable existe en `wrangler.toml [vars]` **y** se intenta crear como
secret con `wrangler secret put`, falla con error `10053: Binding name already in use`.
Solución: elegir uno solo — o `[vars]` (texto plano, visible en dashboard)
o secret encriptado (via `wrangler secret put`). Nunca ambos.

### Porcentajes y fracciones pequeñas

- **`Math.round()` aplasta fracciones pequeñas** → usar **`toFixed(1)`** para mostrar
  porcentajes con un decimal (ej: conversión en embudo).

### supabase vs supabaseAdmin en Server Components

- **SIEMPRE usar `supabaseAdmin`** para queries de `perfiles` y datos internos en
  Server Components (`layout.tsx`, `page.tsx`).
- `supabase` (cliente autenticado via `createClient()`) puede fallar silenciosamente
  con RLS después de redirects, causando loops o "Rendering..." indefinido.
- `supabase` solo usar en componentes cliente para operaciones del usuario autenticado.

### Middleware matcher en Next.js 16

- **No excluir `/login`** del matcher — si se excluye, el middleware no redirige
  usuarios autenticados de `/login` a `/`, causando sidebar + login form simultáneos.
- Envolver `getUser()` en try-catch para que fallos no causen redirect loops.
- Patrón correcto del matcher:
  ```
  /((?!_next/static|_next/image|api|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)
  ```

### Joins de Supabase retornan arrays, no objetos

Los joins con `!foreign_key(columna)` en el query builder de Supabase retornan
**arrays**, no objetos individuales. Siempre mapear el resultado:

```typescript
// El join retorna: { distribuidor: [{ nombre: 'Juan' }] }
// NO retorna:      { distribuidor: { nombre: 'Juan' } }

// Solución: mapear con [0] o fallback
const mapped = data.map((p: any) => ({
  ...p,
  distribuidor: Array.isArray(p.distribuidor) ? p.distribuidor[0] || null : p.distribuidor,
}));
```

Si no se mapea, TypeScript falla en build con error de tipos incompatibles.

### Enums eliminados persisten en RPCs y queries

Al eliminar un valor de un enum PostgreSQL (ej: `operativo` de `rol_usuario`),
las RPCs almacenadas que referencian ese enum siguen usando la versión anterior.
Si una RPC hace `columna::TEXT` sobre un enum, falla con:
`invalid input value for enum rol_usuario: operativo`

**Checklist al eliminar un valor de enum:**
1. Buscar TODAS las RPCs que leen columnas del enum (`\df` en psql)
2. Actualizar cada RPC con `DROP FUNCTION` + `CREATE OR REPLACE`
3. Usar `COALESCE(columna::TEXT, '')` para proteger contra valores residuales
4. Verificar datos residuales en la tabla antes de alterar el enum

### Coexistencia de datos V1 y V2

- Las boletas antiguas (bodega manual) coexisten con las nuevas (generadas por pack).
- Las nuevas boletas V2 tienen `pack_id NOT NULL`.
- Las antiguas tienen `pack_id = null`.
- Los filtros y queries deben considerar ambos casos durante la transición.

---

## EMAIL — Resend API

**Proveedor:** Resend (resend.com)
**From:** `"La Villa del Millón" <noreply@lavilladelmillon.com>`
**Helper:** `lib/mailer.ts` en ambas apps — función `sendMail(to, subject, html)` con logging
**SDK:** `resend` (npm package)

**Variable de entorno (runtime secret en Cloudflare):**
- `RESEND_API_KEY` — API key de Resend

**Nota:** Se intentó Nodemailer + SMTP Titan (GoDaddy) pero falló por incompatibilidad de autenticación (AUTH PLAIN rechazado, certificado auto-firmado). Se revirtió a Resend.

**Archivos que envían email:**
- `admin-dashboard/app/activar/actions.ts` — email pack al comerciante
- `admin-dashboard/app/invitaciones/actions.ts` — invitación + recordatorio
- `landing-page/app/actions.ts` — confirmación registro participante
- `landing-page/app/invitacion/[token]/actions.ts` — QR aceptación + notificación distribuidor

---

## REDISEÑO V2 — EN PROGRESO

**Rama activa:** `feature/rediseno-packs-v2`

### Concepto central del rediseño

El modelo logístico cambia de boletas individuales asignadas por rango a **packs de 25 números generados aleatoriamente** que el distribuidor vende directamente a un comerciante. Cada número tiene un link único que el comerciante distribuye a sus clientes.

### Estado de fases

| Fase | Estado | Descripción |
|------|--------|-------------|
| **Fase 1** | ✅ Completada | Migraciones de base de datos |
| **Fase 2** | ✅ Completada | Limpieza de código — módulos y rol obsoletos |
| **Fase 3** | ✅ Completada | Nuevo módulo de venta de packs |
| **Fase 4** | ✅ Completada | Comunicación WhatsApp/email con links individuales |
| **Fase 5** | ✅ Completada | Página temporal del comerciante `/pack/[token]` en landing-page |
| **Fase 6** | ✅ Completada | Actualizar módulos existentes con nuevos estados |

### Fase 1 — Migraciones aplicadas en Supabase

| Migración | Descripción |
|-----------|-------------|
| `create_packs_table` | Nueva tabla `packs` con enums `tipo_pago_pack` y `estado_pago_pack` |
| `create_activaciones_table` | Nueva tabla `activaciones` para registrar activaciones de números individuales |
| `add_pack_columns_to_boletas` | `pack_id` (FK → packs), `token_link` (text unique) + índices |
| `add_config_campana_columns` | `dias_vencimiento_pago` (default 8), `dias_validez_qr` (default 8), `numeros_por_pack` (default 25) |
| `remove_operativo_from_rol_enum` | Enum `rol_usuario` ahora solo tiene `admin` y `distribuidor` |
| `create_rpc_generar_pack` | RPC que genera 25 números aleatorios únicos y crea el pack |
| `create_rpc_activar_numero` | RPC que activa un número individual vía `token_link` |

### Fase 3 — Módulo Venta de Packs (`/activar`)

La ruta `/activar` fue completamente reemplazada. Ya no activa boletas individuales — ahora vende packs de 25 números a comerciantes.

**Archivos:**

| Archivo | Rol |
|---------|-----|
| `app/activar/page.tsx` | Server component: carga perfil del distribuidor y config de campaña (`dias_vencimiento_pago`) |
| `app/activar/VenderPackForm.tsx` | Client component con máquina de estados: `form` → `success` |
| `app/activar/actions.ts` | `venderPackAction`: llama RPC `generar_pack`, actualiza pack con datos del comerciante |

**Flujo de `venderPackAction`:**
1. Verifica sesión → rol `distribuidor`
2. Lee `configuracion_campana` (id, dias_vencimiento_pago, dias_validez_qr)
3. Llama RPC `generar_pack(p_dist_id, p_campana_id)` → crea pack + 25 boletas con `token_link` único cada una
4. Actualiza el pack: comerciante_nombre, tel, email, whatsapp, tipo_pago, estado_pago, fecha_vencimiento_pago
5. Devuelve: token_pagina, token_qr, qr_valido_hasta, array de 25 números

**Pantalla de confirmación muestra:**
- Grid 5×5 con los 25 números en formato `000000`
- Link del comerciante: `landing-url/pack/[token_pagina]` con botón copiar
- QR de beneficio recreativo (solo si `tipo_pago = 'inmediato'`):
  - Imagen generada via `api.qrserver.com`
  - Codifica: `lavilladelmillon-admin.guillaumer-orion.workers.dev/validar-qr/[token_qr]`
  - La ruta `/validar-qr/[token_qr]` se construirá en Fase 6
- Si pago pendiente: aviso con fecha límite, QR se activa al confirmar pago

### Fase 4 — Comunicación WhatsApp y Email

Botones en la pantalla de confirmación de `VenderPackForm.tsx` para enviar el pack al comerciante.

**WhatsApp:** Link `wa.me/?text=...` con mensaje pre-formado que incluye nombre del comerciante y URL del pack. Siempre disponible.

**Email (Resend):**
- Server action `enviarEmailPackAction` en `actions.ts`
- Remitente modo pruebas: `onboarding@resend.dev`
- Template HTML inline con estilo dark/dorado: saludo, grid 5×5 de números, botón CTA al pack
- Solo visible si el comerciante tiene email registrado
- Estados del botón: idle → sending → sent / error (con reintento)

**Variable de entorno:** `RESEND_API_KEY` — runtime secret en Cloudflare Worker (`wrangler secret put RESEND_API_KEY`)

### Fase 5 — Página del Comerciante (`/pack/[token]`) en landing-page

Página pública (sin autenticación) donde el comerciante ve sus 25 números y los comparte por WhatsApp.

**Migración aplicada:** `fase5_pack_publica`
- Agrega `dias_validez_pagina_comerciante int DEFAULT 30` a `configuracion_campana`
- Crea RPC `get_pack_publica(p_token text)` — SECURITY DEFINER con `GRANT EXECUTE TO anon`
- La RPC valida expiración basada en `fecha_venta + dias_validez_pagina_comerciante`

**Archivos:**

| Archivo | Rol |
|---------|-----|
| `app/pack/[token]/page.tsx` | Server component: llama RPC `get_pack_publica`, maneja error/not found/expired |
| `app/pack/[token]/PackPageClient.tsx` | Client component: grid de números con botón WhatsApp por cada uno |

**Funcionalidad:**
- Cada número muestra botón "Compartir" que abre WhatsApp con mensaje pre-formado incluyendo link de registro
- Botón "Copiar todos" copia lista completa de números al portapapeles
- Header muestra nombre del comerciante, cantidad de números y fecha de vencimiento
- URL de WhatsApp: `https://wa.me/?text=...número XXXXXX...landing-url?numero=XXXXXX`

### Fase 6 — Módulos actualizados y ruta /validar-qr

**Migración aplicada:** `add_qr_usado_at_to_packs` — agrega `qr_usado_at timestamptz` a `packs`

**Nueva ruta: `/validar-qr/[token_qr]`**
- Protegida (requiere auth)
- Muestra datos del comerciante, tipo/estado de pago, validez del QR
- Botón "Registrar Asistencia y Anular QR" con confirmación
- Valida: QR expirado, pago no confirmado, ya canjeado

**Módulo `/boletas` actualizado:**
- Estados: 0=GENERADO, 1=ACTIVADO, 2=REGISTRADO, 3=ANULADO, 4=SORTEADO
- Nueva columna `pack_id` en tabla
- Timeline simplificado: Generación → Activación → Registro → Sorteo

**Módulo `/ventas` reescrito:**
- Ahora muestra packs vendidos (tabla `packs`) en vez de `ventas_clientes`
- Columnas: Comerciante, Distribuidor, Tipo Pago, Estado Pago, Fecha Venta, Vencimiento, # Números

**Módulo `/trazabilidad` actualizado:**
- Cadena logística: 3 pasos (Generado → Activado → Registrado)
- Sección "Pack / Distribuidor" reemplaza "Despachado Por"

**`lib/actions.ts` limpiado:**
- Eliminadas: `getLotesLogisticos`, `getInventarioDistribuidorAction`, `verificarRangoBodegaAction`, `crearLoteBodegaAction`
- Agregadas: `getPacksPaged`, `getPacksDistribuidorAction`
- Actualizados estados en: `getDashboardCounts`, `getRankingZonas`, `cerrarSorteoAction`

### Identificador de Pack (PACK-XXX)

Cada pack tiene un número secuencial auto-incremental `numero_pack serial` en la tabla `packs`.
Se muestra formateado como `PACK-001`, `PACK-002`, etc.

**Visible en:**
- Pantalla de confirmación de venta (VenderPackForm) — tanto inmediato como pendiente
- Tabla de ventas (VentasClient) — primera columna "Pack"
- Drawer de detalle del pack — en el header

**Migración BD:** `ALTER TABLE packs ADD COLUMN numero_pack serial`

**Integración en todos los módulos:**
- Explorador Boletas: tabla muestra `PACK-XXX` en vez de UUID truncado. Drawer de detalle muestra sección "Pack de Origen" con número y comerciante.
- Trazabilidad: RPC `buscar_trazabilidad` incluye join a packs para `numero_pack`. ResultCard muestra `PACK-XXX` en sección "Pack / Distribuidor".
- Asistencia Evento: tabla y CSV muestran `PACK-XXX` en vez de UUID. Scanner lista asistencia con `PACK-XXX`.
- Landing comerciante: header muestra `PACK-XXX` debajo del nombre del comerciante.

**RPCs actualizadas:**
- `buscar_trazabilidad` → `LEFT JOIN public.packs pk ON b.pack_id = pk.id` + retorna `numero_pack`
- `get_pack_publica` → retorna `numero_pack` en el JSON

### Módulo Comerciantes (`/comerciantes` — solo admin)

**Directorio centralizado** de todos los comerciantes registrados via venta de packs.

**Tabla:** Nombre, Identificación, Teléfono, Distribuidor, # Packs, Fecha registro. Búsqueda por nombre o cédula.

**Drawer de detalle:**
- Datos editables (nombre, tipo doc, teléfono, WhatsApp, email)
- Guardar actualiza TODOS los packs del comerciante
- Eliminar con confirmación — cascada: activaciones → boletas → packs

**Edición desde distribuidor:**
- Drawer de /ventas tiene datos del comerciante editables en TODOS los estados
- `actualizarDatosPackAction` verifica que el distribuidor sea dueño del pack
- Botón "Guardar Cambios" en packs pagados

**Archivos:** `app/comerciantes/{page,ComerciantesClient,actions}.tsx`
**Sidebar:** "🏪 Comerciantes" en sección PERSONAL (solo admin)

### Control de duplicados y estado visual por número

**Página del comerciante `/pack/[token]`:**
- RPC `get_pack_publica` retorna `numeros` como JSON array `[{numero, estado}, ...]`
- Cada número muestra su estado visual:
  - `estado < 2` → botón "Compartir" verde normal
  - `estado >= 2` → badge "✅ Registrado" con fondo verde, botón deshabilitado
- Header muestra contador de registrados: "✅ N registrados"
- "Copiar todos" solo copia números disponibles (no registrados)

**Landing `?numero=XXXXXX` con número ya registrado:**
- Si `estado=2` → pantalla genérica sin datos personales (privacidad):
  "Este número ya fue registrado y está participando en el sorteo.
  Si crees que es un error contacta a tu distribuidor."
- No muestra formulario, nombre ni datos del titular anterior

### Lógica de Pago Inmediato vs Pendiente

**Pago Inmediato:**
1. `venderPackAction` llama RPC `generar_pack` → crea pack + 25 boletas
2. Pack queda con `estado_pago='pagado'`, QR y tokens generados
3. Pantalla de confirmación muestra: 25 números, link, QR, botones WhatsApp/Email

**Pago Pendiente:**
1. `venderPackAction` inserta directamente en `packs` sin llamar RPC
2. Pack queda con `estado_pago='pendiente'`, sin boletas, sin QR activo
3. Pantalla de confirmación muestra: reserva registrada, fecha vencimiento, botón WhatsApp informativo
4. Tokens `token_pagina` y `token_qr` se generan con `crypto.randomUUID()` para uso futuro

**Confirmar Pago (`confirmarPagoAction`):**
1. Distribuidor o admin va a Mis Packs → abre drawer del pack pendiente
2. Botón "Confirmar Pago y Generar Pack"
3. Action verifica sesión, rol, y que el pack sea del distribuidor
4. Genera 25 números aleatorios únicos (100000-999999) con verificación de duplicados
5. Inserta boletas, actualiza pack a `estado_pago='pagado'`, `tipo_pago='inmediato'`
6. Genera `qr_valido_hasta` según `dias_validez_qr` de configuración
7. Drawer se recarga mostrando los números y QR generados

### Post-Fase 6 — Detalle de Pack y Reenvío de QR

**Drawer de detalle de pack** en `/ventas` (VentasClient.tsx):
- Se abre al hacer click en cualquier fila de la tabla de packs
- Muestra: datos del comerciante, tipo/estado de pago, link del comerciante, QR de beneficio, grid 5x5 de números con estado individual
- `getPackDetail(packId)` en `lib/actions.ts` — trae pack completo + boletas con estado

**Reenvío de QR de beneficio:**
- Botón "Reenviar WhatsApp" envía QR via `wa.me/` al comerciante
- Botón "Copiar URL QR" copia la URL de la imagen QR
- Solo disponible si `tipo_pago = 'inmediato'` Y `qr_usado_at IS NULL`
- Si QR canjeado: muestra "QR ya utilizado el [fecha]" sin botones

**Acceso distribuidor a `/ventas`:**
- `/ventas` ahora accesible para distribuidores (antes solo admin)
- Filtra automáticamente por `distribuidor_id` del usuario
- Admin ve todos los packs, distribuidor solo los suyos
- Sidebar del distribuidor incluye "📦 Mis Packs" apuntando a `/ventas`

### Módulo de Invitaciones a Eventos

**Tabla BD:** `invitaciones` con estado (pendiente/aceptada/rechazada), token único, token_qr para asistencia.

**Admin-dashboard `/invitaciones`:**
- Admin ve todas las invitaciones, distribuidor ve las suyas
- Formulario: tipo evento (parametrizable), datos comerciante, envío WhatsApp + email
- Tabs: Todas / Aceptadas / Pendientes
- Botón "Reenviar" para invitaciones pendientes/rechazadas

**Landing-page `/invitacion/[token]`:**
- Página pública con mensaje de bienvenida y auspiciantes (KIA, YAMAHA, ODONTO PROTECT)
- Botones "Acepto" / "No puedo asistir"
- Al aceptar: genera QR, envía email con QR al comerciante, notifica al distribuidor
- Si ya aceptada: muestra QR existente
- Si rechazada: mensaje de agradecimiento

**Editor de contenido de landing de evento (Nivel 1):**
- Columnas en `configuracion_campana`: `evento_logo_url`, `evento_titulo`, `evento_subtitulo`, `evento_mensaje`, `evento_auspiciantes text[]`
- Editable desde Configuración (Llaves Maestras) — sección "Contenido Landing Evento"
- Logo uploadeable, título, subtítulo, mensaje de bienvenida (textarea), auspiciantes dinámicos
- Los nombres de auspiciantes se resaltan automáticamente en dorado en el mensaje
- La landing `/invitacion/[token]` lee estos campos de la BD en vez de tener texto hardcodeado

**Tipos de evento parametrizables:**
- Columna `tipos_evento text[]` en `configuracion_campana`
- Editable desde Configuración (Llaves Maestras) — sección "Tipos de Evento"
- Default: Lanzamiento, Capacitación, Feria Comercial, Premiación, Networking

**Scanner:** `validarQrInlineAction` busca en packs Y en invitaciones. QRs de invitación también se validan.

**Envío inmediato post-creación:**
- Al crear invitación: email se envía automáticamente si tiene correo
- Mensaje de éxito muestra botón "📲 Enviar por WhatsApp" directamente (sin abrir drawer)
- WhatsApp usa `wa.me/{numero}?text=...` con número del comerciante como destinatario
- En la tabla: botón WhatsApp por fila también usa número directo del comerciante

**Drawer de detalle:** Click en fila → drawer lateral con:
- Datos comerciante editables (nombre, dirección, teléfono, WhatsApp, email) en todos los estados
- `actualizarInvitacionAction` para guardar cambios
- Info del evento (tipo, fecha creación, estado badge)
- Link de invitación con copiar + compartir WhatsApp
- QR de asistencia (si aceptada) con descargar
- Acciones: reenviar email, reactivar si rechazada

**Sidebar:** "🎪 Invitaciones" para distribuidor, "🎪 Invitaciones Evento" para admin en sección LOGÍSTICA.

**Archivos:**
- `admin-dashboard/app/invitaciones/{page,InvitacionesClient,actions}.tsx`
- `landing-page/app/invitacion/[token]/{page,InvitacionClient,actions}.tsx`
- `admin-dashboard/app/components/ConfiguracionManager.tsx` — tipos evento
- `admin-dashboard/app/scanner/actions.ts` — soporte QR invitaciones

### Scanner — Búsqueda por Cédula

Alternativa al escaneo QR cuando la cámara no funciona.

**Tabs en `/scanner`:** "📷 Escanear QR" (default) | "🔍 Buscar por Cédula"

**Tab Cédula:**
- Campo: número de identificación del comerciante
- `buscarPacksPorCedulaAction(cedula)` — busca packs con `comerciante_identificacion` y `estado_pago='pagado'`
- Resultados muestran: nombre, fecha compra, estado QR (Vigente/Canjeado/Vencido)
- Botón "Usar este QR" solo en QRs vigentes → llama `validarQrInlineAction`
- Tras canjear: recarga resultados + lista de asistencia

### Módulo Asistencia a Evento

**Scanner `/scanner` (Asistente + Admin):**
- Validación inline sin redirect — `validarQrInlineAction` en `app/scanner/actions.ts`
- Toast de éxito/error tras cada validación
- Lista de asistencia de hoy debajo del scanner, recarga automática
- `getAsistenciaAction(fecha?)` — query packs con `qr_usado_at` en la fecha

**Asistencia Admin `/asistencia` (solo Admin):**
- Tabla completa: hora, comerciante, teléfono, WhatsApp, distribuidor
- Filtro por fecha (hoy por defecto)
- Exportar CSV client-side
- Sidebar: "📋 Asistencia Evento" en sección LOGÍSTICA

**Archivos:**
- `app/scanner/actions.ts` — `getAsistenciaAction`, `validarQrInlineAction`
- `app/asistencia/page.tsx` + `AsistenciaClient.tsx` — Vista admin completa

### Fase 2 — Eliminados

- Rutas y componentes: `/bodega`, `/asignaciones`, `/mis-distribuidores`
- Rol `operativo` eliminado de UI, actions, checks de acceso y enum de BD
- RPCs obsoletas: `validar_rango_boletas`, `sugerir_proximo_lote`, `asignar_lote_boletas`

---

## BASE DE DATOS

### Estados de boletas — NUEVOS (Rediseño V2)

| Valor | Estado | Descripción |
|-------|--------|-------------|
| `0` | GENERADO | Número creado aleatoriamente, asignado a un pack |
| `1` | ACTIVADO | Cliente activó su número vía link individual |
| `2` | REGISTRADO | Cliente registró sus datos completos |
| `3` | ANULADO | Anulado por admin |
| `4` | SORTEADO | Ganador del sorteo |

### Tabla `packs`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | uuid PK | Identificador del pack |
| `campana_id` | uuid FK | Campaña a la que pertenece |
| `distribuidor_id` | uuid FK | Distribuidor que vendió el pack |
| `comerciante_nombre` | text | Nombre del comerciante comprador |
| `comerciante_tel` | text | Teléfono del comerciante |
| `comerciante_email` | text | Email del comerciante |
| `comerciante_whatsapp` | text | WhatsApp del comerciante |
| `tipo_pago` | `tipo_pago_pack` | `inmediato` \| `pendiente` |
| `estado_pago` | `estado_pago_pack` | `pagado` \| `pendiente` \| `vencido` |
| `fecha_venta` | timestamptz | Momento de la venta |
| `fecha_vencimiento_pago` | timestamptz | Límite para pago pendiente |
| `token_qr` | text UNIQUE | Token del QR de beneficio recreativo |
| `qr_valido_hasta` | timestamptz | Expiración del QR (configurable, default 8 días) |
| `token_pagina` | text UNIQUE | Token para la página temporal del comerciante |

### Tabla `activaciones`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | uuid PK | Identificador de la activación |
| `boleta_id` | bigint FK | Número activado |
| `pack_id` | uuid FK | Pack al que pertenece |
| `nombre_cliente` | text | Nombre del cliente final |
| `movil_cliente` | text | Móvil del cliente final |
| `acepta_datos` | boolean | Habeas data aceptado |
| `fecha_activacion` | timestamptz | Momento de activación |

### Enums nuevos

| Enum | Valores |
|------|---------|
| `tipo_pago_pack` | `inmediato`, `pendiente` |
| `estado_pago_pack` | `pagado`, `pendiente`, `vencido` |
| `rol_usuario` | `admin`, `distribuidor`, `asistente` *(eliminado: `operativo`)* |

### Rol Asistente — Encargado de Evento

Perfil con acceso limitado para validar QRs de beneficio recreativo en eventos.

**Acceso permitido:** solo `/scanner` y `/validar-qr/[token_qr]`

**Flujo:**
1. Admin crea asistente desde `/distribuidores` (Gestión de Personal)
2. Asistente hace login → redirect automático a `/scanner`
3. En `/scanner`: ingresa token QR manualmente o escanea con cámara del dispositivo
4. Se redirige a `/validar-qr/[token]` donde valida y registra asistencia

**Archivos:**
- `app/scanner/page.tsx` + `ScannerClient.tsx` — Página del scanner
- `app/login/actions.ts` — Redirect post-login por rol
- `app/page.tsx` — Redirige asistente a `/scanner`
- `app/components/Sidebar.tsx` — Menú exclusivo con "Scanner QR"
- `app/distribuidores/CreateDistForm.tsx` — Selector de rol (distribuidor/asistente)

**Sidebar:** Badge purple, label "Asistente", solo muestra "📷 Scanner QR"

---

## POLÍTICAS RLS DE SUPABASE

### Acceso público (rol `anon`) — para la landing page

Las siguientes tablas tienen políticas RLS que permiten lectura sin autenticación:

- `configuracion_campana`
- `premios`
- `sorteos`
- `territorios`

### Requieren autenticación

Todo el resto de tablas requiere sesión activa de Supabase Auth.

---

## MCP CONFIGURADOS (`.claude.json` del proyecto)

| MCP | Uso |
|-----|-----|
| **Cloudflare MCP** | Gestión de Workers, variables de entorno, secretos, dominios |
| **Supabase MCP** | Consultas SQL, migraciones de base de datos, revisión de esquema |

---

## FIXES POST-IMPLEMENTACIÓN V2

- [2026-04-10] Encoding UTF-8 roto en `/distribuidores/page.tsx` (caracteres mojibake `GestiÃ³n`, `MÃ³dulo`, etc.) → Corregidos 5 strings a UTF-8 correcto → `app/distribuidores/page.tsx`
- [2026-04-10] Queries de perfiles y zonas en `/distribuidores` retornaban vacío por RLS → Cambiadas de `supabase` a `supabaseAdmin` → `app/distribuidores/page.tsx`
- [2026-04-10] Sidebar mostraba "GUEST - Cargando..." después del login → Queries de perfil y config en layout cambiadas a `supabaseAdmin` → `app/layout.tsx`
- [2026-04-10] Dashboard "Rendering..." indefinido para distribuidores → Query de perfil en page.tsx cambiada a `supabaseAdmin` → `app/page.tsx`
- [2026-04-10] Loop infinito de `GET /` en dashboard → `fetchPagedData` tenía `total` en deps de `useCallback` causando ciclo → Removido de dependencias → `app/components/RealtimeDashboard.tsx`
- [2026-04-10] Módulo `/activar` mostraba "Módulo exclusivo" al distribuidor → Query de perfil cambiada a `supabaseAdmin` → `app/activar/page.tsx`
- [2026-04-10] Todas las pages con guard de rol fallaban por RLS post-redirect → Migradas a `supabaseAdmin` → `app/{boletas,trazabilidad,ventas,zonas}/page.tsx`
- [2026-04-10] Estados de boletas con valores del esquema viejo en `RealtimeDashboard.tsx` y `page.tsx` → Actualizados a V2 (0=Generado, 1=Activado, 2=Registrado) → `app/components/RealtimeDashboard.tsx`, `app/page.tsx`
- [2026-04-10] Server actions fallaban por RLS al verificar rol del usuario → Todas las queries de `perfiles` en actions migradas a `supabaseAdmin` → `app/{activar,trazabilidad,zonas,distribuidores}/actions.ts`
- [2026-04-10] Encoding UTF-8 roto en `/configuracion/page.tsx` → Corregido mojibake en metadata → `app/configuracion/page.tsx`
- [2026-04-10] Módulo Configuración (Llaves Maestras) no tenía campos de plazos V2 → Agregada sección "Plazos y Vencimientos" con `dias_validez_pagina_comerciante`, `dias_validez_qr`, `dias_vencimiento_pago` → `app/components/ConfiguracionManager.tsx`
- [2026-04-10] Boletas antiguas V1 (pack_id IS NULL) eliminadas de la BD → DELETE cascada: activaciones, ventas_clientes, trazabilidad_geografica, boletas (1050 registros) → SQL directo en Supabase
- [2026-04-10] PackDetailDrawer usaba `useState` para cargar datos → Error "Cannot update component while rendering" → Cambiado a `useEffect` con `[packId]` → `app/ventas/VentasClient.tsx`
- [2026-04-10] Formulario Vender Pack no capturaba identificación del comerciante → Agregados campos tipo documento (CC/CE/NIT/PP) y número de identificación → `app/activar/VenderPackForm.tsx`, `app/activar/actions.ts`
- [2026-04-10] Drawer de detalle de pack no mostraba identificación → Agregado campo identificación en sección comerciante → `app/ventas/VentasClient.tsx`
- [2026-04-10] Landing: "Failed to send request to Edge Function" al registrar → Edge Function `registrar-boleta` no desplegada y con lógica V1 → Reemplazada por Server Action `registrarBoletaAction` con estados V2 y `supabaseAdmin` → `apps/landing-page/app/actions.ts`, `apps/landing-page/app/page.tsx`
- [2026-04-10] Landing: campo número de boleta no se pre-cargaba con query param `?numero=` → Agregado `useSearchParams` + campo readonly con estilo dorado y candado → `apps/landing-page/app/page.tsx`
- [2026-04-11] Landing: campo email opcional + email confirmación con Resend tras registro → `apps/landing-page/app/actions.ts`, `apps/landing-page/app/page.tsx`
- [2026-04-11] Landing: pantalla de confirmación post-registro (número, nombre, premio, fechas) → Reemplaza simple "Registrada con éxito" → `apps/landing-page/app/page.tsx`
- [2026-04-11] Landing: boleta ya registrada muestra confirmación directamente al acceder con `?numero=` → `verificarBoletaAction` + pantalla de confirmación → `apps/landing-page/app/actions.ts`
- [2026-04-11] Migración BD: `ALTER TABLE boletas ADD COLUMN email_usuario text` (aplicada manualmente)
- [2026-04-11] Workflow deploy-landing: agregado `RESEND_API_KEY` como Cloudflare secret → `.github/workflows/deploy-landing.yml`
- [2026-04-11] Gestión de Personal no mostraba asistentes → Agregados tabs Distribuidores/Asistentes con contadores → `app/distribuidores/page.tsx`, `GestionPersonalClient.tsx`
- [2026-04-11] Drawer de detalle mostraba packs para asistentes → Diferenciado por rol: asistente solo ve datos básicos, distribuidor ve packs → `GestionPersonalClient.tsx`
- [2026-04-11] Encoding UTF-8 roto en `/zonas/page.tsx` → Corregidos 8 strings mojibake (Catálogo, Logísticas, etc.) → `app/zonas/page.tsx`
- [2026-04-11] Territorios sin botón editar → Agregado EditButton con formulario inline (nombre + descripción) + `editZonaAction` → `app/zonas/page.tsx`, `app/zonas/actions.ts`
- [2026-04-11] Queries de zonas usaban `supabase` con RLS → Cambiadas a `supabaseAdmin` (insert, delete, select, update) → `app/zonas/page.tsx`, `app/zonas/actions.ts`
- [2026-04-11] Scroll perdido en iOS Safari → `overflow-hidden` doble en body+contenedor bloqueaba scroll → Cambiado a `overflow-y-auto` en contenedor, removido del body → `app/layout.tsx`
- [2026-04-11] Botón hamburguesa se superponía al sidebar abierto → Botón se oculta al abrir, botón ✕ dentro del sidebar para cerrar → `app/components/Sidebar.tsx`
- [2026-04-11] Login no scrolleable en pantallas pequeñas → Cambiado `overflow-hidden` a `overflow-y-auto` → `app/login/page.tsx`
- [2026-04-11] Login descentrado en móvil → Removido `mx-4` de LoginBox que desplazaba el formulario → `app/login/LoginBox.tsx`
- [2026-04-11] Botón hamburguesa en esquina izquierda tapaba contenido → Movido a esquina superior derecha (`right-4`) → `app/components/Sidebar.tsx`

### Auditoría de Seguridad Pre-Merge (2026-04-11)

**Pages sin auth — CORREGIDO:**
- `/configuracion`, `/premios`, `/sorteos` no tenían verificación de sesión ni rol → Agregados guards `getUser()` + verificación rol admin con `supabaseAdmin` + redirect

**Server Actions sin auth — CORREGIDO:**
- `enviarEmailPackAction` (activar/actions.ts) → Agregado check de sesión
- `validarQrInlineAction` y `getAsistenciaAction` (scanner/actions.ts) → Agregado check sesión + rol admin/asistente via `verificarRolScannerAction()`
- `anularQrAction` (validar-qr/actions.ts) → Agregado check sesión + rol admin/asistente

**Validación de inputs en landing-page — CORREGIDO:**
- Número de boleta: validación rango 6 dígitos (100000-999999)
- `premioId` y `territorioId`: validación formato UUID con regex
- `ubicacionManual`: máximo 255 caracteres
- `email`: validación formato server-side con regex
- Token en `/pack/[token]`: alfanumérico, máximo 64 caracteres

**Hardcoded fallback — CORREGIDO:**
- `lib/supabaseAdmin.ts` del admin tenía URL del proyecto como fallback → Removida, usa `?? ''`

**RPC buscar_trazabilidad — CORREGIDO:**
- RPC en BD referenciaba enum `operativo` eliminado → Actualizada con estados V2, `COALESCE` en `pa.rol`, sin `fecha_despacho`
- Action pasaba `p_user_id` que la RPC no aceptaba → Corregido a solo `p_query` con `supabaseAdmin`

**Verificado como seguro:**
- `.env.local` nunca fue commiteado (está en `.gitignore` línea 19)
- Service role key solo en server components/actions, no expuesto al cliente
- RLS activado en tablas sensibles
- Tokens QR generados con `gen_random_uuid()` (no predecibles)
- Middleware redirige no autenticados a `/login`
- Distribuidor solo ve sus propios packs filtrado por `distribuidor_id`

**Pendiente (mejoras futuras):**
- Rate limiting en registro de boletas y scanner (considerar Upstash/Cloudflare)
- Headers de seguridad (CSP, CORS) en Cloudflare Workers
- Validación de formato colombiano para cédula (5-11 dígitos) y celular (10 dígitos)

- [2026-04-13] URLs hardcodeadas de workers.dev → Reemplazadas por `NEXT_PUBLIC_LANDING_URL` y `NEXT_PUBLIC_ADMIN_URL` configurables → 11 archivos en ambas apps
- [2026-04-13] CI/CD solo main → Workflows actualizados para `main` (prod) y `dev` con URLs condicionales por rama → `.github/workflows/deploy-*.yml`
- [2026-04-13] Nodemailer + SMTP Titan falló (AUTH PLAIN rechazado, certificado auto-firmado) → Revertido a Resend SDK → `lib/mailer.ts` en ambas apps
- [2026-04-13] Email invitación tenía template simple → Actualizado para usar contenido dinámico de configuracion_campana (titulo, subtitulo, mensaje, auspiciantes, logo) → `app/invitaciones/actions.ts`
- [2026-04-13] Formulario invitación permitía doble envío → Formulario se oculta tras éxito, muestra botón WhatsApp + "Nueva Invitación" → `InvitacionesClient.tsx`
- [2026-04-13] WhatsApp no reseteaba formulario → Al click en WhatsApp, formulario se resetea después de 500ms → `InvitacionesClient.tsx`
- [2026-04-13] Teléfono obligatorio, WhatsApp opcional → Invertido: WhatsApp obligatorio, Teléfono opcional en todos los formularios → 5 archivos
- [2026-04-13] Explorador boletas sin filtro de participantes → Agregado filtro "Solo Registrados" + botón "Exportar Participantes" CSV → `BoletasBrowser.tsx`, `lib/actions.ts`
- [2026-04-13] Módulo Comerciantes sin paginación ni exportar → Agregado paginación 10 items + exportar CSV → `ComerciantesClient.tsx`
- [2026-04-13] QR invitaciones se podía usar múltiples veces → Nueva columna `qr_escaneado_at`, validación de uso único, estado visual en listas → `scanner/actions.ts`, `InvitacionesClient.tsx`
- [2026-04-13] Scanner sin lista de invitaciones → Dos listas separadas: Evento Recreativo (verde) + Invitaciones (purple), paginadas de 10 → `ScannerClient.tsx`
- [2026-04-13] Asistencia admin filtraba por fecha → Removido filtro, muestra todos paginados de 10 → `AsistenciaClient.tsx`

**Migraciones BD aplicadas manualmente:**
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

---

## AUTO-LOGOUT POR INACTIVIDAD

**Motivación:** Supabase persiste el `refresh_token` en `localStorage` del navegador, que sobrevive al cierre. El refresh token default de Supabase Cloud dura 7 días, así que la sesión "no expira" durante una semana. Seguridad insuficiente cuando un agente deja abierta una laptop.

**Solución de dos capas:**

1. **Idle timeout client-side** (`app/components/IdleLogout.tsx`):
   - Monitorea eventos `mousedown`, `keydown`, `touchstart`, `scroll`, `click`.
   - 60s antes del timeout muestra modal con countdown y botón "Seguir activo".
   - Si no hay interacción, llama `logout()` → `supabase.auth.signOut()` + redirect a `/login`.
   - Se monta en `app/layout.tsx` solo cuando hay usuario.
   - Configurable desde `/configuracion`: campo `sesion_timeout_minutos` (default 30, rango 5-240).

2. **Refresh token TTL reducido en Supabase Dashboard** (manual, NO es código):
   - Authentication → Sessions → reducir de 604800s (7 días) a 28800s (8 horas).
   - Mitiga robo de tokens: si se filtra uno, expira en 8h.

---

## SELECCIÓN DE JORNADAS EN INVITACIONES

El evento tiene múltiples jornadas. El comerciante, al aceptar la invitación, debe seleccionar al menos una jornada a la que asistirá.

**Configuración (admin):** `configuracion_campana.jornadas_evento` (jsonb, editable desde `/configuracion`) — cada jornada `{id, fecha, hora, label}`. Ubicación en `ubicacion_evento` + `ubicacion_maps_url`.

**Landing `/invitacion/[token]`:**
- Pantalla normal (pendiente): checkboxes de jornadas + ubicación con link Maps. Al aceptar valida mínimo 1 jornada.
- Retrofit: invitaciones ya aceptadas sin `jornadas_seleccionadas` (pre-feature) muestran pantalla de confirmación de jornadas sin regenerar QR. Usa `actualizarJornadasAction`.
- Una vez guardadas las jornadas, NO se permite re-edición desde la landing.

**Admin `/invitaciones`:**
- Tabla: columna "Jornada(s)" con badges compactos (muestra primera + `+N`).
- Drawer: sección con lista completa (fecha + hora + label).
- Email de creación incluye ubicación y nota "Al confirmar podrás elegir jornada(s)".
- Email de aceptación (al comerciante y distribuidor) incluye las jornadas elegidas y la ubicación.

**Archivos clave:**
- `admin-dashboard/app/components/ConfiguracionManager.tsx` — editor jornadas/ubicación
- `admin-dashboard/app/invitaciones/{actions,page,InvitacionesClient}.tsx`
- `landing-page/app/invitacion/[token]/{actions,page,InvitacionClient}.tsx`

---

## FLUJO DE CREDENCIALES — Distribuidores y Asistentes

### Creación de usuario (`/distribuidores`)

Al crear un distribuidor o asistente desde Gestión de Personal:
1. Se crea usuario en Auth con `user_metadata: { debe_cambiar_password: true }`
2. Se inserta en `perfiles` con `debe_cambiar_password = true`
3. Se envía email de bienvenida con credenciales temporales (email + contraseña + link al panel)

**Archivos:** `app/distribuidores/actions.ts` (`createPersonalAction`)

### Primer login — Cambio forzado de contraseña

1. El login consulta `perfiles.debe_cambiar_password`
2. Si es `true` → redirect a `/cambiar-password` (en vez de `/` o `/scanner`)
3. El middleware bloquea acceso a cualquier ruta excepto `/cambiar-password` y `/login` usando `user_metadata.debe_cambiar_password`
4. En `/cambiar-password`: formulario nueva contraseña + confirmar
5. Al guardar: actualiza Auth (password + metadata) + `perfiles.debe_cambiar_password = false` → redirect según rol

**Archivos:**
- `app/login/actions.ts` — redirect condicional post-login
- `utils/supabase/middleware.ts` — bloqueo de rutas via `user_metadata`
- `app/cambiar-password/page.tsx` — server component con verificación
- `app/cambiar-password/CambiarPasswordClient.tsx` — formulario client
- `app/cambiar-password/actions.ts` — `cambiarPasswordAction`

### Reset de contraseña por admin

1. En drawer de detalle del personal (`/distribuidores` → click en agente → sección "Seguridad")
2. Admin ingresa nueva contraseña temporal → presiona "Resetear"
3. Se actualiza Auth (password + `user_metadata.debe_cambiar_password = true`) + `perfiles.debe_cambiar_password = true`
4. Se envía email de notificación con nueva contraseña temporal

**Archivos:**
- `app/distribuidores/actions.ts` — `resetPasswordAction`
- `app/distribuidores/GestionPersonalClient.tsx` — `ResetPasswordSection` en `InventoryDrawer`

### Sincronización dual: user_metadata + perfiles

El flag `debe_cambiar_password` se mantiene en dos lugares:
- **`user_metadata`** en Auth — leído por el middleware (sin query extra a BD en cada request)
- **`perfiles.debe_cambiar_password`** en BD — leído por login y por `/cambiar-password` page

Ambos se actualizan juntos en: `createPersonalAction`, `resetPasswordAction`, `cambiarPasswordAction`.

---

## MANTENIMIENTO DE ESTE ARCHIVO

Este archivo es la fuente de verdad del proyecto para agentes de IA.

**Regla:** Al finalizar cualquier sesión de trabajo que introduzca:
- Cambios arquitecturales o de stack
- Nuevas lecciones aprendidas
- Cambios en el pipeline de deploy
- Nuevas tablas o cambios en la base de datos
- Nuevos MCP configurados
- Cambios en políticas RLS

→ Actualizar este CLAUDE.md con los nuevos aprendizajes ANTES del commit final.
