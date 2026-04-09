export const dynamic = 'force-dynamic'
import React from 'react';
import BoletasBrowser from '../components/BoletasBrowser';

export const metadata = {
  title: 'Boletas | Admin Dashboard'
};

import { createClient } from '../../utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function BoletasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('perfiles').select('*').eq('id', user.id).single();
  if (!profile) redirect('/login');

  return <BoletasBrowser userProfile={profile} />;
}
