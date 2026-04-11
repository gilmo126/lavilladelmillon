export const dynamic = 'force-dynamic';
import React from 'react';
import { createClient } from '../../utils/supabase/server';
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { redirect } from 'next/navigation';
import ConfiguracionManager from '../components/ConfiguracionManager';

export const metadata = {
  title: 'Configuración | Admin Dashboard'
};

export default async function ConfiguracionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabaseAdmin.from('perfiles').select('rol').eq('id', user.id).single();
  if (!profile || profile.rol !== 'admin') redirect('/');

  return <ConfiguracionManager />;
}
