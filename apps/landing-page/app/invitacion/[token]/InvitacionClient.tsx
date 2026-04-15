'use client';

import { useState } from 'react';
import { aceptarInvitacionAction, rechazarInvitacionAction, actualizarJornadasAction } from './actions';

type Jornada = { id: string; fecha: string; hora: string; label: string };

type EventoData = {
  logoUrl: string | null;
  titulo: string;
  subtitulo: string;
  mensaje: string;
  auspiciantes: string[];
  jornadas: Jornada[];
  ubicacion: string;
  ubicacionMapsUrl: string;
};

type Props = {
  token: string;
  comercianteNombre: string;
  tipoEvento: string;
  tokenQr: string;
  estado: string;
  jornadasSeleccionadasIniciales: string[] | null;
  evento: EventoData;
};

const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL || 'https://lavilladelmillon-admin.guillaumer-orion.workers.dev';

function resaltarAuspiciantes(texto: string, auspiciantes: string[]) {
  if (!texto || auspiciantes.length === 0) return texto;
  let result = texto;
  for (const a of auspiciantes) {
    if (a.trim()) {
      result = result.replace(new RegExp(a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), `**${a}**`);
    }
  }
  return result;
}

function LocationCard({ ubicacion, mapsUrl }: { ubicacion: string; mapsUrl: string }) {
  if (!ubicacion) return null;
  return (
    <div className="bg-slate-900/60 border border-marca-gold/20 rounded-2xl p-4 flex items-start gap-3">
      <div className="text-2xl">📍</div>
      <div className="flex-1">
        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Ubicación</p>
        <p className="text-white text-sm font-bold">{ubicacion}</p>
        {mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-2 text-marca-gold text-xs font-bold hover:underline"
          >
            Ver en Google Maps →
          </a>
        )}
      </div>
    </div>
  );
}

