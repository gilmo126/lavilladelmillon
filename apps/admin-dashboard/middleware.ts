import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export const runtime = 'edge';

// Rutas exclusivas de Admin — Operativo y Distribuidor NO pueden acceder
const ADMIN_ONLY_ROUTES = [
  '/distribuidores',
  '/zonas',
  '/premios',
  '/configuracion',
  '/boletas',
]

// Rutas permitidas para el Operativo (whitelist estricta)
const OPERATIVO_ALLOWED_ROUTES = [
  '/',
  '/asignaciones',
  '/trazabilidad',
  '/mis-distribuidores',
]

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key',
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          supabaseResponse = NextResponse.next({ request: { headers: request.headers } })
          supabaseResponse.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          supabaseResponse = NextResponse.next({ request: { headers: request.headers } })
          supabaseResponse.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname
  const isLoginPage = pathname.startsWith('/login')

  // Regla 1: Sin sesión → Login
  if (!user && !isLoginPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Regla 2: Logueado + /login → redirigir
  if (user && isLoginPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // Regla 3: Validación por rol (solo si hay sesión)
  if (user) {
    const { data: profile } = await supabase
      .from('perfiles')
      .select('rol')
      .eq('id', user.id)
      .single()

    const rol = profile?.rol

    // --- Operativo ---
    if (rol === 'operativo') {
      if (pathname === '/') {
        const url = request.nextUrl.clone()
        url.pathname = '/asignaciones'
        return NextResponse.redirect(url)
      }
      const isAllowed = OPERATIVO_ALLOWED_ROUTES.some(
        (route) => pathname === route || pathname.startsWith(route + '/')
      )
      if (!isAllowed) {
        const url = request.nextUrl.clone()
        url.pathname = '/asignaciones'
        return NextResponse.redirect(url)
      }
    }

    // --- Distribuidor ---
    if (rol === 'distribuidor') {
      const isAdminRoute = ADMIN_ONLY_ROUTES.some(
        (route) => pathname === route || pathname.startsWith(route + '/')
      )
      if (isAdminRoute) {
        const url = request.nextUrl.clone()
        url.pathname = '/'
        return NextResponse.redirect(url)
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
