'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '../../utils/supabase/server'
import { supabaseAdmin } from '../../lib/supabaseAdmin'
import { SESSION_MARKER_COOKIE } from '../../lib/sessionConfig'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Faltan credenciales' }
  }

  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  // Cookie session-only (sin maxAge/expires) que marca el inicio de la sesión.
  // Muere al cerrar el navegador → sesión efectivamente no persiste tras reinicio del browser.
  // El middleware valida su presencia y edad (ver MAX_SESSION_HOURS).
  const cookieStore = await cookies()
  cookieStore.set(SESSION_MARKER_COOKIE, String(Date.now()), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  })

  revalidatePath('/', 'layout')

  // Redirigir según estado y rol
  if (authData.user) {
    const { data: profile } = await supabaseAdmin
      .from('perfiles')
      .select('rol, debe_cambiar_password')
      .eq('id', authData.user.id)
      .single();

    // Forzar cambio de contraseña en primer login
    if (profile?.debe_cambiar_password) {
      redirect('/cambiar-password')
    }

    if (profile?.rol === 'asistente') {
      redirect('/scanner')
    }
  }

  redirect('/')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_MARKER_COOKIE)
  revalidatePath('/', 'layout')
  redirect('/login')
}
