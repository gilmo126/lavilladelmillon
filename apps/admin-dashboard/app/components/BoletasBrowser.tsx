'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getBoletasPaged, exportarParticipantesAction } from '../../lib/actions';
import { Search as SearchIcon, Eye } from 'lucide-react';

function estadoToString(estado: number) {
  switch (estado) {
    case 0: return 'GENERADO';
    case 1: return 'ACTIVADO';
    case 2: return 'REGISTRADO';
    case 3: return 'ANULADO';
    case 4: return 'SORTEADO';
    default: return 'DESCONOCIDO';
  }
}

function BoletaDetailDrawer({ boleta, onClose, onRefresh }: { boleta: any; onClose: () => void; onRefresh: () => void }) {
  if (!boleta) return null;
  const [isAnnulling, setIsAnnulling] = useState(false);

  const timeline = [
    { label: 'Generación en Pack', date: boleta.created_at, icon: '🆕', status: 'done' },
    { label: 'Activación por Cliente', date: boleta.fecha_activacion, icon: '🏪', status: boleta.estado >= 1 ? 'done' : boleta.estado === 3 ? 'failed' : 'pending' },
    { label: 'Registro Completo', date: boleta.fecha_registro, icon: '🏆', status: boleta.estado >= 2 ? 'done' : boleta.estado === 3 ? 'failed' : 'pending' },
    { label: 'Participación en Sorteo', date: boleta.updated_at, icon: '🔒', status: boleta.estado === 4 ? 'done' : 'pending' },
  ];

  const handleAnular = async () => {
    if (boleta.estado === 3) return;
    if (!window.confirm(`⚠️ ADVERTENCIA CRÍTICA: ¿Estás seguro de que deseas ANULAR la boleta ${boleta.token_integridad}?\n\nEsta acción es IRREVERSIBLE.`)) return;

    setIsAnnulling(true);
    try {
      const { createClient } = await import('../../utils/supabase/client');
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sesión no válida");

      const { anularBoletaAction } = await import('../../lib/actions');
      const res = await anularBoletaAction(user.id, boleta.id_boleta);
      
      if (res.success) {
        alert("✅ Boleta anulada.");
        onRefresh();
        onClose();
      } else {
        throw new Error(res.error);
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsAnnulling(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-slate-900 border-l border-white/10 shadow-2xl z-[200] animate-in slide-in-from-right duration-300 flex flex-col">
      <div className="p-6 border-b border-white/10 flex justify-between items-center bg-slate-950/50">
        <div>
          <h3 className="text-xl font-bold text-white tracking-tight">Expediente Táctico</h3>
          <p className="text-[10px] text-admin-blue font-mono uppercase tracking-widest mt-1">{boleta.token_integridad}</p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-slate-400 hover:text-white transition-all">✕</button>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
        <section>
          <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-3 bg-admin-gold rounded-full" />
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Estado de Vida</h4>
          </div>
          <div className="bg-slate-950 border border-white/5 rounded-2xl p-5 flex items-center justify-between">
            <span className={`text-base font-black tracking-tight ${boleta.estado === 3 ? 'text-red-500' : 'text-white'}`}>
              {estadoToString(boleta.estado)}
            </span>
            <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-admin-blue/10 border border-admin-blue/20 text-admin-blue uppercase">
              ID #{boleta.id_boleta}
            </span>
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-6">
              <div className="w-1 h-3 bg-admin-blue rounded-full" />
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Ruta de Trazabilidad</h4>
          </div>
          <div className="relative pl-8 space-y-10 border-l border-white/5 ml-3">
            {timeline.map((step, idx) => (
              <div key={idx} className="relative">
                <div className={`absolute -left-[41px] top-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] border transition-all ${
                  step.status === 'done' ? 'bg-admin-blue border-admin-blue text-white shadow-lg shadow-blue-500/20' : 
                  step.status === 'failed' ? 'bg-red-500 border-red-500 text-white shadow-lg shadow-red-500/20' :
                  'bg-slate-950 border-white/10 text-slate-600'
                }`}>
                  {step.status === 'done' ? '✓' : step.status === 'failed' ? '✕' : idx + 1}
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-xl filter grayscale group-hover:grayscale-0 transition-all">{step.icon}</span>
                    <p className={`font-bold text-xs uppercase tracking-tight ${step.status === 'done' ? 'text-white' : step.status === 'failed' ? 'text-red-400' : 'text-slate-600'}`}>
                      {step.label}
                    </p>
                  </div>
                  {step.date ? (
                    <p className="text-[10px] text-admin-blue font-bold px-1">
                      {new Date(step.date).toLocaleString()}
                    </p>
                  ) : (
                    <p className="text-[10px] text-slate-700 italic px-1 lowercase font-bold">
                      {boleta.estado === 3 ? 'abortado' : 'pendiente...'}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {boleta.pack && (
          <section className="bg-slate-950 rounded-2xl p-6 border border-admin-gold/20 space-y-2">
            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-1.5">Pack de Origen</p>
            <p className="text-lg font-black text-admin-gold">PACK-{String(boleta.pack.numero_pack).padStart(3, '0')}</p>
            {boleta.pack.comerciante_nombre && (
              <p className="text-[10px] text-slate-400 font-bold">Comerciante: {boleta.pack.comerciante_nombre}</p>
            )}
          </section>
        )}

        {(boleta.comercio_nombre || boleta.nombre_usuario) && (
          <section className="bg-slate-950 rounded-2xl p-6 border border-white/5 space-y-5">
            {boleta.comercio_nombre && (
              <div>
                <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-1.5">Ubicación / Punto de Venta</p>
                <p className="text-sm text-white font-black">{boleta.comercio_nombre}</p>
                <p className="text-[10px] text-admin-gold font-bold mt-1 uppercase">📍 {boleta.zonas?.nombre || 'General'}</p>
              </div>
            )}
            {boleta.nombre_usuario && (
              <div className="pt-4 border-t border-white/5">
                <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-1.5">Titular Registrado</p>
                <p className="text-sm text-white font-black">{boleta.nombre_usuario}</p>
                <p className="text-[10px] text-slate-400 font-bold mt-1">CC: {boleta.identificacion_usuario}</p>
              </div>
            )}
            {boleta.premios?.nombre_premio && (
              <div className="pt-4 border-t border-white/5">
                <p className="text-[9px] font-bold text-admin-gold uppercase tracking-widest mb-1.5">Mérito Reclamado</p>
                <div className="bg-admin-gold/5 border border-admin-gold/20 p-3 rounded-xl border-dashed">
                    <p className="text-sm text-admin-gold font-black">{boleta.premios.nombre_premio}</p>
                </div>
              </div>
            )}
          </section>
        )}
      </div>

      <div className="p-8 border-t border-white/10 bg-slate-950/80 space-y-3">
        {boleta.estado !== 3 && (
          <button 
            onClick={handleAnular}
            disabled={isAnnulling}
            className="w-full py-4 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/20 rounded-2xl font-black transition-all text-xs tracking-widest disabled:opacity-50 uppercase"
          >
            {isAnnulling ? 'Procesando Bajas...' : '❌ Anular Permanente'}
          </button>
        )}
        <button 
          onClick={onClose}
          className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-black transition-colors text-xs tracking-widest uppercase"
        >
          Cerrar Expediente
        </button>
      </div>
    </div>
  );
}

export default function BoletasBrowser({ userProfile }: { userProfile: any }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [range, setRange] = useState({ desde: '', hasta: '' });
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [soloRegistrados, setSoloRegistrados] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [selectedBoleta, setSelectedBoleta] = useState<any>(null);
  
  const limit = 10; // Optimización masiva: 10 registros por página

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const rangeParams = {
          desde: range.desde ? parseInt(range.desde) : undefined,
          hasta: range.hasta ? parseInt(range.hasta) : undefined
      };
      const res = await getBoletasPaged(
        page,
        limit,
        query,
        rangeParams,
        userProfile.rol === 'distribuidor' ? userProfile.id : undefined,
        soloRegistrados
      );
      setData(res.data || []);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, limit, query, range.desde, range.hasta, soloRegistrados]);

  // Efecto 1: Reset a pág 1 cuando cambian los filtros (con Debounce)
  useEffect(() => {
    const handler = setTimeout(() => {
      setPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [query, range.desde, range.hasta, soloRegistrados]);

  // Efecto 2: Fetch de datos cuando cambia la página O cuando los filtros (pág 1) se estabilizan
  useEffect(() => {
    fetchData();
  }, [page, fetchData]);

  // Sincronización de Marca dinamica
  const [brand, setBrand] = useState('La Villa del Millón');
  useEffect(() => {
    import('../../lib/actions').then(m => m.getConfiguracion()).then(cfg => {
        if(cfg?.nombre_campana) setBrand(cfg.nombre_campana);
    });
  }, []);

  return (
    <div className="flex flex-col h-full bg-admin-dark p-4 md:p-10 w-full overflow-hidden relative">
      {selectedBoleta && (
        <BoletaDetailDrawer 
          boleta={selectedBoleta} 
          onClose={() => setSelectedBoleta(null)} 
          onRefresh={fetchData}
        />
      )}

      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-8 gap-6 shrink-0">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-white">{brand}</h2>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-admin-blue rounded-full animate-pulse" />
              Explorador de Auditoría ({total.toLocaleString()} resultados)
          </p>
        </div>
        
        <div className="flex flex-wrap gap-3 w-full lg:w-auto">
          {/* Rango ID */}
          <div className="flex items-center gap-2 bg-slate-900 border border-white/5 rounded-xl px-3 group focus-within:border-admin-blue transition-all">
             <span className="text-[10px] font-bold text-slate-600 uppercase">ID</span>
             <input 
                type="number" 
                placeholder="0"
                value={range.desde}
                onChange={e => setRange(r => ({...r, desde: e.target.value}))}
                className="bg-transparent py-2 w-16 text-xs text-white outline-none font-mono"
             />
             <span className="text-slate-700">|</span>
             <input 
                type="number" 
                placeholder="999"
                value={range.hasta}
                onChange={e => setRange(r => ({...r, hasta: e.target.value}))}
                className="bg-transparent py-2 w-16 text-xs text-white outline-none font-mono"
             />
          </div>

          <input 
            type="text" 
            placeholder="Documento o Token..." 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 lg:flex-none px-4 py-3 bg-slate-900 border border-white/5 rounded-xl text-xs font-bold text-white placeholder-slate-600 outline-none focus:border-admin-blue transition-all min-w-[180px]"
          />

          {/* Filtro Registrados + Exportar */}
          <button
            onClick={() => setSoloRegistrados(!soloRegistrados)}
            className={`px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all border ${
              soloRegistrados
                ? 'bg-admin-green/10 border-admin-green text-admin-green'
                : 'bg-slate-900 border-white/5 text-slate-500 hover:text-white'
            }`}
          >
            {soloRegistrados ? '✅ Participantes' : '👥 Solo Registrados'}
          </button>

          <button
            onClick={async () => {
              setExportando(true);
              const rows = await exportarParticipantesAction(userProfile.rol === 'distribuidor' ? userProfile.id : undefined);
              if (rows.length > 0) {
                const headers = ['Número', 'Nombre', 'Cédula', 'Celular', 'Email', 'Premio', 'Pack', 'Fecha Registro'];
                const csv = [headers, ...rows.map(r => [r.numero, r.nombre, r.identificacion, r.celular, r.email, r.premio, r.pack, r.fecha_registro ? new Date(r.fecha_registro).toLocaleString('es-CO') : ''])].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
                const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = 'participantes-sorteo.csv';
                link.click();
                URL.revokeObjectURL(url);
              }
              setExportando(false);
            }}
            disabled={exportando}
            className="px-4 py-3 bg-admin-gold hover:bg-yellow-500 disabled:opacity-40 text-slate-900 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
          >
            {exportando ? '...' : '📥 Exportar'}
          </button>
        </div>
      </header>

      <div className="bg-admin-card rounded-3xl border border-admin-border shadow-2xl flex-1 overflow-hidden flex flex-col mb-6 relative">
        {loading && (
          <div className="absolute inset-0 z-10 bg-admin-dark/40 backdrop-blur-sm flex justify-center items-center text-admin-gold">
            <div className="w-10 h-10 border-4 border-admin-gold/20 border-t-admin-gold rounded-full animate-spin"></div>
          </div>
        )}

        {/* VISTA MÓVIL (CARDS) */}
        <div className="md:hidden overflow-y-auto flex-1 p-4 space-y-4 custom-scrollbar">
            {data.length === 0 && !loading && (
                <div className="text-center py-20 uppercase text-[10px] font-bold text-slate-600 tracking-widest">Sin resultados encontrados</div>
            )}
            {data.map(b => (
                <div key={b.id_boleta} onClick={() => setSelectedBoleta(b)} className="bg-slate-900 border border-white/5 p-5 rounded-2xl active:scale-95 transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">ID #{b.id_boleta}</p>
                            <p className="text-sm font-black text-white font-mono">{b.token_integridad}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border tracking-tighter ${
                            b.estado === 1 ? 'bg-admin-blue/10 border-admin-blue/20 text-admin-blue' :
                            b.estado === 2 ? 'bg-admin-green/10 border-admin-green/20 text-admin-green' :
                            b.estado === 3 ? 'bg-red-500/10 border-red-500/20 text-red-500' :
                            b.estado === 4 ? 'bg-admin-gold/10 border-admin-gold/20 text-admin-gold' :
                            'bg-slate-100/10 border-white/5 text-slate-300'
                        }`}>
                           {estadoToString(b.estado)}
                        </span>
                    </div>
                    <div className="space-y-2 mb-6">
                        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-tighter">
                            <span className="text-slate-600">Responsable</span>
                            <span className="text-slate-300">{b.distribuidor?.nombre || 'Sin asignar'}</span>
                        </div>
                        {b.identificacion_usuario && (
                            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-tighter">
                                <span className="text-slate-600">Titular</span>
                                <span className="text-admin-gold">{b.identificacion_usuario}</span>
                            </div>
                        )}
                    </div>
                    <button className="w-full py-3 bg-white/5 hover:bg-admin-blue text-white font-bold text-[10px] uppercase tracking-widest rounded-xl border border-white/5">
                        Ver Auditoría Completa
                    </button>
                </div>
            ))}
        </div>

        {/* VISTA DESKTOP (DENSE TABLE) */}
        <div className="hidden md:block overflow-x-auto flex-1 overflow-y-auto custom-scrollbar">
          <table className="w-full text-left text-[11px] whitespace-nowrap min-w-[900px]">
            <thead className="sticky top-0 z-20 bg-slate-900 shadow-xl border-b border-white/5">
              <tr className="text-slate-500 uppercase font-black tracking-tighter">
                <th className="p-4 pl-8">ID / Número</th>
                <th className="p-4">Pack</th>
                <th className="p-4">Estado</th>
                <th className="p-4">Identidad</th>
                <th className="p-4">Comercio</th>
                <th className="p-4">Distribuidor</th>
                <th className="p-4 text-admin-gold">Premio</th>
                <th className="p-4 text-right pr-8">Auditoría</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.map((b) => (
                <tr 
                  key={b.id_boleta} 
                  className="hover:bg-admin-blue/5 transition-all group cursor-pointer"
                  onClick={() => setSelectedBoleta(b)}
                >
                  <td className="p-3 pl-8 text-white font-bold font-mono">{b.id_boleta < 1_000_000 ? String(b.id_boleta).padStart(6, '0') : String(b.id_boleta)}</td>
                  <td className="p-3 text-admin-gold font-black text-[10px]">{b.pack?.numero_pack ? `PACK-${String(b.pack.numero_pack).padStart(3, '0')}` : '—'}</td>
                  <td className="p-3">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-black border tracking-tighter ${
                      b.estado === 1 ? 'bg-admin-blue/10 border-admin-blue/20 text-admin-blue' :
                      b.estado === 2 ? 'bg-admin-green/10 border-admin-green/20 text-admin-green' :
                      b.estado === 3 ? 'bg-red-500/10 border-red-500/20 text-red-500' :
                      b.estado === 4 ? 'bg-admin-gold/10 border-admin-gold/20 text-admin-gold' :
                      'bg-slate-100/10 border-white/5 text-slate-300'
                    }`}>
                      {estadoToString(b.estado)}
                    </span>
                  </td>
                  <td className="p-3 text-slate-300">
                    {b.identificacion_usuario || '-'} 
                    {b.nombre_usuario && <span className="text-slate-600 ml-1">({b.nombre_usuario})</span>}
                  </td>
                  <td className="p-3 text-slate-400 font-bold uppercase">{b.comercio_nombre || b.zonas?.nombre || '-'}</td>
                  <td className="p-3">
                    <span className="text-slate-500 font-bold uppercase tracking-tighter">
                      {b.distribuidor?.nombre || 'Sin asignar'}
                    </span>
                  </td>
                  <td className="p-3 text-admin-gold font-black uppercase text-[9px]">{b.premios?.nombre_premio || '—'}</td>
                  <td className="p-3 text-right pr-8">
                    <button className="w-8 h-8 flex items-center justify-center bg-slate-800/50 hover:bg-admin-blue text-slate-500 hover:text-white rounded-lg transition-all border border-white/5 active:scale-90 shadow-sm">
                      <SearchIcon size={14} strokeWidth={3} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* PAGINACIÓN ADAPTATIVA */}
      <footer className="flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0 px-4 pb-8">
        <div className="text-[10px] uppercase font-black text-slate-500 tracking-widest bg-slate-900 px-4 py-2 rounded-full border border-white/5">
           Página <span className="text-white px-1">{page}</span> de <span className="text-white px-1">{totalPages || 1}</span>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Navegación Desktop */}
          <div className="hidden sm:flex gap-1">
             <button disabled={page <= 1} onClick={() => setPage(1)} className="px-3 py-3 border border-white/5 text-[10px] font-bold uppercase tracking-widest text-slate-400 rounded-xl hover:bg-slate-800 disabled:opacity-10 transition-all">Primero</button>
             <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-4 py-3 border border-white/5 text-[10px] font-bold uppercase tracking-widest text-slate-400 rounded-xl hover:bg-slate-800 disabled:opacity-10 transition-all flex items-center gap-2">‹ Anterior</button>
          </div>

          {/* Navegación Mobile Simplificada */}
          <div className="flex sm:hidden gap-3">
             <button 
                disabled={page <= 1 || loading} 
                onClick={() => setPage(p => p - 1)} 
                className="w-14 h-14 flex items-center justify-center bg-slate-900 border border-white/10 rounded-2xl text-white active:scale-95 disabled:opacity-30 font-black text-xl"
             >←</button>
             <button 
                disabled={page >= totalPages || loading} 
                onClick={() => setPage(p => p + 1)} 
                className="w-14 h-14 flex items-center justify-center bg-slate-900 border border-white/10 rounded-2xl text-white active:scale-95 disabled:opacity-30 font-black text-xl"
             >→</button>
          </div>

          <div className="hidden sm:flex gap-1">
             <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-4 py-3 border border-white/5 text-[10px] font-bold uppercase tracking-widest text-slate-400 rounded-xl hover:bg-slate-800 disabled:opacity-10 transition-all flex items-center gap-2">Siguiente ›</button>
             <button disabled={page >= totalPages} onClick={() => setPage(totalPages)} className="px-3 py-3 border border-white/5 text-[10px] font-bold uppercase tracking-widest text-slate-400 rounded-xl hover:bg-slate-800 disabled:opacity-10 transition-all">Último</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
