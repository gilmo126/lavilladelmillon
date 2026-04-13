'use client';

import { useState } from 'react';
import { aceptarInvitacionAction, rechazarInvitacionAction } from './actions';

type Props = {
  token: string;
  comercianteNombre: string;
  tipoEvento: string;
  tokenQr: string;
};

const ADMIN_URL = 'https://lavilladelmillon-admin.guillaumer-orion.workers.dev';

export default function InvitacionClient({ token, comercianteNombre, tipoEvento, tokenQr }: Props) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'aceptada' | 'rechazada' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const qrDataUrl = `${ADMIN_URL}/validar-qr-inv/${tokenQr}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrDataUrl)}`;

  async function handleAceptar() {
    setStatus('loading');
    const res = await aceptarInvitacionAction(token);
    if (res.success) {
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

  if (status === 'aceptada') {
    return (
      <div className="space-y-6 animate-in fade-in zoom-in duration-500">
        <div className="bg-green-900/20 border border-green-500/30 rounded-3xl p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center text-3xl mx-auto">✅</div>
          <h2 className="text-xl font-black text-white">¡Asistencia Confirmada!</h2>
          <p className="text-green-400 font-bold text-sm">Tu lugar está reservado</p>
        </div>

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

        <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-4 text-center">
          <p className="text-slate-400 text-xs">
            También recibirás el QR por correo electrónico si proporcionaste tu email.
          </p>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-b from-marca-gold/10 to-transparent rounded-3xl p-8 text-center space-y-4 border border-marca-gold/20">
        <h2 className="text-2xl font-black text-white leading-tight">
          ¡Bienvenidos a<br />
          <span className="text-marca-gold">La Villa del Millón!</span>
        </h2>
        <p className="text-marca-gold/80 text-sm font-bold italic">
          El escenario donde tu esfuerzo encuentra su recompensa.
        </p>
      </div>

      {/* Invitado */}
      <div className="bg-slate-800/50 border border-marca-gold/20 rounded-2xl p-6 text-center">
        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">Invitado(a) especial</p>
        <p className="text-xl font-black text-white">{comercianteNombre}</p>
        <p className="text-[10px] text-marca-gold font-bold uppercase tracking-widest mt-2">{tipoEvento}</p>
      </div>

      {/* Mensaje completo */}
      <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-6 space-y-5">
        <p className="text-slate-300 text-sm leading-relaxed">
          Gracias por aceptar esta invitación. Tu presencia hoy no es coincidencia; estás aquí porque eres parte del motor que impulsa nuestra región. En <strong className="text-white">La Villa del Millón</strong>, nuestro objetivo principal es reconocer y potenciar el valor de ustedes, los microempresarios, brindándoles un espacio donde el crecimiento y la celebración van de la mano.
        </p>

        <p className="text-slate-300 text-sm leading-relaxed">
          Sabemos que el camino del emprendimiento requiere aliados fuertes. Por eso, nos enorgullece contar con el respaldo de <strong className="text-marca-gold font-black">Kia</strong>, <strong className="text-marca-gold font-black">Yamaha</strong> y la Clínica Odontológica <strong className="text-marca-gold font-black">Odonto Protect</strong>. Gracias a su visión y apoyo, hoy podemos ofrecerles una jornada cargada de:
        </p>

        <div className="space-y-3 pl-2">
          <div className="flex items-start gap-3">
            <span className="text-marca-gold text-lg mt-0.5">💰</span>
            <div>
              <p className="text-white font-black text-sm">Beneficios Económicos</p>
              <p className="text-slate-400 text-xs">Herramientas y oportunidades diseñadas exclusivamente para fortalecer sus negocios.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-marca-gold text-lg mt-0.5">🎁</span>
            <div>
              <p className="text-white font-black text-sm">Grandes Rifas y Regalos</p>
              <p className="text-slate-400 text-xs">Premios de nuestras marcas aliadas para premiar su constancia.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-marca-gold text-lg mt-0.5">✨</span>
            <div>
              <p className="text-white font-black text-sm">Experiencias de Bienestar</p>
              <p className="text-slate-400 text-xs">Pensadas para que tú y tu negocio sigan brillando.</p>
            </div>
          </div>
        </div>

        <div className="bg-marca-gold/5 border border-marca-gold/20 rounded-2xl p-5 text-center space-y-3">
          <p className="text-marca-gold font-black text-sm uppercase tracking-wider">¡Es tu momento de participar!</p>
          <p className="text-slate-300 text-xs leading-relaxed">
            Queremos que aproveches cada oportunidad. No dejes pasar ninguna actividad, acércate a los stands de nuestros auspiciantes y asegúrate de estar presente en cada sorteo.
          </p>
        </div>

        <p className="text-slate-300 text-sm leading-relaxed">
          <strong className="text-white">Microempresario:</strong> Tu visión nos inspira. Junto a <strong className="text-marca-gold font-black">Kia</strong>, <strong className="text-marca-gold font-black">Yamaha</strong> y <strong className="text-marca-gold font-black">Odonto Protect</strong>, estamos aquí para impulsarte a llegar más lejos. ¡Participa, disfruta y conquista los beneficios que hemos preparado para ti!
        </p>

        <p className="text-slate-400 text-sm text-center italic">
          Nuevamente, gracias por acompañarnos. ¡Que comience el éxito en La Villa del Millón!
        </p>
      </div>

      {/* Auspiciantes */}
      <div className="flex flex-wrap justify-center gap-3">
        <span className="bg-marca-gold/10 border border-marca-gold/30 px-5 py-2.5 rounded-full text-sm font-black text-marca-gold uppercase tracking-wider">KIA</span>
        <span className="bg-marca-gold/10 border border-marca-gold/30 px-5 py-2.5 rounded-full text-sm font-black text-marca-gold uppercase tracking-wider">YAMAHA</span>
        <span className="bg-marca-gold/10 border border-marca-gold/30 px-5 py-2.5 rounded-full text-sm font-black text-marca-gold uppercase tracking-wider">ODONTO PROTECT</span>
      </div>

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
