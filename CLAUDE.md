# LavilladelMillon — Guía del proyecto

## ARQUITECTURA

Monorepo con dos aplicaciones Next.js desplegadas en Cloudflare Workers:

| App | Directorio | URL de producción |
|-----|-----------|-------------------|
| Admin Dashboard | `apps/admin-dashboard` | https://lavilladelmillon-admin.guillaumer-orion.workers.dev |
| Landing Page | `apps/landing-page` | https://landing-page.guillaumer-orion.workers.dev |

---

## STACK TECNOLÓGICO

- **Next.js 16.2.x** con **OpenNext** (`@opennextjs/cloudflare`) para deploy en edge
- **Supabase** — autenticación, base de datos PostgreSQL y storage
- **Cloudflare Workers** — runtime de producción
- **GitHub Actions** — CI/CD automático por ruta de archivos modificados

---

## DEPLOY

### Pipeline automático (GitHub Actions)

- Push a `main` con cambios en `apps/admin-dashboard/` → deploy automático del admin
- Push a `main` con cambios en `apps/landing-page/` → deploy automático de la landing

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
| **Fase 4** | ⏳ Pendiente | Comunicación WhatsApp/email con links individuales |
| **Fase 5** | ✅ Completada | Página temporal del comerciante `/pack/[token]` en landing-page |
| **Fase 6** | ⏳ Pendiente | Actualizar módulos existentes con nuevos estados |

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
| `rol_usuario` | `admin`, `distribuidor` *(eliminado: `operativo`)* |

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
