'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  getPendientesEnvioWhatsappAction,
  confirmarWhatsappInvitacionAction,
  type InvitacionEnvioItem,
} from './actions';

const LANDING_URL = process.env.NEXT_PUBLIC_LANDING_URL || 'https://landing-page.guillaumer-orion.workers.dev';

function formatWhatsAppNumber(num: string): string {
  const digits = num.replace(/\D/g, '');
  if (digits.startsWith('57')) return digits;
  return `57${digits}`;
}

type Phase = 'select' | 'queue' | 'done';

export default function EnvioMasivoWhatsApp({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [pendientes, setPendientes] = useState<InvitacionEnvioItem[] | null>(null);
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [phase, setPhase] = useState<Phase>('select');
  const [busqueda, setBusqueda] = useState('');

  // Cola
  const [cola, setCola] = useState<InvitacionEnvioItem[]>([]);
  const [idx, setIdx] = useState(0);
  const [opened, setOpened] = useState(false);
  const [marking, setMarking] = useState(false);
  const [enviados, setEnviados] = useState(0);
  const [saltados, setSaltados] = useState(0);

  useEffect(() => {
    getPendientesEnvioWhatsappAction().then((res) => {
      setPendientes(res);
      setSeleccionados(new Set(res.map((i) => i.id)));
    });
  }, []);

  useEffect(() => {
    if (phase === 'queue' && cola.length > 0 && idx >= cola.length) {
      setPhase('done');
    }
  }, [phase, idx, cola.length]);

  const visibles = useMemo(() => {
    if (!pendientes) return [];
    const term = busqueda.trim().toLowerCase();
    if (!term) return pendientes;
    return pendientes.filter((i) =>
      i.comerciante_nombre.toLowerCase().includes(term) ||
      (i.comerciante_nombre_comercial || '').toLowerCase().includes(term) ||
      (i.comerciante_ciudad || '').toLowerCase().includes(term) ||
      i.comerciante_whatsapp.includes(term) ||
      (i.distribuidor_nombre || '').toLowerCase().includes(term)
    );
  }, [pendientes, busqueda]);

  if (!pendientes) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <div className="w-10 h-10 border-4 border-admin-gold/20 border-t-admin-gold rounded-full animate-spin" />
      </div>
    );
  }

  if (pendientes.length === 0) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="bg-slate-900 border border-white/10 rounded-2xl p-8 max-w-md w-full text-center space-y-4">
          <div className="text-4xl">✅</div>
          <h3 className="text-white font-black text-lg">Nada pendiente</h3>
          <p className="text-slate-400 text-sm">No hay invitaciones pendientes con WhatsApp válido.</p>
          <button onClick={onClose} className="w-full py-3 bg-admin-gold hover:bg-yellow-500 text-slate-900 font-black rounded-xl text-xs uppercase tracking-widest transition-all">
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  // ── FASE SELECCIÓN ────────────────────────────────────────────────
  if (phase === 'select') {
    const toggle = (id: string) => {
      setSeleccionados((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    };

    const seleccionarTodosVisibles = () => {
      setSeleccionados((prev) => {
        const next = new Set(prev);
        for (const i of visibles) next.add(i.id);
        return next;
      });
    };

    const deseleccionarTodosVisibles = () => {
      setSeleccionados((prev) => {
        const next = new Set(prev);
        for (const i of visibles) next.delete(i.id);
        return next;
      });
    };

    const iniciarCola = () => {
      const picked = pendientes!.filter((i) => seleccionados.has(i.id));
      if (picked.length === 0) return;
      setCola(picked);
      setIdx(0);
      setEnviados(0);
      setSaltados(0);
      setOpened(false);
      setPhase('queue');
    };

    const countSel = seleccionados.size;
    const todosVisiblesSel = visibles.length > 0 && visibles.every((i) => seleccionados.has(i.id));

    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-green-500 p-5 flex items-center justify-between">
            <div>
              <h3 className="text-white font-black text-lg">📲 Envío masivo WhatsApp</h3>
              <p className="text-white/80 text-xs">Selecciona a quiénes enviar — {countSel} de {pendientes.length} marcadas</p>
            </div>
            <button onClick={onClose} className="w-9 h-9 flex items-center justify-center text-white/80 hover:text-white text-2xl">×</button>
          </div>

          <div className="p-5 border-b border-white/5 space-y-3">
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Filtrar por nombre, negocio, ciudad, WhatsApp o distribuidor..."
              className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-admin-gold placeholder:text-slate-600"
            />
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={todosVisiblesSel ? deseleccionarTodosVisibles : seleccionarTodosVisibles}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg text-[10px] uppercase tracking-widest transition-all"
              >
                {todosVisiblesSel ? 'Deseleccionar visibles' : 'Seleccionar visibles'}
              </button>
              <button
                onClick={() => setSeleccionados(new Set(pendientes!.map((i) => i.id)))}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg text-[10px] uppercase tracking-widest transition-all"
              >
                Seleccionar todos
              </button>
              <button
                onClick={() => setSeleccionados(new Set())}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg text-[10px] uppercase tracking-widest transition-all"
              >
                Limpiar
              </button>
              <span className="ml-auto text-[10px] text-slate-500 uppercase font-bold tracking-widest">
                {visibles.length} {visibles.length === 1 ? 'visible' : 'visibles'}
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {visibles.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">Sin resultados para ese filtro.</div>
            ) : (
              <ul className="divide-y divide-white/5">
                {visibles.map((i) => {
                  const checked = seleccionados.has(i.id);
                  return (
                    <li key={i.id}>
                      <label className="flex items-start gap-3 p-4 hover:bg-slate-800/40 cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(i.id)}
                          className="mt-0.5 w-4 h-4 accent-green-500 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-white text-sm truncate">{i.comerciante_nombre}</p>
                            {i.comerciante_nombre_comercial && (
                              <span className="text-admin-gold text-[10px] font-bold">{i.comerciante_nombre_comercial}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap text-[10px] text-slate-500">
                            <span className="text-green-400 font-mono font-bold">+57 {i.comerciante_whatsapp}</span>
                            {i.comerciante_ciudad && <span>· {i.comerciante_ciudad}</span>}
                            {i.distribuidor_nombre && <span>· {i.distribuidor_nombre}</span>}
                          </div>
                        </div>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="p-5 border-t border-white/10 bg-slate-950/80 flex items-center gap-3">
            <button onClick={onClose} className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white font-black rounded-xl text-xs uppercase tracking-widest">
              Cancelar
            </button>
            <button
              onClick={iniciarCola}
              disabled={countSel === 0}
              className="flex-1 py-3 bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black rounded-xl text-xs uppercase tracking-widest transition-all active:scale-95"
            >
              Iniciar cola ({countSel})
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── FASE FIN ──────────────────────────────────────────────────────
  if (phase === 'done') {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="bg-slate-900 border border-white/10 rounded-2xl p-8 max-w-md w-full text-center space-y-4">
          <div className="text-4xl">🎉</div>
          <h3 className="text-white font-black text-lg">Cola completada</h3>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3">
              <p className="text-green-400 text-2xl font-black">{enviados}</p>
              <p className="text-[10px] text-slate-400 uppercase font-bold">Enviados</p>
            </div>
            <div className="bg-slate-800 border border-white/5 rounded-xl p-3">
              <p className="text-slate-300 text-2xl font-black">{saltados}</p>
              <p className="text-[10px] text-slate-400 uppercase font-bold">Saltados</p>
            </div>
          </div>
          <button onClick={() => { onDone(); onClose(); }} className="w-full py-3 bg-admin-gold hover:bg-yellow-500 text-slate-900 font-black rounded-xl text-xs uppercase tracking-widest transition-all">
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  // ── FASE COLA ─────────────────────────────────────────────────────
  if (idx >= cola.length) return null;
  const actual = cola[idx];
  const invUrl = `${LANDING_URL}/invitacion/${actual.token}`;
  const mensaje = `Hola ${actual.comerciante_nombre}, estás invitado(a) a ${actual.tipo_evento} de La Villa del Millón. Confirma aquí: ${invUrl}`;
  const waUrl = `https://wa.me/${formatWhatsAppNumber(actual.comerciante_whatsapp)}?text=${encodeURIComponent(mensaje)}`;
  const progreso = ((idx / cola.length) * 100).toFixed(1);

  function abrirWhatsApp() {
    window.open(waUrl, '_blank', 'noopener,noreferrer');
    setOpened(true);
  }

  async function marcarYSiguiente() {
    setMarking(true);
    await confirmarWhatsappInvitacionAction(actual.id);
    setMarking(false);
    setEnviados((n) => n + 1);
    setOpened(false);
    setIdx((n) => n + 1);
  }

  function saltar() {
    setSaltados((n) => n + 1);
    setOpened(false);
    setIdx((n) => n + 1);
  }

  function cerrar() {
    if (enviados > 0 || saltados > 0) {
      if (!confirm(`Cerrar la cola? Enviados: ${enviados}. Saltados: ${saltados}. Las no procesadas quedan para la siguiente sesión.`)) return;
      onDone();
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden">
        <div className="bg-gradient-to-r from-green-600 to-green-500 p-5 flex items-center justify-between">
          <div>
            <h3 className="text-white font-black text-lg">📲 Envío masivo WhatsApp</h3>
            <p className="text-white/80 text-xs">{idx + 1} de {cola.length} · {enviados} enviados · {saltados} saltados</p>
          </div>
          <button onClick={cerrar} className="w-9 h-9 flex items-center justify-center text-white/80 hover:text-white text-2xl">×</button>
        </div>

        <div className="h-1 bg-slate-800">
          <div className="h-full bg-admin-gold transition-all duration-300" style={{ width: `${progreso}%` }} />
        </div>

        <div className="p-6 space-y-5">
          <div className="bg-slate-950 border border-white/5 rounded-xl p-4 space-y-2">
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Destinatario</p>
            <p className="text-white font-black text-base">{actual.comerciante_nombre}</p>
            {actual.comerciante_nombre_comercial && (
              <p className="text-admin-gold text-xs font-bold">{actual.comerciante_nombre_comercial}</p>
            )}
            {actual.comerciante_ciudad && (
              <p className="text-slate-400 text-xs">{actual.comerciante_ciudad}</p>
            )}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[10px] text-slate-500 uppercase font-bold">WhatsApp:</span>
              <span className="text-green-400 font-mono text-sm font-bold">+57 {actual.comerciante_whatsapp}</span>
            </div>
            {actual.distribuidor_nombre && (
              <p className="text-[10px] text-slate-600">Distribuidor: {actual.distribuidor_nombre}</p>
            )}
          </div>

          <div className="bg-slate-950 border border-white/5 rounded-xl p-3">
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Mensaje</p>
            <p className="text-slate-300 text-xs leading-relaxed">{mensaje}</p>
          </div>

          <div className="space-y-2">
            {!opened ? (
              <button
                onClick={abrirWhatsApp}
                className="w-full py-4 bg-green-600 hover:bg-green-500 text-white font-black rounded-xl text-sm uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                📲 Abrir WhatsApp
              </button>
            ) : (
              <button
                onClick={marcarYSiguiente}
                disabled={marking}
                className="w-full py-4 bg-admin-gold hover:bg-yellow-500 disabled:opacity-50 text-slate-900 font-black rounded-xl text-sm uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                {marking ? 'Guardando...' : '✅ Enviado — Siguiente'}
              </button>
            )}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={saltar}
                className="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-[10px] uppercase tracking-widest transition-all"
              >
                Saltar
              </button>
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpened(true)}
                className="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-[10px] uppercase tracking-widest transition-all text-center"
              >
                Re-abrir
              </a>
            </div>
          </div>

          <p className="text-[10px] text-slate-600 text-center">
            Abre WhatsApp en una nueva pestaña. Envía el mensaje ahí, vuelve acá y confirma con "Enviado".
          </p>
        </div>
      </div>
    </div>
  );
}
