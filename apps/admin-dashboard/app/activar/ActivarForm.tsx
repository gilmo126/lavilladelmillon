'use client';

import { useState } from 'react';
import { activarBoletaAction } from './actions';

function VentaModal({ boleta, territorios, onClose }: { boleta: any; territorios: any[]; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [barrioSearch, setBarrioSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  async function handleAction(formData: FormData) {
    if (!accepted) return setMessage({ type: 'error', text: 'Debe aceptar el tratamiento de datos para continuar.' });
    setLoading(true);
    setMessage(null);

    try {
      const resp = await activarBoletaAction(formData);
      if (resp.success) {
        setMessage({ type: 'success', text: `¡Venta Registrada! La boleta ${resp.boleta_code} ya está activa.` });
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setMessage({ type: 'error', text: resp.error || 'Error al procesar la venta.' });
        setLoading(false);
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Fallo crítico de red.' });
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
      {/* Container Responsivo: 90% en movil, max-w-xl en desktop */}
      <div className="bg-slate-900 border border-admin-gold/30 rounded-3xl w-full max-w-xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] md:max-h-[85vh]">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-admin-gold to-transparent" />
        
        {/* Header Modal */}
        <div className="p-6 md:p-8 border-b border-white/5 flex justify-between items-center bg-slate-950/50">
          <div>
            <h3 className="text-xl md:text-2xl font-black text-white tracking-tight">Registrar Venta</h3>
            <div className="flex items-center gap-2 mt-1">
                <p className="text-admin-gold text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                    Boleta # {boleta.id_boleta}
                </p>
                <span className="w-1 h-1 bg-slate-700 rounded-full" />
                <p className="text-admin-blue text-[9px] font-black uppercase tracking-widest">{boleta.zonas?.nombre || 'General'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-slate-400 hover:text-white transition-all">✕</button>
        </div>

        {/* Formulario con Scroll Interno */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar space-y-6">
           {message && (
            <div className={`p-4 rounded-xl border text-[11px] font-bold animate-in zoom-in-95 duration-300 ${
              message.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-green-500/10 border-green-500/20 text-green-400 shadow-xl shadow-green-500/10'
            }`}>
              {message.text}
            </div>
          )}

          {message?.type === 'success' ? (
             <div className="py-10 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center text-green-400 text-3xl mb-4 animate-bounce">✓</div>
                <p className="text-white font-black text-lg">Venta Confirmada</p>
                <p className="text-slate-500 text-xs mt-2 uppercase font-bold tracking-tighter">Sincronizando con central...</p>
             </div>
          ) : (
            <form action={handleAction} className="space-y-6 pb-4">
              <input type="hidden" name="boleta_id" value={boleta.id_boleta} />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Documento de Identidad</label>
                  <input type="text" name="cliente_id" required placeholder="Cédula / NIT"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-xs outline-none focus:border-admin-blue transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Contacto Celular</label>
                  <input type="text" name="cliente_movil" required placeholder="3XX XXX XXXX"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-xs outline-none focus:border-admin-blue transition-all" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nombre Completo del Comprador</label>
                <input type="text" name="cliente_nombre" required placeholder="Nombres y Apellidos"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-xs outline-none focus:border-admin-blue transition-all" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Dirección Exacta</label>
                    <input type="text" name="cliente_direccion" required placeholder="Barrio / Casa / Local"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-xs outline-none focus:border-admin-blue transition-all" />
                </div>
                <div className="relative space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Barrio Geográfico</label>
                    <input 
                        type="text" 
                        autoComplete="off"
                        required
                        placeholder="Escribe el barrio..."
                        value={barrioSearch}
                        onChange={(e) => {
                          setBarrioSearch(e.target.value);
                          setShowSuggestions(true);
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-xs outline-none focus:border-admin-blue transition-all" 
                    />
                    <input type="hidden" name="cliente_barrio" value={barrioSearch} required />
                    
                    {showSuggestions && (
                    <div className="absolute z-[110] top-full left-0 w-full mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden max-h-40 overflow-y-auto animate-in fade-in slide-in-from-top-1">
                        {territorios
                            .filter(t => t.nombre.toLowerCase().includes(barrioSearch.toLowerCase()))
                            .map((t, idx) => (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                setBarrioSearch(t.nombre);
                                setShowSuggestions(false);
                                }}
                                className="w-full text-left px-4 py-3 text-[10px] font-black text-white hover:bg-admin-blue hover:text-white transition-colors border-b border-white/5 last:border-0 uppercase tracking-tighter"
                            >
                                {t.nombre}
                            </button>
                            ))}
                    </div>
                    )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Establecimiento / Comercio</label>
                <input type="text" name="comercio_nombre" required placeholder="Nombre de la Tienda / Negocio"
                  className="w-full bg-slate-950 border border-admin-gold/30 rounded-xl px-4 py-3 text-white text-xs outline-none focus:border-admin-gold transition-all" />
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-white/5 group">
                <label className="flex items-center gap-4 cursor-pointer">
                    <input 
                        type="checkbox" 
                        name="habeas_data" 
                        required 
                        onChange={(e) => setAccepted(e.target.checked)}
                        className="h-5 w-5 bg-slate-800 border-white/10 rounded-lg text-admin-gold focus:ring-0 cursor-pointer" />
                    <p className="text-[10px] font-bold text-slate-500 leading-tight group-hover:text-slate-300">
                        Autorizo bajo Ley 1581 el tratamiento de datos para validación técnica del sorteo.
                    </p>
                </label>
              </div>

              <div className="pt-4 flex flex-col md:flex-row gap-3">
                 <button type="button" onClick={onClose} className="py-4 md:flex-1 rounded-2xl border border-white/10 text-slate-500 font-bold hover:bg-white/5 transition-all outline-none text-xs uppercase tracking-widest active:scale-95">Regresar</button>
                 <button
                    type="submit"
                    disabled={loading || !accepted}
                    className="py-4 md:flex-[2] bg-admin-blue hover:bg-blue-600 text-white font-black rounded-2xl transition-all shadow-xl shadow-blue-500/20 disabled:opacity-30 disabled:grayscale flex items-center justify-center gap-3 outline-none text-xs uppercase tracking-widest active:scale-105"
                  >
                    {loading
                      ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Procesando...</>
                      : 'Finalizar Registro'}
                  </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ActivarForm({ boletas, territorios = [] }: { boletas: any[]; territorios?: any[] }) {
  const [selectedBoleta, setSelectedBoleta] = useState<any | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const totalPages = Math.ceil(boletas.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedBoletas = boletas.slice(startIndex, startIndex + itemsPerPage);

  // Cálculo de stock por frente
  const stockPorZona = boletas.reduce((acc: any, curr: any) => {
    const zona = curr.zonas?.nombre || 'General';
    acc[zona] = (acc[zona] || 0) + 1;
    return acc;
  }, {});
  const zonasActivas = Object.entries(stockPorZona);

  return (
    <div className="w-full h-full overflow-y-auto pb-20 custom-scrollbar">
      {selectedBoleta && (
        <VentaModal 
          boleta={selectedBoleta} 
          territorios={territorios}
          onClose={() => setSelectedBoleta(null)} 
        />
      )}

      {/* MÉTRICAS TÁCTICAS */}
      {zonasActivas.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
              {zonasActivas.map(([zona, cant]: any) => (
                  <div key={zona} className="bg-slate-900 border border-white/5 p-5 rounded-3xl shadow-2xl relative overflow-hidden group">
                      <div className="absolute -right-2 -bottom-2 text-4xl opacity-5 group-hover:opacity-10 transition-opacity">🗺️</div>
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Frente {zona}</p>
                      <p className="text-3xl font-black text-white">{cant}</p>
                  </div>
              ))}
          </div>
      )}

      <div className="bg-admin-card rounded-3xl border border-admin-border shadow-2xl relative overflow-hidden">
        {/* Header con sumatoria total */}
        <div className="p-6 md:p-8 border-b border-admin-border flex justify-between items-center bg-slate-950/20">
          <div>
            <h3 className="font-black text-white uppercase text-[10px] tracking-widest">Maletín de Campo</h3>
            <p className="text-[9px] text-slate-600 mt-1 uppercase font-black">Estado: <span className="text-emerald-400">Listo para activación</span></p>
          </div>
          <div className="text-right">
             <p className="text-[10px] font-black text-slate-500 uppercase leading-none mb-1">Total Stock</p>
             <p className="text-4xl font-black text-white leading-none tracking-tighter">{boletas.length}</p>
          </div>
        </div>

        {boletas.length === 0 ? (
          <div className="p-24 text-center">
            <div className="w-20 h-20 bg-slate-900 border border-white/5 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 grayscale opacity-20">📭</div>
            <p className="text-xs font-black uppercase tracking-widest text-slate-600">Sin stock disponible</p>
          </div>
        ) : (
          <div>
            {/* VISTA MÓVIL (TARJETAS) */}
            <div className="md:hidden divide-y divide-white/5">
                {paginatedBoletas.map(b => (
                    <div key={b.id_boleta} className="p-6 active:bg-white/5 transition-all">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-0.5">Consecutivo</p>
                                <p className="text-lg font-black text-white"># {b.id_boleta}</p>
                            </div>
                            <span className="bg-admin-blue/10 text-admin-blue border border-admin-blue/20 text-[9px] font-black px-3 py-1 rounded-full uppercase">
                                {b.zonas?.nombre || 'General'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                             <div>
                                <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Hash de Seguridad</p>
                                <p className="text-[11px] font-mono font-bold text-slate-400">TKN-{String(b.id_boleta).padStart(6, '0')}</p>
                             </div>
                             <button 
                                onClick={() => setSelectedBoleta(b)}
                                className="px-6 py-3 bg-admin-blue text-white font-black text-[11px] uppercase tracking-widest rounded-2xl shadow-xl shadow-blue-500/20 active:scale-95"
                             >
                                Vender
                             </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* VISTA DESKTOP (TABLA) */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap">
                <thead>
                    <tr className="border-b border-admin-border text-[10px] uppercase text-slate-500 bg-slate-950/40 font-black tracking-widest">
                    <th className="p-6 pl-8">Audit Hash</th>
                    <th className="p-6">Frente Comercial</th>
                    <th className="p-6 text-center">Consecutivo Físico</th>
                    <th className="p-6 text-right pr-8">Acción en Campo</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-admin-border font-mono">
                    {paginatedBoletas.map((b) => (
                    <tr key={b.id_boleta} className="hover:bg-admin-blue/5 transition-all group">
                        <td className="p-4 pl-8 text-admin-blue text-[11px] font-black">
                        TKN-{String(b.id_boleta).padStart(6, '0')}
                        </td>
                        <td className="p-4">
                        <span className="bg-admin-blue/5 text-admin-blue border border-admin-blue/10 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">
                            {b.zonas?.nombre || 'General'}
                        </span>
                        </td>
                        <td className="p-4 text-center text-white font-black text-sm group-hover:text-admin-gold transition-colors">{b.id_boleta}</td>
                        <td className="p-4 text-right pr-8">
                        <button 
                            onClick={() => setSelectedBoleta(b)}
                            className="px-6 py-3 bg-admin-blue hover:bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-blue-500/10 active:scale-95"
                        >
                            Vender Boleta
                        </button>
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>
            </div>

            {/* PAGINACIÓN TÁCTICA */}
            <div className="p-6 md:p-8 bg-slate-950/50 border-t border-admin-border flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest bg-slate-900 px-5 py-2 rounded-full border border-white/5">
                   Página <span className="text-white mx-1">{currentPage}</span> / {totalPages || 1}
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="w-14 h-14 flex items-center justify-center rounded-3xl bg-slate-900 border border-white/5 text-white disabled:opacity-10 active:scale-90 transition-all font-black text-xl"
                  >
                    ←
                  </button>
                  
                  <button 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="w-14 h-14 flex items-center justify-center rounded-3xl bg-slate-900 border border-white/5 text-white disabled:opacity-10 active:scale-90 transition-all font-black text-xl"
                  >
                    →
                  </button>
                </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
