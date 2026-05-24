import { useState, useEffect, Fragment } from 'react';
import { api, formatCOP, formatFecha } from '../utils/api';
import { useToast } from './Toast';
import { ModalConfirm } from './ModalConfirm';
import { EstadoVacio } from './EstadoVacio';
import { useMoneda } from '../hooks/useMoneda';
import { Plus, Search, ChevronDown, ChevronUp, Calendar, DollarSign, Percent, Receipt, Edit, Trash2, FileText, FileDown } from 'lucide-react';
import { generarEstadoCuentaPDF } from '../utils/pdfGenerator';

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
  const [clientes, setClientes] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState('');
  const [capitalDisplay, setCapitalDisplay] = useState('');
  const [tasaInteres, setTasaInteres] = useState('20');
  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().split('T')[0]);
  const [capitalPendienteDisplay, setCapitalPendienteDisplay] = useState('');
  const [concepto, setConcepto] = useState('');
  const [estadoActivo, setEstadoActivo] = useState(true);
  const [modalError, setModalError] = useState('');
  const [creating, setCreating] = useState(false);

  const [confirm, setConfirm] = useState(null);
  const [cajaSaldo, setCajaSaldo] = useState(null);
  const [highlightedId, setHighlightedId] = useState(null);

  const [expandedLoanId, setExpandedLoanId] = useState(null);
  const [loanAbonos, setLoanAbonos] = useState({});
  const [loadingAbonos, setLoadingAbonos] = useState(false);
  const [generandoPDF, setGenerandoPDF] = useState(null);

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

  useEffect(() => {
    const cargarClientes = async () => {
      try {
        const data = await api.getClientes();
        setClientes(Array.isArray(data) ? data : []);
      } catch (err) {
        // handled silently
      }
    };
    cargarClientes();
  }, []);

  const handleOpenModal = async () => {
    setDeudor('');
    setClienteSeleccionado('');
    setCapitalDisplay('');
    setCapitalPendienteDisplay('');
    setTasaInteres('20');
    setFechaInicio(new Date().toISOString().split('T')[0]);
    setConcepto('');
    setEstadoActivo(true);
    setModalError('');
    setIsModalOpen(true);
    setEditingLoanId(null);
    try {
      const caja = await api.getCajaSaldo();
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
        const body = {
          deudor,
          capital_original: capitalNumerico,
          tasa_interes: parseFloat(tasaInteres),
          fecha_inicio: fechaInicio,
          concepto: concepto || null,
        };
        if (capitalPendienteDisplay) {
          body.capital_pendiente = limpiar(capitalPendienteDisplay);
        }
        body.activo = estadoActivo;
        result = await api.updatePrestamo(editingLoanId, body);
        toast('Préstamo actualizado con éxito', 'exito');
      } else {
        const clienteSel = clientes.find(c => c.id === parseInt(clienteSeleccionado));
        result = await api.createPrestamo({
          deudor: clienteSel?.nombre || deudor,
          capital_original: capitalNumerico,
          tasa_interes: parseFloat(tasaInteres),
          fecha_inicio: fechaInicio,
          cliente_id: clienteSeleccionado ? parseInt(clienteSeleccionado) : null,
          concepto: '',
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
    setClienteSeleccionado(loan.cliente_id ? String(loan.cliente_id) : '');
    setCapitalDisplay(String(loan.capital_original).replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
    setCapitalPendienteDisplay(String(loan.capital_pendiente).replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
    setTasaInteres(loan.tasa_interes.toString());
    setFechaInicio(loan.fecha_inicio.split('T')[0]);
    setConcepto(loan.concepto || '');
    setEstadoActivo(parseFloat(loan.capital_pendiente) > 0);
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

  const handleGenerarPDF = async (loan) => {
    if (generandoPDF) return;
    if (!loan) {
      toast('No hay datos del préstamo para generar el PDF', 'error');
      return;
    }
    setGenerandoPDF(loan.id);
    try {
      const abonos = await api.getAbonos(loan.id);
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const nombreUsuario = user.nombre_usuario || 'Usuario';
      setTimeout(() => {
        generarEstadoCuentaPDF(loan, abonos, nombreUsuario);
        setGenerandoPDF(null);
      }, 100);
    } catch (err) {
      toast('Error al cargar datos para generar el PDF', 'error');
      setGenerandoPDF(null);
    }
  };

  const verEstadoCuenta = async (loanId) => {
    const ventana = window.open('', '_blank');
    if (!ventana) { alert('Permite ventanas emergentes para ver el estado de cuenta.'); return; }
    ventana.document.write('<p style="font-family:sans-serif;padding:2em;color:#666;">Cargando...</p>');
    try {
      const html = await api.getPrestamoEstadoCuenta(loanId);
      ventana.document.write(html);
      ventana.document.close();
    } catch (err) {
      ventana.document.write('<p style="font-family:sans-serif;padding:2em;color:red;">Error al generar estado de cuenta.</p>');
    }
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
        <button className="btn btn-primary" onClick={handleOpenModal} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }} title="Nuevo préstamo">
          <Plus size={18} style={{ flexShrink: 0 }} />
          <span>Nuevo Préstamo</span>
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
                    <div><span style={{ color: 'var(--text-muted)', display: 'block' }}>Int. Mensual</span><span className={loan.interes_mensual > 0 ? 'text-green' : ''} style={{ fontWeight: '600' }}>{formatCOP(loan.interes_mensual)}</span></div>
                    <div><span style={{ color: 'var(--text-muted)', display: 'block' }}>Int. Pendiente</span><span className={loan.interes_pendiente > 0 ? 'text-red' : 'text-green'} style={{ fontWeight: '600' }}>{formatCOP(loan.interes_pendiente)}</span></div>
                    <div><span style={{ color: 'var(--text-muted)', display: 'block' }}>Int. Cobrados</span><span className="text-green" style={{ fontWeight: '600' }}>{formatCOP(loan.total_abonado_interes)}</span></div>
                    <div><span style={{ color: 'var(--text-muted)', display: 'block' }}>Tasa / Tiempo</span><span style={{ fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {parseFloat(loan.tasa_interes) === 0
                        ? <><span className="badge warning" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>⚠ Sin interés</span></>
                        : <>{loan.tasa_interes}%</>
                      }
                      <span style={{ color: 'var(--text-muted)' }}>·</span>
                      <span>{loan.tiempo_texto === 'Sin calcular'
                        ? `${Math.floor((new Date() - new Date(loan.fecha_inicio)) / (1000 * 60 * 60 * 24 * 30)) || 0} mes(es)`
                        : loan.tiempo_texto
                      }</span>
                    </span></div>
                  </div>
                  {/* Próximo vencimiento */}
                  {loan.proximo_vencimiento && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginTop: '8px',
                    padding: '6px 10px',
                    borderRadius: 'var(--radius-sm)',
                    background: loan.dias_para_vencer <= 5
                      ? 'rgba(239,68,68,0.10)'
                      : loan.dias_para_vencer <= 10
                      ? 'rgba(251,191,36,0.10)'
                      : 'var(--color-accent-soft)',
                  }}>
                    <span style={{ fontSize: '12px' }}>📅</span>
                    <span style={{
                      fontSize: '11px',
                      color: loan.dias_para_vencer <= 5
                        ? 'var(--color-danger)'
                        : loan.dias_para_vencer <= 10
                        ? 'var(--color-warning)'
                        : 'var(--color-text-muted)',
                      fontWeight: loan.dias_para_vencer <= 5 ? '600' : '400',
                    }}>
                      {loan.dias_para_vencer === 0
                        ? '⚠️ Vence hoy'
                        : loan.dias_para_vencer < 0
                        ? `Venció hace ${Math.abs(loan.dias_para_vencer)} días`
                        : `Próximo cobro: ${loan.proximo_vencimiento}`
                      }
                    </span>
                  </div>
                  )}
                  <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                    {isActivo && <button className="btn btn-primary btn-small" onClick={() => handleQuickAbonar(loan)} style={{ flex: 1, minHeight: '44px' }}><Receipt size={14} /> Abonar</button>}
                    <button className="btn btn-secondary btn-small" onClick={() => handleGenerarPDF(loan)} disabled={generandoPDF === loan.id} style={{ minHeight: '44px' }} title="Descargar PDF">
                      {generandoPDF === loan.id ? 'Generando...' : <><FileDown size={14} /> PDF</>}
                    </button>
                    <button className="btn btn-secondary btn-small" onClick={() => verEstadoCuenta(loan.id, loan.deudor)} style={{ minHeight: '44px', minWidth: '44px' }} title="Estado de cuenta"><FileText size={14} /></button>
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
                      <th>Int. Mensual Actual</th>
                      <th>Int. Pendiente</th>
                      <th>Int. Cobrados</th>
                      <th>Tasa</th>
                      <th>Desde</th>
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
                            <td className={loan.interes_mensual > 0 ? 'text-green' : ''} style={{ fontWeight: '500' }}>{formatCOP(loan.interes_mensual)}</td>
                            <td className={loan.interes_pendiente > 0 ? 'text-red' : 'text-green'} style={{ fontWeight: '500' }}>{formatCOP(loan.interes_pendiente)}</td>
                            <td className="text-green" style={{ fontWeight: '500' }}>{formatCOP(loan.total_abonado_interes)}</td>
                            <td>{parseFloat(loan.tasa_interes) === 0
                              ? <span className="badge warning" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>⚠ Sin interés</span>
                              : <>{loan.tasa_interes}%</>
                            }</td>
                            <td style={{ fontSize: '12px' }}>{formatFecha(loan.fecha_inicio)}</td>
                            <td><span className={`badge ${isActivo ? 'danger' : 'success'}`}>{isActivo ? 'Activo' : 'Pagado'}</span></td>
                            <td>
                              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {isActivo && <button className="btn btn-secondary btn-small" onClick={() => handleQuickAbonar(loan)} style={{ minHeight: '44px' }} title="Registrar Abono" aria-label="Registrar abono"><Receipt size={14} /></button>}
                                <button className="btn btn-secondary btn-small" onClick={() => handleGenerarPDF(loan)} disabled={generandoPDF === loan.id} style={{ minHeight: '44px' }} title="Descargar PDF">
                                  {generandoPDF === loan.id ? 'Generando...' : <><FileDown size={14} /> PDF</>}
                                </button>
                                <button className="btn btn-secondary btn-small" onClick={() => verEstadoCuenta(loan.id, loan.deudor)} style={{ minHeight: '44px', minWidth: '44px' }} title="Estado de cuenta"><FileText size={14} /></button>
                                <button className="btn btn-secondary btn-small" onClick={() => handleEditClick(loan)} style={{ minHeight: '44px', minWidth: '44px' }} title="Editar" aria-label="Editar préstamo"><Edit size={14} /></button>
                                <button className="btn btn-secondary btn-small text-red" onClick={() => handleDeletePrestamo(loan.id)} style={{ borderColor: 'rgba(239, 68, 68, 0.3)', minHeight: '44px', minWidth: '44px' }} title="Eliminar" aria-label="Eliminar préstamo"><Trash2 size={14} /></button>
                              </div>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="details-row">
                              <td colSpan={11}>
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
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setIsModalOpen(false)} aria-label="Cerrar">×</button>
            <h3 className="modal-title">{editingLoanId ? 'Editar Préstamo' : 'Nuevo Préstamo'}</h3>

            <form onSubmit={handleCreatePrestamo} id="loan-form" style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div className="modal-body">
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

                <div className="form-group">
                  <label style={{ fontSize: '13px', color: 'var(--color-text-soft)', fontWeight: '500', display: 'block', marginBottom: '6px' }}>
                    Cliente *
                  </label>
                  {clientes.length === 0 ? (
                    <div style={{ padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-accent-soft)', fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
                      ⚠️ No hay clientes registrados.{' '}
                      <span
                        style={{ color: 'var(--color-accent)', fontWeight: '600', cursor: 'pointer', textDecoration: 'underline' }}
                        onClick={() => setActiveTab('clientes')}
                      >
                        Crea un cliente primero
                      </span>
                    </div>
                  ) : (
                    <select
                      value={clienteSeleccionado}
                      onChange={e => {
                        setClienteSeleccionado(e.target.value);
                        const c = clientes.find(cl => cl.id === parseInt(e.target.value));
                        if (c) setDeudor(c.nombre);
                      }}
                      style={{ width: '100%', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-glass)', color: clienteSeleccionado ? 'var(--color-text)' : 'var(--color-text-muted)', fontSize: '16px', fontFamily: 'inherit', outline: 'none', marginBottom: '12px', cursor: 'pointer' }}
                      disabled={editingLoanId}
                    >
                      <option value="" disabled>Selecciona un cliente</option>
                      {clientes.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                          {parseFloat(c.deuda_total) > 0
                            ? ` — Deuda: $${parseFloat(c.deuda_total).toLocaleString('es-CO')}`
                            : ' — Sin deuda activa'}
                        </option>
                      ))}
                    </select>
                  )}
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

                {editingLoanId && (
                  <>
                    <div className="form-group">
                      <label htmlFor="modal-capital-pendiente">Capital Pendiente</label>
                      <div style={{ position: 'relative' }}>
                        <DollarSign size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input id="modal-capital-pendiente" type="text" inputMode="decimal" className="form-control" placeholder="monto pendiente" value={capitalPendienteDisplay} onChange={(e) => setCapitalPendienteDisplay(formatear(e.target.value))} style={{ paddingLeft: '2.25rem', width: '100%' }} disabled={creating} />
                      </div>
                    </div>
                    <div className="form-group">
                      <label htmlFor="modal-concepto">Concepto</label>
                      <input id="modal-concepto" type="text" className="form-control" placeholder="Ej: Préstamo para negocio" value={concepto} onChange={(e) => setConcepto(e.target.value)} style={{ width: '100%' }} disabled={creating} />
                    </div>
                    <div className="form-group" style={{ marginTop: '0.75rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', fontWeight: '500', minHeight: '44px' }}>
                        <input type="checkbox" checked={estadoActivo} onChange={(e) => setEstadoActivo(e.target.checked)} style={{ accentColor: 'var(--accent)', width: '18px', height: '18px' }} disabled={creating} />
                        <span>Préstamo activo</span>
                      </label>
                    </div>
                  </>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)} disabled={creating} style={{ flex: 1, minHeight: '44px' }}>Cancelar</button>
                <button type="submit" className="btn btn-success" disabled={creating} style={{ flex: 1, minHeight: '44px', fontWeight: '700' }}>
                  {creating ? 'Guardando...' : (editingLoanId ? 'Actualizar préstamo' : 'Guardar préstamo')}
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
