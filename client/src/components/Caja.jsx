import React, { useState, useEffect } from 'react';
import { api, formatCOP, formatFecha } from '../utils/api';
import { useToast } from './Toast';
import { ModalConfirm } from './ModalConfirm';
import { EstadoVacio } from './EstadoVacio';
import { useMoneda } from '../hooks/useMoneda';
import { Wallet, PlusCircle, MinusCircle, Calendar, FileText, RefreshCw, Pencil, X, Trash2, DollarSign } from 'lucide-react';

export default function Caja() {
  const toast = useToast();
  const { formatear, limpiar } = useMoneda();
  const [saldo, setSaldo] = useState(0);
  const [transacciones, setTransacciones] = useState([]);
  const [montoDisplay, setMontoDisplay] = useState('');
  const [tipo, setTipo] = useState('ingreso');
  const [concepto, setConcepto] = useState('aporte_capital');
  const [descripcion, setDescripcion] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState('todos');
  const [confirm, setConfirm] = useState(null);
  const [transaccionEditando, setTransaccionEditando] = useState(null);
  const [editMonto, setEditMonto] = useState('');
  const [editTipo, setEditTipo] = useState('ingreso');
  const [editDescripcion, setEditDescripcion] = useState('');
  const [editFecha, setEditFecha] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  const montoNumerico = limpiar(montoDisplay);

  const fetchCajaData = async () => {
    try {
      setLoading(true);
      const [saldoRes, transRes] = await Promise.all([api.getCajaSaldo(), api.getCajaTransacciones()]);
      setSaldo(saldoRes.saldo);
      setTransacciones(transRes);
    } catch (err) {
      setError('Error al cargar los datos de caja.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCajaData(); }, []);

  const handleTipoChange = (newTipo) => {
    setTipo(newTipo);
    setConcepto(newTipo === 'ingreso' ? 'aporte_capital' : 'pago_nomina');
    setError('');
  };

  const handleRegisterTransaccion = async (e) => {
    e.preventDefault();
    if (!montoDisplay || !descripcion || !fecha) {
      setError('Por favor completa todos los campos requeridos.');
      return;
    }
    if (montoNumerico <= 0) {
      setError('El monto debe ser mayor a cero.');
      return;
    }
    if (tipo === 'egreso' && montoNumerico > saldo) {
      setError(`Saldo insuficiente en caja (disponible: ${formatCOP(saldo)}).`);
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const concDescr = concepto === 'aporte_capital' ? 'Aporte Capital' : (concepto === 'pago_nomina' ? 'Pago Nómina' : 'Otro Pago');
      await api.createCajaTransaccion({ monto: montoNumerico, tipo, descripcion: `[${concDescr}] ${descripcion}`, fecha });
      toast('Transacción registrada con éxito', 'exito');
      setMontoDisplay('');
      setDescripcion('');
      fetchCajaData();
    } catch (err) {
      setError(err.message || 'Error al registrar la transacción.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (t) => {
    setTransaccionEditando(t);
    setEditMonto(Math.abs(parseFloat(t.monto)).toString());
    setEditTipo(t.tipo);
    setEditDescripcion(t.descripcion);
    setEditFecha(t.fecha.split('T')[0]);
    setError('');
  };

  const handleDeleteTransaccion = (id) => {
    setConfirm({
      mensaje: '¿Estás seguro de eliminar esta transacción? Esta acción no se puede deshacer.',
      onConfirmar: async () => {
        setConfirm(null);
        try { await api.deleteCajaTransaccion(id); toast('Transacción eliminada correctamente', 'exito'); fetchCajaData(); } catch (err) { toast(err.message || 'Error al eliminar la transacción', 'error'); }
      },
      onCancelar: () => setConfirm(null)
    });
  };

  const handleCloseEdit = () => { setTransaccionEditando(null); setEditMonto(''); setEditTipo('ingreso'); setEditDescripcion(''); setEditFecha(''); setError(''); };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    const valorMonto = parseFloat(editMonto);
    if (valorMonto <= 0) { setError('El monto debe ser mayor a cero.'); return; }
    if (!editDescripcion || !editFecha) { setError('Todos los campos son requeridos.'); return; }
    setEditSubmitting(true); setError('');
    try {
      await api.updateCajaTransaccion(transaccionEditando.id, { monto: valorMonto, tipo: editTipo, descripcion: editDescripcion, fecha: editFecha });
      handleCloseEdit();
      toast('Transacción actualizada correctamente', 'exito');
      fetchCajaData();
    } catch (err) { setError(err.message || 'Error al editar la transacción.'); }
    finally { setEditSubmitting(false); }
  };

  const getTipoLabel = (t) => {
    if (t === 'abono_interes') return 'Abono Interés';
    if (t === 'abono_capital') return 'Abono Capital';
    if (t === 'prestamo') return 'Préstamo';
    if (t === 'ingreso') return 'Ingreso';
    if (t === 'egreso') return 'Egreso';
    return t;
  };

  const filteredTransacciones = transacciones.filter(t => {
    if (filtro === 'todos') return true;
    if (filtro === 'ingreso') return t.tipo === 'ingreso' || t.tipo.startsWith('abono');
    if (filtro === 'egreso') return t.tipo === 'egreso' || t.tipo === 'prestamo';
    return t.tipo.includes(filtro);
  });

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div className="card" style={{
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.05) 100%)',
        border: '1px solid var(--border-color-glow)', marginBottom: '2rem',
        padding: '1.5rem 2rem', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem'
      }}>
        <div>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dinero Disponible en Caja</span>
          <h2 style={{ fontSize: '2.5rem', fontWeight: '800', marginTop: '0.25rem', color: 'white', textShadow: '0 0 20px rgba(16, 185, 129, 0.2)' }}>{formatCOP(saldo)}</h2>
        </div>
        <button className="btn btn-secondary btn-small" onClick={fetchCajaData} disabled={loading} style={{ height: '44px', width: '44px', padding: 0, justifyContent: 'center' }} aria-label="Actualizar datos de caja">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="abonos-grid" style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.5fr', gap: '2rem' }}>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <Wallet size={20} className="text-green" />
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700' }}>Registrar Movimiento</h3>
          </div>
          {error && <div className="login-error" style={{ marginBottom: '1.25rem' }}>{error}</div>}
          <form onSubmit={handleRegisterTransaccion}>
            <div className="form-group">
              <label>Tipo de Operación *</label>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" className={`btn ${tipo === 'ingreso' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => handleTipoChange('ingreso')} style={{ flex: 1, minHeight: '44px' }} disabled={submitting} aria-label="Registrar ingreso">
                  <PlusCircle size={16} /> Ingreso / Aporte
                </button>
                <button type="button" className={`btn ${tipo === 'egreso' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => handleTipoChange('egreso')} style={{ flex: 1, minHeight: '44px', borderColor: tipo === 'egreso' ? 'var(--danger)' : '' }} disabled={submitting} aria-label="Registrar egreso">
                  <MinusCircle size={16} /> Egreso / Pago
                </button>
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="caja-concepto">Concepto *</label>
              <select id="caja-concepto" className="form-control" value={concepto} onChange={(e) => setConcepto(e.target.value)} disabled={submitting} required>
                {tipo === 'ingreso' ? (
                  <option value="aporte_capital">Aporte para hacer crecer capital (Inyección)</option>
                ) : (
                  <><option value="pago_nomina">Pago Nómina</option><option value="otro_pago">Otro Pago / Gasto Operativo</option></>
                )}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="caja-monto">Monto *</label>
              <div style={{ position: 'relative' }}>
                <DollarSign size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input id="caja-monto" type="text" inputMode="decimal" className="form-control" placeholder="Monto en COP" value={montoDisplay} onChange={(e) => setMontoDisplay(formatear(e.target.value))} style={{ paddingLeft: '2.25rem', width: '100%' }} disabled={submitting} required />
              </div>
              {tipo === 'egreso' && montoNumerico > 0 && (
                <div style={{ marginTop: '0.35rem', fontSize: '0.75rem', padding: '0.35rem 0.65rem', borderRadius: '0.5rem', background: montoNumerico <= saldo ? 'var(--success-bg)' : 'var(--danger-bg)', border: `1px solid ${montoNumerico <= saldo ? 'var(--success-border)' : 'var(--danger-border)'}`, color: montoNumerico <= saldo ? 'var(--success)' : 'var(--danger)' }}>
                  {montoNumerico <= saldo ? `✅ Saldo después del egreso: ${formatCOP(saldo - montoNumerico)}` : `❌ Saldo insuficiente: necesitas ${formatCOP(montoNumerico - saldo)} más`}
                </div>
              )}
            </div>
            <div className="form-group">
              <label htmlFor="caja-fecha">Fecha *</label>
              <div style={{ position: 'relative' }}>
                <Calendar size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input id="caja-fecha" type="date" className="form-control" value={fecha} onChange={(e) => setFecha(e.target.value)} style={{ paddingLeft: '2.25rem', width: '100%' }} disabled={submitting} required />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="caja-descr">Detalle o Descripción *</label>
              <div style={{ position: 'relative' }}>
                <FileText size={16} style={{ position: 'absolute', left: '0.75rem', top: '0.85rem', color: 'var(--text-muted)' }} />
                <textarea id="caja-descr" className="form-control" placeholder="ej: Pago de nómina de secretaria quincena mayo" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} style={{ paddingLeft: '2.25rem', width: '100%', height: '80px', resize: 'none' }} disabled={submitting} required />
              </div>
            </div>
            <button type="submit" className="btn btn-primary w-full" style={{ marginTop: '0.75rem', background: tipo === 'egreso' ? 'var(--danger)' : '', minHeight: '44px' }} disabled={submitting}>
              {submitting ? 'Registrando...' : 'Registrar Movimiento'}
            </button>
          </form>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '700' }}>Historial de Movimientos</h3>
            <select className="form-control" style={{ width: 'auto', padding: '0.25rem 0.5rem', fontSize: '0.8rem', height: '32px' }} value={filtro} onChange={(e) => setFiltro(e.target.value)} aria-label="Filtrar movimientos">
              <option value="todos">Todos</option>
              <option value="ingreso">Ingresos (Aportes/Abonos)</option>
              <option value="egreso">Egresos (Nóminas/Préstamos)</option>
              <option value="prestamo">Sólo Préstamos</option>
              <option value="abono">Sólo Abonos</option>
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', maxHeight: '420px', paddingRight: '0.25rem' }}>
            {loading ? (
              <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem', padding: '2rem' }}>Cargando movimientos...</p>
            ) : transacciones.length === 0 ? (
              <EstadoVacio icono="💰" titulo="No hay movimientos registrados" descripcion="Registra tu primer ingreso o egreso para empezar a controlar tu caja." />
            ) : filteredTransacciones.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', padding: '2rem' }}>Sin movimientos para el filtro seleccionado.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {filteredTransacciones.map((t) => {
                  return (
                    <div style={{
                      background: 'var(--color-card)',
                      backdropFilter: 'blur(12px)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '14px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      boxShadow: 'var(--color-shadow)',
                      marginBottom: '10px',
                      transition: 'box-shadow 0.2s ease',
                    }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        minWidth: '40px',
                        borderRadius: '50%',
                        background: t.tipo === 'ingreso'
                          ? 'rgba(34,197,94,0.15)'
                          : t.tipo === 'egreso'
                          ? 'rgba(239,68,68,0.15)'
                          : 'var(--color-accent-soft)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                      }}>
                        {t.tipo === 'ingreso' ? '↑'
                         : t.tipo === 'egreso' ? '↓'
                         : '⇄'}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: 'var(--color-text)',
                          margin: 0,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>
                          {t.descripcion}
                        </p>

                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginTop: '3px',
                          flexWrap: 'wrap',
                        }}>
                          <span style={{
                            fontSize: '12px',
                            color: 'var(--color-text-muted)',
                          }}>
                            {formatFecha(t.fecha)}
                          </span>

                          <span style={{
                            fontSize: '10px',
                            fontWeight: '600',
                            padding: '2px 8px',
                            borderRadius: '99px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            background: t.tipo === 'ingreso'
                              ? 'rgba(34,197,94,0.15)'
                              : t.tipo === 'egreso'
                              ? 'rgba(239,68,68,0.15)'
                              : 'var(--color-accent-soft)',
                            color: t.tipo === 'ingreso'
                              ? 'var(--color-success)'
                              : t.tipo === 'egreso'
                              ? 'var(--color-danger)'
                              : 'var(--color-accent)',
                          }}>
                            {getTipoLabel(t.tipo)}
                          </span>
                        </div>

                        <p style={{
                          fontSize: '15px',
                          fontWeight: '700',
                          margin: '4px 0 0',
                          color: t.monto >= 0
                            ? 'var(--color-success)'
                            : 'var(--color-danger)',
                        }}>
                          {t.monto >= 0 ? '+' : ''}
                          {formatCOP(Math.abs(t.monto))}
                        </p>
                      </div>

                      {(t.tipo === 'ingreso' || t.tipo === 'egreso') && (
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          flexShrink: 0,
                        }}>
                          <button
                            onClick={() => handleOpenEdit(t)}
                            style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '8px',
                              border: '1px solid var(--color-border)',
                              background: 'var(--color-glass)',
                              color: 'var(--color-text-soft)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '14px',
                              transition: 'all 0.15s ease',
                            }}
                            title="Editar"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteTransaccion(t.id)}
                            style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '8px',
                              border: '1px solid rgba(239,68,68,0.3)',
                              background: 'rgba(239,68,68,0.08)',
                              color: 'var(--color-danger)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '14px',
                              transition: 'all 0.15s ease',
                            }}
                            title="Eliminar"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {transaccionEditando && (
        <div className="modal-overlay" onClick={handleCloseEdit}>
          <div className="modal-content" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={handleCloseEdit} aria-label="Cerrar">×</button>
            <h3 className="modal-title">Editar Transacción</h3>
            <form onSubmit={handleSaveEdit}>
              <div className="form-group">
                <label>Tipo de Operación *</label>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button type="button" className={`btn ${editTipo === 'ingreso' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setEditTipo('ingreso')} style={{ flex: 1, minHeight: '44px' }} disabled={editSubmitting}><PlusCircle size={16} /> Ingreso</button>
                  <button type="button" className={`btn ${editTipo === 'egreso' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setEditTipo('egreso')} style={{ flex: 1, minHeight: '44px', borderColor: editTipo === 'egreso' ? 'var(--danger)' : '' }} disabled={editSubmitting}><MinusCircle size={16} /> Egreso</button>
                </div>
              </div>
              <div className="form-group"><label htmlFor="edit-monto">Monto *</label><input id="edit-monto" type="number" min="1" step="any" className="form-control" placeholder="Monto en COP" value={editMonto} onChange={(e) => setEditMonto(e.target.value)} disabled={editSubmitting} required /></div>
              <div className="form-group">
                <label htmlFor="edit-fecha">Fecha *</label>
                <div style={{ position: 'relative' }}>
                  <Calendar size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input id="edit-fecha" type="date" className="form-control" value={editFecha} onChange={(e) => setEditFecha(e.target.value)} style={{ paddingLeft: '2.25rem', width: '100%' }} disabled={editSubmitting} required />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="edit-descr">Detalle o Descripción *</label>
                <div style={{ position: 'relative' }}>
                  <FileText size={16} style={{ position: 'absolute', left: '0.75rem', top: '0.85rem', color: 'var(--text-muted)' }} />
                  <textarea id="edit-descr" className="form-control" placeholder="Descripción de la transacción" value={editDescripcion} onChange={(e) => setEditDescripcion(e.target.value)} style={{ paddingLeft: '2.25rem', width: '100%', height: '80px', resize: 'none' }} disabled={editSubmitting} required />
                </div>
              </div>
              {error && <div className="login-error" style={{ marginBottom: '1rem' }}>{error}</div>}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1, minHeight: '44px' }} onClick={handleCloseEdit} disabled={editSubmitting}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, minHeight: '44px', background: editTipo === 'egreso' ? 'var(--danger)' : '' }} disabled={editSubmitting}>{editSubmitting ? 'Guardando...' : 'Guardar Cambios'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirm && <ModalConfirm mensaje={confirm.mensaje} onConfirmar={confirm.onConfirmar} onCancelar={confirm.onCancelar} />}
    </div>
  );
}
