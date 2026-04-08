export const dynamic = 'force-dynamic'
import { createClient } from '../../utils/supabase/server';
import { redirect } from 'next/navigation';
import TrazabilidadClient from './TrazabilidadClient';

export const metadata = { title: 'Buscador Trazabilidad | AdminPanel' };

export default async function TrazabilidadPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('perfiles').select('id, rol, nombre').eq('id', user.id).single();
  
  if (!profile || !['admin', 'operativo', 'distribuidor'].includes(profile.rol)) {
    return <div className="p-8 text-red-500 font-bold">Módulo restringido.</div>;
  }

  return (
    <div className="p-8 pb-20 h-full overflow-y-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">🔍 {profile.rol === 'distribuidor' ? 'Mi Trazabilidad' : 'Buscador de Trazabilidad'}</h1>
        <p className="text-slate-400">
          {profile.rol === 'distribuidor' 
            ? 'Auditoría de tus boletas asignadas. Rastrea desde el despacho hasta la activación en el comercio.'
            : 'Auditoría E2E de cualquier boleta del sistema. Rastrea la cadena completa: Bodega → Distribuidor → Comercio → Titular.'}
        </p>
      </header>
      <TrazabilidadClient userProfile={profile} />
    </div>
  );
}
