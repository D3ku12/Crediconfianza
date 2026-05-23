import React, { useState, useEffect } from 'react';
import { api, formatCOP, formatFecha } from '../utils/api';
import { Wallet, PlusCircle, MinusCircle, Calendar, FileText, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';

export default function Caja() {
  const [saldo, setSaldo] = useState(0);
  const [transacciones, setTransacciones] = useState([]);
  const [monto, setMonto] = useState('');
  const [tipo, setTipo] = useState('ingreso'); // 'ingreso' o 'egreso'
  const [concepto, setConcepto] = useState('aporte_capital'); // 'aporte_capital', 'pago_nomina', 'otro_pago'
  const [descripcion, setDescripcion] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filtro, setFiltro] = useState('todos'); // 'todos', 'ingreso', 'egreso', 'prestamo', 'abono'

  const fetchCajaData = async () => {
    try {
      setLoading(true);
      const [saldoRes, transRes] = await Promise.all([
        api.getCajaSaldo(),
        api.getCajaTransacciones()
      ]);
      setSaldo(saldoRes.saldo);
      setTransacciones(transRes);
    } catch (err) {
      console.error(err);
      setError('Error al cargar los datos de caja.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCajaData();
  }, []);

  const handleTipoChange = (newTipo) => {
    setTipo(newTipo);
    setConcepto(newTipo === 'ingreso' ? 'aporte_capital' : 'pago_nomina');
    setSuccess('');
    setError('');
  };

  const handleRegisterTransaccion = async (e) => {
    e.preventDefault();
    if (!monto || !descripcion || !fecha) {
      setError('Por favor completa todos los campos requeridos.');
      return;
    }

    const valorMonto = parseFloat(monto);
    if (valorMonto <= 0) {
      setError('El monto debe ser mayor a cero.');
      return;
    }

    if (tipo === 'egreso' && valorMonto > saldo) {
      setError('Saldo insuficiente en caja para realizar este egreso.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const concDescr = concepto === 'aporte_capital' ? 'Aporte Capital' : (concepto === 'pago_nomina' ? 'Pago Nómina' : 'Otro Pago');
      await api.createCajaTransaccion({
        monto: valorMonto,
        tipo,
        descripcion: `[${concDescr}] ${descripcion}`,
        fecha
      });
      
      setSuccess('Transacción registrada con éxito.');
      setMonto('');
      setDescripcion('');
      fetchCajaData();
    } catch (err) {
      setError(err.message || 'Error al registrar la transacción.');
    } finally {
      setSubmitting(false);
    }
  };

  const getTipoBadgeClass = (tipoTrans) => {
    if (tipoTrans.startsWith('abono')) return 'success';
    if (tipoTrans === 'ingreso') return 'success';
    if (tipoTrans === 'prestamo') return 'danger';
    if (tipoTrans === 'egreso') return 'danger';
    return 'warning';
  };

  const getTipoLabel = (tipoTrans) => {
    if (tipoTrans === 'abono_interes') return 'Abono Interés';
    if (tipoTrans === 'abono_capital') return 'Abono Capital';
    if (tipoTrans === 'prestamo') return 'Préstamo';
    if (tipoTrans === 'ingreso') return 'Ingreso';
    if (tipoTrans === 'egreso') return 'Egreso';
    return tipoTrans;
  };

  const filteredTransacciones = transacciones.filter(t => {
    if (filtro === 'todos') return true;
    if (filtro === 'ingreso') return t.tipo === 'ingreso' || t.tipo.startsWith('abono');
    if (filtro === 'egreso') return t.tipo === 'egreso' || t.tipo === 'prestamo';
    return t.tipo.includes(filtro);
  });

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      
      {/* Saldo en Caja Card */}
      <div className="card" style={{ 
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.05) 100%)',
        border: '1px solid var(--border-color-glow)',
        marginBottom: '2rem',
        padding: '1.5rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1.5rem'
      }}>
        <div>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Dinero Disponible en Caja
          </span>
          <h2 style={{ fontSize: '2.5rem', fontWeight: '800', marginTop: '0.25rem', color: 'white', textShadow: '0 0 20px rgba(16, 185, 129, 0.2)' }}>
            {formatCOP(saldo)}
          </h2>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-secondary btn-small" onClick={fetchCajaData} disabled={loading} style={{ height: '40px', width: '40px', padding: 0, justifyContent: 'center' }}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="abonos-grid" style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.5fr', gap: '2rem' }}>
        
        {/* Formulario de Transacción */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <Wallet size={20} className="text-green" />
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700' }}>Registrar Movimiento</h3>
          </div>

          {error && <div className="login-error" style={{ marginBottom: '1.25rem' }}>{error}</div>}
          {success && (
            <div className="badge success w-full" style={{ padding: '0.75rem', borderRadius: '0.75rem', marginBottom: '1.25rem', justifyContent: 'center', fontSize: '0.85rem' }}>
              {success}
            </div>
          )}

          <form onSubmit={handleRegisterTransaccion}>
            <div className="form-group">
              <label>Tipo de Operación *</label>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className={`btn ${tipo === 'ingreso' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => handleTipoChange('ingreso')}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                  disabled={submitting}
                >
                  <PlusCircle size={16} />
                  Ingreso / Aporte
                </button>
                <button
                  type="button"
                  className={`btn ${tipo === 'egreso' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => handleTipoChange('egreso')}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', borderColor: tipo === 'egreso' ? 'var(--danger)' : '' }}
                  disabled={submitting}
                >
                  <MinusCircle size={16} />
                  Egreso / Pago
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="caja-concepto">Concepto *</label>
              <select
                id="caja-concepto"
                className="form-control"
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
                disabled={submitting}
                required
              >
                {tipo === 'ingreso' ? (
                  <option value="aporte_capital">Aporte para hacer crecer capital (Inyección)</option>
                ) : (
                  <>
                    <option value="pago_nomina">Pago Nómina</option>
                    <option value="otro_pago">Otro Pago / Gasto Operativo</option>
                  </>
                )}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="caja-monto">Monto *</label>
              <input
                id="caja-monto"
                type="number"
                min="1"
                step="any"
                className="form-control"
                placeholder="Monto en COP"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                disabled={submitting}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="caja-fecha">Fecha *</label>
              <div style={{ position: 'relative' }}>
                <Calendar size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  id="caja-fecha"
                  type="date"
                  className="form-control"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  style={{ paddingLeft: '2.25rem', width: '100%' }}
                  disabled={submitting}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="caja-descr">Detalle o Descripción *</label>
              <div style={{ position: 'relative' }}>
                <FileText size={16} style={{ position: 'absolute', left: '0.75rem', top: '0.85rem', color: 'var(--text-muted)' }} />
                <textarea
                  id="caja-descr"
                  className="form-control"
                  placeholder="ej: Pago de nómina de secretaria quincena mayo"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  style={{ paddingLeft: '2.25rem', width: '100%', height: '80px', resize: 'none' }}
                  disabled={submitting}
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary w-full"
              style={{ marginTop: '0.75rem', background: tipo === 'egreso' ? 'var(--danger)' : '' }}
              disabled={submitting}
            >
              {submitting ? 'Registrando...' : 'Registrar Movimiento'}
            </button>
          </form>
        </div>

        {/* Historial de Caja */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '700' }}>Historial de Movimientos</h3>
            
            <select 
              className="form-control" 
              style={{ width: 'auto', padding: '0.25rem 0.5rem', fontSize: '0.8rem', height: '32px' }}
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
            >
              <option value="todos">Todos</option>
              <option value="ingreso">Ingresos (Aportes/Abonos)</option>
              <option value="egreso">Egresos (Nóminas/Préstamos)</option>
              <option value="prestamo">Sólo Préstamos</option>
              <option value="abono">Sólo Abonos</option>
            </select>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', maxHeight: '420px', paddingRight: '0.25rem' }}>
            {loading ? (
              <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem', padding: '2rem' }}>Cargando movimientos...</p>
            ) : filteredTransacciones.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', padding: '2rem' }}>Sin movimientos registrados para el filtro seleccionado.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {filteredTransacciones.map((t) => {
                  const esPositivo = parseFloat(t.monto) > 0;
                  return (
                    <div 
                      key={t.id} 
                      className="nav-item" 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        padding: '0.75rem 1rem', 
                        background: 'rgba(255,255,255,0.01)', 
                        border: '1px solid var(--border-color)',
                        borderRadius: '0.75rem',
                        gap: '1rem',
                        cursor: 'default'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                        <div style={{ 
                          width: '32px', 
                          height: '32px', 
                          borderRadius: '50%', 
                          background: esPositivo ? 'var(--success-bg)' : 'var(--danger-bg)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          {esPositivo ? (
                            <ArrowDownRight className="text-green" size={16} />
                          ) : (
                            <ArrowUpRight className="text-red" size={16} />
                          )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'white', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                            {t.descripcion}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                            {formatFecha(t.fecha)} · <span className={`text-${esPositivo ? 'green' : 'red'}`}>{getTipoLabel(t.tipo)}</span>
                          </span>
                        </div>
                      </div>
                      <span className={esPositivo ? 'text-green' : 'text-red'} style={{ fontWeight: '700', fontSize: '0.95rem', flexShrink: 0 }}>
                        {esPositivo ? '+' : ''}{formatCOP(t.monto)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
