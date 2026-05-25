import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useToast } from './Toast';
import { ModalConfirm } from './ModalConfirm';
import { User, Lock, Shield, Users, FolderPlus, Trash2, UserPlus, Wrench } from 'lucide-react';
import { subscribe } from '../contexts/RealtimeContext';

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
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(null);
  const [repairUserId, setRepairUserId] = useState('');
  const [reparando, setReparando] = useState(false);
  const [repairResult, setRepairResult] = useState(null);

  const fetchData = async () => {
    try { setLoading(true); const [gruposData, usuariosData] = await Promise.all([api.getGrupos(), api.getUsuarios()]); setGrupos(gruposData); setUsuarios(usuariosData); }
    catch (err) { /* handled silently */ }
    finally { setLoading(false); }
  };

  const refreshData = async () => {
    try { const [gruposData, usuariosData] = await Promise.all([api.getGrupos(), api.getUsuarios()]); setGrupos(gruposData); setUsuarios(usuariosData); }
    catch (err) { /* silent */ }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => subscribe(refreshData), []);

  const handleCrearGrupo = async (e) => {
    e.preventDefault();
    if (!nuevoGrupoNombre.trim()) return;
    setCreandoGrupo(true);
    try { await api.createGrupo(nuevoGrupoNombre.trim()); setNuevoGrupoNombre(''); toast(`Grupo "${nuevoGrupoNombre.trim()}" creado`, 'exito'); fetchData(); }
    catch (err) { toast(err.message || 'Error al crear grupo', 'error'); }
    finally { setCreandoGrupo(false); }
  };

  const handleEliminarGrupo = (grupoId) => {
    setConfirm({ mensaje: '¿Eliminar este grupo? Los usuarios volverán a tener cuenta individual.', onConfirmar: async () => { setConfirm(null); try { await api.deleteGrupo(grupoId); toast('Grupo eliminado', 'exito'); fetchData(); } catch (err) { toast(err.message || 'Error', 'error'); } }, onCancelar: () => setConfirm(null) });
  };

  const handleEliminarUsuario = (userId, nombreUsuario) => {
    setConfirm({ mensaje: `¿Eliminar al usuario "${nombreUsuario}"? Se eliminarán todos sus datos.`, onConfirmar: async () => { setConfirm(null); try { await api.deleteUser(userId); toast(`Usuario eliminado`, 'exito'); fetchData(); } catch (err) { toast(err.message || 'Error', 'error'); } }, onCancelar: () => setConfirm(null) });
  };

  const handleCambiarGrupo = async (userId, grupoId) => {
    try { await api.updateUsuarioGrupo(userId, grupoId === '' ? null : parseInt(grupoId)); toast('Grupo actualizado', 'exito'); fetchData(); }
    catch (err) { toast(err.message || 'Error', 'error'); }
  };

  const handleRegisterUser = async (e) => {
    e.preventDefault();
    if (!nombreUsuario || !username || !password) { setError('Completa todos los campos.'); return; }
    setSubmitting(true); setError('');
    try { await api.register(nombreUsuario, username, password, esAdmin, grupoIdNuevo ? parseInt(grupoIdNuevo) : null); toast(`Usuario "${username}" creado`, 'exito'); setNombreUsuario(''); setUsername(''); setPassword(''); setEsAdmin(false); setGrupoIdNuevo(''); fetchData(); }
    catch (err) { setError(err.message || 'Error al registrar.'); }
    finally { setSubmitting(false); }
  };

  const handleRepairPrestamos = async () => {
    if (!repairUserId) return;
    setReparando(true); setRepairResult(null);
    try { const res = await api.repairPrestamos(parseInt(repairUserId)); setRepairResult(res.reparados); toast(res.mensaje, 'exito'); }
    catch (err) { toast(err.message || 'Error', 'error'); setRepairResult(0); }
    finally { setReparando(false); }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Cargando administración...</p></div>;
  }

  const inputClasses = "w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all";
  const inputStyle = { borderColor: 'var(--color-border)', background: 'var(--bg-input)', color: 'var(--color-text)' };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Groups */}
      <div className="bg-white rounded-2xl border p-5 shadow-sm" style={{ borderColor: 'var(--color-border)', background: 'var(--color-card)' }}>
        <div className="flex items-center gap-2.5 mb-3">
          <Users size={22} style={{ color: 'var(--color-success)' }} />
          <h3 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>Gestión de Grupos</h3>
        </div>
        <p className="text-sm mb-4 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
          Los usuarios del <strong>mismo grupo</strong> comparten préstamos, abonos, caja y resumen.
          Los usuarios <strong>sin grupo</strong> tienen cuenta individual.
        </p>
        <form onSubmit={handleCrearGrupo} className="flex gap-2 w-full mb-4">
          <div className="relative flex-1 min-w-0">
            <FolderPlus size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
            <input type="text" placeholder="Nombre del grupo" value={nuevoGrupoNombre} onChange={(e) => setNuevoGrupoNombre(e.target.value)} disabled={creandoGrupo}
              className={inputClasses} style={{ paddingLeft: '2.25rem', ...inputStyle }} />
          </div>
          <button type="submit" disabled={creandoGrupo || !nuevoGrupoNombre.trim()} className="min-h-[44px] px-4 rounded-xl text-sm font-semibold text-white transition-all shadow-sm whitespace-nowrap flex-shrink-0" style={{ background: 'linear-gradient(135deg, #6C63FF, #5A52E0)' }}>{creandoGrupo ? '...' : 'Crear Grupo'}</button>
        </form>
        {grupos.length === 0 ? (
          <p className="text-sm text-center py-4" style={{ color: 'var(--color-text-muted)' }}>No hay grupos creados.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {grupos.map((grupo) => (
              <div key={grupo.id} className="rounded-xl p-4 flex-1 min-w-[200px] max-w-xs" style={{ background: 'rgba(0,200,150,0.06)', border: '1px solid rgba(0,200,150,0.15)' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>{grupo.nombre}</span>
                  <button onClick={() => handleEliminarGrupo(grupo.id)} className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border transition-all" style={{ borderColor: 'rgba(255,71,87,0.2)', color: 'var(--color-danger)' }} title="Eliminar grupo"><Trash2 size={14} /></button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {grupo.miembros?.length > 0 ? grupo.miembros.map((m) => (
                    <span key={m.id} className="px-2.5 py-0.5 rounded-full text-[11px] font-medium truncate max-w-[140px]" style={{ background: m.es_admin ? 'var(--warning-bg)' : 'var(--success-bg)', color: m.es_admin ? 'var(--warning-text)' : 'var(--success-text)', border: `1px solid ${m.es_admin ? 'var(--warning-border)' : 'var(--success-border)'}` }}>{m.nombre_usuario}</span>
                  )) : <span className="text-xs italic" style={{ color: 'var(--color-text-muted)' }}>Sin miembros</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Users */}
      <div className="bg-white rounded-2xl border p-5 shadow-sm" style={{ borderColor: 'var(--color-border)', background: 'var(--color-card)' }}>
        <h2 className="text-base font-bold mb-4" style={{ color: 'var(--color-text)' }}>👥 Gestión de Usuarios</h2>
        {usuarios.length === 0 ? (
          <p className="text-sm text-center py-4" style={{ color: 'var(--color-text-muted)' }}>No hay usuarios registrados.</p>
        ) : (
          <div className="space-y-3">
            {usuarios.map((u) => (
              <div key={u.id} className="flex flex-col gap-2 p-4 rounded-2xl border" style={{ borderColor: 'var(--color-border)', background: 'var(--color-card)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 min-w-[40px] rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ background: 'var(--color-accent-soft)', color: 'var(--color-primary)' }}>
                    {u.nombre_usuario.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate max-w-[160px] sm:max-w-none" style={{ color: 'var(--color-text)' }}>{u.nombre_usuario}</p>
                    <p className="text-xs truncate max-w-[120px] sm:max-w-none" style={{ color: 'var(--color-text-muted)' }}>@{u.username}</p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium flex-shrink-0" style={{ background: u.es_admin ? 'var(--warning-bg)' : 'var(--success-bg)', color: u.es_admin ? 'var(--warning-text)' : 'var(--success-text)', border: `1px solid ${u.es_admin ? 'var(--warning-border)' : 'var(--success-border)'}` }}>
                    {u.es_admin ? 'Admin' : 'Gestor'}
                  </span>
                </div>
                <div className="flex items-center gap-2 pl-[52px] sm:pl-0">
                  <span className="text-xs whitespace-nowrap" style={{ color: u.grupo_nombre ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>{u.grupo_nombre || 'Individual'}</span>
                  <select value={u.grupo_id || ''} onChange={(e) => handleCambiarGrupo(u.id, e.target.value)}
                    className="flex-1 rounded-xl border px-2 py-1.5 text-xs outline-none cursor-pointer min-w-0"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--bg-input)', color: 'var(--color-text)' }} aria-label={`Cambiar grupo de ${u.nombre_usuario}`}>
                    <option value="">Sin grupo</option>
                    {grupos.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                  </select>
                  <button onClick={() => handleEliminarUsuario(u.id, u.nombre_usuario)} className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border transition-all flex-shrink-0" style={{ borderColor: 'rgba(255,71,87,0.2)', color: 'var(--color-danger)' }} title="Eliminar"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Register User */}
      <div className="bg-white rounded-2xl border p-5 shadow-sm" style={{ borderColor: 'var(--color-border)', background: 'var(--color-card)' }}>
        <div className="flex items-center gap-2.5 mb-4">
          <UserPlus size={22} style={{ color: 'var(--color-success)' }} />
          <h3 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>Registrar Nuevo Usuario</h3>
        </div>
        {error && <div className="mb-4 px-4 py-3 rounded-xl text-sm font-medium text-center" style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)', border: '1px solid var(--danger-border)' }}>{error}</div>}
        <form onSubmit={handleRegisterUser}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="reg-nombre" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-soft)' }}>Nombre Completo *</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
                <input id="reg-nombre" type="text" placeholder="ej: Carlos Arturo" value={nombreUsuario} onChange={(e) => setNombreUsuario(e.target.value)} disabled={submitting} required
                  className={inputClasses} style={{ paddingLeft: '2.25rem', ...inputStyle }} />
              </div>
            </div>
            <div>
              <label htmlFor="reg-username" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-soft)' }}>Username (Login) *</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
                <input id="reg-username" type="text" placeholder="ej: carlos_admin" value={username} onChange={(e) => setUsername(e.target.value)} disabled={submitting} required
                  className={inputClasses} style={{ paddingLeft: '2.25rem', ...inputStyle }} />
              </div>
            </div>
            <div>
              <label htmlFor="reg-password" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-soft)' }}>Contraseña *</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
                <input id="reg-password" type="password" placeholder="Mínimo 6 caracteres" value={password} onChange={(e) => setPassword(e.target.value)} disabled={submitting} required
                  className={inputClasses} style={{ paddingLeft: '2.25rem', ...inputStyle }} />
              </div>
            </div>
            <div>
              <label htmlFor="reg-grupo" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-soft)' }}>Asignar a Grupo</label>
              <select id="reg-grupo" value={grupoIdNuevo} onChange={(e) => setGrupoIdNuevo(e.target.value)} disabled={submitting}
                className={inputClasses} style={inputStyle}>
                <option value="">Sin grupo (Individual)</option>
                {grupos.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer font-medium mt-4 min-h-[44px]" style={{ color: 'var(--color-text)' }}>
            <input type="checkbox" checked={esAdmin} onChange={(e) => setEsAdmin(e.target.checked)} disabled={submitting} style={{ accentColor: 'var(--color-accent)', width: '16px', height: '16px' }} />
            <span className="text-sm flex items-center gap-1">Asignar Administrador <Shield size={14} style={{ color: 'var(--color-warning)' }} /></span>
          </label>
          <p className="text-xs mt-1 mb-4 pl-7" style={{ color: 'var(--color-text-muted)' }}>Los administradores pueden crear usuarios, grupos y gestionar asignaciones.</p>
          <button type="submit" disabled={submitting}
            className="w-full min-h-[44px] rounded-xl text-sm font-semibold text-white transition-all shadow-sm"
            style={{ background: 'linear-gradient(135deg, #6C63FF, #5A52E0)' }}>
            {submitting ? 'Registrando...' : 'Crear Usuario'}
          </button>
        </form>
      </div>

      {/* Repair Tool */}
      <div className="bg-white rounded-2xl border p-5 shadow-sm" style={{ borderColor: 'var(--color-border)', background: 'var(--color-card)' }}>
        <div className="flex items-center gap-2.5 mb-4">
          <Wrench size={20} style={{ color: 'var(--color-warning)' }} />
          <h3 className="text-base font-bold" style={{ color: 'var(--color-text)' }}>Herramientas</h3>
        </div>
        <div>
          <label htmlFor="repair-user" className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-soft)' }}>Reparar préstamos huérfanos</label>
          <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>Asigna los préstamos sin usuario al usuario seleccionado.</p>
          <div className="flex gap-3 items-center">
            <select id="repair-user" value={repairUserId} onChange={(e) => setRepairUserId(e.target.value)}
              className="flex-1 min-h-[44px] rounded-xl border px-4 py-2.5 text-sm outline-none"
              style={{ borderColor: 'var(--color-border)', background: 'var(--bg-input)', color: 'var(--color-text)' }}>
              <option value="">Seleccionar usuario...</option>
              {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nombre_usuario} (@{u.username})</option>)}
            </select>
            <button onClick={handleRepairPrestamos} disabled={!repairUserId || reparando}
              className="min-h-[44px] px-5 rounded-xl text-sm font-semibold text-white transition-all shadow-sm whitespace-nowrap"
              style={{ background: 'linear-gradient(135deg, #6C63FF, #5A52E0)' }}>
              {reparando ? 'Reparando...' : '🔧 Reparar'}
            </button>
          </div>
          {repairResult !== null && (
            <div className="mt-3 px-4 py-2.5 rounded-xl text-sm font-medium" style={{
              background: repairResult > 0 ? 'var(--success-bg)' : 'var(--color-accent-soft)',
              border: `1px solid ${repairResult > 0 ? 'var(--success-border)' : 'var(--color-border)'}`,
              color: repairResult > 0 ? 'var(--success-text)' : 'var(--color-text-secondary)',
            }}>
              {repairResult > 0 ? `✅ ${repairResult} préstamo(s) reparado(s)` : 'ℹ️ No se encontraron préstamos huérfanos'}
            </div>
          )}
        </div>
      </div>

      {confirm && <ModalConfirm mensaje={confirm.mensaje} onConfirmar={confirm.onConfirmar} onCancelar={confirm.onCancelar} />}
    </div>
  );
}
