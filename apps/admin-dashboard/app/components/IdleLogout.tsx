'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { logout } from '../login/actions';

const WARNING_SECONDS = 60;
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'scroll', 'click'] as const;

export default function IdleLogout({ timeoutMinutes }: { timeoutMinutes: number }) {
  const timeoutMs = Math.max(1, timeoutMinutes) * 60 * 1000;
  const warnAtMs = Math.max(1000, timeoutMs - WARNING_SECONDS * 1000);

  const lastActivityRef = useRef<number>(Date.now());
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(WARNING_SECONDS);

  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (showWarning) setShowWarning(false);
  }, [showWarning]);

  useEffect(() => {
    for (const ev of ACTIVITY_EVENTS) {
      window.addEventListener(ev, resetActivity, { passive: true });
    }
    return () => {
      for (const ev of ACTIVITY_EVENTS) {
        window.removeEventListener(ev, resetActivity);
      }
    };
  }, [resetActivity]);

  useEffect(() => {
    tickRef.current = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed >= timeoutMs) {
        logout();
        return;
      }
      if (elapsed >= warnAtMs) {
        setShowWarning(true);
        setSecondsLeft(Math.max(0, Math.ceil((timeoutMs - elapsed) / 1000)));
      }
    }, 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [timeoutMs, warnAtMs]);

  if (!showWarning) return null;

  return (
    <div className="fixed inset-0 z-[500] bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-admin-card border border-admin-gold/30 rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center space-y-4">
        <div className="text-4xl">⏱️</div>
        <h2 className="text-xl font-black text-white">Tu sesión está por expirar</h2>
        <p className="text-slate-400 text-sm">
          Por seguridad, tu sesión se cerrará automáticamente por inactividad en{' '}
          <strong className="text-admin-gold font-black text-lg">{secondsLeft}</strong>{' '}
          {secondsLeft === 1 ? 'segundo' : 'segundos'}.
        </p>
        <div className="space-y-2 pt-2">
          <button
            onClick={resetActivity}
            className="w-full py-3 bg-admin-gold hover:bg-yellow-500 text-slate-900 font-black rounded-xl text-xs uppercase tracking-widest transition-all"
          >
            Seguir activo
          </button>
          <button
            onClick={() => logout()}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs uppercase tracking-widest border border-white/5 transition-all"
          >
            Cerrar sesión ahora
          </button>
        </div>
      </div>
    </div>
  );
}
