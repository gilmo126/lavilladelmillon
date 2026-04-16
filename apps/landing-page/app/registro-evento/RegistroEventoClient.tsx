'use client';

import { useState } from 'react';
import { registrarPreRegistroAction } from './actions';

const CELULAR_REGEX = /^3[0-9]{9}$/;

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

export default function RegistroEventoClient({ evento }: { evento: EventoData }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [waError, setWaError] = useState<string | null>(null);
  const [jornadasMarcadas, setJornadasMarcadas] = useState<string[]>([]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const fd = new FormData(e.currentTarget);

    if (evento.jornadas.length > 0 && jornadasMarcadas.length === 0) {
      setError('Debes seleccionar al menos una jornada.');
      setLoading(false);
      return;
    }
    if (jornadasMarcadas.length > 0) {
      fd.set('jornadas_seleccionadas', JSON.stringify(jornadasMarcadas));
    }

    const wa = (fd.get('whatsapp') as string)?.trim() || '';

    if (wa && !CELULAR_REGEX.test(wa)) {
      setError('WhatsApp debe ser un celular colombiano de 10 dígitos que inicie con 3.');
      setLoading(false);
      return;
    }

    const res = await registrarPreRegistroAction(fd);
    setLoading(false);
    if (res.success) {
      setSuccess(true);
    } else {
      setError(res.error || 'Error al registrar. Intenta de nuevo.');
    }
  }

  if (success) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {evento.logoUrl && (
          <div className="text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={evento.logoUrl} alt="Logo" className="h-16 mx-auto" />
          </div>
        )}
        <div className="bg-green-500/10 border border-green-500/20 rounded-3xl p-8 text-center space-y-4">
          <div className="text-5xl">🎉</div>
          <h2 className="text-2xl font-black text-white">¡Tu registro fue recibido!</h2>
          <p className="text-slate-300 text-sm leading-relaxed">
            Pronto recibirás tu invitación oficial con los detalles del evento por WhatsApp y/o email.
          </p>
        </div>
        <div className="bg-slate-900/60 border border-marca-gold/20 rounded-2xl p-5 text-center">
          <p className="text-marca-gold text-xs font-black uppercase tracking-widest">{evento.titulo}</p>
          <p className="text-slate-400 text-[10px] mt-1 italic">{evento.subtitulo}</p>
        </div>
      </div>
    );
  }

  const mensajeResaltado = resaltarAuspiciantes(evento.mensaje, evento.auspiciantes);

  return (
    <div className="space-y-6">
      {/* Header del evento */}
      <div className="text-center space-y-3">
        {evento.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={evento.logoUrl} alt="Logo" className="h-16 mx-auto" />
        )}
        <h1 className="text-2xl font-black text-marca-gold tracking-tight">{evento.titulo}</h1>
        <p className="text-slate-400 text-sm italic">{evento.subtitulo}</p>
      </div>

      {/* Mensaje del evento */}
      {mensajeResaltado && (
        <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-5">
          {mensajeResaltado.split('\n').filter(Boolean).map((p, i) => (
            <p key={i} className="text-slate-300 text-sm leading-relaxed mb-2 last:mb-0"
              dangerouslySetInnerHTML={{ __html: p.replace(/\*\*(.*?)\*\*/g, '<strong class="text-marca-gold font-black">$1</strong>') }}
            />
          ))}
        </div>
      )}

      {/* Jornadas — seleccionar al menos una */}
      {evento.jornadas.length > 0 && (
        <div className="bg-slate-900/60 border border-marca-gold/20 rounded-2xl p-5 space-y-3">
          <p className="text-[10px] text-marca-gold uppercase tracking-widest font-black">Selecciona tu jornada *</p>
          <p className="text-slate-400 text-xs">Elige la jornada a la que deseas asistir.</p>
          <div className="space-y-2">
            {evento.jornadas.map((j: Jornada) => {
              const selected = jornadasMarcadas[0] === j.id;
              return (
                <label
                  key={j.id}
                  className={`flex items-center gap-3 cursor-pointer rounded-xl px-4 py-3 border transition-all ${
                    selected ? 'bg-marca-gold/10 border-marca-gold/40' : 'bg-marca-gold/5 border-marca-gold/20 hover:border-marca-gold/30'
                  }`}
                >
                  <input
                    type="radio"
                    name="jornada"
                    checked={selected}
                    onChange={() => setJornadasMarcadas([j.id])}
                    className="w-5 h-5 accent-yellow-500 flex-shrink-0"
                  />
                  <div>
                    <p className="text-white text-sm font-bold">{j.label}</p>
                    <p className="text-marca-gold/80 text-xs">{j.fecha} — {j.hora}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Ubicación */}
      {evento.ubicacion && (
        <div className="bg-slate-900/60 border border-marca-gold/20 rounded-2xl p-4 flex items-start gap-3">
          <div className="text-2xl">📍</div>
          <div className="flex-1">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Ubicación</p>
            <p className="text-white text-sm font-bold">{evento.ubicacion}</p>
            {evento.ubicacionMapsUrl && (
              <a href={evento.ubicacionMapsUrl} target="_blank" rel="noopener noreferrer"
                className="inline-block mt-2 text-marca-gold text-xs font-bold hover:underline">
                Ver en Google Maps →
              </a>
            )}
          </div>
        </div>
      )}

      {/* Auspiciantes */}
      {evento.auspiciantes.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          {evento.auspiciantes.filter(Boolean).map((a, i) => (
            <span key={i} className="inline-block bg-marca-gold/10 border border-marca-gold/30 text-marca-gold font-black text-[10px] px-3 py-1.5 rounded-full uppercase tracking-wider">
              {a}
            </span>
          ))}
        </div>
      )}

      {/* Formulario */}
      <div className="bg-slate-900/80 border border-white/10 rounded-3xl p-6">
        <div className="text-center mb-6">
          <h2 className="text-lg font-black text-white">Regístrate al evento</h2>
          <p className="text-slate-400 text-xs mt-1">Completa tus datos y recibirás tu invitación oficial</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4">
            <p className="text-red-400 text-sm font-bold">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Nombre completo *</label>
            <input name="nombre" required placeholder="Ej: Juan Pérez"
              className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-marca-gold transition-all" />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Nombre del negocio *</label>
            <input name="nombre_negocio" required placeholder="Ej: Tienda El Progreso"
              className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-marca-gold transition-all" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Tipo documento</label>
              <select name="tipo_doc" defaultValue="CC"
                className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-marca-gold transition-all appearance-none">
                <option value="CC">CC</option>
                <option value="CE">CE</option>
                <option value="NIT">NIT</option>
                <option value="PP">PP</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Número de identificación</label>
              <input name="identificacion" placeholder="Ej: 1144000111"
                className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-marca-gold transition-all" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">WhatsApp *</label>
              <input name="whatsapp" required pattern="3[0-9]{9}" maxLength={10} placeholder="3001234567"
                onChange={(e) => setWaError(e.target.value && !CELULAR_REGEX.test(e.target.value) ? '10 dígitos, inicia con 3' : null)}
                className={`w-full bg-slate-950 border rounded-xl px-4 py-3 text-white text-sm outline-none transition-all ${waError ? 'border-red-500' : 'border-slate-700/50 focus:border-marca-gold'}`} />
              {waError && <p className="text-red-400 text-[10px] mt-1">{waError}</p>}
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Codigo Influencer <span className="text-slate-600 normal-case">(opcional)</span></label>
              <input name="codigo_influencer" maxLength={30} placeholder="Ej: MARIA2026"
                className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-marca-gold transition-all uppercase" />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Email <span className="text-slate-600 normal-case">(opcional)</span></label>
            <input name="email" type="email" placeholder="correo@ejemplo.com"
              className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-marca-gold transition-all" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Ciudad</label>
              <input name="ciudad" placeholder="Ej: Palmira"
                className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-marca-gold transition-all" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Dirección del negocio</label>
              <input name="direccion" placeholder="Cra 10 #20-30"
                className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-marca-gold transition-all" />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">¿Cómo se enteró del evento?</label>
            <select name="como_se_entero" defaultValue=""
              className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-marca-gold transition-all appearance-none">
              <option value="" disabled>Seleccione...</option>
              <option value="Redes sociales">Redes sociales</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="Referido">Referido</option>
              <option value="Distribuidor">Distribuidor</option>
              <option value="Otro">Otro</option>
            </select>
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-4 bg-marca-gold hover:bg-yellow-500 disabled:opacity-40 text-slate-900 font-black rounded-2xl transition-all text-sm uppercase tracking-widest">
            {loading ? 'Registrando...' : 'Registrarme al Evento'}
          </button>
        </form>
      </div>

      <p className="text-center text-slate-600 text-[10px]">La Villa del Millón · Palmira 2026</p>
    </div>
  );
}
