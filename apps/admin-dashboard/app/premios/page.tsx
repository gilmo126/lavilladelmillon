export const dynamic = 'force-dynamic';
import React from 'react';
import { createClient } from '../../utils/supabase/server';
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { redirect } from 'next/navigation';
import PremiosManager from '../components/PremiosManager';

export const metadata = {
  title: 'Premios | Admin Dashboard'
};

export default async function PremiosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabaseAdmin.from('perfiles').select('rol').eq('id', user.id).single();
  if (!profile || profile.rol !== 'admin') redirect('/');

  return <PremiosManager />;
}
