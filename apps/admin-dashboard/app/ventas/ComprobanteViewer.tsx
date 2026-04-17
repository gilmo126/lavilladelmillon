'use client';

import { useState, useEffect, useRef } from 'react';

type Props = {
  url: string;
  onClose: () => void;
};

export default function ComprobanteViewer({ url, onClose }: Props) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isPdf = url.toLowerCase().includes('.pdf') || url.toLowerCase().includes('application/pdf');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === '+' || e.key === '=') setZoom((z) => Math.min(z + 0.25, 5));
      if (e.key === '-' || e.key === '_') setZoom((z) => Math.max(z - 0.25, 0.5));
      if (e.key === '0') { setZoom(1); setPan({ x: 0, y: 0 }); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.15 : -0.15;
    setZoom((z) => Math.max(0.5, Math.min(5, z + delta)));
  }

  function handleMouseDown(e: React.MouseEvent) {
    if (zoom <= 1) return;
    setDragging(true);
    startRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!dragging || !startRef.current) return;
    setPan({ x: e.clientX - startRef.current.x, y: e.clientY - startRef.current.y });
  }

  function handleMouseUp() {
    setDragging(false);
    startRef.current = null;
  }

  return (
    <div className="fixed inset-0 z-[300] bg-black/95 flex flex-col animate-in fade-in duration-200">
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-slate-950/80">
        <p className="text-white text-sm font-bold">Comprobante de pago</p>
        <div className="flex items-center gap-2">
          {!isPdf && (
            <>
              <button onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))} className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black text-lg">−</button>
              <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="px-3 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase">{Math.round(zoom * 100)}%</button>
              <button onClick={() => setZoom((z) => Math.min(z + 0.25, 5))} className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black text-lg">+</button>
            </>
          )}
          <a href={url} target="_blank" rel="noopener noreferrer" className="px-3 h-10 flex items-center rounded-xl bg-admin-blue hover:bg-blue-600 text-white font-bold text-xs uppercase">↗ Abrir</a>
          <button onClick={onClose} className="w-10 h-10 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-lg">✕</button>
        </div>
      </div>

      <div
        ref={containerRef}
        onWheel={!isPdf ? handleWheel : undefined}
        onMouseDown={!isPdf ? handleMouseDown : undefined}
        onMouseMove={!isPdf ? handleMouseMove : undefined}
        onMouseUp={!isPdf ? handleMouseUp : undefined}
        onMouseLeave={!isPdf ? handleMouseUp : undefined}
        className="flex-1 overflow-hidden flex items-center justify-center select-none"
        style={{
          cursor: isPdf ? 'default' : zoom > 1 ? (dragging ? 'grabbing' : 'grab') : 'zoom-in',
          touchAction: isPdf ? 'auto' : 'pinch-zoom',
        }}
      >
        {isPdf ? (
          <iframe src={url} className="w-full h-full" title="Comprobante PDF" />
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={url}
            alt="Comprobante"
            draggable={false}
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center',
              transition: dragging ? 'none' : 'transform 120ms ease-out',
              maxWidth: '100%',
              maxHeight: '100%',
              pointerEvents: 'none',
            }}
          />
        )}
      </div>

      <div className="px-4 py-3 border-t border-white/10 bg-slate-950/80 text-center">
        <p className="text-[10px] text-slate-500 uppercase tracking-widest">
          Pellizca para zoom en mobile · Scroll/+/− en desktop · Esc para cerrar
        </p>
      </div>
    </div>
  );
}
