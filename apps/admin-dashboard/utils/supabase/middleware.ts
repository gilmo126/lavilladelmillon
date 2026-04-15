import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { MAX_SESSION_HOURS, SESSION_MARKER_COOKIE } from '../../lib/sessionConfig'

const MAX_SESSION_MS = MAX_SESSION_HOURS * 60 * 60 * 1000

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    // If getUser() fails (network, missing env vars, etc.), treat as unauthenticated
  }

  const pathname = request.nextUrl.pathname
  const isLoginPage = pathname === '/login'
  const isChangePasswordPage = pathname === '/cambiar-password'

  // Cota dura de sesión: requiere cookie marker (session-only, muere al cerrar navegador)
  // y valida que la sesión no exceda MAX_SESSION_HOURS.
  if (user && !isLoginPage) {
    const marker = request.cookies.get(SESSION_MARKER_COOKIE)?.value
    const markerMs = marker ? parseInt(marker, 10) : NaN
    const sessionExpired =
      !marker ||
      Number.isNaN(markerMs) ||
      Date.now() - markerMs > MAX_SESSION_MS

    if (sessionExpired) {
      try {
        await supabase.auth.signOut()
      } catch { /* ignore */ }
      const redirectResp = NextResponse.redirect(new URL('/login', request.url))
      redirectResp.cookies.delete(SESSION_MARKER_COOKIE)
      return redirectResp
    }
  }

  if (!user && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && isLoginPage) {
    // Si debe cambiar contraseña, redirigir allí en vez de /
    if (user.user_metadata?.debe_cambiar_password) {
      return NextResponse.redirect(new URL('/cambiar-password', request.url))
    }
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Bloquear acceso a cualquier ruta si debe cambiar contraseña
  if (user && user.user_metadata?.debe_cambiar_password && !isChangePasswordPage && !isLoginPage) {
    return NextResponse.redirect(new URL('/cambiar-password', request.url))
  }

  return response
}
