import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

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
