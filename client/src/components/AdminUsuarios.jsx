import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useToast } from './Toast';
import { ModalConfirm } from './ModalConfirm';
import { User, Lock, Shield, Users, FolderPlus, Trash2, UserPlus, Link2 } from 'lucide-react';

export default function AdminUsuarios() {
  const toast = useToast();
  const [grupos, setGrupos] = useState([]);
  const [nuevoGrupoNombre, setNuevoGrupoNombre] = useState('');
  const [creandoGrupo, setCreandoGrupo] = useState(false);
  const [usuarios, setUsuarios] = useState([]);
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [esAdmin, setEsAdmin] = useState(false);
  const [grupoIdNuevo, setGrupoIdNuevo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [gruposData, usuariosData] = await Promise.all([api.getGrupos(), api.getUsuarios()]);
      setGrupos(gruposData);
      setUsuarios(usuariosData);
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCrearGrupo = async (e) => {
    e.preventDefault();
    if (!nuevoGrupoNombre.trim()) return;
    setCreandoGrupo(true);
    try {
      await api.createGrupo(nuevoGrupoNombre.trim());
      setNuevoGrupoNombre('');
      toast(`Grupo "${nuevoGrupoNombre.trim()}" creado exitosamente`, 'exito');
      fetchData();
    } catch (err) {
      toast(err.message || 'Error al crear grupo', 'error');
    } finally {
      setCreandoGrupo(false);
    }
  };

  const handleEliminarGrupo = (grupoId) => {
    setConfirm({
      mensaje: '¿Eliminar este grupo? Los usuarios volverán a tener cuenta individual.',
      onConfirmar: async () => {
        setConfirm(null);
        try { await api.deleteGrupo(grupoId); toast('Grupo eliminado correctamente', 'exito'); fetchData(); } catch (err) { toast(err.message || 'Error al eliminar grupo', 'error'); }
      },
      onCancelar: () => setConfirm(null)
    });
  };

  const handleCambiarGrupo = async (userId, grupoId) => {
    try {
      await api.updateUsuarioGrupo(userId, grupoId === '' ? null : parseInt(grupoId));
      toast('Grupo del usuario actualizado', 'exito');
      fetchData();
    } catch (err) {
      toast(err.message || 'Error al cambiar grupo', 'error');
    }
  };

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
      await api.register(nombreUsuario, username, password, esAdmin, grupoIdNuevo ? parseInt(grupoIdNuevo) : null);
      toast(`Usuario "${username}" creado exitosamente`, 'exito');
      setNombreUsuario('');
      setUsername('');
      setPassword('');
      setEsAdmin(false);
      setGrupoIdNuevo('');
      fetchData();
    } catch (err) {
      setError(err.message || 'Error al registrar el usuario.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40vh' }}><p style={{ color: 'var(--text-secondary)' }}>Cargando administración...</p></div>;
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
          <Users size={22} className="text-green" />
          <h3 style={{ fontSize: '1.25rem', fontWeight: '700' }}>Gestión de Grupos</h3>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: '1.5' }}>
          Los usuarios dentro del <strong>mismo grupo</strong> comparten préstamos, abonos, caja y resumen.
          Los usuarios <strong>sin grupo</strong> tienen una cuenta completamente individual.
        </p>
        <form onSubmit={handleCrearGrupo} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
            <FolderPlus size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input id="nuevo-grupo" type="text" className="form-control" placeholder="Nombre del nuevo grupo (ej: Socios Principal)" value={nuevoGrupoNombre} onChange={(e) => setNuevoGrupoNombre(e.target.value)} style={{ paddingLeft: '2.25rem', width: '100%' }} disabled={creandoGrupo} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={creandoGrupo || !nuevoGrupoNombre.trim()} style={{ minHeight: '44px' }}>{creandoGrupo ? '...' : 'Crear Grupo'}</button>
        </form>
        {grupos.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>No hay grupos creados. Crea uno para que los usuarios compartan información.</p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            {grupos.map((grupo) => (
              <div key={grupo.id} style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '0.75rem', padding: '0.85rem 1.1rem', minWidth: '200px', flex: '1 1 200px', maxWidth: '300px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: '700', fontSize: '0.95rem' }}>{grupo.nombre}</span>
                  <button onClick={() => handleEliminarGrupo(grupo.id)} className="btn btn-secondary btn-small text-red" style={{ borderColor: 'rgba(239, 68, 68, 0.3)', padding: '0.2rem', minHeight: '44px', minWidth: '44px' }} title="Eliminar grupo" aria-label="Eliminar grupo"><Trash2 size={14} /></button>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {grupo.miembros?.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.25rem' }}>
                      {grupo.miembros.map((m) => (
                        <span key={m.id} className="badge" style={{ padding: '0.1rem 0.5rem', fontSize: '0.7rem', background: m.es_admin ? 'var(--warning-bg)' : 'var(--success-bg)', color: m.es_admin ? 'var(--warning)' : 'var(--success)', border: `1px solid ${m.es_admin ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)'}` }}>{m.nombre_usuario}</span>
                      ))}
                    </div>
                  ) : <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin miembros</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
          <Link2 size={20} className="text-green" />
          <h3 style={{ fontSize: '1.15rem', fontWeight: '700' }}>Asignar Usuarios a Grupos</h3>
        </div>
        {usuarios.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>No hay usuarios registrados.</p>
        ) : (
          <div className="table-container">
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Usuario</th>
                    <th>Rol</th>
                    <th>Grupo Actual</th>
                    <th>Cambiar Grupo</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((u) => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: '600' }}>{u.nombre_usuario}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{u.username}</td>
                      <td><span className={`badge ${u.es_admin ? 'warning' : 'success'}`} style={{ padding: '0.1rem 0.5rem', fontSize: '0.7rem' }}>{u.es_admin ? 'Admin' : 'Gestor'}</span></td>
                      <td>{u.grupo_nombre ? <span style={{ fontWeight: '500', color: 'var(--accent)' }}>{u.grupo_nombre}</span> : <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem' }}>Individual</span>}</td>
                      <td>
                        <select className="form-control" value={u.grupo_id || ''} onChange={(e) => handleCambiarGrupo(u.id, e.target.value)} style={{ width: 'auto', padding: '0.25rem 0.5rem', fontSize: '0.8rem', height: '32px', minWidth: '140px' }} aria-label={`Cambiar grupo de ${u.nombre_usuario}`}>
                          <option value="">Sin grupo (Individual)</option>
                          {grupos.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.5rem' }}>
          <UserPlus size={22} className="text-green" />
          <h3 style={{ fontSize: '1.25rem', fontWeight: '700' }}>Registrar Nuevo Usuario</h3>
        </div>
        {error && <div className="login-error" style={{ marginBottom: '1.25rem' }}>{error}</div>}
        {success && <div className="badge success w-full" style={{ padding: '0.75rem', borderRadius: '0.75rem', marginBottom: '1.25rem', justifyContent: 'center', fontSize: '0.85rem' }}>{success}</div>}
        <form onSubmit={handleRegisterUser}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
            <div className="form-group">
              <label htmlFor="reg-nombre">Nombre Completo *</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input id="reg-nombre" type="text" className="form-control" placeholder="ej: Carlos Arturo" value={nombreUsuario} onChange={(e) => setNombreUsuario(e.target.value)} style={{ paddingLeft: '2.25rem', width: '100%' }} disabled={submitting} required />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="reg-username">Nombre de Usuario (Login) *</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input id="reg-username" type="text" className="form-control" placeholder="ej: carlos_admin" value={username} onChange={(e) => setUsername(e.target.value)} style={{ paddingLeft: '2.25rem', width: '100%' }} disabled={submitting} required />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="reg-password">Contraseña Inicial *</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input id="reg-password" type="password" className="form-control" placeholder="Mínimo 6 caracteres" value={password} onChange={(e) => setPassword(e.target.value)} style={{ paddingLeft: '2.25rem', width: '100%' }} disabled={submitting} required />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="reg-grupo">Asignar a Grupo</label>
              <select id="reg-grupo" className="form-control" value={grupoIdNuevo} onChange={(e) => setGrupoIdNuevo(e.target.value)} disabled={submitting} style={{ width: '100%', height: '42px' }}>
                <option value="">Sin grupo (Cuenta individual)</option>
                {grupos.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: '1.75rem', marginTop: '0.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: '500', color: 'var(--color-text)', minHeight: '44px' }}>
              <input type="checkbox" checked={esAdmin} onChange={(e) => setEsAdmin(e.target.checked)} disabled={submitting} style={{ accentColor: 'var(--accent)', width: '16px', height: '16px' }} />
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>¿Asignar Rol de Administrador?<Shield size={14} className="text-yellow" style={{ marginLeft: '2px' }} /></span>
            </label>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', paddingLeft: '1.5rem' }}>Los administradores pueden crear usuarios, grupos y gestionar asignaciones.</p>
          </div>
          <button type="submit" className="btn btn-primary w-full" disabled={submitting} style={{ minHeight: '44px' }}>{submitting ? 'Registrando...' : 'Crear Usuario'}</button>
        </form>
      </div>

      {confirm && <ModalConfirm mensaje={confirm.mensaje} onConfirmar={confirm.onConfirmar} onCancelar={confirm.onCancelar} />}
    </div>
  );
}
