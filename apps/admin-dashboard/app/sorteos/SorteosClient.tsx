'use client';

import React, { useState, useEffect } from 'react';
import { getPremiosConSorteo, upsertSorteo, cerrarSorteoAction, getConfiguracion } from '../../lib/actions';

export default function SorteosClient() {
  const [premios, setPremios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<any>(null);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const conf = await getConfiguracion();
        setConfig(conf);
        const data = await getPremiosConSorteo(conf.id);
        setPremios(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const handleUpdateFecha = async (premioId: string, sorteoId: string | undefined, fecha: string) => {
    try {
      await upsertSorteo({
        id: sorteoId,
        premio_id: premioId,
        fecha_sorteo: fecha,
        estado: 'programado'
      });
      alert("✅ Fecha de sorteo actualizada.");
      // Refresh premios
      const data = await getPremiosConSorteo(config.id);
      setPremios(data);
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  const handleCerrarSorteo = async () => {
    if (!window.confirm("⚠️ ADVERTENCIA: Esta acción moverá TODAS las boletas registradas (Estado 3) al Estado 5 (SORTEADA).\n\nEsto invalidará las boletas para sorteos futuros. ¿Deseas proceder con el cierre de ciclo?")) {
      return;
    }

    setIsClosing(true);
    try {
      const { data: { user } } = await (await import('../../utils/supabase/client')).createClient().auth.getUser();
      if (!user) throw new Error("Sesión no válida");

      const res = await cerrarSorteoAction(user.id, config.id);
      if (res.success) {
        alert(`✅ Ciclo cerrado. ${res.count} boletas marcadas como SORTEADAS (Estado 5).`);
      } else {
        throw new Error(res.error);
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setIsClosing(false);
    }
  };

  if (loading) return <div className="p-10 text-admin-gold animate-pulse">Cargando sorteos...</div>;

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-6xl">
      <header className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold">Programación de Sorteos</h2>
          <p className="text-slate-400 mt-1">Asigna fechas de premiación y gestiona el cierre de ciclos de boletas.</p>
        </div>
        
        <button 
          onClick={handleCerrarSorteo}
          disabled={isClosing}
          className="bg-red-600 hover:bg-red-700 text-white font-black px-6 py-4 rounded-xl shadow-xl shadow-red-500/20 transition-all flex items-center gap-3 disabled:opacity-50"
        >
          <span className="text-2xl">🔒</span>
          {isClosing ? 'CERRANDO CICLO...' : 'CERRAR SORTEO ACTUAL'}
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {premios.map((p) => {
          const sorteo = p.sorteos && p.sorteos[0];
          return (
            <div key={p.id} className="bg-admin-card border border-admin-border rounded-2xl p-6 shadow-lg relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-admin-gold/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-admin-gold/10 transition-all" />
              
              <h3 className="text-xl font-bold text-admin-gold mb-1">{p.nombre_premio}</h3>
              <p className="text-xs text-slate-500 mb-6 uppercase tracking-widest font-black">Identificador: {p.id.split('-')[0]}</p>

              <div className="space-y-4 relative z-10">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha y Hora del Gran Sorteo</label>
                  <input 
                    type="datetime-local" 
                    defaultValue={sorteo?.fecha_sorteo ? new Date(sorteo.fecha_sorteo).toISOString().slice(0, 16) : ''}
                    onBlur={(e) => handleUpdateFecha(p.id, sorteo?.id, e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-admin-gold transition-all"
                  />
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                    sorteo?.estado === 'programado' ? 'bg-admin-blue/10 text-admin-blue border border-admin-blue/30' : 'bg-slate-800 text-slate-500 border border-slate-700'
                  }`}>
                    {sorteo?.estado || 'SIN PROGRAMAR'}
                  </span>
                  
                  {sorteo?.fecha_sorteo && (
                    <p className="text-xs font-bold text-slate-400">
                      Vigencia: {new Date(sorteo.fecha_sorteo) < new Date() ? '❌ VENCIDO' : '✅ ACTIVO'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 flex items-start gap-4">
        <span className="text-3xl">ℹ️</span>
        <div className="space-y-2">
          <h4 className="font-bold text-white">Manual Operativo del Sorteo</h4>
          <p className="text-sm text-slate-400 leading-relaxed text-pretty">
            Al realizar el <strong>Cierre de Sorteo</strong>, el sistema mueve todas las boletas registradas al un estado inmutable. Esto significa que las boletas físicas que el cliente ya registró quedarán invalidadas en sistema y no podrán ser reutilizadas para el siguiente premio de la campaña, garantizando la transparencia legal del concurso.
          </p>
        </div>
      </div>
    </div>
  );
}
