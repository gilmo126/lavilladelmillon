'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { getBoletasPaged } from '../../lib/actions';
import Link from 'next/link';

function estadoToString(estado: number) {
  switch (estado) {
    case 0: return 'BODEGA';
    case 1: return 'DESPACHADA';
    case 2: return 'ACTIVA / VENDIDA';
    case 3: return 'REGISTRADA';
    case 4: return 'ANULADA';
    case 5: return 'SORTEADA';
    default: return 'DESCONOCIDO';
  }
}

function getTimeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);
  
  if (diffInMinutes < 1) return 'hace segundos';
  if (diffInMinutes < 60) return `hace ${diffInMinutes} min`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `hace ${diffInHours} h`;
  return `hace ${Math.floor(diffInHours / 24)} días`;
}

interface BoletaRegistro {
  id_boleta: number;
  token_integridad: string;
  zona_comercio: string;
  estado: number;
  nombre_usuario: string;
  updated_at: string;
  zonas?: { nombre: string }; // Nueva relación para mostrar zona
}

interface ZonaRanking {
  nombre: string;
  activadas: number;
  registradas: number;
  conversion: string;
}

interface RealtimeDashboardProps {
  initialConfig: string;
  initialCounts: {
    total: number;
    activas: number;
    registradas: number;
  };
  initialRecientes: BoletaRegistro[];
  initialRanking: ZonaRanking[];
  userProfile: any;
}

