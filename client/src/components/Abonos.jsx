import React, { useState, useEffect } from 'react';
import { api, formatCOP, formatFecha } from '../utils/api';
import { useToast } from './Toast';
import { useMoneda } from '../hooks/useMoneda';
import { CircleDollarSign, Calendar, FileText, ShieldCheck, HelpCircle, DollarSign } from 'lucide-react';
import { subscribe } from '../contexts/RealtimeContext';

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
    } catch (err) { setError('Error al cargar la lista de préstamos activos.'); }
    finally { setLoadingLoans(false); }
  };

  const refreshLoans = async () => {
    try {
      const data = await api.getPrestamos();
      const activos = data.filter(p => parseFloat(p.capital_pendiente) > 0);
      setPrestamos(activos);
      if (selectedLoan) setSelectedLoanId(selectedLoan.id.toString());
    } catch (err) { /* silent */ }
  };

  useEffect(() => { fetchLoans(); }, [selectedLoan]);

  useEffect(() => subscribe(refreshLoans), []);

  const handleLoanChange = (e) => {
    const id = e.target.value; setSelectedLoanId(id); setError('');
    if (id) { const loan = prestamos.find(p => p.id.toString() === id); setSelectedLoan(loan || null); }
    else { setSelectedLoan(null); }
  };

  const handleRegisterAbono = async (e) => {
    e.preventDefault();
    if (!selectedLoanId || !montoDisplay || !tipo || !fecha) { setError('Por favor completa todos los campos requeridos.'); return; }
    const valorMonto = limpiar(montoDisplay);
    if (valorMonto <= 0) { setError('El monto del abono debe ser mayor a cero.'); return; }
    const activeLoan = prestamos.find(p => p.id.toString() === selectedLoanId);
    if (tipo === 'capital' && activeLoan) {
      const capPend = parseFloat(activeLoan.capital_pendiente);
      const intPend = parseFloat(activeLoan.interes_pendiente || 0);
      const deudaTotal = capPend + intPend;
      if (valorMonto > deudaTotal) { setError(`El monto supera la deuda total de ${formatCOP(deudaTotal)} (capital ${formatCOP(capPend)} + intereses ${formatCOP(intPend)}).`); return; }
      if (valorMonto > capPend && intPend <= 0) { setError(`No puede exceder el capital pendiente de ${formatCOP(capPend)} porque no hay intereses pendientes.`); return; }
    }
    setSubmitting(true); setError('');
    try {
      await api.createAbono({ prestamo_id: parseInt(selectedLoanId), monto: valorMonto, tipo, fecha, nota });
      toast('Abono registrado con éxito', 'exito');
      setMontoDisplay(''); setNota(''); fetchLoans();
    } catch (err) { setError(err.message || 'Error al registrar el abono.'); }
    finally { setSubmitting(false); }
  };

  const selectedLoanData = prestamos.find(p => p.id.toString() === selectedLoanId);

  const handlePagoTotalClick = () => {
    if (!selectedLoanData) return;
    const totalPagar = selectedLoanData.interes_pendiente + selectedLoanData.capital_pendiente;
    if (totalPagar <= 0) { setError('Este préstamo ya no tiene saldo pendiente.'); return; }
    setShowConfirmModal(true);
  };

  const confirmPagoTotal = async () => {
    setShowConfirmModal(false); setSubmitting(true); setError('');
    try {
      if (selectedLoanData.interes_pendiente > 0) {
        await api.createAbono({ prestamo_id: parseInt(selectedLoanId), monto: selectedLoanData.interes_pendiente, tipo: 'interes', fecha, nota: nota || 'Pago total - Liquidación de intereses' });
      }
      if (selectedLoanData.capital_pendiente > 0) {
        await api.createAbono({ prestamo_id: parseInt(selectedLoanId), monto: selectedLoanData.capital_pendiente, tipo: 'capital', fecha, nota: nota || 'Pago total - Liquidación de capital' });
      }
      toast(`Pago total de ${formatCOP(selectedLoanData.interes_pendiente + selectedLoanData.capital_pendiente)} registrado. Crédito liquidado.`, 'exito');
      setMontoDisplay(''); setNota(''); fetchLoans();
    } catch (err) { setError(err.message || 'Error al procesar el pago total.'); }
    finally { setSubmitting(false); }
  };

  const montoNumerico = limpiar(montoDisplay);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6">
        <div className="bg-white rounded-2xl border p-5 shadow-sm" style={{ borderColor: 'var(--color-border)', background: 'var(--color-card)' }}>
          <div className="flex items-center gap-2 mb-4">
            <CircleDollarSign size={20} style={{ color: 'var(--color-success)' }} />
            <h3 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>Registrar Abono</h3>
          </div>
          {error && <div className="mb-4 px-4 py-3 rounded-xl text-sm font-medium text-center" style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)', border: '1px solid var(--danger-border)' }}>{error}</div>}
          <form onSubmit={handleRegisterAbono} className="space-y-4">
            <div>
              <label htmlFor="abono-loan" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-soft)' }}>Seleccionar Préstamo *</label>
              {loadingLoans ? (
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Cargando préstamos activos...</p>
              ) : (
                <select id="abono-loan" value={selectedLoanId} onChange={handleLoanChange} disabled={submitting} required
                  className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all"
                  style={{ borderColor: 'var(--color-border)', background: 'var(--bg-input)', color: 'var(--color-text)' }}>
                  <option value="">-- Seleccionar Deudor --</option>
                  {prestamos.map(p => <option key={p.id} value={p.id}>{p.deudor} (Pendiente: {formatCOP(p.capital_pendiente)})</option>)}
                </select>
              )}
            </div>
            <div>
              <label htmlFor="abono-monto" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-soft)' }}>Monto del Abono *</label>
              <div className="relative">
                <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
                <input id="abono-monto" type="text" inputMode="decimal" placeholder="Monto en COP" value={montoDisplay} onChange={(e) => setMontoDisplay(formatear(e.target.value))} disabled={submitting || !selectedLoanId} required
                  className="w-full rounded-xl border px-4 py-2.5 pl-9 text-sm outline-none transition-all"
                  style={{ borderColor: 'var(--color-border)', background: 'var(--bg-input)', color: 'var(--color-text)' }} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-soft)' }}>Tipo de Abono *</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer font-medium min-h-[44px]" style={{ color: 'var(--color-text)' }}>
                  <input type="radio" name="tipo-abono" value="interes" checked={tipo === 'interes'} onChange={() => setTipo('interes')} disabled={submitting || !selectedLoanId} style={{ accentColor: 'var(--color-accent)' }} />
                  Abono a Interés
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium min-h-[44px]" style={{ color: 'var(--color-text)' }}>
                  <input type="radio" name="tipo-abono" value="capital" checked={tipo === 'capital'} onChange={() => setTipo('capital')} disabled={submitting || !selectedLoanId} style={{ accentColor: 'var(--color-accent)' }} />
                  Abono a Capital
                </label>
              </div>
            </div>
            {selectedLoanData && montoNumerico > 0 && tipo === 'capital' && montoNumerico > parseFloat(selectedLoanData.capital_pendiente) && (
              (() => {
                const capPend = parseFloat(selectedLoanData.capital_pendiente);
                const intPend = parseFloat(selectedLoanData.interes_pendiente || 0);
                const deudaTotal = capPend + intPend;
                if (montoNumerico > deudaTotal) {
                  return <div className="px-3 py-2 rounded-xl text-xs font-medium" style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)' }}>
                    ⚠️ El monto supera la deuda total de {formatCOP(deudaTotal)}
                  </div>;
                }
                const exceso = montoNumerico - capPend;
                return <div className="px-3 py-2 rounded-xl text-xs font-medium" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: 'var(--warning-text)' }}>
                  ℹ️ Se asignarán {formatCOP(capPend)} a capital y {formatCOP(exceso)} a intereses
                </div>;
              })()
            )}
            <div>
              <label htmlFor="abono-fecha" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-soft)' }}>Fecha de Pago *</label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
                <input id="abono-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} disabled={submitting || !selectedLoanId} required
                  className="w-full rounded-xl border px-4 py-2.5 pl-9 text-sm outline-none transition-all"
                  style={{ borderColor: 'var(--color-border)', background: 'var(--bg-input)', color: 'var(--color-text)' }} />
              </div>
            </div>
            <div>
              <label htmlFor="abono-nota" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-soft)' }}>Nota (Opcional)</label>
              <div className="relative">
                <FileText size={16} className="absolute left-3 top-3" style={{ color: 'var(--color-text-muted)' }} />
                <textarea id="abono-nota" placeholder="ej: Recibo de pago de interés del primer mes" value={nota} onChange={(e) => setNota(e.target.value)} disabled={submitting || !selectedLoanId}
                  className="w-full rounded-xl border px-4 py-2.5 pl-9 text-sm outline-none transition-all resize-none"
                  style={{ borderColor: 'var(--color-border)', background: 'var(--bg-input)', color: 'var(--color-text)', height: '80px' }} />
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button type="submit" className="flex-1 min-h-[44px] rounded-xl text-sm font-semibold text-white transition-all shadow-sm" style={{ background: 'linear-gradient(135deg, #6C63FF, #5A52E0)' }} disabled={submitting || !selectedLoanId}>
                {submitting ? 'Registrando...' : 'Registrar Abono'}
              </button>
              {selectedLoanData && (
                <button type="button" onClick={handlePagoTotalClick} className="flex-1 min-h-[44px] rounded-xl text-sm font-medium transition-all border" style={{ borderColor: 'var(--color-border)', color: 'var(--color-accent)' }} disabled={submitting || !selectedLoanId}>
                  Liquidar Crédito
                </button>
              )}
            </div>
          </form>
        </div>

        {selectedLoanData && (
          <div className="bg-white rounded-2xl border p-5 shadow-sm h-fit" style={{ borderColor: 'var(--color-border)', background: 'var(--color-card)' }}>
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck size={20} style={{ color: 'var(--color-success)' }} />
              <h3 className="text-base font-bold" style={{ color: 'var(--color-text)' }}>Estado del Crédito</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span style={{ color: 'var(--color-text-secondary)' }}>Deudor:</span><span className="font-semibold" style={{ color: 'var(--color-text)' }}>{selectedLoanData.deudor}</span></div>
              <div className="flex justify-between"><span style={{ color: 'var(--color-text-secondary)' }}>Capital Original:</span><span className="font-medium font-mono" style={{ color: 'var(--color-text)' }}>{formatCOP(selectedLoanData.capital_original)}</span></div>
              <div className="flex justify-between pb-3 border-b" style={{ borderColor: 'var(--color-border)' }}><span style={{ color: 'var(--color-text-secondary)' }}>Capital Pendiente:</span><span className="font-semibold font-mono" style={{ color: 'var(--color-danger)' }}>{formatCOP(selectedLoanData.capital_pendiente)}</span></div>
              <div className="flex justify-between"><span style={{ color: 'var(--color-text-secondary)' }}>Tasa mensual:</span><span className="font-medium" style={{ color: 'var(--color-text)' }}>{selectedLoanData.tasa_interes}% mensual</span></div>
              <div className="flex justify-between"><span style={{ color: 'var(--color-text-secondary)' }}>Interés mensual:</span><span className="font-medium font-mono" style={{ color: 'var(--color-text)' }}>{formatCOP(selectedLoanData.interes_mensual)}</span></div>
              <div className="flex justify-between"><span style={{ color: 'var(--color-text-secondary)' }}>Fecha de Inicio:</span><span style={{ color: 'var(--color-text)' }}>{formatFecha(selectedLoanData.fecha_inicio)}</span></div>
              <div className="flex justify-between"><span style={{ color: 'var(--color-text-secondary)' }}>Tiempo:</span><span className="text-xs italic" style={{ color: 'var(--color-text-muted)' }}>{selectedLoanData.tiempo_texto}</span></div>
              <div className="flex justify-between pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}><span style={{ color: 'var(--color-text-secondary)' }}>Interés Acumulado:</span><span className="font-medium font-mono" style={{ color: 'var(--color-text)' }}>{formatCOP(selectedLoanData.interes_acumulado)}</span></div>
              <div className="flex justify-between"><span style={{ color: 'var(--color-text-secondary)' }}>Abonado a Intereses:</span><span className="font-medium font-mono" style={{ color: 'var(--color-success)' }}>{formatCOP(selectedLoanData.total_abonado_interes)}</span></div>
              <div className="p-3 rounded-xl text-sm font-bold" style={{ background: 'var(--color-accent-soft)' }}>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--color-text)' }}>Interés Pendiente:</span>
                  <span className="font-mono" style={{ color: selectedLoanData.interes_pendiente > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>{formatCOP(selectedLoanData.interes_pendiente)}</span>
                </div>
              </div>
            </div>
            <div className="mt-4 p-3 rounded-xl text-xs flex gap-2" style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)' }}>
              <HelpCircle size={14} style={{ color: 'var(--color-danger)', flexShrink: 0, marginTop: '1px' }} />
              <p style={{ color: 'var(--color-text-secondary)', lineHeight: '1.4' }}>* Un abono a <strong>interés</strong> reduce el saldo pendiente, mientras que un abono a <strong>capital</strong> disminuye la deuda base y reduce intereses futuros.</p>
            </div>
            {selectedLoanData.interes_pendiente > 0 && selectedLoanData.interes_mensual > 0 && (
              <div className="mt-3 px-3 py-2 rounded-xl text-xs font-medium" style={{
                background: selectedLoanData.interes_pendiente >= selectedLoanData.interes_mensual * 3 ? 'var(--danger-bg)' : 'rgba(245,158,11,0.1)',
                border: `1px solid ${selectedLoanData.interes_pendiente >= selectedLoanData.interes_mensual * 3 ? 'var(--danger-border)' : 'rgba(245,158,11,0.2)'}`,
                color: selectedLoanData.interes_pendiente >= selectedLoanData.interes_mensual * 3 ? 'var(--danger-text)' : 'var(--warning-text)',
              }}>
                {selectedLoanData.interes_pendiente >= selectedLoanData.interes_mensual * 3 ? '⚠️ Más de 3 meses de intereses sin pagar' : `🕐 ${selectedLoanData.tiempo_texto} — sin abonar`}
              </div>
            )}
          </div>
        )}
      </div>

      {showConfirmModal && selectedLoanData && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6 animate-fade-in" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-modal-enter" style={{ background: 'var(--color-card)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>Confirmar Liquidación</h2>
              <button onClick={() => setShowConfirmModal(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-lg" style={{ color: 'var(--color-text-secondary)' }}>×</button>
            </div>
            <div className="text-sm space-y-3" style={{ color: 'var(--color-text-secondary)' }}>
              <p>Se registrarán los siguientes pagos con fecha <strong>{formatFecha(fecha)}</strong>:</p>
              <ul className="ml-5 space-y-1" style={{ listStyle: 'disc' }}>
                <li>Interés pendiente: <strong style={{ color: selectedLoanData.interes_pendiente > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>{formatCOP(selectedLoanData.interes_pendiente)}</strong></li>
                <li>Capital pendiente: <strong style={{ color: selectedLoanData.capital_pendiente > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>{formatCOP(selectedLoanData.capital_pendiente)}</strong></li>
              </ul>
              <div className="flex justify-between items-center p-4 rounded-xl" style={{ background: 'color-mix(in srgb, var(--color-bg) 50%, transparent)', border: '1px solid var(--color-border)' }}>
                <span className="font-medium" style={{ color: 'var(--color-text)' }}>Total a pagar:</span>
                <span className="text-xl font-extrabold font-mono" style={{ color: 'var(--color-success)' }}>{formatCOP(selectedLoanData.interes_pendiente + selectedLoanData.capital_pendiente)}</span>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowConfirmModal(false)} className="flex-1 min-h-[44px] rounded-xl border text-sm font-medium transition-all" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)', background: 'var(--color-card)' }}>Cancelar</button>
              <button onClick={confirmPagoTotal} className="flex-1 min-h-[44px] rounded-xl text-sm font-semibold text-white transition-all shadow-sm" style={{ background: 'linear-gradient(135deg, #6C63FF, #5A52E0)' }}>Confirmar Pago</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
