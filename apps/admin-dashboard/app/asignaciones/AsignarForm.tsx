'use client';

import { useState, useEffect, useCallback } from 'react';
import { asignarBoletasAction, validarRangoAction, sugerirLoteAction } from './actions';

export default function AsignarForm({ distribuidores, boletasLibres }: { distribuidores: any[], boletasLibres: number }) {
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning', text: string } | null>(null);
  
  // Estado de inputs
  const [rango, setRango] = useState({ inicio: '', fin: '' });
  const [selectedDistId, setSelectedDistId] = useState<string>('');
  const [availableZones, setAvailableZones] = useState<any[]>([]);
  const [validation, setValidation] = useState<{ 
    total: number, 
    disponibles: number, 
    no_aptas: number, 
    es_valido: boolean 
  } | null>(null);

  // 1. Manejo de Zonas Dinámicas
  useEffect(() => {
    const dist = distribuidores.find(d => d.id === selectedDistId);
    if (dist && dist.perfil_zonas) {
        const zones = dist.perfil_zonas.map((pz: any) => pz.zonas);
        setAvailableZones(zones);
    } else {
        setAvailableZones([]);
    }
  }, [selectedDistId, distribuidores]);

  // 2. Función para sugerir lote
  const handleSugerir = async () => {
    setLoading(true);
    const resp = await sugerirLoteAction();
    if (resp.success && resp.inicio) {
      setRango({ inicio: resp.inicio.toString(), fin: resp.fin.toString() });
    } else {
      setMessage({ type: 'warning', text: 'No se encontraron bloques disponibles en bodega.' });
    }
    setLoading(false);
  };

  // 3. Validación asíncrona
  const performValidation = useCallback(async (inicio: number, fin: number) => {
    if (!inicio || !fin || inicio > fin) {
      setValidation(null);
      return;
    }
    setValidating(true);
    const resp = await validarRangoAction(inicio, fin);
    if (resp.success) {
      setValidation({
        total: resp.total || 0,
        disponibles: resp.disponibles || 0,
        no_aptas: resp.no_aptas || 0,
        es_valido: resp.es_valido || false
      });
    }
    setValidating(false);
  }, []);

  useEffect(() => {
    const i = parseInt(rango.inicio);
    const f = parseInt(rango.fin);
    const timer = setTimeout(() => {
      if (!isNaN(i) && !isNaN(f)) performValidation(i, f);
    }, 600);
    return () => clearTimeout(timer);
  }, [rango, performValidation]);

  // 4. Ejecución final
  async function handleAction(formData: FormData) {
    setLoading(true);
    setMessage(null);
    
    try {
      const resp = await asignarBoletasAction(formData);
      if (resp.success) {
        setMessage({ type: 'success', text: `¡Éxito! Se han despachado ${resp.count} boletas correctamente.` });
        setRango({ inicio: '', fin: '' });
        setSelectedDistId('');
        setValidation(null);
      } else {
        setMessage({ type: 'error', text: resp.error || 'Fallo en la transacción.' });
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: 'Error crítico de comunicación.' });
    }
    setLoading(false);
  }

  const stockBadgeClass = boletasLibres > 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400";

  return (
    <div className="bg-admin-card rounded-2xl border border-admin-border p-8 mt-6">
      <div className="mb-6 flex justify-between items-center">
        <div className="flex space-x-4 items-center">
          <h2 className="text-xl font-bold text-white">Despacho de Inventario</h2>
          <span className={`text-[10px] font-bold px-3 py-1 rounded-full border border-current/20 ${stockBadgeClass}`}>
             Stock Matriz: {boletasLibres.toLocaleString()} libres
          </span>
        </div>
        <button 
          type="button"
          onClick={handleSugerir}
          disabled={loading || boletasLibres === 0}
          className="text-xs font-bold text-admin-gold hover:text-white transition-colors flex items-center gap-1 bg-admin-gold/10 px-3 py-1.5 rounded-lg border border-admin-gold/20"
        >
          ✨ Sugerir Próximo Lote
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-xl mb-6 border text-xs font-bold animate-in fade-in slide-in-from-top-2 ${
          message.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 
          message.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
          'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
        }`}>
          {message.text}
        </div>
      )}

      <form action={handleAction} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Responsable del Lote</label>
                <select 
                    name="distribuidor_id" 
                    required 
                    value={selectedDistId}
                    onChange={(e) => setSelectedDistId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-admin-blue transition-all text-sm"
                >
                    <option value="" disabled>-- Perfil de Distribución --</option>
                    {distribuidores.map((dist) => (
                    <option key={dist.id} value={dist.id}>
                        {dist.nombre} — {dist.perfil_zonas?.length} Zonas Atribuidas
                    </option>
                    ))}
                </select>
            </div>

            <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Zona de Destino Final</label>
                <select 
                    name="zona_id" 
                    required 
                    className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-admin-blue transition-all text-sm disabled:opacity-30 disabled:bg-slate-900/50"
                    disabled={availableZones.length === 0}
                    defaultValue=""
                >
                    <option value="" disabled>{availableZones.length > 0 ? '-- Seleccionar un Frente --' : 'Seleccione primero un distribuidor'}</option>
                    {availableZones.map((z) => (
                    <option key={z.id} value={z.id}>
                        📍 {z.nombre}
                    </option>
                    ))}
                </select>
                {availableZones.length > 0 && <p className="text-[9px] text-admin-gold mt-1.5 uppercase font-bold px-1">* Solo se muestran las zonas autorizadas para este agente.</p>}
            </div>
        </div>

        <div className="grid grid-cols-2 gap-6 p-6 bg-slate-950 rounded-2xl border border-white/5">
           <div>
             <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">ID Inicial</label>
             <input 
               type="number" 
               name="rango_inicio" 
               required 
               value={rango.inicio}
               onChange={(e) => setRango(prev => ({ ...prev, inicio: e.target.value }))}
               placeholder="1"
               className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white font-mono focus:border-admin-blue transition-all"
             />
           </div>
           <div>
             <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">ID Final</label>
             <input 
               type="number" 
               name="rango_fin" 
               required 
               value={rango.fin}
               onChange={(e) => setRango(prev => ({ ...prev, fin: e.target.value }))}
               placeholder="100"
               className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white font-mono focus:border-admin-blue transition-all"
             />
           </div>
        </div>

        {/* Feedback de Validación en Tiempo Real */}
        {validation && (
          <div className={`p-5 rounded-2xl border transition-all animate-in zoom-in-95 duration-200 ${
            validation.es_valido ? 'bg-emerald-500/5 border-emerald-500/20 shadow-lg shadow-emerald-500/5' : 'bg-amber-500/5 border-amber-500/20'
          }`}>
            <div className="flex justify-between items-center mb-4">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Validación de Lote Bodega</span>
              {validating && <span className="text-[10px] text-admin-gold animate-pulse font-bold">Verificando integridad...</span>}
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-black tracking-tighter mb-1">Aptas para Despacho</p>
                <p className={`text-3xl font-mono font-black ${validation.es_valido ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {validation.disponibles} <span className="text-xs font-normal text-slate-600">/ {validation.total}</span>
                </p>
              </div>
              {validation.no_aptas > 0 && (
                <div>
                  <p className="text-[10px] text-red-400 uppercase font-bold mb-1">Boletas Ocupadas</p>
                  <p className="text-3xl font-mono font-black text-red-500">{validation.no_aptas}</p>
                </div>
              )}
            </div>
            {!validation.es_valido && (
              <p className="text-[10px] text-amber-400/80 mt-4 italic font-bold uppercase tracking-tight">
                ⚠️ El sistema no permite el despacho de boletas activadas. Modifique el rango.
              </p>
            )}
          </div>
        )}

        <button 
          type="submit" 
          disabled={loading || validating || !validation?.es_valido || distribuidores.length === 0}
          className="w-full bg-admin-blue hover:bg-blue-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-blue-500/20 transition-all disabled:opacity-20 disabled:grayscale flex items-center justify-center gap-4 uppercase text-xs tracking-widest"
        >
          {loading ? (
             <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Procesando Transacción...</>
          ) : (
             <><span className="text-xl">✈️</span> Confirmar Despacho a Logística</>
          )}
        </button>
      </form>
    </div>
  );
}
