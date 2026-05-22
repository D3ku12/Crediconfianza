import React, { useState } from 'react';
import { api } from '../utils/api';
import { User, Lock, UserCheck, Shield, AlertCircle } from 'lucide-react';

export default function AdminUsuarios() {
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [esAdmin, setEsAdmin] = useState(false);
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleRegisterUser = async (e) => {
    e.preventDefault();
    if (!nombreUsuario || !username || !password) {
      setError('Por favor completa todos los campos requeridos.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await api.register(nombreUsuario, username, password, esAdmin);
      
      setSuccess(`Usuario "${username}" creado exitosamente.`);
      setNombreUsuario('');
      setUsername('');
      setPassword('');
      setEsAdmin(false);
    } catch (err) {
      setError(err.message || 'Error al registrar el usuario.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '550px', margin: '2rem auto' }}>
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.5rem' }}>
          <UserCheck size={22} className="text-green" />
          <h3 style={{ fontSize: '1.25rem', fontWeight: '700' }}>Registrar Nuevo Usuario</h3>
        </div>

        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: '1.4' }}>
          Como administrador, tienes el privilegio de añadir nuevos gestores o clientes al sistema. Cada usuario tendrá su propio espacio de préstamos privado.
        </p>

        {error && <div className="login-error" style={{ marginBottom: '1.25rem' }}>{error}</div>}
        {success && (
          <div className="badge success w-full" style={{ padding: '0.75rem', borderRadius: '0.75rem', marginBottom: '1.25rem', justifyContent: 'center', fontSize: '0.85rem' }}>
            {success}
          </div>
        )}

        <form onSubmit={handleRegisterUser}>
          <div className="form-group">
            <label htmlFor="reg-nombre">Nombre Completo (Mostrar en pantalla) *</label>
            <div style={{ position: 'relative' }}>
              <User size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                id="reg-nombre"
                type="text"
                className="form-control"
                placeholder="ej: Carlos Arturo"
                value={nombreUsuario}
                onChange={(e) => setNombreUsuario(e.target.value)}
                style={{ paddingLeft: '2.25rem', width: '100%' }}
                disabled={submitting}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="reg-username">Nombre de Usuario (Para Login) *</label>
            <div style={{ position: 'relative' }}>
              <User size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                id="reg-username"
                type="text"
                className="form-control"
                placeholder="ej: carlos_admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{ paddingLeft: '2.25rem', width: '100%' }}
                disabled={submitting}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="reg-password">Contraseña Inicial *</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                id="reg-password"
                type="password"
                className="form-control"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '2.25rem', width: '100%' }}
                disabled={submitting}
                required
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1.75rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: '500', color: 'white' }}>
              <input
                type="checkbox"
                checked={esAdmin}
                onChange={(e) => setEsAdmin(e.target.checked)}
                disabled={submitting}
                style={{ accentColor: 'var(--accent)', width: '16px', height: '16px' }}
              />
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                ¿Asignar Rol de Administrador?
                <Shield size={14} className="text-yellow" style={{ marginLeft: '2px' }} />
              </span>
            </label>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', paddingLeft: '1.5rem' }}>
              Los administradores tienen la facultad de crear otros usuarios en la aplicación.
            </p>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary w-full"
            disabled={submitting}
          >
            {submitting ? 'Registrando...' : 'Crear Usuario'}
          </button>
        </form>
      </div>
    </div>
  );
}
