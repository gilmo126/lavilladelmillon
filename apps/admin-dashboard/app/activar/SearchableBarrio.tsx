'use client';

import React, { useState, useRef, useEffect } from 'react';

/**
 * SearchableBarrio: Componente de autocompletado premium para la selección de barrios.
 * Ofrece una experiencia de búsqueda fluida con diseño adaptado al dashboard.
 */
export default function SearchableBarrio({ 
  options, 
  value, 
  onChange, 
  placeholder = "Escribe el barrio..." 
}: { 
  options: { nombre: string }[]; 
  value: string; 
  onChange: (val: string) => void;
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sincronizar el término de búsqueda cuando cambia el valor externo
  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  // Manejar clics fuera del componente para cerrar la lista
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm(value); // Revertir al último valor seleccionado si se cancela
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value]);

  const filtered = options.filter(opt => 
    opt.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="relative flex items-center">
        <input
          type="text"
          autoComplete="off"
          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-xs outline-none focus:border-admin-blue transition-all pr-10"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
            // Si el campo se vacía, notificamos el cambio
            if (e.target.value === "") onChange("");
          }}
          onFocus={() => setIsOpen(true)}
        />
        <div className="absolute right-4 text-slate-600 pointer-events-none text-[10px]">
           {isOpen ? '▲' : '▼'}
        </div>
      </div>
      
      {isOpen && filtered.length > 0 && (
        <div className="absolute z-[210] top-full left-0 w-full mt-2 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="max-h-52 overflow-y-auto custom-scrollbar py-2">
            {filtered.map((opt, idx) => (
              <button
                key={idx}
                type="button"
                className="w-full text-left px-5 py-3 text-[10px] font-black text-slate-400 hover:bg-admin-blue hover:text-white transition-all border-b border-white/5 last:border-0 uppercase tracking-widest flex items-center justify-between group"
                onClick={() => {
                  onChange(opt.nombre);
                  setSearchTerm(opt.nombre);
                  setIsOpen(false);
                }}
              >
                <span>{opt.nombre}</span>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[8px]">Seleccionar</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Caso: No hay resultados */}
      {isOpen && searchTerm.length > 0 && filtered.length === 0 && (
        <div className="absolute z-[210] top-full left-0 w-full mt-2 bg-slate-900/95 backdrop-blur-xl border border-red-500/20 rounded-2xl p-4 shadow-2xl animate-in fade-in slide-in-from-top-2">
          <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest text-center">
             ⚠️ Barrio no encontrado
          </p>
        </div>
      )}
    </div>
  );
}
