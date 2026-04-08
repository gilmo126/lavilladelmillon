'use client';

import React, { useState, useEffect } from 'react';
import { getPremios, upsertPremio, deletePremio, getConfiguracion, uploadPublicImagenAction } from '../../lib/actions';
import { supabase } from '../../lib/supabaseClient';

export default function PremiosManager() {
  const [premios, setPremios] = useState<any[]>([]);
  const [campanaId, setCampanaId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  
  // States for the active form
  const [isEditing, setIsEditing] = useState(false);
  const [formId, setFormId] = useState<string | undefined>(undefined);
  const [formNombre, setFormNombre] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCantidad, setFormCantidad] = useState(0);
  const [formImagenUrl, setFormImagenUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const getPlaceholder = (nombre: string) => {
    const text = encodeURIComponent(nombre || 'Premio');
    return `https://via.placeholder.com/600x400/1E293B/F59E0B?text=${text}`;
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const config = await getConfiguracion();
      if (config) {
        setCampanaId(config.id);
        const data = await getPremios(config.id);
        setPremios(data || []);
      }
    } catch (e) {
      console.error(e);
      alert('Error cargando los premios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleEdit = (p: any) => {
    setIsEditing(true);
    setFormId(p.id);
    setFormNombre(p.nombre_premio);
    setFormDesc(p.descripcion);
    setFormCantidad(p.cantidad_disponible || 0);
    setFormImagenUrl(p.imagen_url || null);
  };

  const handleNew = () => {
    setIsEditing(true);
    setFormId(undefined);
    setFormNombre('');
    setFormDesc('');
    setFormCantidad(1);
    setFormImagenUrl(null);
  };

  const handeSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campanaId) return alert('No hay campaña activa para atar el premio');
    
    try {
      await upsertPremio({
        id: formId,
        campana_id: campanaId,
        nombre_premio: formNombre,
        descripcion: formDesc,
        cantidad_disponible: formCantidad,
        imagen_url: formImagenUrl
      });
      setIsEditing(false);
      loadData();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este premio? Esto podría romper boletas asociadas.')) return;
    try {
      await deletePremio(id);
      loadData();
    } catch (err: any) {
      alert('Error al borrar: ' + err.message);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    // Validación de Tamaño (5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      alert('⚠️ La imagen es muy pesada. Por favor sube una de menos de 5MB');
      return;
    }

    setUploading(true);
    
    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      const resp = await uploadPublicImagenAction(formData);

      if (!resp.success) throw new Error(resp.error);

      setFormImagenUrl(resp.url || null);
    } catch (err: any) {
      alert('Error subiendo imagen: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-admin-dark p-6 md:p-10 w-full overflow-y-auto">
      <header className="flex justify-between items-end mb-10 shrink-0">
        <div>
          <h2 className="text-3xl font-bold">Gestión de Premios</h2>
          <p className="text-slate-400 mt-1">Configura las arcas del tesoro dinámicamente.</p>
        </div>
        {!isEditing && (
          <button 
            onClick={handleNew}
            className="bg-admin-gold text-admin-dark font-bold px-6 py-2 rounded-lg shadow-[0_0_15px_rgba(245,158,11,0.4)] hover:shadow-[0_0_25px_rgba(245,158,11,0.6)] transition-all"
          >
            + Añadir Premio
          </button>
        )}
      </header>

      {isEditing ? (
        <div className="table-glass rounded-xl border border-admin-gold/30 p-8 shadow-2xl mb-8 max-w-2xl mx-auto w-full">
          <h3 className="text-xl font-bold mb-6 text-white">{formId ? 'Editar Premio' : 'Nuevo Premio'}</h3>
          <form onSubmit={handeSave} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Nombre del Premio</label>
              <input required type="text" value={formNombre} onChange={e=>setFormNombre(e.target.value)} className="w-full bg-slate-900 border border-admin-border rounded-md px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-admin-gold" placeholder="Ej: Carro Kia 0km" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Descripción</label>
              <textarea required rows={3} value={formDesc} onChange={e=>setFormDesc(e.target.value)} className="w-full bg-slate-900 border border-admin-border rounded-md px-3 py-2 text-white focus:outline-none focus:border-admin-gold" placeholder="Detalles operativos"></textarea>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Cantidad en Stock</label>
              <input required type="number" min="0" value={formCantidad} onChange={e=>setFormCantidad(Number(e.target.value))} className="w-full bg-slate-900 border border-admin-border rounded-md px-3 py-2 text-white focus:outline-none focus:border-admin-gold" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Fotografía del Premio</label>
              <div className="flex items-center gap-4">
                <div className="w-24 h-16 rounded border border-admin-border overflow-hidden bg-slate-900 relative">
                  <img src={formImagenUrl || getPlaceholder(formNombre)} alt="Preview" className="w-full h-full object-cover" />
                  {uploading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-[10px]">Subiendo...</div>}
                </div>
                <input type="file" accept="image/*" onChange={handleFileUpload} className="text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-admin-gold/10 file:text-admin-gold hover:file:bg-admin-gold/20 cursor-pointer" />
              </div>
              <p className="text-[10px] text-slate-500 mt-2">Formatos: JPG, PNG, WebP. Tamaño máx: 2MB.</p>
            </div>
            <div className="flex gap-4 pt-4">
              <button type="submit" className="flex-1 bg-admin-green/20 text-admin-green border border-admin-green hover:bg-admin-green hover:text-admin-dark rounded-md py-2 font-bold transition">Guardar Oficialmente</button>
              <button type="button" onClick={() => setIsEditing(false)} className="flex-1 bg-slate-800 text-slate-300 hover:bg-slate-700 rounded-md py-2 transition">Cancelar</button>
            </div>
          </form>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <p className="text-slate-400">Consultando la bóveda...</p>
          ) : premios.length === 0 ? (
            <p className="text-slate-400">No hay premios configurados.</p>
          ) : (
            premios.map(p => (
              <div key={p.id} className="table-glass rounded-xl border border-admin-border p-0 shadow-lg hover:border-admin-gold/30 transition flex flex-col overflow-hidden group">
                <div className="h-40 w-full relative overflow-hidden bg-slate-900 border-b border-admin-border">
                  <img src={p.imagen_url || getPlaceholder(p.nombre_premio)} alt={p.nombre_premio} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute top-2 right-2">
                    <span className="bg-admin-dark/80 backdrop-blur-sm text-admin-gold text-[10px] font-bold px-2 py-0.5 rounded-full border border-admin-gold/20 shadow-lg">
                      Sorteo Activo
                    </span>
                  </div>
                </div>
                <div className="p-6 flex flex-col flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-bold text-white shrink-0">{p.nombre_premio}</h3>
                    <span className="bg-admin-blue/10 text-admin-blue text-[10px] font-bold px-2 py-1 rounded-full border border-admin-blue/20">
                      Stock: {p.cantidad_disponible}
                    </span>
                  </div>
                  <p className="text-slate-400 text-sm mb-6 flex-1">{p.descripcion}</p>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(p)} className="flex-1 py-1.5 bg-admin-blue/10 text-admin-blue hover:bg-admin-blue hover:text-admin-dark rounded text-sm font-medium transition cursor-pointer">Editar</button>
                    <button onClick={() => handleDelete(p.id)} className="flex-1 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded text-sm font-medium transition cursor-pointer">Borrar</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
