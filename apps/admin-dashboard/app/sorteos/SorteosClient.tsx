'use client';

import React, { useState, useEffect } from 'react';
import { getPremiosConSorteo, upsertSorteo, cerrarSorteoAction, getConfiguracion } from '../../lib/actions';

const VENTANA_CIERRE_HORAS = 24;

export default function SorteosClient() {
  const [premios, setPremios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<any>(null);
  const [closingPremioId, setClosingPremioId] = useState<string | null>(null);

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

  const handleCerrarPremio = async (premioId: string, nombrePremio: string) => {
    if (!window.confirm(`⚠️ Cierre del sorteo "${nombrePremio}"\n\nMoverá a SORTEADO (estado 4) todas las boletas registradas para este premio específico. Las boletas registradas para OTROS premios de la campaña NO se tocan.\n\n¿Confirmar cierre?`)) {
      return;
    }

    setClosingPremioId(premioId);
    try {
      const { data: { user } } = await (await import('../../utils/supabase/client')).createClient().auth.getUser();
      if (!user) throw new Error("Sesión no válida");

      const res = await cerrarSorteoAction(user.id, config.id, premioId);
      if (res.success) {
        alert(`✅ Sorteo "${nombrePremio}" cerrado. ${res.count} boleta${res.count !== 1 ? 's' : ''} marcada${res.count !== 1 ? 's' : ''} como SORTEADA.`);
        const data = await getPremiosConSorteo(config.id);
        setPremios(data);
      } else {
        throw new Error(res.error);
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setClosingPremioId(null);
    }
  };

  const ventanaCierre = (fechaSorteoIso: string | null | undefined): { estado: 'sin_fecha' | 'lejano' | 'listo' | 'vencido'; horasRestantes: number } => {
    if (!fechaSorteoIso) return { estado: 'sin_fecha', horasRestantes: 0 };
    const fecha = new Date(fechaSorteoIso).getTime();
    const ahora = Date.now();
    const horas = (fecha - ahora) / (1000 * 60 * 60);
    if (horas < 0) return { estado: 'vencido', horasRestantes: 0 };
    if (horas <= VENTANA_CIERRE_HORAS) return { estado: 'listo', horasRestantes: horas };
    return { estado: 'lejano', horasRestantes: horas };
  };

  if (loading) return <div className="p-10 text-admin-gold animate-pulse">Cargando sorteos...</div>;

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-6xl">
      <header>
        <h2 className="text-3xl font-bold">Programación de Sorteos</h2>
        <p className="text-slate-400 mt-1">Asigna fechas de premiación y gestiona el cierre de ciclos de boletas.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {premios.map((p) => {
          const sorteo = p.sorteos && p.sorteos[0];
          const ventana = ventanaCierre(sorteo?.fecha_sorteo);
          const yaFinalizado = sorteo?.estado === 'finalizado';
          const puedeCerrar = !yaFinalizado && (ventana.estado === 'listo' || ventana.estado === 'vencido');
          const isClosingThis = closingPremioId === p.id;

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
                    disabled={yaFinalizado}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-admin-gold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-800 gap-2 flex-wrap">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                    yaFinalizado ? 'bg-slate-700 text-slate-400 border border-slate-600'
                    : sorteo?.estado === 'programado' ? 'bg-admin-blue/10 text-admin-blue border border-admin-blue/30'
                    : 'bg-slate-800 text-slate-500 border border-slate-700'
                  }`}>
                    {yaFinalizado ? 'FINALIZADO' : sorteo?.estado || 'SIN PROGRAMAR'}
                  </span>

                  {sorteo?.fecha_sorteo && !yaFinalizado && (
                    <p className="text-[10px] font-bold text-slate-400">
                      {ventana.estado === 'lejano' && `Faltan ${Math.ceil(ventana.horasRestantes / 24)} días`}
                      {ventana.estado === 'listo' && <span className="text-admin-gold">🕐 Ventana de cierre abierta</span>}
                      {ventana.estado === 'vencido' && <span className="text-orange-400">⚠️ Fecha pasada — pendiente cerrar</span>}
                    </p>
                  )}
                </div>

                {!yaFinalizado && (
                  <button
                    onClick={() => handleCerrarPremio(p.id, p.nombre_premio)}
                    disabled={!puedeCerrar || isClosingThis}
                    className={`w-full py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                      puedeCerrar
                        ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/20 active:scale-[0.99]'
                        : 'bg-slate-800/60 text-slate-600 cursor-not-allowed'
                    } disabled:opacity-50`}
                    title={!puedeCerrar ? `Disponible ${VENTANA_CIERRE_HORAS}h antes de la fecha del sorteo` : ''}
                  >
                    <span>🔒</span>
                    {isClosingThis ? 'Cerrando…' : puedeCerrar ? 'Cerrar este sorteo' : `Cierre disponible ${VENTANA_CIERRE_HORAS}h antes`}
                  </button>
                )}

                {yaFinalizado && (
                  <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 text-center">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Sorteo cerrado</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 flex items-start gap-4">
        <span className="text-3xl">ℹ️</span>
        <div className="space-y-3 text-sm text-slate-400 leading-relaxed">
          <h4 className="font-bold text-white text-base">Manual Operativo del Sorteo</h4>

          <div className="space-y-1">
            <p className="text-white font-bold text-[11px] uppercase tracking-widest">Cierre por premio</p>
            <p>
              Cada premio tiene su propio botón "Cerrar este sorteo". Al accionarlo, solo las boletas cuyo <strong className="text-white">premio seleccionado</strong> coincide pasan a estado <strong className="text-white">Sorteado (4)</strong> (inmutable). Las boletas registradas para otros premios de la campaña <strong className="text-white">no se tocan</strong>.
              El botón se habilita automáticamente <strong className="text-admin-gold">{VENTANA_CIERRE_HORAS}h antes</strong> de la fecha programada del sorteo (ventana de cierre manual).
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-white font-bold text-[11px] uppercase tracking-widest">Unicidad de números</p>
            <p>
              Los números de boleta son <strong className="text-white">únicos a nivel global</strong> (clave primaria en la base). Un número nunca se repite: ni entre sorteos ya cerrados, ni entre los activos. Al generar un pack, el sistema valida contra toda la tabla antes de crear las 25 boletas; si detectara colisión, la inserción se aborta.
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-white font-bold text-[11px] uppercase tracking-widest">Capacidad del rango</p>
            <p>
              Los números nuevos se emiten en el rango <strong className="text-white">1.000.000 a 9.999.999</strong> (≈9 millones). Los números legacy de 6 dígitos (100.000–999.999) siguen siendo válidos y operan en paralelo. Al superar el <strong className="text-admin-gold">80%</strong> de ocupación global el sistema bloquea nuevas emisiones automáticamente para evitar fallas silenciosas del generador.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
