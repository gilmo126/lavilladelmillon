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
      {/* Mensaje de bienvenida */}
      <div className="bg-gradient-to-b from-marca-gold/10 to-transparent rounded-3xl p-8 text-center space-y-6 border border-marca-gold/20">
        <h2 className="text-2xl font-black text-white leading-tight">
          ¡Bienvenido(a) a<br />
          <span className="text-marca-gold">La Villa del Millón!</span>
        </h2>
        <p className="text-slate-300 text-sm leading-relaxed max-w-md mx-auto">
          El escenario donde tu esfuerzo encuentra su recompensa.
          Has sido invitado(a) al evento <strong className="text-marca-gold">{tipoEvento}</strong>.
        </p>
        <div className="flex flex-wrap justify-center gap-4 pt-4">
          <span className="bg-slate-800 border border-white/10 px-4 py-2 rounded-full text-xs font-black text-white uppercase tracking-wider">KIA</span>
          <span className="bg-slate-800 border border-white/10 px-4 py-2 rounded-full text-xs font-black text-white uppercase tracking-wider">YAMAHA</span>
          <span className="bg-slate-800 border border-white/10 px-4 py-2 rounded-full text-xs font-black text-white uppercase tracking-wider">ODONTO PROTECT</span>
        </div>
      </div>

      {/* Personalización */}
      <div className="bg-slate-800/50 border border-white/5 rounded-2xl p-6 text-center">
        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">Invitado(a)</p>
        <p className="text-xl font-black text-white">{comercianteNombre}</p>
      </div>

      {status === 'error' && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-center text-red-400 text-sm font-bold">
          {errorMsg}
        </div>
      )}

      {/* Botones */}
      <div className="space-y-3">
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
