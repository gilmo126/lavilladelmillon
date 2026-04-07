'use client';

import { useState } from 'react';
import { createPersonalAction } from './actions';

export default function CreateDistForm({ zonasDisponibles }: { zonasDisponibles: {id: string, nombre: string}[] }) {
  const [loading, setLoading] = useState(false);
  const [selectedRol, setSelectedRol] = useState<'distribuidor' | 'operativo'>('distribuidor');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  async function handleAction(formData: FormData) {
    setLoading(true);
    setMessage(null);
    
    try {
      // Forzamos el rol seleccionado en el formData por si acaso, 
      // aunque el select ya lo tiene como 'name="rol"'
      const resp = await createPersonalAction(formData);
      if (resp.success) {
        setMessage({ type: 'success', text: `Personal (${selectedRol}) reclutado exitosamente. Las llaves logísticas han sido creadas.` });
        (document.getElementById('distForm') as HTMLFormElement)?.reset();
        setSelectedRol('distribuidor'); // Reset local state
      } else {
        setMessage({ type: 'error', text: resp.error || 'Fallo desconocido.' });
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'Error crítico de comunicación con el servidor.' });
    }
    
    setLoading(false);
  }

  return (
    <div className="bg-admin-card rounded-2xl border border-admin-border p-6 h-fit sticky top-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-admin-blue/10 flex items-center justify-center border border-admin-blue/20">
          <span className="text-xl">🛡️</span>
        </div>
        <h2 className="text-xl font-bold text-white">Reclutar Personal</h2>
      </div>

      {message && (
        <div className={`p-4 rounded-lg mb-6 text-sm border font-medium ${message.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-green-500/10 border-green-500/20 text-green-400'}`}>
          {message.text}
        </div>
      )}

      <form id="distForm" action={handleAction} className="space-y-4">
        {/* Selector de Rol */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Tipo de Personal</label>
          <select 
            name="rol"
            required
            value={selectedRol}
            onChange={(e) => setSelectedRol(e.target.value as any)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-admin-blue transition-colors text-sm appearance-none"
          >
            <option value="distribuidor">🚚 Distribuidor (Campo / Logística)</option>
            <option value="operativo">🔧 Operativo (Bodega / Central)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Nombre / Razón Social</label>
          <input 
            type="text" 
            name="nombre" 
            required 
            placeholder="Ej: Distribuciones ABC"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-admin-blue transition-colors text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Cédula / NIT</label>
            <input 
              type="text" 
              name="cedula" 
              required 
              placeholder="Ej: 1144000111"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-admin-blue transition-colors text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Celular</label>
            <input 
              type="text" 
              name="movil" 
              required 
              placeholder="Ej: 3001234567"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-admin-blue transition-colors text-sm"
            />
          </div>
        </div>

        <div>
           <label className="block text-sm font-medium text-slate-300 mb-1">Dirección Física</label>
           <input 
             type="text" 
             name="direccion" 
             required 
             placeholder="Ej: Cra 14 #20-10, local 3"
             className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-admin-blue transition-colors text-sm"
           />
        </div>

        {/* Zona Territorial Condicional (SOLO para Distribuidores) */}
        {selectedRol === 'distribuidor' ? (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
            <label className="block text-sm font-medium text-slate-300 mb-1 font-bold text-admin-gold">📍 Zona Territorial Requerida</label>
            <select 
               name="zona_id" 
               required 
               defaultValue=""
               className="w-full bg-slate-900 border border-admin-gold/30 rounded-lg px-4 py-2 text-white outline-none focus:border-admin-gold transition-colors text-sm appearance-none"
            >
               <option value="" disabled>-- Selecciona un Territorio --</option>
               {zonasDisponibles.map((z: any) => (
                  <option key={z.id} value={z.id}>{z.nombre}</option>
               ))}
            </select>
            <p className="text-[10px] text-admin-gold/60 mt-1 italic">* Campo obligatorio para gestión de despachos en campo.</p>
          </div>
        ) : (
          <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
            <p className="text-[10px] text-slate-400 italic">
              ✨ El personal <b>Operativo</b> será asignado automáticamente a la <b>Bodega Central</b>.
            </p>
          </div>
        )}

        <div className="pt-4 border-t border-admin-border mt-6">
           <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Credenciales GoTrue</h3>
           <div className="space-y-4">
             <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Correo (Bóveda Identidad)</label>
                <input 
                  type="email" 
                  name="email" 
                  required 
                  placeholder="personal@empresa.com"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-admin-blue transition-colors text-sm"
                />
             </div>
             <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Contraseña de Activación</label>
                <input 
                  type="text" 
                  name="password" 
                  required 
                  minLength={6}
                  placeholder="Generar clave (Ej: Per123*)"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-admin-blue transition-colors text-sm"
                />
             </div>
           </div>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full mt-6 bg-admin-blue text-white font-bold py-3 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 text-sm shadow-lg shadow-admin-blue/20"
        >
          {loading ? 'Sincronizando con IAM...' : 'Emitir Llaves de Bóveda'}
        </button>
      </form>
    </div>
  );
}
