'use client'

import React, { useState } from 'react'
import { login } from './actions'

export default function LoginBox() {
  const [errorMSG, setErrorMSG] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setErrorMSG('')
    
    // We create FormData from the event target
    const formData = new FormData(e.currentTarget)

    const res = await login(formData)
    if (res?.error) {
      setErrorMSG("Credenciales inválidas o cuenta no registrada.")
      setLoading(false)
    }
    // Si no hay error, next/navigation redirige y esto se desmonta solo.
  }

  return (
    <div className="w-full max-w-md p-8 glass-panel rounded-2xl border border-admin-gold/30 shadow-2xl relative overflow-hidden bg-slate-900 mx-4">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-admin-gold/20 via-admin-gold to-admin-gold/20" />
      
      <div className="text-center mb-8">
        <div className="w-12 h-12 rounded-xl bg-admin-gold flex items-center justify-center font-bold text-admin-dark text-xl mx-auto mb-4 tracking-tighter">VM</div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Acceso Operativo</h2>
        <p className="text-slate-400 text-sm mt-1">Identifícate con tus credenciales de logística</p>
      </div>

      {errorMSG && <div className="mb-6 p-4 rounded-lg bg-red-900/30 border border-red-500/50 text-red-200 text-sm text-center">{errorMSG}</div>}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1">
           <label className="text-sm font-medium text-slate-300">Correo Electrónico</label>
           <input required type="email" name="email" autoFocus suppressHydrationWarning
             className="w-full bg-admin-dark border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-admin-gold transition-colors"
           />
        </div>
        <div className="space-y-1">
           <label className="text-sm font-medium text-slate-300">Contraseña Segura</label>
           <input required type="password" name="password" suppressHydrationWarning
             className="w-full bg-admin-dark border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-admin-gold transition-colors"
           />
        </div>
        <button type="submit" disabled={loading}
           className="w-full py-3 mt-4 rounded-lg font-bold text-admin-dark bg-admin-gold hover:opacity-90 transition-all disabled:opacity-50">
           {loading ? 'Verificando Criptografía...' : 'Ingresar a Bóveda'}
        </button>
      </form>
    </div>
  )
}