function JornadasSeleccionadasBadges({
  ids,
  jornadas,
}: {
  ids: string[];
  jornadas: Jornada[];
}) {
  const seleccionadas = jornadas.filter((j) => ids.includes(j.id));
  if (seleccionadas.length === 0) return null;
  return (
    <div className="bg-slate-800/50 border border-marca-gold/20 rounded-2xl p-5 space-y-3">
      <p className="text-[10px] text-marca-gold uppercase tracking-widest font-black">Jornada(s) confirmada(s)</p>
      <div className="space-y-2">
        {seleccionadas.map((j) => (
          <div key={j.id} className="bg-marca-gold/10 border border-marca-gold/30 rounded-xl px-4 py-3">
            <p className="text-white text-sm font-bold">{j.label}</p>
            <p className="text-marca-gold/80 text-xs">{j.fecha} — {j.hora}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function InvitacionClient({
  token,
  comercianteNombre,
  tipoEvento,
  tokenQr,
  estado,
  jornadasSeleccionadasIniciales,
  evento,
}: Props) {
  const yaAceptada = estado === 'aceptada';
  const necesitaRetrofit = yaAceptada && (!jornadasSeleccionadasIniciales || jornadasSeleccionadasIniciales.length === 0);

  const [status, setStatus] = useState<'idle' | 'loading' | 'aceptada' | 'rechazada' | 'error'>(
    yaAceptada && !necesitaRetrofit ? 'aceptada' : 'idle'
  );
  const [errorMsg, setErrorMsg] = useState('');
  const [jornadasMarcadas, setJornadasMarcadas] = useState<string[]>([]);
  const [jornadasFinales, setJornadasFinales] = useState<string[]>(jornadasSeleccionadasIniciales || []);

  const qrDataUrl = `${ADMIN_URL}/validar-qr-inv/${tokenQr}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrDataUrl)}`;

  function toggleJornada(id: string) {
    setJornadasMarcadas((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleAceptar() {
    if (jornadasMarcadas.length === 0) {
      setErrorMsg('Debes seleccionar al menos una jornada a la que asistirás.');
      setStatus('error');
      return;
    }
    setStatus('loading');
    setErrorMsg('');
    const res = await aceptarInvitacionAction(token, jornadasMarcadas);
    if (res.success) {
      setJornadasFinales(jornadasMarcadas);
      setStatus('aceptada');
    } else {
      setErrorMsg(res.error || 'Error al procesar');
      setStatus('error');
    }
  }

  async function handleConfirmarRetrofit() {
    if (jornadasMarcadas.length === 0) {
      setErrorMsg('Debes seleccionar al menos una jornada.');
      setStatus('error');
      return;
    }
    setStatus('loading');
    setErrorMsg('');
    const res = await actualizarJornadasAction(token, jornadasMarcadas);
    if (res.success) {
      setJornadasFinales(jornadasMarcadas);
      setStatus('aceptada');
    } else {
      setErrorMsg(res.error || 'Error al procesar');
      setStatus('error');
    }
  }

  async function handleRechazar() {
    setStatus('loading');
    const res = await rechazarInvitacionAction(token);
    if (res.success) {
      setStatus('rechazada');
    } else {
      setErrorMsg(res.error || 'Error al procesar');
      setStatus('error');
    }
  }

  // Estado: aceptada con jornadas confirmadas → muestra QR + jornadas
  if (status === 'aceptada') {
    return (
      <div className="space-y-6 animate-in fade-in zoom-in duration-500">
        <div className="bg-green-900/20 border border-green-500/30 rounded-3xl p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center text-3xl mx-auto">✅</div>
          <h2 className="text-xl font-black text-white">¡Asistencia Confirmada!</h2>
          <p className="text-green-400 font-bold text-sm">{comercianteNombre}</p>
        </div>

        {jornadasFinales.length > 0 && (
          <JornadasSeleccionadasBadges ids={jornadasFinales} jornadas={evento.jornadas} />
        )}

        <LocationCard ubicacion={evento.ubicacion} mapsUrl={evento.ubicacionMapsUrl} />

        <div className="bg-marca-gold/5 border border-marca-gold/30 rounded-3xl p-6 text-center space-y-4">
          <p className="text-marca-gold text-xs font-black uppercase tracking-widest">Tu QR de Asistencia</p>
          <div className="flex justify-center">
            <div className="bg-white p-3 rounded-2xl shadow-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrImageUrl} alt="QR de asistencia" width={180} height={180} className="rounded-lg" />
            </div>
          </div>
          <p className="text-slate-400 text-xs">Presenta este QR en la entrada del evento.</p>
        </div>
      </div>
    );
  }

  if (status === 'rechazada') {
    return (
      <div className="text-center space-y-4 animate-in fade-in duration-500">
        <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center text-3xl mx-auto">🙏</div>
        <h2 className="text-xl font-black text-white">Gracias por responder</h2>
        <p className="text-slate-400 text-sm">Lamentamos que no puedas asistir. ¡Esperamos verte en el próximo evento!</p>
      </div>
    );
  }

  // Retrofit: invitación ya aceptada pero sin jornadas registradas
  if (necesitaRetrofit) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-b from-marca-gold/10 to-transparent rounded-3xl p-6 text-center space-y-3 border border-marca-gold/20">
          <div className="text-3xl">📅</div>
          <h2 className="text-lg font-black text-white">Confirma tus jornadas</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Ya confirmaste tu asistencia, {comercianteNombre}. Ahora selecciona a qué jornada(s) asistirás.
          </p>
        </div>

        <LocationCard ubicacion={evento.ubicacion} mapsUrl={evento.ubicacionMapsUrl} />

        <div className="space-y-3">
          <p className="text-[10px] text-marca-gold uppercase tracking-widest font-black">Selecciona jornada(s)</p>
          {evento.jornadas.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-4">Jornadas aún no configuradas.</p>
          ) : (
            evento.jornadas.map((j) => {
              const checked = jornadasMarcadas.includes(j.id);
              return (
                <label
                  key={j.id}
                  className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                    checked
                      ? 'bg-marca-gold/10 border-marca-gold'
                      : 'bg-slate-900/50 border-white/10 hover:border-marca-gold/40'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleJornada(j.id)}
                    className="mt-1 w-5 h-5 accent-marca-gold"
                  />
                  <div className="flex-1">
                    <p className="text-white text-sm font-bold">{j.label}</p>
                    <p className="text-slate-400 text-xs mt-1">{j.fecha} — {j.hora}</p>
                  </div>
                </label>
              );
            })
          )}
        </div>

        {status === 'error' && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-center text-red-400 text-sm font-bold">
            {errorMsg}
          </div>
        )}

        <button
          onClick={handleConfirmarRetrofit}
          disabled={status === 'loading'}
          className="w-full py-5 bg-marca-gold hover:bg-yellow-500 disabled:opacity-40 text-slate-900 font-black rounded-2xl transition-all text-sm uppercase tracking-widest shadow-xl shadow-marca-gold/20 active:scale-[0.99]"
        >
          {status === 'loading' ? 'Guardando...' : 'Confirmar jornadas'}
        </button>
      </div>
    );
  }

  // Estado normal: pendiente
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-b from-marca-gold/10 to-transparent rounded-3xl p-8 text-center space-y-4 border border-marca-gold/20">
        {evento.logoUrl && (
          <div className="flex justify-center mb-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={evento.logoUrl} alt="Logo evento" className="h-20 w-auto object-contain" />
          </div>
        )}
        <h2 className="text-2xl font-black text-white leading-tight">
          {evento.titulo.split('\n').map((line, i) => <span key={i}>{line}<br /></span>)}
        </h2>
        <p className="text-marca-gold/80 text-sm font-bold italic">
          {evento.subtitulo}
        </p>
      </div>

      {/* Invitado */}
      <div className="bg-slate-800/50 border border-marca-gold/20 rounded-2xl p-6 text-center">
        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">Invitado(a) especial</p>
        <p className="text-xl font-black text-white">{comercianteNombre}</p>
        <p className="text-[10px] text-marca-gold font-bold uppercase tracking-widest mt-2">{tipoEvento}</p>
      </div>

      {/* Mensaje dinámico */}
      {evento.mensaje && (
        <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-6 space-y-4">
          {resaltarAuspiciantes(evento.mensaje, evento.auspiciantes).split('\n').filter(Boolean).map((parrafo, i) => (
            <p key={i} className="text-slate-300 text-sm leading-relaxed">
              {parrafo.split(/\*\*(.*?)\*\*/g).map((part, j) =>
                j % 2 === 1
                  ? <strong key={j} className="text-marca-gold font-black">{part}</strong>
                  : part
              )}
            </p>
          ))}
        </div>
      )}

      {/* Auspiciantes */}
      {evento.auspiciantes.length > 0 && (
        <div className="flex flex-wrap justify-center gap-3">
          {evento.auspiciantes.filter(Boolean).map((a) => (
            <span key={a} className="bg-marca-gold/10 border border-marca-gold/30 px-5 py-2.5 rounded-full text-sm font-black text-marca-gold uppercase tracking-wider">
              {a}
            </span>
          ))}
        </div>
      )}

      {/* Ubicación */}
      <LocationCard ubicacion={evento.ubicacion} mapsUrl={evento.ubicacionMapsUrl} />

      {/* Selector de jornadas */}
      {evento.jornadas.length > 0 && (
        <div className="space-y-3">
          <p className="text-[10px] text-marca-gold uppercase tracking-widest font-black">¿A cuál jornada asistirás?</p>
          {evento.jornadas.map((j) => {
            const checked = jornadasMarcadas.includes(j.id);
            return (
              <label
                key={j.id}
                className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                  checked
                    ? 'bg-marca-gold/10 border-marca-gold'
                    : 'bg-slate-900/50 border-white/10 hover:border-marca-gold/40'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleJornada(j.id)}
                  className="mt-1 w-5 h-5 accent-marca-gold"
                />
                <div className="flex-1">
                  <p className="text-white text-sm font-bold">{j.label}</p>
                  <p className="text-slate-400 text-xs mt-1">{j.fecha} — {j.hora}</p>
                </div>
              </label>
            );
          })}
          <p className="text-[10px] text-slate-500">Puedes seleccionar una o varias jornadas.</p>
        </div>
      )}

      {status === 'error' && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-center text-red-400 text-sm font-bold">
          {errorMsg}
        </div>
      )}

      {/* Botones de decisión */}
      <div className="space-y-3 pt-2">
        <p className="text-center text-marca-gold font-black text-sm uppercase tracking-widest">¡La Villa del Millón te espera!</p>
        <button
          onClick={handleAceptar}
          disabled={status === 'loading'}
          className="w-full py-5 bg-marca-gold hover:bg-yellow-500 disabled:opacity-40 text-slate-900 font-black rounded-2xl transition-all text-sm uppercase tracking-widest shadow-xl shadow-marca-gold/20 active:scale-[0.99]"
        >
          {status === 'loading' ? 'Procesando...' : '✅ ACEPTO LA INVITACIÓN'}
        </button>
        <button
          onClick={handleRechazar}
          disabled={status === 'loading'}
          className="w-full py-4 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-400 font-bold rounded-2xl transition-all text-sm border border-white/5"
        >
          ❌ No puedo asistir
        </button>
      </div>
    </div>
  );
}
