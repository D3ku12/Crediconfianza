import { useState, useEffect, memo } from 'react';
import { api } from '../utils/api';
import { Edit3, Trash2, FileText } from 'lucide-react';

const Clientes = memo(function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [clienteEditando, setClienteEditando] = useState(null);
  const [confirmarEliminar, setConfirmarEliminar] = useState(null);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({ nombre: '', telefono: '', descripcion: '' });

  const cargarClientes = async () => {
    try { setCargando(true); setError(''); const data = await api.getClientes(); setClientes(Array.isArray(data) ? data : []); }
    catch (error) { console.error('Error al cargar clientes:', error); setError('Error al cargar clientes.'); }
    finally { setCargando(false); }
  };

  useEffect(() => { cargarClientes(); }, []);

  const abrirNuevo = () => { setFormData({ nombre: '', telefono: '', descripcion: '' }); setClienteEditando(null); setMostrarFormulario(true); };
  const abrirEditar = (cliente) => { setFormData({ nombre: cliente.nombre || '', telefono: cliente.telefono || '', descripcion: cliente.descripcion || '' }); setClienteEditando(cliente); setMostrarFormulario(true); };

  const guardar = async () => {
    if (!formData.nombre.trim()) return;
    if (!formData.telefono.trim()) { setError('El teléfono es requerido.'); return; }
    try {
      setError('');
      const datos = { nombre: formData.nombre.trim(), telefono: formData.telefono.trim(), descripcion: formData.descripcion.trim() };
      if (clienteEditando) { await api.updateCliente(clienteEditando.id, datos); } else { await api.createCliente(datos); }
      setMostrarFormulario(false); cargarClientes();
    } catch (error) { setError(error.message || 'Error al guardar cliente.'); }
  };

  const soportaContactos = 'contacts' in navigator && 'ContactsManager' in window;
  const agregarDesdeContactos = async () => {
    try {
      const props = ['name', 'tel']; const opts = { multiple: false };
      const contactos = await navigator.contacts.select(props, opts);
      if (contactos.length > 0) { const contacto = contactos[0]; setFormData({ nombre: contacto.name?.[0] || '', telefono: contacto.tel?.[0] || '', descripcion: '' }); setClienteEditando(null); setMostrarFormulario(true); }
    } catch (error) { console.error('Error al acceder a contactos:', error); }
  };

  const eliminar = async (id) => { try { await api.deleteCliente(id); setConfirmarEliminar(null); cargarClientes(); } catch (error) { console.error('Error al eliminar cliente:', error); } };

  const verEstadoCuenta = async (clienteId) => {
    const ventana = window.open('', '_blank');
    if (!ventana) { alert('Permite las ventanas emergentes para ver el estado de cuenta.'); return; }
    ventana.document.write('<p style="font-family:sans-serif;padding:2em;color:#666;">Cargando estado de cuenta...</p>');
    try { const html = await api.getClienteEstadoCuenta(clienteId); ventana.document.write(html); ventana.document.close(); }
    catch (error) { ventana.document.write('<p style="font-family:sans-serif;padding:2em;color:red;">Error al generar el estado de cuenta.</p>'); }
  };

  const inputBase = "w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all";
  const inputStyle = { borderColor: 'var(--color-border)', background: 'var(--bg-input)', color: 'var(--color-text)' };

  return (
    <div className="max-w-3xl mx-auto">
      {error && (
        <div className="flex items-center justify-center gap-2 px-4 py-3 mb-4 rounded-xl text-sm" style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)' }}>
          {error}
          <button onClick={cargarClientes} className="underline font-medium bg-transparent border-none cursor-pointer" style={{ color: 'inherit' }}>Reintentar</button>
        </div>
      )}

      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>👥 Clientes</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{clientes.length} cliente{clientes.length !== 1 ? 's' : ''} registrado{clientes.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {soportaContactos && (
            <button onClick={agregarDesdeContactos} className="min-h-[44px] px-4 py-2.5 rounded-xl border border-dashed text-sm font-medium transition-all" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
              📱 Contactos
            </button>
          )}
          <button onClick={abrirNuevo} className="min-h-[44px] px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all shadow-sm" style={{ background: 'linear-gradient(135deg, #6C63FF, #5A52E0)' }}>
            + Nuevo cliente
          </button>
        </div>
      </div>

      {cargando && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-xl border" style={{ borderColor: 'var(--color-border)' }}>
              <div className="w-11 h-11 rounded-full bg-gray-200 animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!cargando && clientes.length === 0 && (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">👤</div>
          <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--color-text)' }}>Sin clientes aún</h3>
          <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>Registra tu primer cliente para generar estados de cuenta</p>
          <button onClick={abrirNuevo} className="min-h-[44px] px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all shadow-sm" style={{ background: 'linear-gradient(135deg, #6C63FF, #5A52E0)' }}>+ Nuevo cliente</button>
        </div>
      )}

      {!cargando && clientes.map(cliente => (
        <div key={cliente.id} className="flex items-center gap-4 p-4 mb-3 rounded-2xl border shadow-sm transition-all hover:shadow-md" style={{ borderColor: 'var(--color-border)', background: 'var(--color-card)' }}>
          <div className="w-11 h-11 min-w-[44px] rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0" style={{ background: 'var(--color-accent-soft)', color: 'var(--color-primary)' }}>
            {cliente.nombre.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text)' }}>{cliente.nombre}</p>
            <div className="flex gap-3 flex-wrap mt-0.5">
              {cliente.telefono && <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>📱 {cliente.telefono}</span>}
              {cliente.documento && <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>🪪 {cliente.documento}</span>}
              {parseFloat(cliente.total_prestamos) > 0 && <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>📋 {cliente.total_prestamos} préstamo{parseFloat(cliente.total_prestamos) !== 1 ? 's' : ''}</span>}
              {parseFloat(cliente.deuda_total) > 0 && <span className="text-xs font-semibold" style={{ color: 'var(--color-danger)' }}>💰 ${parseFloat(cliente.deuda_total).toLocaleString('es-CO')} pendiente</span>}
            </div>
          </div>
          <div className="flex gap-1.5 flex-shrink-0">
            <button onClick={() => verEstadoCuenta(cliente.id)} className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border text-sm transition-all" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }} title="Estado de cuenta"><FileText size={16} /></button>
            <button onClick={() => abrirEditar(cliente)} className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border text-sm transition-all" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }} title="Editar"><Edit3 size={16} /></button>
            <button onClick={() => setConfirmarEliminar(cliente)} className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border text-sm transition-all" style={{ borderColor: 'rgba(255,71,87,0.2)', color: 'var(--color-danger)' }} title="Eliminar"><Trash2 size={16} /></button>
          </div>
        </div>
      ))}

      {mostrarFormulario && (
        <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center animate-fade-in" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md p-5 animate-slide-up" style={{ background: 'var(--color-card)' }}>
            <h3 className="text-base font-bold mb-4" style={{ color: 'var(--color-text)' }}>{clienteEditando ? '✏️ Editar cliente' : '👤 Nuevo cliente'}</h3>
            <div className="space-y-3">
              <input className={inputBase} style={inputStyle} placeholder="Nombre completo *" value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} autoFocus />
              <input className={inputBase} style={inputStyle} placeholder="Número de teléfono *" value={formData.telefono} onChange={e => setFormData({ ...formData, telefono: e.target.value })} inputMode="tel" type="tel" />
              <textarea className={inputBase} style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} placeholder="Descripción (opcional)" value={formData.descripcion} onChange={e => setFormData({ ...formData, descripcion: e.target.value })} />
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setMostrarFormulario(false)} className="flex-1 min-h-[44px] rounded-xl border text-sm font-medium transition-all" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)', background: 'var(--color-card)' }}>Cancelar</button>
              <button onClick={guardar} disabled={!formData.nombre.trim()} className="flex-1 min-h-[44px] rounded-xl text-sm font-semibold text-white transition-all shadow-sm" style={{ background: 'linear-gradient(135deg, #6C63FF, #5A52E0)', opacity: !formData.nombre.trim() ? 0.5 : 1 }}>{clienteEditando ? 'Guardar cambios' : 'Crear cliente'}</button>
            </div>
          </div>
        </div>
      )}

      {confirmarEliminar && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 animate-fade-in" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
          <div className="rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center animate-modal-enter" style={{ background: 'var(--color-card)' }}>
            <div className="text-4xl mb-3">⚠️</div>
            <h3 className="text-base font-bold mb-2" style={{ color: 'var(--color-text)' }}>¿Eliminar cliente?</h3>
            <p className="text-sm mb-6 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              Se eliminará <strong>{confirmarEliminar.nombre}</strong>. Sus préstamos no se eliminarán.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmarEliminar(null)} className="flex-1 min-h-[44px] rounded-xl border text-sm font-medium transition-all" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)', background: 'var(--color-card)' }}>Cancelar</button>
              <button onClick={() => eliminar(confirmarEliminar.id)} className="flex-1 min-h-[44px] rounded-xl text-sm font-semibold text-white transition-all" style={{ background: 'var(--color-danger)' }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default Clientes;
