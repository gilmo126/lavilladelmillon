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

## BASE DE DATOS — ESTADOS DE BOLETAS

| Valor | Estado | Descripción |
|-------|--------|-------------|
| `0` | BODEGA | En stock, no asignada |
| `1` | DESPACHADA | En maletín del distribuidor |
| `2` | ACTIVA/VENDIDA | En poder de un comercio |
| `3` | REGISTRADA | Registrada por el comprador |
| `4` | ANULADA | Anulada |
| `5` | SORTEADA | Ganadora del sorteo |

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
