
import React from 'react';
import LoginBox from './LoginBox';
import { createClient } from '../../utils/supabase/server';

export async function generateMetadata() {
  const supabase = await createClient();
  const { data } = await supabase.from('configuracion_campana').select('nombre_campana').limit(1).single();
  return {
    title: `Acceso Central | ${data?.nombre_campana || 'Sorteo Activo'}`,
  };
}

export default async function LoginPage() {
  const supabase = await createClient();
  const { data: config } = await supabase.from('configuracion_campana').select('nombre_campana').limit(1).single();
  const brand = config?.nombre_campana || "V180C Terminal";

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-admin-dark relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
         <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-admin-gold/5 blur-[150px] rounded-full animate-pulse"></div>
         <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-admin-blue/5 blur-[120px] rounded-full"></div>
      </div>
      
      <div className="w-full max-w-md z-10 space-y-6">
        <div className="text-center mb-8">
            <h1 className="text-2xl font-black text-white tracking-tighter uppercase">{brand}</h1>
            <p className="text-[10px] font-black text-slate-500 tracking-widest mt-1">Terminal de Control Logístico</p>
        </div>
        <LoginBox />
      </div>
    </div>
  );
}
