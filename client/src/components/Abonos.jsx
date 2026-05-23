import React, { useState, useEffect } from 'react';
import { api, formatCOP, formatFecha } from '../utils/api';
import { CircleDollarSign, Calendar, FileText, BadgePercent, ShieldCheck, HelpCircle } from 'lucide-react';

export default function Abonos({ selectedLoan, setSelectedLoan }) {
  const [prestamos, setPrestamos] = useState([]);
  const [selectedLoanId, setSelectedLoanId] = useState('');
  const [monto, setMonto] = useState('');
  const [tipo, setTipo] = useState('interes');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [nota, setNota] = useState('');
  
  const [loadingLoans, setLoadingLoans] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchLoans = async () => {
    try {
      setLoadingLoans(true);
      const data = await api.getPrestamos();
      // Solo mostrar préstamos activos (con capital pendiente > 0)
      const activos = data.filter(p => parseFloat(p.capital_pendiente) > 0);
      setPrestamos(activos);
      
      // Si nos pasaron un préstamo seleccionado desde fuera (ej: desde préstamos)
      if (selectedLoan) {
        setSelectedLoanId(selectedLoan.id.toString());
      }
    } catch (err) {
      console.error(err);
      setError('Error al cargar la lista de préstamos activos.');
    } finally {
      setLoadingLoans(false);
    }
  };

  useEffect(() => {
    fetchLoans();
  }, [selectedLoan]);

  const handleLoanChange = (e) => {
    const id = e.target.value;
    setSelectedLoanId(id);
    setSuccess('');
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
    if (!selectedLoanId || !monto || !tipo || !fecha) {
      setError('Por favor completa todos los campos requeridos.');
      return;
    }

    const valorMonto = parseFloat(monto);
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
    setSuccess('');

    try {
      await api.createAbono({
        prestamo_id: parseInt(selectedLoanId),
        monto: valorMonto,
        tipo,
        fecha,
        nota
      });
      
      setSuccess('Abono registrado con éxito en el sistema.');
      setMonto('');
      setNota('');
      
      // Recargar préstamos para actualizar saldos del deudor
      fetchLoans();
    } catch (err) {
      setError(err.message || 'Error al registrar el abono.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedLoanData = prestamos.find(p => p.id.toString() === selectedLoanId);

  const handlePagoTotal = async () => {
    if (!selectedLoanData) return;
    
    const totalPagar = selectedLoanData.interes_pendiente + selectedLoanData.capital_pendiente;
    
    if (totalPagar <= 0) {
      setError('Este préstamo ya no tiene saldo pendiente.');
      return;
    }

    if (!window.confirm(`¿Estás seguro de liquidar este crédito?\n\nSe registrarán automáticamente los siguientes pagos con fecha ${fecha}:\n- Interés pendiente: ${formatCOP(selectedLoanData.interes_pendiente)}\n- Capital pendiente: ${formatCOP(selectedLoanData.capital_pendiente)}\n\nTotal a pagar: ${formatCOP(totalPagar)}`)) {
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      if (selectedLoanData.interes_pendiente > 0) {
        await api.createAbono({
          prestamo_id: parseInt(selectedLoanId),
          monto: selectedLoanData.interes_pendiente,
          tipo: 'interes',
          fecha,
          nota: nota || 'Pago total - Liquidación de intereses'
        });
      }
      
      if (selectedLoanData.capital_pendiente > 0) {
        await api.createAbono({
          prestamo_id: parseInt(selectedLoanId),
          monto: selectedLoanData.capital_pendiente,
          tipo: 'capital',
          fecha,
          nota: nota || 'Pago total - Liquidación de capital'
        });
      }
      
      setSuccess(`Pago total de ${formatCOP(totalPagar)} registrado con éxito. Crédito liquidado.`);
      setMonto('');
      setNota('');
      
      fetchLoans();
    } catch (err) {
      setError(err.message || 'Error al procesar el pago total.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="abonos-grid" style={{ display: 'grid', gridTemplateColumns: selectedLoanData ? '1.2fr 1fr' : '1fr', gap: '2rem' }}>
        
        {/* Formulario */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <CircleDollarSign size={20} className="text-green" />
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700' }}>Registrar Abono</h3>
          </div>

          {error && <div className="login-error" style={{ marginBottom: '1.25rem' }}>{error}</div>}
          {success && (
            <div className="badge success w-full" style={{ padding: '0.75rem', borderRadius: '0.75rem', marginBottom: '1.25rem', justifyContent: 'center', fontSize: '0.85rem' }}>
              {success}
            </div>
          )}

          <form onSubmit={handleRegisterAbono}>
            <div className="form-group">
              <label htmlFor="abono-loan">Seleccionar Préstamo *</label>
              {loadingLoans ? (
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Cargando préstamos activos...</p>
              ) : (
                <select
                  id="abono-loan"
                  className="form-control"
                  value={selectedLoanId}
                  onChange={handleLoanChange}
                  disabled={submitting}
                  required
                >
                  <option value="">-- Seleccionar Deudor --</option>
                  {prestamos.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.deudor} (Pendiente: {formatCOP(p.capital_pendiente)})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="abono-monto">Monto del Abono *</label>
              <div style={{ position: 'relative' }}>
                <CircleDollarSign size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  id="abono-monto"
                  type="number"
                  min="1"
                  step="any"
                  className="form-control"
                  placeholder="Monto en COP"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  style={{ paddingLeft: '2.25rem', width: '100%' }}
                  disabled={submitting || !selectedLoanId}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Tipo de Abono *</label>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: '500', color: 'white' }}>
                  <input
                    type="radio"
                    name="tipo-abono"
                    value="interes"
                    checked={tipo === 'interes'}
                    onChange={() => setTipo('interes')}
                    disabled={submitting || !selectedLoanId}
                    style={{ accentColor: 'var(--accent)' }}
                  />
                  Abono a Interés
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: '500', color: 'white' }}>
                  <input
                    type="radio"
                    name="tipo-abono"
                    value="capital"
                    checked={tipo === 'capital'}
                    onChange={() => setTipo('capital')}
                    disabled={submitting || !selectedLoanId}
                    style={{ accentColor: 'var(--accent)' }}
                  />
                  Abono a Capital
                </label>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="abono-fecha">Fecha de Pago *</label>
              <div style={{ position: 'relative' }}>
                <Calendar size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  id="abono-fecha"
                  type="date"
                  className="form-control"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  style={{ paddingLeft: '2.25rem', width: '100%' }}
                  disabled={submitting || !selectedLoanId}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="abono-nota">Nota u Observación (Opcional)</label>
              <div style={{ position: 'relative' }}>
                <FileText size={16} style={{ position: 'absolute', left: '0.75rem', top: '0.85rem', color: 'var(--text-muted)' }} />
                <textarea
                  id="abono-nota"
                  className="form-control"
                  placeholder="ej: Recibo de pago de interés del primer mes"
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  style={{ paddingLeft: '2.25rem', width: '100%', height: '80px', resize: 'vertical' }}
                  disabled={submitting || !selectedLoanId}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
              <button 
                type="submit" 
                className="btn btn-primary"
                style={{ flex: 1 }}
                disabled={submitting || !selectedLoanId}
              >
                {submitting ? 'Registrando...' : 'Registrar Abono'}
              </button>
              
              {selectedLoanData && (
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  style={{ flex: 1, borderColor: 'var(--accent)', color: 'var(--accent)' }}
                  disabled={submitting || !selectedLoanId}
                  onClick={handlePagoTotal}
                >
                  Pago Total (Liquidar)
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Resumen del crédito seleccionado */}
        {selectedLoanData && (
          <div className="card" style={{ height: 'fit-content' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <ShieldCheck size={20} className="text-green" />
              <h3 style={{ fontSize: '1.15rem', fontWeight: '700' }}>Estado del Crédito</h3>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.925rem' }}>
              <div className="flex-row-between">
                <span style={{ color: 'var(--text-secondary)' }}>Deudor:</span>
                <span style={{ fontWeight: '600' }}>{selectedLoanData.deudor}</span>
              </div>
              <div className="flex-row-between">
                <span style={{ color: 'var(--text-secondary)' }}>Capital Original:</span>
                <span style={{ fontWeight: '500' }}>{formatCOP(selectedLoanData.capital_original)}</span>
              </div>
              <div className="flex-row-between" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Capital Pendiente:</span>
                <span className="text-red" style={{ fontWeight: '600' }}>{formatCOP(selectedLoanData.capital_pendiente)}</span>
              </div>
              
              <div className="flex-row-between">
                <span style={{ color: 'var(--text-secondary)' }}>Tasa mensual:</span>
                <span style={{ fontWeight: '500' }}>{selectedLoanData.tasa_interes}% mensual</span>
              </div>
              <div className="flex-row-between">
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-secondary)' }}>
                  Interés mensual:
                </span>
                <span style={{ fontWeight: '500' }}>{formatCOP(selectedLoanData.interes_mensual)}</span>
              </div>
              <div className="flex-row-between">
                <span style={{ color: 'var(--text-secondary)' }}>Fecha de Inicio:</span>
                <span>{formatFecha(selectedLoanData.fecha_inicio)}</span>
              </div>
              <div className="flex-row-between">
                <span style={{ color: 'var(--text-secondary)' }}>Meses cobrados:</span>
                <span style={{ fontWeight: '500' }}>{selectedLoanData.meses_transcurridos} mes(es)</span>
              </div>
              <div className="flex-row-between" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Interés Acumulado:</span>
                <span style={{ fontWeight: '500' }}>{formatCOP(selectedLoanData.interes_acumulado)}</span>
              </div>
              <div className="flex-row-between">
                <span style={{ color: 'var(--text-secondary)' }}>Abonado a Intereses:</span>
                <span className="text-green" style={{ fontWeight: '500' }}>{formatCOP(selectedLoanData.total_abonado_interes)}</span>
              </div>
              <div className="flex-row-between" style={{ fontSize: '1.05rem', fontWeight: '700', padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '0.5rem' }}>
                <span style={{ color: 'white' }}>Interés Pendiente:</span>
                <span className={selectedLoanData.interes_pendiente > 0 ? 'text-red' : 'text-green'}>
                  {formatCOP(selectedLoanData.interes_pendiente)}
                </span>
              </div>
            </div>
            
            <div style={{ marginTop: '1.25rem', padding: '0.75rem', background: 'var(--danger-bg)', borderRadius: '0.5rem', border: '1px solid var(--danger-border)', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
              <HelpCircle size={16} className="text-red" style={{ flexShrink: 0, marginTop: '2px' }} />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.3' }}>
                * Un abono a <strong>interés</strong> reduce el saldo pendiente de intereses acumulados, mientras que un abono a <strong>capital</strong> disminuye la deuda base y, en consecuencia, reduce los intereses devengados de los siguientes meses.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
