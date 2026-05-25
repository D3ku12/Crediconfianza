import React, { useState, useEffect } from 'react';
import { api, formatCOP, formatFecha } from '../utils/api';
import { useToast } from './Toast';
import { ModalConfirm } from './ModalConfirm';
import { EstadoVacio } from './EstadoVacio';
import { useMoneda } from '../hooks/useMoneda';
import { Wallet, PlusCircle, MinusCircle, Calendar, FileText, RefreshCw, Pencil, Trash2, DollarSign } from 'lucide-react';
import { useRefresh } from '../contexts/RealtimeContext';

export default function Caja() {
  const toast = useToast();
  const { formatear, limpiar } = useMoneda();
  const refreshKey = useRefresh();
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
      setSaldo(saldoRes.saldo); setTransacciones(transRes);
    } catch (err) { setError('Error al cargar los datos de caja.'); }
    finally { setLoading(false); }
  };

  const refreshCajaData = async () => {
    try {
      const [saldoRes, transRes] = await Promise.all([api.getCajaSaldo(), api.getCajaTransacciones()]);
      setSaldo(saldoRes.saldo); setTransacciones(transRes);
    } catch (err) { /* silent */ }
  };

  useEffect(() => { fetchCajaData(); }, []);

  useEffect(() => { if (refreshKey > 0) refreshCajaData(); }, [refreshKey]);

  const handleTipoChange = (newTipo) => { setTipo(newTipo); setConcepto(newTipo === 'ingreso' ? 'aporte_capital' : 'pago_nomina'); setError(''); };

  const handleRegisterTransaccion = async (e) => {
    e.preventDefault();
    if (!montoDisplay || !descripcion || !fecha) { setError('Por favor completa todos los campos requeridos.'); return; }
    if (montoNumerico <= 0) { setError('El monto debe ser mayor a cero.'); return; }
    if (tipo === 'egreso' && montoNumerico > saldo) { setError(`Saldo insuficiente en caja (disponible: ${formatCOP(saldo)}).`); return; }
    setSubmitting(true); setError('');
    try {
      const concDescr = concepto === 'aporte_capital' ? 'Aporte Capital' : (concepto === 'pago_nomina' ? 'Pago Nómina' : 'Otro Pago');
      await api.createCajaTransaccion({ monto: montoNumerico, tipo, descripcion: `[${concDescr}] ${descripcion}`, fecha });
      toast('Transacción registrada con éxito', 'exito');
      setMontoDisplay(''); setDescripcion(''); fetchCajaData();
    } catch (err) { setError(err.message || 'Error al registrar la transacción.'); }
    finally { setSubmitting(false); }
  };

  const handleOpenEdit = (t) => { setTransaccionEditando(t); setEditMonto(Math.abs(parseFloat(t.monto)).toString()); setEditTipo(t.tipo); setEditDescripcion(t.descripcion); setEditFecha(t.fecha.split('T')[0]); setError(''); };

  const handleDeleteTransaccion = (id) => {
    setConfirm({
      mensaje: '¿Estás seguro de eliminar esta transacción? Esta acción no se puede deshacer.',
      onConfirmar: async () => { setConfirm(null); try { await api.deleteCajaTransaccion(id); toast('Transacción eliminada correctamente', 'exito'); fetchCajaData(); } catch (err) { toast(err.message || 'Error al eliminar la transacción', 'error'); } },
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
      handleCloseEdit(); toast('Transacción actualizada correctamente', 'exito'); fetchCajaData();
    } catch (err) { setError(err.message || 'Error al editar la transacción.'); }
    finally { setEditSubmitting(false); }
  };

  const getTipoLabel = (t) => {
    if (t === 'abono_interes') return 'Abono Interés'; if (t === 'abono_capital') return 'Abono Capital';
    if (t === 'prestamo') return 'Préstamo'; if (t === 'ingreso') return 'Ingreso'; if (t === 'egreso') return 'Egreso';
    return t;
  };

  const filteredTransacciones = transacciones.filter(t => {
    if (filtro === 'todos') return true;
    if (filtro === 'ingreso') return t.tipo === 'ingreso' || t.tipo.startsWith('abono');
    if (filtro === 'egreso') return t.tipo === 'egreso' || t.tipo === 'prestamo';
    return t.tipo.includes(filtro);
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="rounded-2xl border p-5 flex items-center justify-between flex-wrap gap-4" style={{
        background: 'linear-gradient(135deg, rgba(0,200,150,0.12), rgba(0,200,150,0.04))',
        borderColor: 'rgba(0,200,150,0.2)',
      }}>
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Dinero Disponible en Caja</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold mt-1 font-mono" style={{ color: 'var(--color-text)' }}>{formatCOP(saldo)}</h2>
        </div>
        <button onClick={fetchCajaData} disabled={loading} className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border text-sm transition-all" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }} aria-label="Actualizar">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1.5fr] gap-6">
        <div className="bg-white rounded-2xl border p-5 shadow-sm" style={{ borderColor: 'var(--color-border)', background: 'var(--color-card)' }}>
          <div className="flex items-center gap-2 mb-4">
            <Wallet size={20} style={{ color: 'var(--color-success)' }} />
            <h3 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>Registrar Movimiento</h3>
          </div>
          {error && <div className="mb-4 px-4 py-3 rounded-xl text-sm font-medium text-center" style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)', border: '1px solid var(--danger-border)' }}>{error}</div>}
          <form onSubmit={handleRegisterTransaccion} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-soft)' }}>Tipo de Operación *</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => handleTipoChange('ingreso')} disabled={submitting}
                  className="flex-1 min-h-[44px] rounded-xl text-sm font-medium transition-all border"
                  style={{ background: tipo === 'ingreso' ? 'linear-gradient(135deg, #6C63FF, #5A52E0)' : 'var(--color-card)', color: tipo === 'ingreso' ? '#fff' : 'var(--color-text)', borderColor: tipo === 'ingreso' ? 'transparent' : 'var(--color-border)' }}>
                  <PlusCircle size={16} className="inline mr-1" /> Ingreso
                </button>
                <button type="button" onClick={() => handleTipoChange('egreso')} disabled={submitting}
                  className="flex-1 min-h-[44px] rounded-xl text-sm font-medium transition-all border"
                  style={{ background: tipo === 'egreso' ? 'var(--color-danger)' : 'var(--color-card)', color: tipo === 'egreso' ? '#fff' : 'var(--color-text)', borderColor: tipo === 'egreso' ? 'transparent' : 'var(--color-border)' }}>
                  <MinusCircle size={16} className="inline mr-1" /> Egreso
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="caja-concepto" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-soft)' }}>Concepto *</label>
              <select id="caja-concepto" value={concepto} onChange={(e) => setConcepto(e.target.value)} disabled={submitting} required
                className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all"
                style={{ borderColor: 'var(--color-border)', background: 'var(--bg-input)', color: 'var(--color-text)' }}>
                {tipo === 'ingreso' ? (
                  <option value="aporte_capital">Aporte para hacer crecer capital</option>
                ) : (
                  <><option value="pago_nomina">Pago Nómina</option><option value="otro_pago">Otro Pago / Gasto Operativo</option></>
                )}
              </select>
            </div>
            <div>
              <label htmlFor="caja-monto" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-soft)' }}>Monto *</label>
              <div className="relative">
                <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
                <input id="caja-monto" type="text" inputMode="decimal" placeholder="Monto en COP" value={montoDisplay} onChange={(e) => setMontoDisplay(formatear(e.target.value))} disabled={submitting} required
                  className="w-full rounded-xl border px-4 py-2.5 pl-9 text-sm outline-none transition-all"
                  style={{ borderColor: 'var(--color-border)', background: 'var(--bg-input)', color: 'var(--color-text)' }} />
              </div>
              {tipo === 'egreso' && montoNumerico > 0 && (
                <div className="mt-1.5 px-3 py-1.5 rounded-xl text-xs font-medium" style={{
                  background: montoNumerico <= saldo ? 'var(--success-bg)' : 'var(--danger-bg)',
                  border: `1px solid ${montoNumerico <= saldo ? 'var(--success-border)' : 'var(--danger-border)'}`,
                  color: montoNumerico <= saldo ? 'var(--success-text)' : 'var(--danger-text)',
                }}>
                  {montoNumerico <= saldo ? `✅ Después: ${formatCOP(saldo - montoNumerico)}` : `❌ Faltan ${formatCOP(montoNumerico - saldo)}`}
                </div>
              )}
            </div>
            <div>
              <label htmlFor="caja-fecha" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-soft)' }}>Fecha *</label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
                <input id="caja-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} disabled={submitting} required
                  className="w-full rounded-xl border px-4 py-2.5 pl-9 text-sm outline-none transition-all"
                  style={{ borderColor: 'var(--color-border)', background: 'var(--bg-input)', color: 'var(--color-text)' }} />
              </div>
            </div>
            <div>
              <label htmlFor="caja-descr" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-soft)' }}>Detalle *</label>
              <div className="relative">
                <FileText size={16} className="absolute left-3 top-3" style={{ color: 'var(--color-text-muted)' }} />
                <textarea id="caja-descr" placeholder="ej: Pago de nómina de secretaria" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} disabled={submitting} required
                  className="w-full rounded-xl border px-4 py-2.5 pl-9 text-sm outline-none transition-all resize-none"
                  style={{ borderColor: 'var(--color-border)', background: 'var(--bg-input)', color: 'var(--color-text)', height: '80px' }} />
              </div>
            </div>
            <button type="submit" disabled={submitting}
              className="w-full min-h-[44px] rounded-xl text-sm font-semibold text-white transition-all shadow-sm"
              style={{ background: tipo === 'egreso' ? 'var(--color-danger)' : 'linear-gradient(135deg, #6C63FF, #5A52E0)' }}>
              {submitting ? 'Registrando...' : 'Registrar Movimiento'}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-2xl border p-5 shadow-sm flex flex-col" style={{ borderColor: 'var(--color-border)', background: 'var(--color-card)' }}>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="text-base font-bold" style={{ color: 'var(--color-text)' }}>Historial</h3>
            <select value={filtro} onChange={(e) => setFiltro(e.target.value)}
              className="rounded-xl border px-3 py-1.5 text-xs outline-none"
              style={{ borderColor: 'var(--color-border)', background: 'var(--bg-input)', color: 'var(--color-text)' }} aria-label="Filtrar">
              <option value="todos">Todos</option>
              <option value="ingreso">Ingresos</option>
              <option value="egreso">Egresos</option>
              <option value="prestamo">Préstamos</option>
              <option value="abono">Abonos</option>
            </select>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2" style={{ maxHeight: '420px' }}>
            {loading ? (
              <p className="text-center text-sm py-8" style={{ color: 'var(--color-text-secondary)' }}>Cargando movimientos...</p>
            ) : transacciones.length === 0 ? (
              <EstadoVacio icono="💰" titulo="Sin movimientos" descripcion="Registra tu primer ingreso o egreso." />
            ) : filteredTransacciones.length === 0 ? (
              <p className="text-center text-sm py-8" style={{ color: 'var(--color-text-muted)' }}>Sin movimientos para este filtro.</p>
            ) : (
              filteredTransacciones.map((t) => (
                <div key={t.id} className="flex items-center gap-3 p-3.5 rounded-xl border transition-all hover:shadow-sm" style={{ borderColor: 'var(--color-border)', background: 'var(--color-card)' }}>
                  <div className="w-10 h-10 min-w-[40px] rounded-full flex items-center justify-center text-base" style={{
                    background: t.tipo === 'ingreso' ? 'rgba(0,200,150,0.12)' : t.tipo === 'egreso' ? 'rgba(255,71,87,0.12)' : 'var(--color-accent-soft)',
                  }}>
                    {t.tipo === 'ingreso' ? '↑' : t.tipo === 'egreso' ? '↓' : '⇄'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text)' }}>{t.descripcion}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{formatFecha(t.fecha)}</span>
                      <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full" style={{
                        background: t.tipo === 'ingreso' ? 'rgba(0,200,150,0.12)' : t.tipo === 'egreso' ? 'rgba(255,71,87,0.12)' : 'var(--color-accent-soft)',
                        color: t.tipo === 'ingreso' ? 'var(--color-success)' : t.tipo === 'egreso' ? 'var(--color-danger)' : 'var(--color-accent)',
                      }}>
                        {getTipoLabel(t.tipo)}
                      </span>
                    </div>
                    <p className="text-base font-bold mt-1 font-mono" style={{ color: t.monto >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                      {t.monto >= 0 ? '+' : ''}{formatCOP(Math.abs(t.monto))}
                    </p>
                  </div>
                  {(t.tipo === 'ingreso' || t.tipo === 'egreso') && (
                    <div className="flex flex-col gap-1.5 flex-shrink-0">
                      <button onClick={() => handleOpenEdit(t)} className="w-9 h-9 flex items-center justify-center rounded-lg border transition-all" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }} title="Editar"><Pencil size={13} /></button>
                      <button onClick={() => handleDeleteTransaccion(t.id)} className="w-9 h-9 flex items-center justify-center rounded-lg border transition-all" style={{ borderColor: 'rgba(255,71,87,0.2)', color: 'var(--color-danger)' }} title="Eliminar"><Trash2 size={13} /></button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {transaccionEditando && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 animate-fade-in" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }} onClick={handleCloseEdit}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 animate-modal-enter" style={{ background: 'var(--color-card)' }} onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold mb-4" style={{ color: 'var(--color-text)' }}>Editar Transacción</h3>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-soft)' }}>Tipo *</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setEditTipo('ingreso')} disabled={editSubmitting}
                    className="flex-1 min-h-[44px] rounded-xl text-sm font-medium transition-all border"
                    style={{ background: editTipo === 'ingreso' ? 'linear-gradient(135deg, #6C63FF, #5A52E0)' : 'var(--color-card)', color: editTipo === 'ingreso' ? '#fff' : 'var(--color-text)', borderColor: editTipo === 'ingreso' ? 'transparent' : 'var(--color-border)' }}>
                    Ingreso
                  </button>
                  <button type="button" onClick={() => setEditTipo('egreso')} disabled={editSubmitting}
                    className="flex-1 min-h-[44px] rounded-xl text-sm font-medium transition-all border"
                    style={{ background: editTipo === 'egreso' ? 'var(--color-danger)' : 'var(--color-card)', color: editTipo === 'egreso' ? '#fff' : 'var(--color-text)', borderColor: editTipo === 'egreso' ? 'transparent' : 'var(--color-border)' }}>
                    Egreso
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="edit-monto" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-soft)' }}>Monto *</label>
                <input id="edit-monto" type="number" min="1" step="any" placeholder="Monto en COP" value={editMonto} onChange={(e) => setEditMonto(e.target.value)} disabled={editSubmitting} required
                  className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all"
                  style={{ borderColor: 'var(--color-border)', background: 'var(--bg-input)', color: 'var(--color-text)' }} />
              </div>
              <div>
                <label htmlFor="edit-fecha" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-soft)' }}>Fecha *</label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
                  <input id="edit-fecha" type="date" value={editFecha} onChange={(e) => setEditFecha(e.target.value)} disabled={editSubmitting} required
                    className="w-full rounded-xl border px-4 py-2.5 pl-9 text-sm outline-none transition-all"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--bg-input)', color: 'var(--color-text)' }} />
                </div>
              </div>
              <div>
                <label htmlFor="edit-descr" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-soft)' }}>Detalle *</label>
                <div className="relative">
                  <FileText size={16} className="absolute left-3 top-3" style={{ color: 'var(--color-text-muted)' }} />
                  <textarea id="edit-descr" placeholder="Descripción" value={editDescripcion} onChange={(e) => setEditDescripcion(e.target.value)} disabled={editSubmitting} required
                    className="w-full rounded-xl border px-4 py-2.5 pl-9 text-sm outline-none transition-all resize-none"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--bg-input)', color: 'var(--color-text)', height: '80px' }} />
                </div>
              </div>
              {error && <div className="px-4 py-3 rounded-xl text-sm font-medium text-center" style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)', border: '1px solid var(--danger-border)' }}>{error}</div>}
              <div className="flex gap-3">
                <button type="button" onClick={handleCloseEdit} disabled={editSubmitting} className="flex-1 min-h-[44px] rounded-xl border text-sm font-medium transition-all" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)', background: 'var(--color-card)' }}>Cancelar</button>
                <button type="submit" disabled={editSubmitting} className="flex-1 min-h-[44px] rounded-xl text-sm font-semibold text-white transition-all shadow-sm" style={{ background: editTipo === 'egreso' ? 'var(--color-danger)' : 'linear-gradient(135deg, #6C63FF, #5A52E0)' }}>{editSubmitting ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirm && <ModalConfirm mensaje={confirm.mensaje} onConfirmar={confirm.onConfirmar} onCancelar={confirm.onCancelar} />}
    </div>
  );
}
