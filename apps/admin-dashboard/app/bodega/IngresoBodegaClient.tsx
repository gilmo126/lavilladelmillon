'use client';

import React, { useState, useEffect } from 'react';
import { crearLoteBodegaAction, verificarRangoBodegaAction } from '../../lib/actions';

export default function IngresoBodegaClient({ campanaId }: { campanaId: string }) {
  const [inicio, setInicio] = useState<number>(1);
  const [fin, setFin] = useState<number>(100000);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ success: boolean; count?: number; skipped?: number; error?: string } | null>(null);
  
  // Estado de validación previa
  const [checking, setChecking] = useState(false);
  const [collisionCount, setCollisionCount] = useState(0);

  // Debounce para validación de rango
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (fin > inicio) {
        setChecking(true);
        const res = await verificarRangoBodegaAction(inicio, fin);
        if (res.success) {
          setCollisionCount(res.count || 0);
        }
        setChecking(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [inicio, fin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fin <= inicio) return alert("El rango de fin debe ser mayor al de inicio.");

    // Alerta de colisión si existen boletas
    if (collisionCount > 0) {
      const confirm = window.confirm(`Atención: El rango seleccionado contiene ${collisionCount.toLocaleString()} boletas que ya existen. \n\n¿Deseas saltar las existentes y crear solo las ${(fin - inicio + 1 - collisionCount).toLocaleString()} faltantes?`);
      if (!confirm) return;
    }

    setLoading(true);
    setProgress(0);
    setResult(null);

    const total = fin - inicio + 1;
    const stepSize = 100000; 
    let currentInicio = inicio;
    let totalCreated = 0;

    try {
      while (currentInicio <= fin) {
        const currentFin = Math.min(currentInicio + stepSize - 1, fin);
        const res = await crearLoteBodegaAction(currentInicio, currentFin, campanaId);
        
        if (!res.success) {
          throw new Error(res.error);
        }

        totalCreated += res.count || 0;
        currentInicio = currentFin + 1;
        
        const percent = Math.min(Math.round(((currentInicio - inicio) / total) * 100), 100);
        setProgress(percent);
      }
      
      setResult({ 
        success: true, 
        count: totalCreated, 
        skipped: collisionCount 
      });
      setCollisionCount(0); // Reset después de éxito
    } catch (error: any) {
      setResult({ success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-admin-card rounded-3xl border border-admin-border p-8 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-admin-gold/5 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none" />

      <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-admin-blue" />
              RANGO INICIAL
            </label>
            <input 
              type="number" 
              required
              value={inicio}
              onChange={(e) => setInicio(parseInt(e.target.value) || 0)}
              className="w-full bg-slate-900 border border-slate-700/50 rounded-xl px-5 py-4 text-white focus:outline-none focus:border-admin-blue transition-all text-lg font-bold"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-admin-gold" />
              RANGO FINAL
            </label>
            <input 
              type="number" 
              required
              value={fin}
              onChange={(e) => setFin(parseInt(e.target.value) || 0)}
              className="w-full bg-slate-900 border border-slate-700/50 rounded-xl px-5 py-4 text-white focus:outline-none focus:border-admin-gold transition-all text-lg font-bold"
            />
          </div>
        </div>

        {/* Panel de Validación Preventiva */}
        <div className={`p-4 rounded-xl border transition-all ${
          checking ? 'bg-slate-800/20 border-slate-700/30' : 
          collisionCount > 0 ? 'bg-amber-950/20 border-amber-900/40 text-amber-500' : 
          'bg-green-950/10 border-green-900/40 text-green-500'
        }`}>
           <div className="flex items-center justify-between">
              <div>
                 <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 opacity-60">Status del Rango</p>
                 <div className="flex items-center gap-2">
                    {checking ? (
                      <span className="text-sm font-bold animate-pulse text-slate-400">Verificando colisiones...</span>
                    ) : collisionCount > 0 ? (
                      <span className="text-sm font-bold">⚠️ {collisionCount.toLocaleString()} boletas ya existen en este rango.</span>
                    ) : (
                      <span className="text-sm font-bold">🛡️ Rango disponible para creación.</span>
                    )}
                 </div>
              </div>
              <div className="text-right">
                 <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 opacity-60">Boletas Faltantes</p>
                 <p className="text-xl font-black">{Math.max(0, fin - inicio + 1 - collisionCount).toLocaleString()}</p>
              </div>
           </div>
        </div>

        {loading && (
          <div className="space-y-3">
            <div className="flex justify-between items-end mb-1">
              <p className="text-sm font-bold text-admin-gold flex items-center gap-2 animate-pulse">
                <span>⚡</span> Procesando Lote Resiliente...
              </p>
              <p className="text-xs font-bold text-slate-500">{progress}%</p>
            </div>
            <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700/30">
              <div 
                className="h-full bg-gradient-to-r from-admin-gold to-yellow-300 transition-all duration-300 ease-out shadow-[0_0_15px_rgba(212,175,55,0.4)]"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {result && (
          <div className={`p-5 rounded-2xl border ${result.success ? 'bg-admin-green/10 border-admin-green/30 text-admin-green' : 'bg-red-900/10 border-red-900/30 text-red-400'}`}>
            <h4 className="font-bold flex items-center gap-2 mb-2">
              {result.success ? '✅ Carga Finalizada' : '❌ Error Crítico'}
            </h4>
            {result.success ? (
              <div className="space-y-1">
                <p className="text-sm font-medium">
                   <strong className="text-xl">{result.count?.toLocaleString()}</strong> boletas nuevas creadas.
                </p>
                {result.skipped && result.skipped > 0 ? (
                  <p className="text-xs opacity-70">
                    {result.skipped.toLocaleString()} boletas ya existían y fueron omitidas por seguridad.
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-sm opacity-90">{result.error}</p>
            )}
          </div>
        )}

        <button 
          type="submit" 
          disabled={loading || checking}
          className="w-full py-5 bg-gradient-to-r from-admin-blue to-blue-600 text-white font-black text-lg rounded-xl shadow-xl shadow-blue-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:scale-100"
        >
          {loading ? 'GENERANDO INVENTARIO...' : 'INICIALIZAR INVENTARIO EN BODEGA'}
        </button>
      </form>
    </div>
  );
}
