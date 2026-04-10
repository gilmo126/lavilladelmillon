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

### Variables de entorno

Las variables `NEXT_PUBLIC_*` se **baked en build time** — deben estar configuradas
como GitHub Secrets y pasarse al step de build en el workflow de GitHub Actions.
No sirve definirlas solo en Cloudflare Workers env vars.

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
