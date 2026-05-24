import React, { useState, useEffect } from 'react';
import { api, formatCOP, formatFecha } from '../utils/api';
import { useToast } from './Toast';
import { useMoneda } from '../hooks/useMoneda';
import { CircleDollarSign, Calendar, FileText, ShieldCheck, HelpCircle, DollarSign } from 'lucide-react';

export default function Abonos({ selectedLoan, setSelectedLoan }) {
  const toast = useToast();
  const { formatear, limpiar } = useMoneda();
  const [prestamos, setPrestamos] = useState([]);
  const [selectedLoanId, setSelectedLoanId] = useState('');
  const [montoDisplay, setMontoDisplay] = useState('');
  const [tipo, setTipo] = useState('interes');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [nota, setNota] = useState('');

  const [loadingLoans, setLoadingLoans] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [error, setError] = useState('');

  const fetchLoans = async () => {
    try {
      setLoadingLoans(true);
      const data = await api.getPrestamos();
      const activos = data.filter(p => parseFloat(p.capital_pendiente) > 0);
      setPrestamos(activos);
      if (selectedLoan) setSelectedLoanId(selectedLoan.id.toString());
    } catch (err) {
      setError('Error al cargar la lista de préstamos activos.');
    } finally {
      setLoadingLoans(false);
    }
  };

  useEffect(() => { fetchLoans(); }, [selectedLoan]);

  const handleLoanChange = (e) => {
    const id = e.target.value;
    setSelectedLoanId(id);
    setError('');
    if (id) {
      const loan = prestamos.find(p => p.id.toString() === id);
      setSelectedLoan(loan || null);
    } else {
      setSelectedLoan(null);
    }
  };

  const handleRegisterAbono = async (e) => {
    e.preventDefault();
    if (!selectedLoanId || !montoDisplay || !tipo || !fecha) {
      setError('Por favor completa todos los campos requeridos.');
      return;
    }
    const valorMonto = limpiar(montoDisplay);
    if (valorMonto <= 0) {
      setError('El monto del abono debe ser mayor a cero.');
      return;
    }
    const activeLoan = prestamos.find(p => p.id.toString() === selectedLoanId);
    if (tipo === 'capital' && activeLoan && valorMonto > parseFloat(activeLoan.capital_pendiente)) {
      setError(`El abono a capital no puede superar el capital pendiente de ${formatCOP(activeLoan.capital_pendiente)}.`);
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await api.createAbono({ prestamo_id: parseInt(selectedLoanId), monto: valorMonto, tipo, fecha, nota });
      toast('Abono registrado con éxito', 'exito');
      setMontoDisplay('');
      setNota('');
      fetchLoans();
    } catch (err) {
      setError(err.message || 'Error al registrar el abono.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedLoanData = prestamos.find(p => p.id.toString() === selectedLoanId);

  const handlePagoTotalClick = () => {
    if (!selectedLoanData) return;
    const totalPagar = selectedLoanData.interes_pendiente + selectedLoanData.capital_pendiente;
    if (totalPagar <= 0) { setError('Este préstamo ya no tiene saldo pendiente.'); return; }
    setShowConfirmModal(true);
  };

  const confirmPagoTotal = async () => {
    setShowConfirmModal(false);
    setSubmitting(true);
    setError('');
    try {
      if (selectedLoanData.interes_pendiente > 0) {
        await api.createAbono({ prestamo_id: parseInt(selectedLoanId), monto: selectedLoanData.interes_pendiente, tipo: 'interes', fecha, nota: nota || 'Pago total - Liquidación de intereses' });
      }
      if (selectedLoanData.capital_pendiente > 0) {
        await api.createAbono({ prestamo_id: parseInt(selectedLoanId), monto: selectedLoanData.capital_pendiente, tipo: 'capital', fecha, nota: nota || 'Pago total - Liquidación de capital' });
      }
      toast(`Pago total de ${formatCOP(selectedLoanData.interes_pendiente + selectedLoanData.capital_pendiente)} registrado. Crédito liquidado.`, 'exito');
      setMontoDisplay('');
      setNota('');
      fetchLoans();
    } catch (err) {
      setError(err.message || 'Error al procesar el pago total.');
    } finally {
      setSubmitting(false);
    }
  };

  const montoNumerico = limpiar(montoDisplay);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="abonos-grid" style={{ display: 'grid', gridTemplateColumns: selectedLoanData ? '1.2fr 1fr' : '1fr', gap: '2rem' }}>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <CircleDollarSign size={20} className="text-green" />
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700' }}>Registrar Abono</h3>
          </div>
          {error && <div className="login-error" style={{ marginBottom: '1.25rem' }}>{error}</div>}
          <form onSubmit={handleRegisterAbono}>
            <div className="form-group">
              <label htmlFor="abono-loan">Seleccionar Préstamo *</label>
              {loadingLoans ? (
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Cargando préstamos activos...</p>
              ) : (
                <select id="abono-loan" className="form-control" value={selectedLoanId} onChange={handleLoanChange} disabled={submitting} required>
                  <option value="">-- Seleccionar Deudor --</option>
                  {prestamos.map(p => <option key={p.id} value={p.id}>{p.deudor} (Pendiente: {formatCOP(p.capital_pendiente)})</option>)}
                </select>
              )}
            </div>
            <div className="form-group">
              <label htmlFor="abono-monto">Monto del Abono *</label>
              <div style={{ position: 'relative' }}>
                <DollarSign size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input id="abono-monto" type="text" inputMode="decimal" className="form-control" placeholder="Monto en COP" value={montoDisplay} onChange={(e) => setMontoDisplay(formatear(e.target.value))} style={{ paddingLeft: '2.25rem', width: '100%' }} disabled={submitting || !selectedLoanId} required />
              </div>
            </div>
            <div className="form-group">
              <label>Tipo de Abono *</label>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: '500', color: 'var(--color-text)', minHeight: '44px' }}>
                  <input type="radio" name="tipo-abono" value="interes" checked={tipo === 'interes'} onChange={() => setTipo('interes')} disabled={submitting || !selectedLoanId} />
                  Abono a Interés
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: '500', color: 'var(--color-text)', minHeight: '44px' }}>
                  <input type="radio" name="tipo-abono" value="capital" checked={tipo === 'capital'} onChange={() => setTipo('capital')} disabled={submitting || !selectedLoanId} />
                  Abono a Capital
                </label>
              </div>
            </div>
            {selectedLoanData && montoNumerico > 0 && tipo === 'capital' && montoNumerico > parseFloat(selectedLoanData.capital_pendiente) && (
              <div style={{ padding: '0.5rem 0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', fontSize: '0.8rem', color: 'var(--danger)' }}>
                ⚠️ El abono a capital no puede exceder {formatCOP(selectedLoanData.capital_pendiente)}
              </div>
            )}
            <div className="form-group">
              <label htmlFor="abono-fecha">Fecha de Pago *</label>
              <div style={{ position: 'relative' }}>
                <Calendar size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input id="abono-fecha" type="date" className="form-control" value={fecha} onChange={(e) => setFecha(e.target.value)} style={{ paddingLeft: '2.25rem', width: '100%' }} disabled={submitting || !selectedLoanId} required />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="abono-nota">Nota u Observación (Opcional)</label>
              <div style={{ position: 'relative' }}>
                <FileText size={16} style={{ position: 'absolute', left: '0.75rem', top: '0.85rem', color: 'var(--text-muted)' }} />
                <textarea id="abono-nota" className="form-control" placeholder="ej: Recibo de pago de interés del primer mes" value={nota} onChange={(e) => setNota(e.target.value)} style={{ paddingLeft: '2.25rem', width: '100%', height: '80px', resize: 'vertical' }} disabled={submitting || !selectedLoanId} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 1, minWidth: 0, minHeight: '44px' }} disabled={submitting || !selectedLoanId}>
                {submitting ? 'Registrando...' : 'Registrar Abono'}
              </button>
              {selectedLoanData && (
                <button type="button" className="btn btn-secondary" style={{ flex: 1, minWidth: 0, borderColor: 'var(--accent)', color: 'var(--accent)', minHeight: '44px' }} disabled={submitting || !selectedLoanId} onClick={handlePagoTotalClick}>
                  Pago Total (Liquidar)
                </button>
              )}
            </div>
          </form>
        </div>

        {selectedLoanData && (
          <div className="card" style={{ height: 'fit-content' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <ShieldCheck size={20} className="text-green" />
              <h3 style={{ fontSize: '1.15rem', fontWeight: '700' }}>Estado del Crédito</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.925rem' }}>
              <div className="flex-row-between"><span style={{ color: 'var(--text-secondary)' }}>Deudor:</span><span style={{ fontWeight: '600' }}>{selectedLoanData.deudor}</span></div>
              <div className="flex-row-between"><span style={{ color: 'var(--text-secondary)' }}>Capital Original:</span><span style={{ fontWeight: '500' }}>{formatCOP(selectedLoanData.capital_original)}</span></div>
              <div className="flex-row-between" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}><span style={{ color: 'var(--text-secondary)' }}>Capital Pendiente:</span><span className="text-red" style={{ fontWeight: '600' }}>{formatCOP(selectedLoanData.capital_pendiente)}</span></div>
              <div className="flex-row-between"><span style={{ color: 'var(--text-secondary)' }}>Tasa mensual:</span><span style={{ fontWeight: '500' }}>{selectedLoanData.tasa_interes}% mensual</span></div>
              <div className="flex-row-between"><span style={{ color: 'var(--text-secondary)' }}>Interés mensual:</span><span style={{ fontWeight: '500' }}>{formatCOP(selectedLoanData.interes_mensual)}</span></div>
              <div className="flex-row-between"><span style={{ color: 'var(--text-secondary)' }}>Fecha de Inicio:</span><span>{formatFecha(selectedLoanData.fecha_inicio)}</span></div>
              <div className="flex-row-between"><span style={{ color: 'var(--text-secondary)' }}>Tiempo transcurrido:</span><span style={{ fontWeight: '500', fontSize: '12px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>{selectedLoanData.tiempo_label}</span></div>
              <div className="flex-row-between" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}><span style={{ color: 'var(--text-secondary)' }}>Interés Acumulado:</span><span style={{ fontWeight: '500' }}>{formatCOP(selectedLoanData.interes_acumulado)}</span></div>
              <div className="flex-row-between"><span style={{ color: 'var(--text-secondary)' }}>Abonado a Intereses:</span><span className="text-green" style={{ fontWeight: '500' }}>{formatCOP(selectedLoanData.total_abonado_interes)}</span></div>
              <div style={{ fontSize: '1.05rem', fontWeight: '700', padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '0.5rem' }}>
                <div className="flex-row-between">
                  <span style={{ color: 'var(--color-text)' }}>Interés Pendiente:</span>
                  <span className={selectedLoanData.interes_pendiente > 0 ? 'text-red' : 'text-green'}>{formatCOP(selectedLoanData.interes_pendiente)}</span>
                </div>
                {selectedLoanData.tiempo_label && (
                  <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: '2px 0 0', fontStyle: 'italic' }}>
                    {selectedLoanData.tiempo_label}
                  </p>
                )}
              </div>
            </div>
            <div style={{ marginTop: '1.25rem', padding: '0.75rem', background: 'var(--danger-bg)', borderRadius: '0.5rem', border: '1px solid var(--danger-border)', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
              <HelpCircle size={16} className="text-red" style={{ flexShrink: 0, marginTop: '2px' }} />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.3' }}>* Un abono a <strong>interés</strong> reduce el saldo pendiente de intereses acumulados, mientras que un abono a <strong>capital</strong> disminuye la deuda base y, en consecuencia, reduce los intereses devengados de los siguientes meses.</p>
            </div>
            {selectedLoanData.interes_pendiente > 0 && selectedLoanData.interes_mensual > 0 && (
              <div style={{ marginTop: '1rem', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.8rem', background: selectedLoanData.interes_pendiente >= selectedLoanData.interes_mensual * 3 ? 'var(--danger-bg)' : 'rgba(245,158,11,0.1)', border: `1px solid ${selectedLoanData.interes_pendiente >= selectedLoanData.interes_mensual * 3 ? 'var(--danger-border)' : 'rgba(245,158,11,0.2)'}`, color: selectedLoanData.interes_pendiente >= selectedLoanData.interes_mensual * 3 ? 'var(--danger)' : 'var(--warning)' }}>
                {selectedLoanData.interes_pendiente >= selectedLoanData.interes_mensual * 3
                  ? '⚠️ Este préstamo tiene más de 3 meses de intereses sin pagar'
                  : `🕐 ${selectedLoanData.tiempo_label} — sin abonar`}
              </div>
            )}
          </div>
        )}
      </div>

      {showConfirmModal && selectedLoanData && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button className="modal-close" onClick={() => setShowConfirmModal(false)}>×</button>
            <h2 className="modal-title">Confirmar Liquidación</h2>
            <div style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: '1.6' }}>
              <p>¿Estás seguro de liquidar este crédito? Se registrarán automáticamente los siguientes pagos con fecha <strong>{formatFecha(fecha)}</strong>:</p>
              <ul style={{ margin: '1rem 0 1rem 1.5rem', color: 'var(--text-primary)' }}>
                <li>Interés pendiente: <strong className={selectedLoanData.interes_pendiente > 0 ? "text-red" : "text-green"}>{formatCOP(selectedLoanData.interes_pendiente)}</strong></li>
                <li>Capital pendiente: <strong className={selectedLoanData.capital_pendiente > 0 ? "text-red" : "text-green"}>{formatCOP(selectedLoanData.capital_pendiente)}</strong></li>
              </ul>
              <div style={{ padding: '1rem', background: 'var(--bg-main)', borderRadius: '0.5rem', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Total a pagar:</span>
                <span className="text-green" style={{ fontSize: '1.25rem', fontWeight: '800' }}>{formatCOP(selectedLoanData.interes_pendiente + selectedLoanData.capital_pendiente)}</span>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowConfirmModal(false)} style={{ minHeight: '44px' }}>Cancelar</button>
              <button className="btn btn-primary" onClick={confirmPagoTotal} style={{ minHeight: '44px' }}>Confirmar Pago</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
