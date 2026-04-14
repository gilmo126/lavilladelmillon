'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logout } from '../login/actions';

export default function Sidebar({ role, userName, campanaNombre }: { role: string; userName: string; campanaNombre: string }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // ── Admin: Acceso Total ───────────────────────────────────────────
  const adminItems = [
    { href: '/',                label: '📊 Dashboard Principal' },
    { href: '/trazabilidad',    label: '🔎 Buscador Trazabilidad' },
    { href: '/ventas',          label: '📈 Reporte de Ventas' },
    { href: '/boletas',         label: '🎟️ Explorador Boletas' },
    { sep: true, label: 'LOGÍSTICA' },
    { href: '/sorteos',         label: '📅 Gestión de Sorteos' },
    { href: '/asistencia',      label: '📋 Asistencia Evento' },
    { href: '/invitaciones',    label: '🎪 Invitaciones Evento' },
    { sep: true, label: 'PERSONAL' },
    { href: '/comerciantes',    label: '🏪 Comerciantes' },
    { href: '/distribuidores',  label: '👥 Gestión de Personal' },
    { href: '/zonas',           label: '📍 Territorios y Zonas' },
    { sep: true, label: 'CAMPAÑA' },
    { href: '/premios',         label: '🎁 Gestionar Premios' },
    { href: '/configuracion',   label: '⚙️ Llaves Maestras' },
  ];

  // ── Distribuidor: Operatividad de campo ─────────────────────────
  const distItems = [
    { href: '/',        label: '📊 Mi Trazabilidad' },
    { href: '/activar', label: '🎟️ Vender Pack' },
    { href: '/ventas',        label: '📦 Mis Packs' },
    { href: '/invitaciones',  label: '🎪 Invitaciones' },
  ];

  // ── Asistente: Solo validación de QR ──────────────────────────
  const asistenteItems = [
    { href: '/scanner', label: '📷 Scanner QR' },
  ];

  const menuItems = role === 'admin' ? adminItems : role === 'asistente' ? asistenteItems : distItems;

  const roleBadge: Record<string, string> = {
    admin:        'text-admin-gold',
    distribuidor: 'text-green-400',
    asistente:    'text-purple-400',
  };
  const roleLabel: Record<string, string> = {
    admin:        'Gerencia',
    distribuidor: 'Distribuidor',
    asistente:    'Asistente',
  };

  const toggleSidebar = () => setIsOpen(!isOpen);

  return (
    <>
      {/* Botón de Hamburguesa Móvil — solo visible cuando sidebar está cerrado */}
      {!isOpen && (
        <button
          onClick={toggleSidebar}
          className="fixed top-4 right-4 z-[100] md:hidden w-12 h-12 bg-slate-900 border border-white/10 rounded-2xl flex items-center justify-center text-white shadow-2xl active:scale-95 transition-all"
        >
          ☰
        </button>
      )}

      {/* Backdrop para móvil */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] md:hidden animate-in fade-in duration-300"
          onClick={toggleSidebar}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-[90] w-72 bg-slate-900 border-r border-white/5 p-8 flex flex-col
        transition-transform duration-500 ease-out shadow-2xl
        md:relative md:translate-x-0 md:flex md:w-64 md:z-auto
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center gap-4 mb-10">
          <div className="w-10 h-10 rounded-xl bg-admin-gold flex items-center justify-center font-black text-admin-dark text-lg uppercase shadow-lg shadow-admin-gold/20">
            {campanaNombre.substring(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-black tracking-tighter text-sm text-white truncate leading-none">
              {campanaNombre}
            </h1>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Ecosistema V180C</p>
          </div>
          {/* Botón cerrar — solo visible en móvil cuando sidebar está abierto */}
          <button
            onClick={toggleSidebar}
            className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
          >
            ✕
          </button>
        </div>

        <div className="mb-10 p-5 rounded-2xl bg-slate-950 border border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity">🛡️</div>
          <p className={`text-[10px] font-black uppercase tracking-widest mb-1.5 ${roleBadge[role] || 'text-slate-400'}`}>
            {roleLabel[role] || role}
          </p>
          <p className="font-bold text-white text-sm truncate leading-tight">{userName || 'Cargando...'}</p>
        </div>

        <nav className="flex-1 space-y-1.5 overflow-y-auto custom-scrollbar pr-2">
          {menuItems.map((item, idx) => {
            if ('sep' in item && item.sep) {
              return (
                <div key={`sep-${idx}`} className="flex items-center gap-3 pt-6 pb-2 px-2">
                  <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest whitespace-nowrap">
                    {item.label}
                  </p>
                  <div className="h-px bg-white/5 flex-1" />
                </div>
              );
            }
            const href = (item as any).href;
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition-all text-xs uppercase tracking-tight group ${
                  isActive
                    ? 'bg-admin-blue/10 text-admin-blue border border-admin-blue/20 shadow-lg shadow-blue-500/5'
                    : 'text-slate-500 hover:text-white border border-transparent hover:bg-white/5'
                }`}
              >
                <div className={`w-1.5 h-1.5 rounded-full transition-all ${isActive ? 'bg-admin-blue scale-125' : 'bg-slate-700 opacity-50 group-hover:bg-slate-500'}`} />
                {(item as any).label}
              </Link>
            );
          })}
        </nav>

        <form action={logout} className="mt-auto pt-8 border-t border-white/5">
          <button type="submit" className="w-full py-4 bg-slate-950 hover:bg-red-500/10 text-slate-500 hover:text-red-500 rounded-2xl font-black transition-all text-[10px] uppercase tracking-widest border border-white/5 hover:border-red-500/20 active:scale-95">
            Cerrar Terminal
          </button>
        </form>
      </aside>
    </>
  );
}