export default function RealtimeDashboard({ initialConfig, initialCounts, initialRecientes, initialRanking, userProfile }: RealtimeDashboardProps) {
  const [total, setTotal] = useState(initialCounts.total);
  const [activas, setActivas] = useState(initialCounts.activas);
  const [registradas, setRegistradas] = useState(initialCounts.registradas);
  
  // Paginación para la tabla de registros
  const [recientes, setRecientes] = useState<BoletaRegistro[]>(initialRecientes);
  const [page, setPage] = useState(1);
  const limit = 10;
  const [totalPages, setTotalPages] = useState(Math.ceil(initialCounts.total / limit));
  const [loading, setLoading] = useState(false);

  const [ranking, setRanking] = useState<ZonaRanking[]>(initialRanking);

  const isDist = userProfile?.rol === 'distribuidor';
  const myId = userProfile?.id;

  const fetchPagedData = useCallback(async (p: number) => {
      setLoading(true);
      try {
          const res = await getBoletasPaged(p, limit, "");
          setRecientes(res.data);
          setTotalPages(res.totalPages);
          // Actualizar total también si hubo cambios
          if (res.total !== total) setTotal(res.total);
      } catch (e) {
          console.error(e);
      } finally {
          setLoading(false);
      }
  }, [total]);

  // Sincronización Real-time (solo para resetear a la pag 1 o actualizar contadores)
  useEffect(() => {
    const channel = supabase.channel('dashboard-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'boletas' }, () => {
          // Refrescar página 1 si hay cambios para ver lo más nuevo
          if (page === 1) fetchPagedData(1);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [page, fetchPagedData]);

  const bodega = total - (activas + registradas);
  const pctRegistradas = total > 0 ? Math.round((registradas / total) * 100) : 0;
  const pctActivas = total > 0 ? Math.round((activas / total) * 100) : 0;
  const pctBodega = total > 0 ? Math.round((bodega / total) * 100) : 0;

  const kpis = [
    { label: 'Campaña Activa', value: initialConfig, color: 'text-admin-gold' },
    { label: 'Total Inventario', value: total.toLocaleString(), color: 'text-white' },
    { label: 'En Punto (Activas)', value: activas.toLocaleString(), color: 'text-admin-blue' },
    { label: 'Convertidas (Reg)', value: registradas.toLocaleString(), color: 'text-admin-green' },
  ];

  return (
    <div className="w-full flex-1 overflow-y-auto px-4 md:px-0 pb-20 custom-scrollbar">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight">{initialConfig}</h2>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Torre de Control Operativa</p>
        </div>
        <div className="px-4 py-2 bg-slate-900 border border-white/5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-3 text-slate-400">
          <span className="w-2 h-2 rounded-full bg-admin-green animate-pulse shadow-lg shadow-green-500/50" /> 
          Sincronización: Live
        </div>
      </header>

      {/* KPIs Responsivos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {kpis.map((kpi, index) => (
          <div key={index} className="bg-slate-900 border border-white/5 rounded-3xl p-6 shadow-2xl relative overflow-hidden group">
            <div className="absolute -right-2 -bottom-2 text-4xl opacity-5 group-hover:opacity-10 transition-opacity">📈</div>
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">{kpi.label}</h3>
            <p className={`text-2xl md:text-3xl font-black tracking-tighter ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tabla / Cards de Registros Recientes */}
        <div className="lg:col-span-2 bg-admin-card rounded-3xl border border-admin-border shadow-2xl overflow-hidden flex flex-col min-h-[500px]">
          <div className="p-6 md:p-8 border-b border-white/5 flex justify-between items-center bg-slate-950/20">
            <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                <div className="w-1 h-3 bg-admin-blue rounded-full" />
                Historial de Trazabilidad
            </h3>
            <Link href="/boletas" className="text-[10px] font-black text-admin-blue hover:text-white uppercase tracking-widest transition-colors">Ver Explorador →</Link>
          </div>

          <div className="flex-1 relative">
            {loading && (
                <div className="absolute inset-0 z-10 bg-admin-dark/40 backdrop-blur-sm flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-admin-blue/20 border-t-admin-blue rounded-full animate-spin" />
                </div>
            )}

            {/* Mobile: Layout de Tarjetas */}
            <div className="md:hidden divide-y divide-white/5">
                {recientes.map(reg => (
                    <div key={reg.id_boleta} className="p-6 space-y-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-[10px] font-bold text-slate-600 uppercase mb-0.5">#{reg.id_boleta}</p>
                                <p className="text-sm font-black text-white font-mono">{reg.token_integridad}</p>
                            </div>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border tracking-tighter ${
                            reg.estado === 2 ? 'bg-admin-green/10 border-admin-green/20 text-admin-green' : 
                            reg.estado === 1 ? 'bg-admin-blue/10 border-admin-blue/20 text-admin-blue' :
                            reg.estado === 3 ? 'bg-admin-gold/10 border-admin-gold/20 text-admin-gold' :
                            'bg-slate-100/10 border-white/5 text-slate-300'
                        }`}>
                            {estadoToString(reg.estado)}
                        </span>
                        </div>
                        <div className="flex justify-between items-end border-t border-white/5 pt-4">
                            <div>
                                <p className="text-[9px] font-bold text-slate-600 uppercase">Frente</p>
                                <p className="text-[10px] font-black text-admin-gold uppercase">{reg.zonas?.nombre || 'General'}</p>
                            </div>
                            <p className="text-[10px] font-bold text-slate-500">{getTimeAgo(reg.updated_at)}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Desktop: Tabla Densa */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-[11px] whitespace-nowrap">
                <thead className="bg-slate-950/40 text-slate-500 uppercase font-black tracking-tighter">
                    <tr className="border-b border-white/5">
                    <th className="p-6 pl-8">ID</th>
                    <th className="p-6">Token Hash</th>
                    <th className="p-6">Frente Comercial</th>
                    <th className="p-6">Estado Vida</th>
                    <th className="p-6">Custodia / Titular</th>
                    <th className="p-6 text-right pr-8">Cronos</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {recientes.map((reg) => (
                    <tr key={reg.id_boleta} className="hover:bg-admin-blue/5 transition-all">
                        <td className="p-4 pl-8 font-black text-white">#{reg.id_boleta}</td>
                        <td className="p-4 font-mono text-slate-500 text-[10px]">{reg.token_integridad}</td>
                        <td className="p-4 text-admin-gold font-black uppercase text-[10px]">{reg.zonas?.nombre || 'General'}</td>
                        <td className="p-4">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border tracking-tighter ${
                            reg.estado === 2 ? 'bg-admin-green/10 border-admin-green/20 text-admin-green' : 
                            reg.estado === 1 ? 'bg-admin-blue/10 border-admin-blue/20 text-admin-blue' :
                            reg.estado === 3 ? 'bg-admin-gold/10 border-admin-gold/20 text-admin-gold' :
                            'bg-slate-100/10 border-white/5 text-slate-300'
                            }`}>
                            {estadoToString(reg.estado)}
                            </span>
                        </td>
                        <td className="p-4 text-slate-400 font-bold uppercase">{reg.nombre_usuario || 'En Almacén'}</td>
                        <td className="p-4 text-right pr-8 text-slate-500 font-bold">
                            {getTimeAgo(reg.updated_at)}
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>
            </div>
          </div>

          {/* Paginación Dashboard */}
          <div className="p-8 bg-slate-950/20 border-t border-white/5 flex justify-between items-center">
             <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Pág {page} / {totalPages}</span>
             <div className="flex gap-3">
                <button 
                    disabled={page === 1 || loading} 
                    onClick={() => { const p = page - 1; setPage(p); fetchPagedData(p); }}
                    className="w-12 h-12 md:w-10 md:h-10 flex items-center justify-center bg-slate-900 border border-white/5 rounded-xl text-white disabled:opacity-10 active:scale-90 transition-all font-black text-lg md:text-base"
                >←</button>
                <button 
                    disabled={page >= totalPages || loading} 
                    onClick={() => { const p = page + 1; setPage(p); fetchPagedData(p); }}
                    className="w-12 h-12 md:w-10 md:h-10 flex items-center justify-center bg-slate-900 border border-white/5 rounded-xl text-white disabled:opacity-10 active:scale-90 transition-all font-black text-lg md:text-base"
                >→</button>
             </div>
          </div>
        </div>

        <div className="space-y-6">
            {/* Ranking de Zonas */}
            <div className="bg-slate-900 border border-white/5 rounded-3xl p-8 shadow-2xl">
                <h3 className="text-xs font-black text-white uppercase tracking-widest mb-8 flex items-center justify-between">
                    Desempeño Geográfico
                    <span className="bg-admin-gold/10 text-admin-gold px-2 py-0.5 rounded text-[8px]">En tiempo real</span>
                </h3>
                <div className="space-y-6">
                    {ranking.map((z, idx) => (
                        <div key={idx} className="space-y-2">
                            <div className="flex justify-between items-end">
                                <span className="text-[11px] font-black text-white uppercase tracking-tighter">{z.nombre}</span>
                                <span className="text-[10px] font-black text-admin-gold">{z.conversion}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden flex shadow-inner">
                                <div className="h-full bg-admin-blue/40" style={{ width: `${Math.min(100, (z.activadas / (total || 1)) * 100)}%` }} />
                                <div className="h-full bg-admin-green shadow-lg shadow-green-500/50" style={{ width: `${z.conversion}%` }} />
                            </div>
                            <div className="flex justify-between text-[9px] font-bold text-slate-600 uppercase tracking-widest">
                                <span>{z.activadas} Activas</span>
                                <span>{z.registradas} Reg</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Funnel Circular Responsivo */}
            <div className="bg-slate-900 border border-white/5 rounded-3xl p-8 flex flex-col items-center">
                <h3 className="text-xs font-black text-white uppercase tracking-widest mb-10 w-full">Embudo de Conversión</h3>
                <div className="relative w-40 h-40 rounded-full border-[6px] border-slate-950 flex items-center justify-center shadow-2xl"
                    style={{ background: `conic-gradient(#10B981 0% ${pctRegistradas}%, #3B82F6 ${pctRegistradas}% ${pctRegistradas + pctActivas}%, #1E293B ${pctRegistradas + pctActivas}% 100%)` }}>
                    <div className="w-32 h-32 bg-slate-900 rounded-full flex flex-col items-center justify-center border border-white/5 shadow-inner">
                        <span className="text-3xl font-black text-white tracking-tighter">{pctRegistradas}%</span>
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-1">Éxito Total</span>
                    </div>
                </div>
                <div className="mt-10 w-full space-y-4">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400">
                        <span className="flex items-center gap-3"><span className="w-2 h-2 rounded-full bg-admin-green" /> Registradas</span>
                        <span className="text-white">{pctRegistradas}%</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400">
                        <span className="flex items-center gap-3"><span className="w-2 h-2 rounded-full bg-admin-blue" /> Activas en PDV</span>
                        <span className="text-white">{pctActivas}%</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400">
                        <span className="flex items-center gap-3"><span className="w-2 h-2 rounded-full bg-slate-700" /> Bodega Central</span>
                        <span className="text-slate-500">{pctBodega}%</span>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
