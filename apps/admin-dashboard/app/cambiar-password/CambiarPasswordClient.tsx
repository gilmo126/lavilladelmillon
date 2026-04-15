'use client';

import { useState } from 'react';
import { cambiarPasswordAction } from './actions';

export default function CambiarPasswordClient({ nombre }: { nombre: string }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('La contraseña debe tener mínimo 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    const res = await cambiarPasswordAction(password);
    if (res?.error) {
      setError(res.error);
      setLoading(false);
    }
    // Si no hay error, la action redirige automáticamente
  }

  return (
    <div className="w-full max-w-md p-8 rounded-2xl border border-admin-gold/30 shadow-2xl relative overflow-hidden bg-slate-900">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-admin-gold/20 via-admin-gold to-admin-gold/20" />

      <div className="text-center mb-8">
        <div className="w-12 h-12 rounded-xl bg-admin-gold flex items-center justify-center font-bold text-admin-dark text-xl mx-auto mb-4 tracking-tighter">
          🔐
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Cambiar Contraseña</h2>
        <p className="text-slate-400 text-sm mt-1">
          Hola <span className="text-white font-bold">{nombre}</span>, debes establecer una contraseña personal antes de continuar.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-900/30 border border-red-500/50 text-red-200 text-sm text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-300">Nueva Contraseña</label>
          <input
            required
            type="password"
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            className="w-full bg-admin-dark border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-admin-gold transition-colors"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-300">Confirmar Contraseña</label>
          <input
            required
            type="password"
            minLength={6}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repite la contraseña"
            className="w-full bg-admin-dark border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-admin-gold transition-colors"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 mt-4 rounded-lg font-bold text-admin-dark bg-admin-gold hover:opacity-90 transition-all disabled:opacity-50"
        >
          {loading ? 'Guardando...' : 'Guardar Nueva Contraseña'}
        </button>
      </form>
    </div>
  );
}
