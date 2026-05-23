import { useState, useEffect, Fragment } from 'react';
import { api, formatCOP, formatFecha } from '../utils/api';
import { useToast } from './Toast';
import { ModalConfirm } from './ModalConfirm';
import { EstadoVacio } from './EstadoVacio';
import { useMoneda } from '../hooks/useMoneda';
import { Plus, Search, ChevronDown, ChevronUp, Calendar, User, DollarSign, Percent, Receipt, Edit, Trash2, BookOpen } from 'lucide-react';

export default function Prestamos({ setActiveTab, setSelectedLoanForAbono }) {
  const toast = useToast();
  const { formatear, limpiar } = useMoneda();
  const [prestamos, setPrestamos] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLoanId, setEditingLoanId] = useState(null);
  const [deudor, setDeudor] = useState('');
  const [capitalDisplay, setCapitalDisplay] = useState('');
  const [tasaInteres, setTasaInteres] = useState('20');
  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().split('T')[0]);
  const [modalError, setModalError] = useState('');
  const [creating, setCreating] = useState(false);
  const [listaDeudores, setListaDeudores] = useState([]);

  const [confirm, setConfirm] = useState(null);
  const [cajaSaldo, setCajaSaldo] = useState(null);
  const [highlightedId, setHighlightedId] = useState(null);

  const [expandedLoanId, setExpandedLoanId] = useState(null);
  const [loanAbonos, setLoanAbonos] = useState({});
  const [loadingAbonos, setLoadingAbonos] = useState(false);

  const fetchPrestamos = async () => {
    try {
      setLoading(true);
      const data = await api.getPrestamos();
      setPrestamos(data);
    } catch (err) {
      setError('Error al obtener la lista de préstamos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPrestamos(); }, []);

  const handleOpenModal = async () => {
    setDeudor('');
    setCapitalDisplay('');
    setTasaInteres('20');
    setFechaInicio(new Date().toISOString().split('T')[0]);
    setModalError('');
    setIsModalOpen(true);
    setEditingLoanId(null);
    try {
      const [deudores, caja] = await Promise.all([
        api.getDeudores(),
        api.getCajaSaldo()
      ]);
      setListaDeudores(deudores);
      setCajaSaldo(caja.saldo);
    } catch {}
  };

  const handleCreatePrestamo = async (e) => {
    e.preventDefault();
    if (!deudor || !capitalDisplay || !fechaInicio) {
      setModalError('Por favor complete todos los campos obligatorios.');
      return;
    }
    setCreating(true);
    setModalError('');
    const capitalNumerico = limpiar(capitalDisplay);
    try {
      let result;
      if (editingLoanId) {
        result = await api.updatePrestamo(editingLoanId, {
          deudor,
          capital_original: capitalNumerico,
          tasa_interes: parseFloat(tasaInteres),
          fecha_inicio: fechaInicio,
        });
        toast('Préstamo actualizado con éxito', 'exito');
      } else {
        result = await api.createPrestamo({
          deudor,
          capital_original: capitalNumerico,
          tasa_interes: parseFloat(tasaInteres),
          fecha_inicio: fechaInicio,
        });
        toast('Préstamo creado con éxito', 'exito');
      }
      setIsModalOpen(false);
      await fetchPrestamos();
      const idResaltar = result?.id || editingLoanId;
      if (idResaltar) {
        setHighlightedId(idResaltar);
        setTimeout(() => setHighlightedId(null), 2500);
      }
    } catch (err) {
      setModalError(err.message || 'Error al guardar el préstamo.');
    } finally {
      setCreating(false);
    }
  };

  const handleEditClick = (loan) => {
    setDeudor(loan.deudor);
    setCapitalDisplay(String(loan.capital_original).replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
    setTasaInteres(loan.tasa_interes.toString());
    setFechaInicio(loan.fecha_inicio.split('T')[0]);
    setModalError('');
    setEditingLoanId(loan.id);
    setIsModalOpen(true);
    api.getCajaSaldo().then(r => setCajaSaldo(r.saldo)).catch(() => {});
  };

  const handleDeletePrestamo = (id) => {
    setConfirm({
      mensaje: '¿Estás seguro de que deseas eliminar este préstamo? Se borrarán todos sus abonos. Esta acción no se puede deshacer.',
      onConfirmar: async () => {
        setConfirm(null);
        try {
          await api.deletePrestamo(id);
          toast('Préstamo eliminado correctamente', 'exito');
          fetchPrestamos();
        } catch (err) {
          toast(err.message || 'Error al eliminar el préstamo', 'error');
        }
      },
      onCancelar: () => setConfirm(null)
    });
  };

  const handleDeleteAbono = (abonoId, prestamoId) => {
    setConfirm({
      mensaje: '¿Estás seguro de que deseas eliminar este abono? Si fue a capital, el saldo pendiente aumentará.',
      onConfirmar: async () => {
        setConfirm(null);
        try {
          await api.deleteAbono(abonoId);
          const data = await api.getAbonos(prestamoId);
          setLoanAbonos(prev => ({ ...prev, [prestamoId]: data }));
          fetchPrestamos();
          toast('Abono eliminado correctamente', 'exito');
        } catch (err) {
          toast(err.message || 'Error al eliminar el abono', 'error');
        }
      },
      onCancelar: () => setConfirm(null)
    });
  };

  const handleToggleExpand = async (loanId) => {
    if (expandedLoanId === loanId) { setExpandedLoanId(null); return; }
    setExpandedLoanId(loanId);
    if (loanAbonos[loanId]) return;
    setLoadingAbonos(true);
    try { const data = await api.getAbonos(loanId); setLoanAbonos(prev => ({ ...prev, [loanId]: data })); } catch {}
    finally { setLoadingAbonos(false); }
  };

  const handleQuickAbonar = (loan) => {
    setSelectedLoanForAbono(loan);
    setActiveTab('abonos');
  };

  const capitalNumerico = limpiar(capitalDisplay);
  const tasaNum = parseFloat(tasaInteres) || 0;
  const interesMensualPreview = capitalNumerico * tasaNum / 100;

  const filteredPrestamos = prestamos.filter(p =>
    p.deudor.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="view-controls">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input type="text" className="form-control search-input" placeholder="Buscar deudor..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={handleOpenModal}>
          <Plus size={18} />
          Nuevo Préstamo
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40vh' }}>
          <p style={{ color: 'var(--text-secondary)' }}>Cargando préstamos...</p>
        </div>
      ) : error ? (
        <div className="login-error">{error}</div>
      ) : filteredPrestamos.length === 0 && prestamos.length === 0 ? (
        <EstadoVacio
          icono="💳"
          titulo="Aún no tienes préstamos registrados"
          descripcion="Comienza creando un préstamo para hacer seguimiento de capital, intereses y abonos."
          accion={handleOpenModal}
          textoAccion="Crear primer préstamo"
        />
      ) : filteredPrestamos.length === 0 ? (
        <EstadoVacio icono="🔍" titulo="Sin resultados" descripcion={`No se encontraron préstamos para "${searchTerm}".`} accion={() => setSearchTerm('')} textoAccion="Limpiar búsqueda" />
      ) : (
        <>
          <div className="mobile-cards">
            {filteredPrestamos.map((loan) => {
              const isExpanded = expandedLoanId === loan.id;
              const isActivo = parseFloat(loan.capital_pendiente) > 0;
              const isHighlighted = highlightedId === loan.id;
              return (
                <div key={loan.id} className="card loan-card" style={isHighlighted ? { borderColor: 'var(--color-success)', boxShadow: '0 0 0 2px color-mix(in srgb, var(--color-success) 30%, transparent)', transition: 'all 0.3s ease' } : {}}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ fontWeight: '700', fontSize: '1rem' }}>{loan.deudor}</span>
                    <span className={`badge ${isActivo ? 'danger' : 'success'}`}>{isActivo ? 'Activo' : 'Pagado'}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
                    <div style={{ gridColumn: '1 / -1', paddingBottom: '0.25rem', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '0.25rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Fecha de Inicio: </span>
                      <span style={{ fontWeight: '600' }}>{formatFecha(loan.fecha_inicio)}</span>
                    </div>
                    <div><span style={{ color: 'var(--text-muted)', display: 'block' }}>Capital</span><span style={{ fontWeight: '600' }}>{formatCOP(loan.capital_original)}</span></div>
                    <div><span style={{ color: 'var(--text-muted)', display: 'block' }}>Pendiente</span><span className={isActivo ? 'text-red' : 'text-green'} style={{ fontWeight: '600' }}>{formatCOP(loan.capital_pendiente)}</span></div>
                    <div><span style={{ color: 'var(--text-muted)', display: 'block' }}>Int. Pendiente</span><span className={loan.interes_pendiente > 0 ? 'text-red' : 'text-green'} style={{ fontWeight: '600' }}>{formatCOP(loan.interes_pendiente)}</span></div>
                    <div><span style={{ color: 'var(--text-muted)', display: 'block' }}>Tasa / Meses</span><span style={{ fontWeight: '500' }}>{loan.tasa_interes}% · {loan.meses_transcurridos}m</span></div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                    {isActivo && <button className="btn btn-primary btn-small" onClick={() => handleQuickAbonar(loan)} style={{ flex: 1, minHeight: '44px' }}><Receipt size={14} /> Abonar</button>}
                    <button className="btn btn-secondary btn-small" onClick={() => handleEditClick(loan)} style={{ minHeight: '44px', minWidth: '44px' }} aria-label="Editar préstamo"><Edit size={14} /></button>
                    <button className="btn btn-secondary btn-small text-red" onClick={() => handleDeletePrestamo(loan.id)} style={{ borderColor: 'rgba(239, 68, 68, 0.3)', minHeight: '44px', minWidth: '44px' }} aria-label="Eliminar préstamo"><Trash2 size={14} /></button>
                    <button onClick={() => handleToggleExpand(loan.id)} className="btn btn-secondary btn-small" style={{ minHeight: '44px', minWidth: '44px' }} aria-label={isExpanded ? 'Colapsar abonos' : 'Expandir abonos'}>
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>
                  {isExpanded && loanAbonos[loan.id]?.length > 0 && (
                    <div style={{ marginTop: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                      <p style={{ fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Historial de Abonos</p>
                      {loanAbonos[loan.id].map((abono) => (
                        <div key={abono.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', borderBottom: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                          <div>
                            <span className={abono.tipo === 'capital' ? 'text-green' : 'text-yellow'} style={{ fontWeight: '600' }}>{formatCOP(abono.monto)}</span>
                            <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem', fontSize: '0.7rem' }}>{abono.tipo === 'capital' ? 'Capital' : 'Interés'}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{formatFecha(abono.fecha)}</span>
                            <button className="btn btn-secondary btn-small text-red" onClick={() => handleDeleteAbono(abono.id, loan.id)} style={{ borderColor: 'transparent', padding: '0.15rem', minHeight: '44px', minWidth: '44px' }} aria-label="Eliminar abono"><Trash2 size={12} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {isExpanded && (!loanAbonos[loan.id] || loanAbonos[loan.id].length === 0) && (
                    <p style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>Sin abonos registrados.</p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="desktop-table">
            <div className="table-container">
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}></th>
                      <th>Deudor</th>
                      <th>Capital Original</th>
                      <th>Capital Pendiente</th>
                      <th>Tasa</th>
                      <th>Fecha Inicio</th>
                      <th>Meses</th>
                      <th>Int. Pendiente</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPrestamos.map((loan) => {
                      const isExpanded = expandedLoanId === loan.id;
                      const isActivo = parseFloat(loan.capital_pendiente) > 0;
                      const isHighlighted = highlightedId === loan.id;
                      return (
                        <Fragment key={loan.id}>
                          <tr style={isHighlighted ? { background: 'rgba(34,197,94,0.06)', transition: 'background 0.3s ease' } : {}}>
                            <td>
                              <button onClick={() => handleToggleExpand(loan.id)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '44px', minWidth: '44px' }} aria-label={isExpanded ? 'Colapsar abonos' : 'Expandir abonos'}>
                                {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                              </button>
                            </td>
                            <td style={{ fontWeight: '600' }}>{loan.deudor}</td>
                            <td>{formatCOP(loan.capital_original)}</td>
                            <td className={isActivo ? 'text-red' : 'text-green'} style={{ fontWeight: '500' }}>{formatCOP(loan.capital_pendiente)}</td>
                            <td>{loan.tasa_interes}%</td>
                            <td>{formatFecha(loan.fecha_inicio)}</td>
                            <td>{loan.meses_transcurridos}</td>
                            <td className={loan.interes_pendiente > 0 ? 'text-red' : 'text-green'} style={{ fontWeight: '500' }}>{formatCOP(loan.interes_pendiente)}</td>
                            <td><span className={`badge ${isActivo ? 'danger' : 'success'}`}>{isActivo ? 'Activo' : 'Pagado'}</span></td>
                            <td>
                              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {isActivo && <button className="btn btn-secondary btn-small" onClick={() => handleQuickAbonar(loan)} style={{ minHeight: '44px' }} title="Registrar Abono" aria-label="Registrar abono"><Receipt size={14} /></button>}
                                <button className="btn btn-secondary btn-small" onClick={() => handleEditClick(loan)} style={{ minHeight: '44px', minWidth: '44px' }} title="Editar" aria-label="Editar préstamo"><Edit size={14} /></button>
                                <button className="btn btn-secondary btn-small text-red" onClick={() => handleDeletePrestamo(loan.id)} style={{ borderColor: 'rgba(239, 68, 68, 0.3)', minHeight: '44px', minWidth: '44px' }} title="Eliminar" aria-label="Eliminar préstamo"><Trash2 size={14} /></button>
                              </div>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="details-row">
                              <td colSpan={10}>
                                <div className="details-wrapper">
                                  <h4 className="subtable-title"><Receipt size={14} />Historial de Abonos</h4>
                                  {loadingAbonos && !loanAbonos[loan.id] ? (
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', padding: '0.5rem 0' }}>Cargando historial...</p>
                                  ) : !loanAbonos[loan.id] || loanAbonos[loan.id].length === 0 ? (
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', padding: '0.5rem 0' }}>No se han registrado abonos para este préstamo.</p>
                                  ) : (
                                    <table style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
                                      <thead><tr><th style={{ padding: '0.5rem 1rem' }}>Fecha</th><th style={{ padding: '0.5rem 1rem' }}>Monto</th><th style={{ padding: '0.5rem 1rem' }}>Tipo</th><th style={{ padding: '0.5rem 1rem' }}>Nota</th><th style={{ padding: '0.5rem 1rem' }}>Acciones</th></tr></thead>
                                      <tbody>
                                        {loanAbonos[loan.id].map((abono) => (
                                          <tr key={abono.id}>
                                            <td style={{ padding: '0.65rem 1rem' }}>{formatFecha(abono.fecha)}</td>
                                            <td style={{ padding: '0.65rem 1rem', fontWeight: '600' }} className={abono.tipo === 'capital' ? 'text-green' : 'text-yellow'}>{formatCOP(abono.monto)}</td>
                                            <td style={{ padding: '0.65rem 1rem' }}><span className={`badge ${abono.tipo === 'capital' ? 'success' : 'warning'}`} style={{ padding: '0.1rem 0.5rem', fontSize: '0.7rem' }}>{abono.tipo === 'capital' ? 'A Capital' : 'A Interés'}</span></td>
                                            <td style={{ padding: '0.65rem 1rem', color: 'var(--text-secondary)' }}>{abono.nota || '—'}</td>
                                            <td style={{ padding: '0.65rem 1rem' }}>
                                              <button className="btn btn-secondary btn-small text-red" onClick={() => handleDeleteAbono(abono.id, loan.id)} style={{ borderColor: 'transparent', padding: '0.2rem', minHeight: '44px', minWidth: '44px' }} title="Eliminar Abono" aria-label="Eliminar abono"><Trash2 size={14} /></button>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '520px' }}>
            <button className="modal-close" onClick={() => setIsModalOpen(false)} aria-label="Cerrar">×</button>
            <h3 className="modal-title">{editingLoanId ? 'Editar Préstamo' : 'Nuevo Préstamo'}</h3>

            {cajaSaldo !== null && !editingLoanId && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.65rem 1rem', borderRadius: '0.75rem',
                background: cajaSaldo >= capitalNumerico ? 'var(--success-bg)' : 'var(--danger-bg)',
                border: `1px solid ${cajaSaldo >= capitalNumerico ? 'var(--success-border)' : 'var(--danger-border)'}`,
                marginBottom: '1.25rem', fontSize: '0.85rem', fontWeight: '500'
              }}>
                <DollarSign size={16} className={cajaSaldo >= capitalNumerico ? 'text-green' : 'text-red'} />
                <span style={{ color: 'var(--text-secondary)' }}>
                  Disponible en caja: <strong className={cajaSaldo >= capitalNumerico ? 'text-green' : 'text-red'}>{formatCOP(cajaSaldo)}</strong>
                  {capitalNumerico > 0 && (
                    <> — {cajaSaldo >= capitalNumerico ? 'Fondos suficientes ✅' : '⚠️ Saldo insuficiente'}</>
                  )}
                </span>
              </div>
            )}

            {modalError && <div className="login-error" style={{ marginBottom: '1.25rem' }}>{modalError}</div>}

            <form onSubmit={handleCreatePrestamo}>
              <div className="form-group">
                <label htmlFor="modal-deudor">Nombre del Deudor *</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <User size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input id="modal-deudor" type="text" className="form-control" placeholder="Nombre completo" value={deudor} onChange={(e) => setDeudor(e.target.value)} style={{ paddingLeft: '2.25rem', width: '100%' }} disabled={creating} required list="deudores-list" autoComplete="off" />
                    <datalist id="deudores-list">{listaDeudores.map((n, i) => <option key={i} value={n} />)}</datalist>
                  </div>
                  {('contacts' in navigator && 'ContactsManager' in window) && (
                    <button type="button" className="btn btn-secondary" onClick={async () => { try { const c = await navigator.contacts.select(['name'], { multiple: false }); if (c?.[0]?.name?.[0]) setDeudor(c[0].name[0]); } catch {} }} style={{ padding: '0 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '44px' }} title="Seleccionar de Contactos" aria-label="Seleccionar de contactos">
                      <BookOpen size={18} style={{ color: 'var(--primary-color)' }} />
                    </button>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="modal-capital">Capital Original (COP) *</label>
                <div style={{ position: 'relative' }}>
                  <DollarSign size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input id="modal-capital" type="text" inputMode="decimal" className="form-control" placeholder="monto en COP (ej: 1.000.000)" value={capitalDisplay} onChange={(e) => setCapitalDisplay(formatear(e.target.value))} style={{ paddingLeft: '2.25rem', width: '100%' }} disabled={creating} required />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="modal-tasa">Tasa de Interés (% Mensual)</label>
                <div style={{ position: 'relative' }}>
                  <Percent size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input id="modal-tasa" type="number" min="0" step="0.01" className="form-control" value={tasaInteres} onChange={(e) => setTasaInteres(e.target.value)} style={{ paddingLeft: '2.25rem', width: '100%' }} disabled={creating} required />
                </div>
              </div>

              {capitalNumerico > 0 && tasaNum > 0 && (
                <div style={{
                  background: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--color-primary) 40%, transparent)',
                  borderRadius: '12px', padding: '16px', marginBottom: '20px'
                }}>
                  <p style={{ fontSize: '13px', color: 'var(--color-primary)', margin: 0 }}>
                    💡 Interés mensual estimado:{' '}
                    <strong>
                      ${interesMensualPreview.toLocaleString('es-CO')}
                    </strong>
                  </p>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="modal-fecha">Fecha de Inicio *</label>
                <div style={{ position: 'relative' }}>
                  <Calendar size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input id="modal-fecha" type="date" className="form-control" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} style={{ paddingLeft: '2.25rem', width: '100%' }} disabled={creating} required />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)} disabled={creating} style={{ minWidth: '44px', minHeight: '44px' }}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={creating} style={{ minWidth: '44px', minHeight: '44px' }}>
                  {creating ? 'Guardando...' : (editingLoanId ? 'Guardar Cambios' : 'Crear Préstamo')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirm && <ModalConfirm mensaje={confirm.mensaje} onConfirmar={confirm.onConfirmar} onCancelar={confirm.onCancelar} />}
    </div>
  );
}
