'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { getDashboardCounts, getDashboardExtendedCounts } from '../../lib/actions';
import Link from 'next/link';

interface ExtendedCounts {
  totalPacks: number;
  packsPendientes: number;
  totalInvitaciones: number;
  invAceptadas: number;
  invPendientes: number;
  invRechazadas: number;
  asistencias: number;
  preRegistrosPendientes: number;
  personalActivo: number;
}

interface RealtimeDashboardProps {
  initialConfig: string;
  initialCounts: {
    total: number;
    activas: number;
    registradas: number;
  };
  initialExtended: ExtendedCounts;
  userProfile: any;
}

export default function RealtimeDashboard({ initialConfig, initialCounts, initialExtended, userProfile }: RealtimeDashboardProps) {
  const [total, setTotal] = useState(initialCounts.total);
  const [activas, setActivas] = useState(initialCounts.activas);
  const [registradas, setRegistradas] = useState(initialCounts.registradas);
  const [extended, setExtended] = useState<ExtendedCounts>(initialExtended);

  const isDist = userProfile?.rol === 'distribuidor';
  const isAdmin = userProfile?.rol === 'admin';
  const myId = userProfile?.id;

  const refreshCounts = useCallback(async () => {
    try {
      const [counts, ext] = await Promise.all([
        getDashboardCounts(isDist ? myId : undefined),
        getDashboardExtendedCounts(isDist ? myId : undefined),
      ]);
      setTotal(counts.total);
      setActivas(counts.activas);
      setRegistradas(counts.registradas);
      setExtended(ext);
    } catch (e) {
      console.error(e);
    }
  }, [isDist, myId]);

  useEffect(() => {
    const channel = supabase.channel('dashboard-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'boletas' }, () => refreshCounts())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'packs' }, () => refreshCounts())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invitaciones' }, () => refreshCounts())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [refreshCounts]);

  const bodega = total - (activas + registradas);
  const pctRegistradas = total > 0 ? parseFloat(((registradas / total) * 100).toFixed(1)) : 0;
  const pctActivas = total > 0 ? parseFloat(((activas / total) * 100).toFixed(1)) : 0;
  const pctBodega = total > 0 ? parseFloat(((bodega / total) * 100).toFixed(1)) : 0;

  type KpiCard = { label: string; value: string | number; color: string; href: string; emoji: string };

  const row1: KpiCard[] = [
    { label: 'Campana Activa', value: initialConfig, color: 'text-admin-gold', href: isAdmin ? '/configuracion' : '/', emoji: '🏆' },
    { label: 'Total Inventario', value: total.toLocaleString(), color: 'text-white', href: '/boletas', emoji: '🎟️' },
    { label: isDist ? 'Ventas en Comercio' : 'En Punto (Activas)', value: activas.toLocaleString(), color: 'text-admin-blue', href: '/boletas', emoji: '📍' },
    { label: 'Convertidas (Reg)', value: registradas.toLocaleString(), color: 'text-admin-green', href: '/boletas', emoji: '✅' },
  ];

  const row2: KpiCard[] = [
    { label: 'Total Invitaciones', value: extended.totalInvitaciones.toLocaleString(), color: 'text-purple-400', href: '/invitaciones?tab=todas', emoji: '🎪' },
    { label: 'Inv. Aceptadas', value: extended.invAceptadas.toLocaleString(), color: 'text-green-400', href: '/invitaciones?tab=aceptada', emoji: '🤝' },
    { label: 'Inv. Pendientes', value: extended.invPendientes.toLocaleString(), color: extended.invPendientes > 0 ? 'text-yellow-400' : 'text-slate-400', href: '/invitaciones?tab=pendiente', emoji: '⏳' },
    { label: 'Asistencias Evento', value: extended.asistencias.toLocaleString(), color: 'text-emerald-400', href: '/asistencia', emoji: '📋' },
  ];

  const row3: KpiCard[] = isAdmin ? [
    { label: 'Total Packs', value: extended.totalPacks.toLocaleString(), color: 'text-admin-gold', href: '/ventas', emoji: '📦' },
    { label: 'Packs Pago Pendiente', value: extended.packsPendientes.toLocaleString(), color: extended.packsPendientes > 0 ? 'text-orange-400' : 'text-slate-400', href: '/ventas', emoji: '💰' },
    { label: 'Pre-Registros Pendientes', value: extended.preRegistrosPendientes.toLocaleString(), color: extended.preRegistrosPendientes > 0 ? 'text-yellow-400' : 'text-slate-400', href: '/pre-registros', emoji: '📝' },
    { label: 'Inv. Rechazadas', value: extended.invRechazadas.toLocaleString(), color: extended.invRechazadas > 0 ? 'text-red-400' : 'text-slate-400', href: '/invitaciones?tab=todas', emoji: '❌' },
  ] : [];

  const row4: KpiCard[] = isAdmin ? [
    { label: 'Comerciantes', value: '—', color: 'text-cyan-400', href: '/comerciantes', emoji: '🏪' },
    { label: 'Personal Activo', value: extended.personalActivo.toLocaleString(), color: 'text-slate-300', href: '/distribuidores', emoji: '👥' },
  ] : [];

  function KpiGrid({ cards }: { cards: KpiCard[] }) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((kpi, i) => (
          <Link key={i} href={kpi.href}
            className="bg-slate-900 border border-white/5 rounded-3xl p-6 shadow-2xl relative overflow-hidden group hover:border-admin-gold/30 transition-all active:scale-[0.98]">
            <div className="absolute -right-2 -bottom-2 text-4xl opacity-5 group-hover:opacity-15 transition-opacity">{kpi.emoji}</div>
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">{kpi.label}</h3>
            <p className={`text-2xl md:text-3xl font-black tracking-tighter ${kpi.color}`}>{kpi.value}</p>
          </Link>
        ))}
      </div>
    );
  }

  return (
    <div className="w-full flex-1 overflow-y-auto px-4 md:px-0 pb-20 custom-scrollbar">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight">{initialConfig}</h2>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Torre de Control Operativa</p>
        </div>
        <div className="px-4 py-2 bg-slate-900 border border-white/5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-3 text-slate-400">
          <span className="w-2 h-2 rounded-full bg-admin-green animate-pulse shadow-lg shadow-green-500/50" />
          Sincronizacion: Live
        </div>
      </header>

      {/* KPIs Fila 1: Boletas */}
      <div className="mb-4">
        <KpiGrid cards={row1} />
      </div>

      {/* KPIs Fila 2: Operacion */}
      <div className="mb-4">
        <KpiGrid cards={row2} />
      </div>

      {/* KPIs Fila 3: Admin only */}
      {row3.length > 0 && (
        <div className="mb-4">
          <KpiGrid cards={row3} />
        </div>
      )}

      {/* KPIs Fila 4: Admin extras */}
      {row4.length > 0 && (
        <div className="mb-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {row4.map((kpi, i) => (
              <Link key={i} href={kpi.href}
                className="bg-slate-900 border border-white/5 rounded-3xl p-6 shadow-2xl relative overflow-hidden group hover:border-admin-gold/30 transition-all active:scale-[0.98]">
                <div className="absolute -right-2 -bottom-2 text-4xl opacity-5 group-hover:opacity-15 transition-opacity">{kpi.emoji}</div>
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">{kpi.label}</h3>
                <p className={`text-2xl md:text-3xl font-black tracking-tighter ${kpi.color}`}>{kpi.value}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Resumen de Invitaciones */}
        <div className="bg-slate-900 border border-white/5 rounded-3xl p-8 shadow-2xl">
          <h3 className="text-xs font-black text-white uppercase tracking-widest mb-8 flex items-center justify-between">
            Resumen de Invitaciones
            <Link href="/invitaciones/reporte" className="text-[10px] font-black text-admin-gold hover:text-white uppercase tracking-widest transition-colors">
              Ver Reporte →
            </Link>
          </h3>
          <div className="space-y-5">
            {[
              { label: 'Aceptadas', value: extended.invAceptadas, total: extended.totalInvitaciones, color: 'bg-green-500', textColor: 'text-green-400' },
              { label: 'Pendientes', value: extended.invPendientes, total: extended.totalInvitaciones, color: 'bg-yellow-500', textColor: 'text-yellow-400' },
              { label: 'Rechazadas', value: extended.invRechazadas, total: extended.totalInvitaciones, color: 'bg-red-500', textColor: 'text-red-400' },
              { label: 'Asistencias (QR)', value: extended.asistencias, total: extended.invAceptadas || 1, color: 'bg-emerald-500', textColor: 'text-emerald-400' },
            ].map((item, idx) => {
              const pct = item.total > 0 ? ((item.value / item.total) * 100).toFixed(1) : '0.0';
              return (
                <div key={idx} className="space-y-2">
                  <div className="flex justify-between items-end">
                    <span className="text-[11px] font-black text-white uppercase tracking-tighter">{item.label}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black ${item.textColor}`}>{item.value.toLocaleString()}</span>
                      <span className="text-[9px] text-slate-600">({pct}%)</span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden shadow-inner">
                    <div className={`h-full ${item.color} rounded-full transition-all`} style={{ width: `${Math.min(100, parseFloat(pct))}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Embudo de Conversion */}
        <div className="bg-slate-900 border border-white/5 rounded-3xl p-8 flex flex-col items-center">
          <h3 className="text-xs font-black text-white uppercase tracking-widest mb-10 w-full">Embudo de Conversion</h3>
          <div className="relative w-40 h-40 rounded-full border-[6px] border-slate-950 flex items-center justify-center shadow-2xl"
            style={{ background: `conic-gradient(#10B981 0% ${pctRegistradas}%, #3B82F6 ${pctRegistradas}% ${pctRegistradas + pctActivas}%, #1E293B ${pctRegistradas + pctActivas}% 100%)` }}>
            <div className="w-32 h-32 bg-slate-900 rounded-full flex flex-col items-center justify-center border border-white/5 shadow-inner">
              <span className="text-3xl font-black text-white tracking-tighter">
                {pctRegistradas > 0 ? pctRegistradas : pctActivas}%
              </span>
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-1">
                {pctRegistradas > 0 ? 'Exito Total' : 'Progreso Ventas'}
              </span>
            </div>
          </div>
          <div className="mt-10 w-full space-y-4">
            <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400">
              <span className="flex items-center gap-3"><span className="w-2 h-2 rounded-full bg-admin-green" /> Registradas</span>
              <span className="text-white">{pctRegistradas}%</span>
            </div>
            <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400">
              <span className="flex items-center gap-3"><span className="w-2 h-2 rounded-full bg-admin-blue" /> {isDist ? 'Ventas en Comercio' : 'Activas en PDV'}</span>
              <span className="text-white">{pctActivas}%</span>
            </div>
            <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400">
              <span className="flex items-center gap-3"><span className="w-2 h-2 rounded-full bg-slate-700" /> {isDist ? 'Por Activar' : 'Generados (Sin Activar)'}</span>
              <span className="text-slate-500">{pctBodega}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
