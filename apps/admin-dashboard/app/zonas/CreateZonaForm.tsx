'use client';

import { useState } from 'react';
import { createZonaAction } from './actions';

export default function CreateZonaForm() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  async function handleAction(formData: FormData) {
    setLoading(true);
    setMessage(null);
    
    try {
      const resp = await createZonaAction(formData);
      if (resp.success) {
        setMessage({ type: 'success', text: 'Territorio geográfico delimitado con éxito.' });
        (document.getElementById('zonaForm') as HTMLFormElement)?.reset();
      } else {
        setMessage({ type: 'error', text: resp.error || 'Fallo desconocido.' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Error crítico de red.' });
    }
    
    setLoading(false);
  }

  return (
    <div className="bg-admin-card rounded-2xl border border-admin-border p-6 h-fit sticky top-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
          <span className="text-xl">📍</span>
        </div>
        <h2 className="text-xl font-bold text-white">Delimitar Territorio</h2>
      </div>

      {message && (
        <div className={`p-4 rounded-lg mb-6 text-sm border font-medium ${message.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-green-500/10 border-green-500/20 text-green-400'}`}>
          {message.text}
        </div>
      )}

      <form id="zonaForm" action={handleAction} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Nombre Oficial de Zona</label>
          <input 
            type="text" 
            name="nombre" 
            required 
            placeholder="Ej: Cali Sur - Valle"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-admin-blue transition-colors text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Descripción Estratégica (Opcional)</label>
          <textarea 
             name="descripcion" 
             rows={3}
             placeholder="Ej: Abarca desde la Calle 5ta hasta Pance"
             className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-admin-blue transition-colors text-sm resize-none"
          ></textarea>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full mt-6 bg-admin-blue text-white font-bold py-3 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 text-sm"
        >
          {loading ? 'Añadiendo al Catálogo...' : 'Guardar Zona Geográfica'}
        </button>
      </form>
    </div>
  );
}
