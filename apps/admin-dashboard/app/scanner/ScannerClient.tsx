'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ScannerClient() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = token.trim();
    if (!cleaned) {
      setError('Ingresa un token de QR válido');
      return;
    }
    setError(null);
    router.push(`/validar-qr/${cleaned}`);
  }

  return (
    <div className="space-y-6">
      <div className="bg-admin-card border border-admin-border rounded-3xl p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">
              Token del QR
            </label>
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Pega o escribe el código del QR..."
              autoFocus
              className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-4 text-white text-center font-mono text-lg outline-none focus:border-admin-gold transition-all"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm font-bold text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-5 bg-admin-gold hover:bg-yellow-500 text-slate-900 font-black rounded-2xl transition-all text-sm uppercase tracking-widest shadow-xl shadow-admin-gold/20 active:scale-[0.99]"
          >
            Validar QR
          </button>
        </form>
      </div>

      <div className="bg-admin-blue/5 border border-admin-blue/20 rounded-2xl p-5 text-center">
        <p className="text-slate-400 text-sm leading-relaxed">
          <span className="text-admin-blue font-bold">Instrucciones:</span> Escanea el QR del comerciante con la cámara de tu dispositivo.
          El navegador abrirá automáticamente la página de validación.
          Si la cámara no funciona, copia el código del QR y pégalo en el campo de arriba.
        </p>
      </div>
    </div>
  );
}
