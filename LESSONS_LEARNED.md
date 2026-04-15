# Lecciones Aprendidas — LavilladelMillon

Errores que ya pagamos. No repetir.

---

## Next.js 16

- Usa **`proxy.ts`**, no `middleware.ts` — la API cambió en Next.js 16.

## Adapter de Cloudflare

- **`@cloudflare/next-on-pages` está deprecado.** Siempre usar **`@opennextjs/cloudflare`**.

## SDK de Supabase v2 — query builder inmutable

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

## Variables de entorno en Cloudflare Workers — no mezclar [vars] y secrets

Si una variable existe en `wrangler.toml [vars]` **y** se intenta crear como
secret con `wrangler secret put`, falla con error `10053: Binding name already in use`.
Solución: elegir uno solo — o `[vars]` (texto plano, visible en dashboard)
o secret encriptado (via `wrangler secret put`). Nunca ambos.

## Variables runtime vs build-time

Pasar una variable runtime solo como `env:` en el step de `wrangler deploy`
la hace disponible para el proceso de deploy, **no para el Worker en producción**. Causa error 500.

Workflow correcto para variables runtime: step separado con `wrangler secret put` **antes** del deploy.

## Porcentajes y fracciones pequeñas

- **`Math.round()` aplasta fracciones pequeñas** → usar **`toFixed(1)`** para mostrar
  porcentajes con un decimal (ej: conversión en embudo).

## supabase vs supabaseAdmin en Server Components

- **SIEMPRE usar `supabaseAdmin`** para queries de `perfiles` y datos internos en
  Server Components (`layout.tsx`, `page.tsx`).
- `supabase` (cliente autenticado via `createClient()`) puede fallar silenciosamente
  con RLS después de redirects, causando loops o "Rendering..." indefinido.
- `supabase` solo usar en componentes cliente para operaciones del usuario autenticado.

## Middleware matcher en Next.js 16

- **No excluir `/login`** del matcher — si se excluye, el middleware no redirige
  usuarios autenticados de `/login` a `/`, causando sidebar + login form simultáneos.
- Envolver `getUser()` en try-catch para que fallos no causen redirect loops.
- Patrón correcto del matcher:
  ```
  /((?!_next/static|_next/image|api|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)
  ```

## Joins de Supabase retornan arrays, no objetos

Los joins con `!foreign_key(columna)` en el query builder de Supabase retornan
**arrays**, no objetos individuales. Siempre mapear el resultado:

```typescript
// El join retorna: { distribuidor: [{ nombre: 'Juan' }] }
// NO retorna:      { distribuidor: { nombre: 'Juan' } }

const mapped = data.map((p: any) => ({
  ...p,
  distribuidor: Array.isArray(p.distribuidor) ? p.distribuidor[0] || null : p.distribuidor,
}));
```

Si no se mapea, TypeScript falla en build con error de tipos incompatibles.

## Enums eliminados persisten en RPCs y queries

Al eliminar un valor de un enum PostgreSQL (ej: `operativo` de `rol_usuario`),
las RPCs almacenadas que referencian ese enum siguen usando la versión anterior.
Si una RPC hace `columna::TEXT` sobre un enum, falla con:
`invalid input value for enum rol_usuario: operativo`

**Checklist al eliminar un valor de enum:**
1. Buscar TODAS las RPCs que leen columnas del enum (`\df` en psql)
2. Actualizar cada RPC con `DROP FUNCTION` + `CREATE OR REPLACE`
3. Usar `COALESCE(columna::TEXT, '')` para proteger contra valores residuales
4. Verificar datos residuales en la tabla antes de alterar el enum

## Coexistencia de datos V1 y V2

- Las boletas antiguas (bodega manual) coexisten con las nuevas (generadas por pack).
- Las nuevas boletas V2 tienen `pack_id NOT NULL`.
- Las antiguas tienen `pack_id = null`.
- Los filtros y queries deben considerar ambos casos durante la transición.
- En esta campaña se eliminaron las V1 manualmente (ver CHANGELOG 2026-04-10).

## Email — Nodemailer + SMTP Titan no funcionó

Se intentó Nodemailer + SMTP Titan (GoDaddy) pero falló por incompatibilidad de
autenticación (AUTH PLAIN rechazado, certificado auto-firmado). Usar **Resend SDK**.
