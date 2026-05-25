import { useState, useEffect } from 'react'
import { api } from '../utils/api'
import { useToast } from './Toast'
import { User, Lock, Save, CheckCircle } from 'lucide-react'

export default function Perfil({ user, onUserUpdate }) {
  const toast = useToast()
  const [nombre, setNombre] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [cambiandoPass, setCambiandoPass] = useState(false)
  const [exitoPass, setExitoPass] = useState(false)

  useEffect(() => {
    if (user) setNombre(user.nombre_usuario || '')
  }, [user])

  const guardarNombre = async (e) => {
    e.preventDefault()
    if (!nombre.trim()) return
    setGuardando(true)
    try {
      const updated = await api.updatePerfil(nombre.trim())
      onUserUpdate(updated)
      toast('Nombre actualizado con éxito', 'exito')
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setGuardando(false)
    }
  }

  const cambiarPassword = async (e) => {
    e.preventDefault()
    if (nueva !== confirmar) { toast('Las contraseñas nuevas no coinciden', 'error'); return }
    if (nueva.length < 4) { toast('La nueva contraseña debe tener al menos 4 caracteres', 'error'); return }
    setCambiandoPass(true)
    setExitoPass(false)
    try {
      await api.changePassword(actual, nueva)
      toast('Contraseña cambiada con éxito', 'exito')
      setExitoPass(true)
      setActual('')
      setNueva('')
      setConfirmar('')
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setCambiandoPass(false)
    }
  }

  const inputClass = "w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all"
  const focusStyle = { borderColor: 'var(--color-accent)', boxShadow: '0 0 0 3px var(--color-accent-soft)' }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold"
          style={{ background: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}>
          {user?.nombre_usuario?.charAt(0).toUpperCase() || '?'}
        </div>
        <div>
          <h2 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>{user?.nombre_usuario}</h2>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>@{user?.username} {user?.es_admin ? '· Admin' : ''}</p>
        </div>
      </div>

      <div className="rounded-2xl border p-5 space-y-4" style={{ borderColor: 'var(--color-border)', background: 'var(--color-card)' }}>
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
          <User size={16} /> Cambiar nombre
        </h3>
        <form onSubmit={guardarNombre} className="flex gap-2">
          <input type="text" value={nombre} onChange={e => setNombre(e.target.value)}
            placeholder="Tu nombre" className={inputClass}
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}
            onFocus={e => Object.assign(e.target.style, focusStyle)}
            onBlur={e => { e.target.style.borderColor = 'var(--color-border)'; e.target.style.boxShadow = 'none' }} />
          <button type="submit" disabled={guardando || !nombre.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
            style={{ background: 'linear-gradient(135deg, #6C63FF, #5A52E0)', opacity: guardando || !nombre.trim() ? 0.6 : 1 }}>
            <Save size={16} /> {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </form>
      </div>

      <div className="rounded-2xl border p-5 space-y-4" style={{ borderColor: 'var(--color-border)', background: 'var(--color-card)' }}>
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
          <Lock size={16} /> Cambiar contraseña
        </h3>
        {exitoPass && (
          <div className="flex items-center gap-2 text-sm p-3 rounded-xl" style={{ background: 'rgba(34,197,94,0.1)', color: '#16a34a' }}>
            <CheckCircle size={16} /> Contraseña actualizada con éxito
          </div>
        )}
        <form onSubmit={cambiarPassword} className="space-y-3">
          <input type="password" value={actual} onChange={e => setActual(e.target.value)}
            placeholder="Contraseña actual" className={`${inputClass} w-full`}
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}
            onFocus={e => Object.assign(e.target.style, focusStyle)}
            onBlur={e => { e.target.style.borderColor = 'var(--color-border)'; e.target.style.boxShadow = 'none' }} />
          <input type="password" value={nueva} onChange={e => setNueva(e.target.value)}
            placeholder="Nueva contraseña (mín. 4 caracteres)" className={`${inputClass} w-full`}
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}
            onFocus={e => Object.assign(e.target.style, focusStyle)}
            onBlur={e => { e.target.style.borderColor = 'var(--color-border)'; e.target.style.boxShadow = 'none' }} />
          <input type="password" value={confirmar} onChange={e => setConfirmar(e.target.value)}
            placeholder="Confirmar nueva contraseña" className={`${inputClass} w-full`}
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}
            onFocus={e => Object.assign(e.target.style, focusStyle)}
            onBlur={e => { e.target.style.borderColor = 'var(--color-border)'; e.target.style.boxShadow = 'none' }} />
          <button type="submit" disabled={cambiandoPass || !actual || !nueva || !confirmar}
            className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
            style={{ background: 'linear-gradient(135deg, #6C63FF, #5A52E0)', opacity: cambiandoPass || !actual || !nueva || !confirmar ? 0.6 : 1 }}>
            <Lock size={16} /> {cambiandoPass ? 'Cambiando...' : 'Cambiar contraseña'}
          </button>
        </form>
      </div>
    </div>
  )
}
