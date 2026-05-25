import React, { useState } from 'react';
import { api } from '../utils/api';
import { Lock, User, Eye, EyeOff } from 'lucide-react';

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Por favor, completa todos los campos.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const data = await api.login(username, password);
      onLoginSuccess(data.token, data.usuario);
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6" style={{ background: 'linear-gradient(135deg, #6C63FF 0%, #EEF2FF 100%)' }}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 sm:p-8 animate-fade-slide-up" style={{ background: 'var(--color-card)' }}>
        <div className="text-center mb-6">
          <div className="text-4xl mb-2" style={{ animation: 'float 4s ease-in-out infinite' }}>🤝</div>
          <h2 className="text-2xl font-extrabold tracking-tight" style={{ color: 'var(--color-text)' }}>CREDIALIADO</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>Tu aliado estratégico en gestión de préstamos</p>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm font-medium text-center" style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)', border: '1px solid var(--danger-border)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-soft)' }}>
              Nombre de Usuario
            </label>
            <div className="relative">
              <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
              <input
                id="username"
                type="text"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm outline-none transition-all"
                placeholder="ej: carlos_admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                style={{ borderColor: 'var(--color-border)', background: 'var(--bg-input)', color: 'var(--color-text)' }}
                onFocus={(e) => { e.target.style.borderColor = '#6C63FF'; e.target.style.boxShadow = '0 0 0 3px rgba(108,99,255,0.15)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--color-border)'; e.target.style.boxShadow = 'none'; }}
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-soft)' }}>
              Contraseña
            </label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border text-sm outline-none transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                style={{ borderColor: 'var(--color-border)', background: 'var(--bg-input)', color: 'var(--color-text)' }}
                onFocus={(e) => { e.target.style.borderColor = '#6C63FF'; e.target.style.boxShadow = '0 0 0 3px rgba(108,99,255,0.15)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--color-border)'; e.target.style.boxShadow = 'none'; }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center"
                style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all min-h-[44px]"
            style={{ background: 'linear-gradient(135deg, #6C63FF, #5A52E0)' }}
            disabled={loading}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Iniciando sesión...
              </span>
            ) : 'Ingresar al Dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
}
