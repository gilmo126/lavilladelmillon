'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '../../utils/supabase/server'
import { supabaseAdmin } from '../../lib/supabaseAdmin'

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

  revalidatePath('/', 'layout')

  // Redirigir según rol
  if (authData.user) {
    const { data: profile } = await supabaseAdmin
      .from('perfiles')
      .select('rol')
      .eq('id', authData.user.id)
      .single();

    if (profile?.rol === 'asistente') {
      redirect('/scanner')
    }
  }

  redirect('/')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
