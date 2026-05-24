import { useState, useEffect, memo } from 'react';
import { api } from '../utils/api';

const Clientes = memo(function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [clienteEditando, setClienteEditando] = useState(null);
  const [confirmarEliminar, setConfirmarEliminar] = useState(null);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    nombre: '', telefono: '', descripcion: ''
  });

  // ── Cargar clientes ──
  const cargarClientes = async () => {
    try {
      setCargando(true);
      setError('');
      const data = await api.getClientes();
      setClientes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error al cargar clientes:', error);
      setError('Error al cargar clientes. Verifica tu conexión.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargarClientes(); }, []);

  // ── Abrir formulario nuevo ──
  const abrirNuevo = () => {
    setFormData({ nombre:'', telefono:'', descripcion:'' });
    setClienteEditando(null);
    setMostrarFormulario(true);
  };

  // ── Abrir formulario editar ──
  const abrirEditar = (cliente) => {
    setFormData({
      nombre:      cliente.nombre      || '',
      telefono:    cliente.telefono    || '',
      descripcion: cliente.descripcion || '',
    });
    setClienteEditando(cliente);
    setMostrarFormulario(true);
  };

  // ── Guardar (crear o editar) ──
  const guardar = async () => {
    if (!formData.nombre.trim()) return;
    try {
      const datos = {
        nombre: formData.nombre.trim(),
        telefono: formData.telefono.trim(),
        descripcion: formData.descripcion.trim()
      };
      if (clienteEditando) {
        await api.updateCliente(clienteEditando.id, datos);
      } else {
        await api.createCliente(datos);
      }
      setMostrarFormulario(false);
      cargarClientes();
    } catch (error) {
      console.error('Error al guardar cliente:', error);
    }
  };

  // ── Importar desde contactos (solo móvil) ──
  const soportaContactos = 'contacts' in navigator && 'ContactsManager' in window;

  const agregarDesdeContactos = async () => {
    try {
      const props = ['name', 'tel'];
      const opts = { multiple: false };
      const contactos = await navigator.contacts.select(props, opts);
      if (contactos.length > 0) {
        const contacto = contactos[0];
        setFormData({
          nombre: contacto.name?.[0] || '',
          telefono: contacto.tel?.[0] || '',
          descripcion: ''
        });
        setClienteEditando(null);
        setMostrarFormulario(true);
      }
    } catch (error) {
      console.error('Error al acceder a contactos:', error);
    }
  };

  // ── Eliminar ──
  const eliminar = async (id) => {
    try {
      await api.deleteCliente(id);
      setConfirmarEliminar(null);
      cargarClientes();
    } catch (error) {
      console.error('Error al eliminar cliente:', error);
    }
  };

  // ── Descargar estado de cuenta ──
  const verEstadoCuenta = async (clienteId) => {
    const ventana = window.open('', '_blank');
    if (!ventana) {
      alert('Permite las ventanas emergentes para ver el estado de cuenta.')
      return
    }
    ventana.document.write('<p style="font-family:sans-serif;padding:2em;color:#666;">Cargando estado de cuenta...</p>')
    try {
      const html = await api.getClienteEstadoCuenta(clienteId)
      ventana.document.write(html)
      ventana.document.close()
    } catch (error) {
      ventana.document.write('<p style="font-family:sans-serif;padding:2em;color:red;">Error al generar el estado de cuenta.</p>')
      console.error('Error al generar estado de cuenta:', error)
    }
  };

  // ── Estilos compartidos ──
  const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)',
    background: 'var(--color-glass)',
    color: 'var(--color-text)',
    fontSize: '16px',
    fontFamily: 'inherit',
    outline: 'none',
    marginBottom: '12px',
  };

  const btnPrimary = {
    background: 'var(--color-primary)',
    color: 'var(--color-on-primary)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    minHeight: '44px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  };

  return (
    <div style={{ padding: '16px', maxWidth: '800px', margin: '0 auto', minHeight: '50vh' }}>

      {/* ── ERROR ── */}
      {error && (
        <div style={{
          padding: '12px 16px',
          marginBottom: '16px',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.2)',
          color: 'var(--color-danger)',
          fontSize: '13px',
          textAlign: 'center',
        }}>
          {error}
          <button onClick={cargarClientes} style={{
            marginLeft: '8px',
            textDecoration: 'underline',
            background: 'none',
            border: 'none',
            color: 'inherit',
            cursor: 'pointer',
          }}>Reintentar</button>
        </div>
      )}

      {/* ── ENCABEZADO ── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div>
          <h2 style={{
            fontSize: 'clamp(18px, 5vw, 24px)',
            fontWeight: '700',
            color: 'var(--color-text)',
            margin: 0,
          }}>
            👥 Clientes
          </h2>
          <p style={{
            fontSize: '13px',
            color: 'var(--color-text-muted)',
            margin: '4px 0 0',
          }}>
            {clientes.length} cliente{clientes.length !== 1 ? 's' : ''} registrado{clientes.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {soportaContactos && (
            <button onClick={agregarDesdeContactos} style={{
              ...btnPrimary,
              background: 'transparent',
              border: '1px dashed var(--color-border)',
              color: 'var(--color-text)',
            }}>
              📱 Agregar desde contactos
            </button>
          )}
          <button onClick={abrirNuevo} style={btnPrimary}>
            + Nuevo cliente
          </button>
        </div>
      </div>

      {/* ── CARGANDO ── */}
      {cargando && (
        <div style={{
          textAlign: 'center',
          padding: '48px',
          color: 'var(--color-text-muted)',
          fontSize: '14px',
        }}>
          Cargando clientes...
        </div>
      )}

      {/* ── ESTADO VACÍO ── */}
      {!cargando && clientes.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '48px 24px',
          color: 'var(--color-text-muted)',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>👤</div>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: 'var(--color-text)',
            marginBottom: '8px',
          }}>
            Sin clientes aún
          </h3>
          <p style={{ fontSize: '13px', marginBottom: '24px' }}>
            Registra tu primer cliente para generar estados de cuenta
          </p>
          <button onClick={abrirNuevo} style={btnPrimary}>
            + Nuevo cliente
          </button>
        </div>
      )}

      {/* ── LISTA DE CLIENTES ── */}
      {!cargando && clientes.map(cliente => (
        <div key={cliente.id} className="card" style={{
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          flexWrap: 'wrap',
        }}>

          {/* Avatar inicial */}
          <div style={{
            width: '44px',
            height: '44px',
            minWidth: '44px',
            borderRadius: '50%',
            background: 'var(--color-accent-soft)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            fontWeight: '700',
            color: 'var(--color-accent)',
          }}>
            {cliente.nombre.charAt(0).toUpperCase()}
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontSize: '15px',
              fontWeight: '600',
              color: 'var(--color-text)',
              margin: 0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {cliente.nombre}
            </p>
            <div style={{
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap',
              marginTop: '3px',
            }}>
              {cliente.telefono && (
                <span style={{
                  fontSize: '12px',
                  color: 'var(--color-text-muted)',
                }}>
                  📱 {cliente.telefono}
                </span>
              )}
              {cliente.documento && (
                <span style={{
                  fontSize: '12px',
                  color: 'var(--color-text-muted)',
                }}>
                  🪪 {cliente.documento}
                </span>
              )}
              {parseFloat(cliente.total_prestamos) > 0 && (
                <span style={{
                  fontSize: '12px',
                  color: 'var(--color-text-muted)',
                }}>
                  📋 {cliente.total_prestamos} préstamo{parseFloat(cliente.total_prestamos) !== 1 ? 's' : ''}
                </span>
              )}
              {parseFloat(cliente.deuda_total) > 0 && (
                <span style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: 'var(--color-danger)',
                }}>
                  💰 ${parseFloat(cliente.deuda_total)
                    .toLocaleString('es-CO')} pendiente
                </span>
              )}
            </div>
          </div>

          {/* Acciones */}
          <div style={{
            display: 'flex',
            gap: '6px',
            flexShrink: 0,
            flexWrap: 'wrap',
          }}>
            <button
              onClick={() => verEstadoCuenta(cliente.id, cliente.nombre)}
              title="Estado de cuenta"
              style={{
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                background: 'var(--color-glass)',
                color: 'var(--color-text)',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500',
                minHeight: '38px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              📄 PDF
            </button>
            <button
              onClick={() => abrirEditar(cliente)}
              title="Editar cliente"
              style={{
                width: '38px',
                height: '38px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                background: 'var(--color-glass)',
                color: 'var(--color-text-soft)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '15px',
              }}
            >
              ✏️
            </button>
            <button
              onClick={() => setConfirmarEliminar(cliente)}
              title="Eliminar cliente"
              style={{
                width: '38px',
                height: '38px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(239,68,68,0.3)',
                background: 'rgba(239,68,68,0.08)',
                color: 'var(--color-danger)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '15px',
              }}
            >
              🗑️
            </button>
          </div>
        </div>
      ))}

      {/* ── MODAL FORMULARIO ── */}
      {mostrarFormulario && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: 998,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          padding: '0',
        }}>
          <div style={{
            background: 'var(--color-card-solid)',
            borderRadius: '20px 20px 0 0',
            padding: '24px 20px',
            width: '100%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflowY: 'auto',
            animation: 'slideUp 0.3s ease',
          }}>
            <h3 style={{
              fontSize: '17px',
              fontWeight: '700',
              color: 'var(--color-text)',
              marginBottom: '20px',
            }}>
              {clienteEditando ? '✏️ Editar cliente' : '👤 Nuevo cliente'}
            </h3>

            <input
              style={inputStyle}
              placeholder="Nombre completo *"
              value={formData.nombre}
              onChange={e => setFormData({ ...formData, nombre: e.target.value })}
              autoFocus
            />
            <input
              style={inputStyle}
              placeholder="Número de teléfono *"
              value={formData.telefono}
              onChange={e => setFormData({ ...formData, telefono: e.target.value })}
              inputMode="tel"
              type="tel"
            />
            <textarea
              style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
              placeholder="Descripción (opcional)"
              value={formData.descripcion}
              onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
            />

            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button
                onClick={() => setMostrarFormulario(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-glass)',
                  color: 'var(--color-text)',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  minHeight: '44px',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={guardar}
                disabled={!formData.nombre.trim()}
                style={{
                  ...btnPrimary,
                  flex: 1,
                  justifyContent: 'center',
                  opacity: !formData.nombre.trim() ? 0.5 : 1,
                }}
              >
                {clienteEditando ? 'Guardar cambios' : 'Crear cliente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CONFIRMAR ELIMINAR ── */}
      {confirmarEliminar && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: 999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
        }}>
          <div style={{
            background: 'var(--color-card-solid)',
            borderRadius: 'var(--radius-xl)',
            padding: '28px 24px',
            maxWidth: '340px',
            width: '100%',
            textAlign: 'center',
            animation: 'slideUp 0.25s ease',
          }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>⚠️</div>
            <h3 style={{
              fontSize: '16px',
              fontWeight: '700',
              color: 'var(--color-text)',
              marginBottom: '8px',
            }}>
              ¿Eliminar cliente?
            </h3>
            <p style={{
              fontSize: '13px',
              color: 'var(--color-text-muted)',
              marginBottom: '24px',
              lineHeight: '1.5',
            }}>
              Se eliminará <strong>{confirmarEliminar.nombre}</strong>.
              Sus préstamos no se eliminarán.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setConfirmarEliminar(null)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-glass)',
                  color: 'var(--color-text)',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  minHeight: '44px',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => eliminar(confirmarEliminar.id)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  background: 'var(--color-danger)',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  minHeight: '44px',
                }}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
});

export default Clientes;