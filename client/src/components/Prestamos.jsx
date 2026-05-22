import React, { useState, useEffect } from 'react';
import { api, formatCOP, formatFecha } from '../utils/api';
import { Plus, Search, ChevronDown, ChevronUp, Calendar, User, DollarSign, Percent, Receipt, AlertCircle, Edit, Trash2 } from 'lucide-react';

export default function Prestamos({ setActiveTab, setSelectedLoanForAbono }) {
  const [prestamos, setPrestamos] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Estados del modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLoanId, setEditingLoanId] = useState(null);
  const [deudor, setDeudor] = useState('');
  const [capitalOriginal, setCapitalOriginal] = useState('');
  const [tasaInteres, setTasaInteres] = useState('20');
  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().split('T')[0]);
  const [modalError, setModalError] = useState('');
  const [creating, setCreating] = useState(false);
  const [listaDeudores, setListaDeudores] = useState([]);

  // Fila colapsable de abonos
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
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrestamos();
  }, []);

  const handleOpenModal = async () => {
    setDeudor('');
    setCapitalOriginal('');
    setTasaInteres('20');
    setFechaInicio(new Date().toISOString().split('T')[0]);
    setModalError('');
    setIsModalOpen(true);
    setEditingLoanId(null);
    
    // Cargar lista de deudores previos para el autocompletado
    try {
      const deudores = await api.getDeudores();
      setListaDeudores(deudores);
    } catch (err) {
      console.error('Error al cargar la lista de clientes', err);
    }
  };

  const handleCreatePrestamo = async (e) => {
    e.preventDefault();
    if (!deudor || !capitalOriginal || !fechaInicio) {
      setModalError('Por favor complete todos los campos obligatorios.');
      return;
    }

    setCreating(true);
    setModalError('');

    try {
      if (editingLoanId) {
        await api.updatePrestamo(editingLoanId, {
          deudor,
          capital_original: parseFloat(capitalOriginal),
          tasa_interes: parseFloat(tasaInteres),
          fecha_inicio: fechaInicio,
        });
      } else {
        await api.createPrestamo({
          deudor,
          capital_original: parseFloat(capitalOriginal),
          tasa_interes: parseFloat(tasaInteres),
          fecha_inicio: fechaInicio,
        });
      }
      setIsModalOpen(false);
      fetchPrestamos();
    } catch (err) {
      setModalError(err.message || 'Error al guardar el préstamo.');
    } finally {
      setCreating(false);
    }
  };

  const handleEditClick = (loan) => {
    setDeudor(loan.deudor);
    setCapitalOriginal(loan.capital_original.toString());
    setTasaInteres(loan.tasa_interes.toString());
    setFechaInicio(loan.fecha_inicio.split('T')[0]);
    setModalError('');
    setEditingLoanId(loan.id);
    setIsModalOpen(true);
  };

  const handleDeletePrestamo = async (id) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este préstamo? Se borrarán todos sus abonos. Esta acción no se puede deshacer.')) {
      try {
        await api.deletePrestamo(id);
        fetchPrestamos();
      } catch (err) {
        alert(err.message || 'Error al eliminar el préstamo');
      }
    }
  };

  const handleDeleteAbono = async (abonoId, prestamoId) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este abono? Si fue a capital, el saldo pendiente aumentará.')) {
      try {
        await api.deleteAbono(abonoId);
        // Actualizar subtabla de abonos
        const data = await api.getAbonos(prestamoId);
        setLoanAbonos(prev => ({ ...prev, [prestamoId]: data }));
        // Actualizar lista principal
        fetchPrestamos();
      } catch (err) {
        alert(err.message || 'Error al eliminar el abono');
      }
    }
  };

  const handleToggleExpand = async (loanId) => {
    if (expandedLoanId === loanId) {
      setExpandedLoanId(null);
      return;
    }

    setExpandedLoanId(loanId);
    
    // Si ya tenemos cargados los abonos, no volver a hacer fetch
    if (loanAbonos[loanId]) return;

    setLoadingAbonos(true);
    try {
      const data = await api.getAbonos(loanId);
      setLoanAbonos(prev => ({ ...prev, [loanId]: data }));
    } catch (err) {
      console.error('Error al obtener abonos del préstamo:', err);
    } finally {
      setLoadingAbonos(false);
    }
  };

  const handleQuickAbonar = (loan) => {
    setSelectedLoanForAbono(loan);
    setActiveTab('abonos');
  };

  // Filtrar préstamos
  const filteredPrestamos = prestamos.filter(p =>
    p.deudor.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="view-controls">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="form-control search-input"
            placeholder="Buscar deudor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
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
      ) : filteredPrestamos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--bg-card)', borderRadius: '1rem', border: '1px dashed var(--border-color)' }}>
          <AlertCircle size={32} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
          <p style={{ color: 'var(--text-secondary)' }}>No se encontraron préstamos.</p>
        </div>
      ) : (
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
                  
                  return (
                    <React.Fragment key={loan.id}>
                      <tr>
                        <td>
                          <button
                            onClick={() => handleToggleExpand(loan.id)}
                            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          </button>
                        </td>
                        <td style={{ fontWeight: '600' }}>{loan.deudor}</td>
                        <td>{formatCOP(loan.capital_original)}</td>
                        <td className={isActivo ? 'text-red' : 'text-green'} style={{ fontWeight: '500' }}>
                          {formatCOP(loan.capital_pendiente)}
                        </td>
                        <td>{loan.tasa_interes}%</td>
                        <td>{formatFecha(loan.fecha_inicio)}</td>
                        <td>{loan.meses_transcurridos}</td>
                        <td className={loan.interes_pendiente > 0 ? 'text-red' : 'text-green'} style={{ fontWeight: '500' }}>
                          {formatCOP(loan.interes_pendiente)}
                        </td>
                        <td>
                          <span className={`badge ${isActivo ? 'danger' : 'success'}`}>
                            {isActivo ? 'Activo' : 'Pagado'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {isActivo && (
                              <button
                                className="btn btn-secondary btn-small"
                                onClick={() => handleQuickAbonar(loan)}
                                title="Registrar Abono"
                              >
                                <Receipt size={14} />
                              </button>
                            )}
                            <button
                              className="btn btn-secondary btn-small"
                              onClick={() => handleEditClick(loan)}
                              title="Editar"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              className="btn btn-secondary btn-small text-red"
                              onClick={() => handleDeletePrestamo(loan.id)}
                              style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}
                              title="Eliminar"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      
                      {/* Fila colapsable de abonos */}
                      {isExpanded && (
                        <tr className="details-row">
                          <td colSpan={10}>
                            <div className="details-wrapper">
                              <h4 className="subtable-title">
                                <Receipt size={14} />
                                Historial de Abonos
                              </h4>
                              {loadingAbonos && !loanAbonos[loan.id] ? (
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', padding: '0.5rem 0' }}>Cargando historial...</p>
                              ) : !loanAbonos[loan.id] || loanAbonos[loan.id].length === 0 ? (
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', padding: '0.5rem 0' }}>No se han registrado abonos para este préstamo.</p>
                              ) : (
                                <table style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
                                  <thead>
                                    <tr>
                                      <th style={{ padding: '0.5rem 1rem' }}>Fecha</th>
                                      <th style={{ padding: '0.5rem 1rem' }}>Monto</th>
                                      <th style={{ padding: '0.5rem 1rem' }}>Tipo</th>
                                      <th style={{ padding: '0.5rem 1rem' }}>Nota</th>
                                      <th style={{ padding: '0.5rem 1rem' }}>Acciones</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {loanAbonos[loan.id].map((abono) => (
                                      <tr key={abono.id}>
                                        <td style={{ padding: '0.65rem 1rem' }}>{formatFecha(abono.fecha)}</td>
                                        <td style={{ padding: '0.65rem 1rem', fontWeight: '600' }} className={abono.tipo === 'capital' ? 'text-green' : 'text-yellow'}>
                                          {formatCOP(abono.monto)}
                                        </td>
                                        <td style={{ padding: '0.65rem 1rem' }}>
                                          <span className={`badge ${abono.tipo === 'capital' ? 'success' : 'warning'}`} style={{ padding: '0.1rem 0.5rem', fontSize: '0.7rem' }}>
                                            {abono.tipo === 'capital' ? 'A Capital' : 'A Interés'}
                                          </span>
                                        </td>
                                        <td style={{ padding: '0.65rem 1rem', color: 'var(--text-secondary)' }}>{abono.nota || '—'}</td>
                                        <td style={{ padding: '0.65rem 1rem' }}>
                                          <button
                                            className="btn btn-secondary btn-small text-red"
                                            onClick={() => handleDeleteAbono(abono.id, loan.id)}
                                            style={{ borderColor: 'transparent', padding: '0.2rem' }}
                                            title="Eliminar Abono"
                                          >
                                            <Trash2 size={14} />
                                          </button>
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
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal para Crear Préstamo */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button className="modal-close" onClick={() => setIsModalOpen(false)}>×</button>
            <h3 className="modal-title">{editingLoanId ? 'Editar Préstamo' : 'Nuevo Préstamo'}</h3>
            
            {modalError && <div className="login-error" style={{ marginBottom: '1.25rem' }}>{modalError}</div>}
            
            <form onSubmit={handleCreatePrestamo}>
              <div className="form-group">
                <label htmlFor="modal-deudor">Nombre del Deudor *</label>
                <div style={{ position: 'relative' }}>
                  <User size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    id="modal-deudor"
                    type="text"
                    className="form-control"
                    placeholder="Nombre completo"
                    value={deudor}
                    onChange={(e) => setDeudor(e.target.value)}
                    style={{ paddingLeft: '2.25rem', width: '100%' }}
                    disabled={creating}
                    required
                    list="deudores-list"
                    autoComplete="off"
                  />
                  <datalist id="deudores-list">
                    {listaDeudores.map((nombre, idx) => (
                      <option key={idx} value={nombre} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="modal-capital">Capital Original (COP) *</label>
                <div style={{ position: 'relative' }}>
                  <DollarSign size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    id="modal-capital"
                    type="number"
                    min="1"
                    step="any"
                    className="form-control"
                    placeholder="monto en COP (ej: 1000000)"
                    value={capitalOriginal}
                    onChange={(e) => setCapitalOriginal(e.target.value)}
                    style={{ paddingLeft: '2.25rem', width: '100%' }}
                    disabled={creating}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="modal-tasa">Tasa de Interés (% Mensual)</label>
                <div style={{ position: 'relative' }}>
                  <Percent size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    id="modal-tasa"
                    type="number"
                    min="0"
                    step="0.01"
                    className="form-control"
                    value={tasaInteres}
                    onChange={(e) => setTasaInteres(e.target.value)}
                    style={{ paddingLeft: '2.25rem', width: '100%' }}
                    disabled={creating}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="modal-fecha">Fecha de Inicio *</label>
                <div style={{ position: 'relative' }}>
                  <Calendar size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    id="modal-fecha"
                    type="date"
                    className="form-control"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    style={{ paddingLeft: '2.25rem', width: '100%' }}
                    disabled={creating}
                    required
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)} disabled={creating}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? 'Guardando...' : (editingLoanId ? 'Guardar Cambios' : 'Crear Préstamo')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
