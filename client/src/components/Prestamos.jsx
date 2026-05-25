import { useState, useEffect, Fragment } from 'react';
import { api, formatCOP, formatFecha } from '../utils/api';
import { useToast } from './Toast';
import { ModalConfirm } from './ModalConfirm';
import { EstadoVacio } from './EstadoVacio';
import { useMoneda } from '../hooks/useMoneda';
import { Plus, Search, ChevronDown, ChevronUp, Calendar, DollarSign, Percent, Receipt, Edit, Trash2, FileDown } from 'lucide-react';
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
      } catch (err) {}
    };
    cargarClientes();
  }, []);

  const handleOpenModal = async () => {
    setDeudor(''); setClienteSeleccionado(''); setCapitalDisplay(''); setCapitalPendienteDisplay('');
    setTasaInteres('20'); setFechaInicio(new Date().toISOString().split('T')[0]);
    setConcepto(''); setEstadoActivo(true); setModalError(''); setIsModalOpen(true); setEditingLoanId(null);
    try { const caja = await api.getCajaSaldo(); setCajaSaldo(caja.saldo); } catch {}
  };

  const handleCreatePrestamo = async (e) => {
    e.preventDefault();
    if (!deudor || !capitalDisplay || !fechaInicio) { setModalError('Por favor complete todos los campos obligatorios.'); return; }
    setCreating(true); setModalError('');
    const capitalNumerico = limpiar(capitalDisplay);
    try {
      let result;
      if (editingLoanId) {
        const body = { deudor, capital_original: capitalNumerico, tasa_interes: parseFloat(tasaInteres), fecha_inicio: fechaInicio, concepto: concepto || null, cliente_id: clienteSeleccionado ? parseInt(clienteSeleccionado) : null };
        if (capitalPendienteDisplay) body.capital_pendiente = limpiar(capitalPendienteDisplay);
        body.activo = estadoActivo;
        result = await api.updatePrestamo(editingLoanId, body);
        toast('Préstamo actualizado con éxito', 'exito');
      } else {
        const clienteSel = clientes.find(c => c.id === parseInt(clienteSeleccionado));
        result = await api.createPrestamo({ deudor: clienteSel?.nombre || deudor, capital_original: capitalNumerico, tasa_interes: parseFloat(tasaInteres), fecha_inicio: fechaInicio, cliente_id: clienteSeleccionado ? parseInt(clienteSeleccionado) : null, concepto: '' });
        toast('Préstamo creado con éxito', 'exito');
      }
      setIsModalOpen(false);
      await fetchPrestamos();
      const idResaltar = result?.id || editingLoanId;
      if (idResaltar) { setHighlightedId(idResaltar); setTimeout(() => setHighlightedId(null), 2500); }
    } catch (err) {
      setModalError(err.message || 'Error al guardar el préstamo.');
    } finally { setCreating(false); }
  };

  const handleEditClick = async (loan) => {
    try { const data = await api.getClientes(); setClientes(Array.isArray(data) ? data : []); } catch {}
    setDeudor(loan.deudor);
    setClienteSeleccionado(loan.cliente_id ? String(loan.cliente_id) : '');
    setCapitalDisplay(String(loan.capital_original).replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
    setCapitalPendienteDisplay(String(loan.capital_pendiente).replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
    setTasaInteres(loan.tasa_interes.toString());
    setFechaInicio(loan.fecha_inicio.split('T')[0]);
    setConcepto(loan.concepto || '');
    setEstadoActivo(parseFloat(loan.capital_pendiente) > 0);
    setModalError(''); setEditingLoanId(loan.id); setIsModalOpen(true);
    api.getCajaSaldo().then(r => setCajaSaldo(r.saldo)).catch(() => {});
  };

  const handleDeletePrestamo = (id) => {
    setConfirm({
      mensaje: '¿Estás seguro de que deseas eliminar este préstamo? Se borrarán todos sus abonos. Esta acción no se puede deshacer.',
      onConfirmar: async () => { setConfirm(null); try { await api.deletePrestamo(id); toast('Préstamo eliminado correctamente', 'exito'); fetchPrestamos(); } catch (err) { toast(err.message || 'Error al eliminar el préstamo', 'error'); } },
      onCancelar: () => setConfirm(null)
    });
  };

  const handleDeleteAbono = (abonoId, prestamoId) => {
    setConfirm({
      mensaje: '¿Estás seguro de que deseas eliminar este abono? Si fue a capital, el saldo pendiente aumentará.',
      onConfirmar: async () => { setConfirm(null); try { await api.deleteAbono(abonoId); const data = await api.getAbonos(prestamoId); setLoanAbonos(prev => ({ ...prev, [prestamoId]: data })); fetchPrestamos(); toast('Abono eliminado correctamente', 'exito'); } catch (err) { toast(err.message || 'Error al eliminar el abono', 'error'); } },
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

  const handleQuickAbonar = (loan) => { setSelectedLoanForAbono(loan); setActiveTab('abonos'); };

  const handleGenerarPDF = async (loan) => {
    if (generandoPDF) return;
    if (!loan) { toast('No hay datos del préstamo para generar el PDF', 'error'); return; }
    setGenerandoPDF(loan.id);
    try {
      const [abonos, todosClientes] = await Promise.all([api.getAbonos(loan.id), api.getClientes()]);
      const cliente = Array.isArray(todosClientes) ? todosClientes.find(c => c.id === loan.cliente_id) || {} : {};
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      setTimeout(() => { generarEstadoCuentaPDF(loan, abonos, cliente, user.nombre_usuario || 'Usuario'); setGenerandoPDF(null); }, 100);
    } catch (err) { toast('Error al cargar datos para generar el PDF', 'error'); setGenerandoPDF(null); }
  };

  const capitalNumerico = limpiar(capitalDisplay);
  const tasaNum = parseFloat(tasaInteres) || 0;
  const interesMensualPreview = capitalNumerico * tasaNum / 100;

  const filteredPrestamos = prestamos.filter(p => p.deudor.toLowerCase().includes(searchTerm.toLowerCase()));

  const inputClasses = "w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all";
  const inputFocusStyle = { borderColor: 'var(--color-border)', background: 'var(--bg-input)', color: 'var(--color-text)' };

  const modalFooter = (isEdit) => (
    <div className="flex gap-3 pt-4 border-t flex-shrink-0" style={{ borderColor: 'var(--color-border)' }}>
      <button type="button" onClick={() => setIsModalOpen(false)} disabled={creating}
        className="flex-1 min-h-[44px] rounded-xl border text-sm font-medium transition-all"
        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)', background: 'var(--color-card)' }}>
        Cancelar
      </button>
      <button type="submit" disabled={creating}
        className="flex-1 min-h-[44px] rounded-xl text-sm font-bold text-white transition-all"
        style={{ background: 'linear-gradient(135deg, #00C896, #00A87A)' }}>
        {creating ? 'Guardando...' : (isEdit ? 'Actualizar préstamo' : 'Guardar préstamo')}
      </button>
    </div>
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
          <input type="text" placeholder="Buscar deudor..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className={inputClasses} style={{ paddingLeft: '2.25rem', ...inputFocusStyle }} />
        </div>
        <button onClick={handleOpenModal}
          className="inline-flex items-center gap-2 min-h-[44px] px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all shadow-sm"
          style={{ background: 'linear-gradient(135deg, #6C63FF, #5A52E0)' }}>
          <Plus size={18} /> <span className="hidden sm:inline">Nuevo Préstamo</span>
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border p-4 flex items-center gap-4" style={{ borderColor: 'var(--color-border)' }}>
              <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl text-sm font-medium text-center" style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)', border: '1px solid var(--danger-border)' }}>{error}</div>
      ) : filteredPrestamos.length === 0 && prestamos.length === 0 ? (
        <EstadoVacio icono="💳" titulo="Aún no tienes préstamos registrados" descripcion="Comienza creando un préstamo para hacer seguimiento de capital, intereses y abonos." accion={handleOpenModal} textoAccion="Crear primer préstamo" />
      ) : filteredPrestamos.length === 0 ? (
        <EstadoVacio icono="🔍" titulo="Sin resultados" descripcion={`No se encontraron préstamos para "${searchTerm}".`} accion={() => setSearchTerm('')} textoAccion="Limpiar búsqueda" />
      ) : (
        <>
          {/* MOBILE CARDS */}
          <div className="lg:hidden space-y-3">
            {filteredPrestamos.map((loan) => {
              const isExpanded = expandedLoanId === loan.id;
              const isActivo = parseFloat(loan.capital_pendiente) > 0;
              const isHighlighted = highlightedId === loan.id;
              return (
                <div key={loan.id} className="rounded-2xl border p-4 shadow-sm transition-all" style={{
                  borderColor: isHighlighted ? 'var(--color-success)' : 'var(--color-border)',
                  background: 'var(--color-card)',
                  boxShadow: isHighlighted ? '0 0 0 2px rgba(0,200,150,0.2)' : undefined,
                }}>
                  {/* HEADER */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-base" style={{ color: 'var(--color-text)' }}>{loan.deudor}</h3>
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Inicio: {formatFecha(loan.fecha_inicio)}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${
                      isActivo ? 'bg-green-500/10 text-green-600' : 'bg-gray-500/10 text-gray-500'
                    }`}>
                      {isActivo ? 'Activo' : 'Saldado'}
                    </span>
                  </div>

                  {/* FINANCIAL GRID */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-3">
                    {[
                      { label: 'Capital',        valor: loan.capital_original,        color: 'var(--color-text)' },
                      { label: 'Pendiente',      valor: loan.capital_pendiente,       color: 'var(--color-danger)' },
                      { label: 'Int. Mensual',   valor: loan.interes_mensual,         color: 'var(--color-primary)' },
                      { label: 'Int. Pendiente', valor: loan.interes_pendiente,       color: 'var(--color-danger)' },
                      { label: 'Int. Cobrados',  valor: loan.total_abonado_interes,   color: 'var(--color-success)' },
                      { label: 'Tasa',           valor: `${loan.tasa_interes}%`,      color: 'var(--color-text)', raw: true },
                    ].map(({ label, valor, color, raw }) => (
                      <div key={label}>
                        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
                        <p className="font-semibold text-sm font-mono" style={{ color }}>
                          {raw ? valor : formatCOP(valor)}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* PRÓXIMO COBRO */}
                  {loan.proximo_vencimiento && (
                    <div className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-3 py-2 mb-3">
                      <span className="text-xs" style={{ color: 'var(--color-primary)' }}>📅 Próximo cobro:</span>
                      <span className="text-xs font-semibold" style={{ color: 'var(--color-primary)' }}>
                        {loan.dias_para_vencer === 0 ? '⚠️ Vence hoy' : loan.dias_para_vencer < 0 ? `Venció hace ${Math.abs(loan.dias_para_vencer)} días` : loan.proximo_vencimiento}
                      </span>
                    </div>
                  )}

                  {/* ACTION BUTTONS */}
                  <div className="flex gap-2 mt-3">
                    {isActivo && (
                      <button onClick={() => handleQuickAbonar(loan)}
                        className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-semibold text-sm transition-all">
                        💰 Abonar
                      </button>
                    )}
                    <button onClick={() => handleGenerarPDF(loan)} disabled={generandoPDF === loan.id}
                      className={`${isActivo ? 'flex-1' : 'w-full'} flex items-center justify-center gap-2 border py-3 rounded-xl font-medium text-sm transition-all`}
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                      📄 {generandoPDF === loan.id ? '...' : 'PDF'}
                    </button>
                  </div>

                  {/* EDIT / DELETE / EXPAND */}
                  <div className="flex justify-center gap-3 mt-2 pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
                    <button onClick={() => handleEditClick(loan)}
                      className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm transition-all"
                      style={{ color: 'var(--color-text-secondary)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99,102,241,0.08)'; e.currentTarget.style.color = '#4F46E5'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-secondary)'; }}>
                      ✏️ Editar
                    </button>
                    <button onClick={() => handleDeletePrestamo(loan.id)}
                      className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm transition-all"
                      style={{ color: 'var(--color-text-secondary)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = '#EF4444'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-secondary)'; }}>
                      🗑️ Eliminar
                    </button>
                    <button onClick={() => handleToggleExpand(loan.id)}
                      className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm transition-all"
                      style={{ color: 'var(--color-text-secondary)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99,102,241,0.08)'; e.currentTarget.style.color = '#4F46E5'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-secondary)'; }}>
                      {isExpanded ? '▲ Menos' : '▼ Más'}
                    </button>
                  </div>

                  {isExpanded && loanAbonos[loan.id]?.length > 0 && (
                    <div className="mt-3 pt-3 border-t space-y-2" style={{ borderColor: 'var(--color-border)' }}>
                      <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>Historial de Abonos</p>
                      {loanAbonos[loan.id].map((abono) => (
                        <div key={abono.id} className="flex items-center justify-between py-1.5 text-xs border-b last:border-b-0" style={{ borderColor: 'var(--color-border)' }}>
                          <div>
                            <span className="font-semibold font-mono" style={{ color: abono.tipo === 'capital' ? 'var(--color-success)' : 'var(--color-warning)' }}>{formatCOP(abono.monto)}</span>
                            <span className="ml-1.5 text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{abono.tipo === 'capital' ? 'Capital' : 'Interés'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span style={{ color: 'var(--color-text-secondary)' }}>{formatFecha(abono.fecha)}</span>
                            <button onClick={() => handleDeleteAbono(abono.id, loan.id)} className="min-h-[36px] min-w-[36px] flex items-center justify-center" style={{ color: 'var(--color-danger)', background: 'none', border: 'none' }} aria-label="Eliminar abono"><Trash2 size={12} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {isExpanded && (!loanAbonos[loan.id] || loanAbonos[loan.id].length === 0) && (
                    <p className="mt-3 text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>Sin abonos registrados.</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* DESKTOP TABLE */}
          <div className="hidden lg:block">
            <div className="rounded-2xl border overflow-hidden shadow-sm" style={{ borderColor: 'var(--color-border)', background: 'var(--color-card)' }}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr style={{ background: 'var(--color-accent-soft)' }}>
                      <th className="px-4 py-3 text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--color-text-secondary)', width: '40px' }}></th>
                      <th className="px-4 py-3 text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Deudor</th>
                      <th className="px-4 py-3 text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Capital Original</th>
                      <th className="px-4 py-3 text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Capital Pendiente</th>
                      <th className="px-4 py-3 text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Int. Mensual</th>
                      <th className="px-4 py-3 text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Int. Pendiente</th>
                      <th className="px-4 py-3 text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Int. Cobrados</th>
                      <th className="px-4 py-3 text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Tasa</th>
                      <th className="px-4 py-3 text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Desde</th>
                      <th className="px-4 py-3 text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Estado</th>
                      <th className="px-4 py-3 text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPrestamos.map((loan) => {
                      const isExpanded = expandedLoanId === loan.id;
                      const isActivo = parseFloat(loan.capital_pendiente) > 0;
                      const isHighlighted = highlightedId === loan.id;
                      return (
                        <Fragment key={loan.id}>
                          <tr className="transition-colors" style={{ background: isHighlighted ? 'rgba(0,200,150,0.04)' : undefined }} onMouseEnter={(e) => { if (!isHighlighted) e.currentTarget.style.background = 'rgba(108,99,255,0.02)'; }} onMouseLeave={(e) => { if (!isHighlighted) e.currentTarget.style.background = ''; }}>
                            <td className="px-4 py-3">
                              <button onClick={() => handleToggleExpand(loan.id)} className="min-h-[44px] min-w-[44px] flex items-center justify-center" style={{ color: 'var(--color-text-secondary)', cursor: 'pointer', background: 'none', border: 'none' }} aria-label={isExpanded ? 'Colapsar' : 'Expandir'}>
                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </button>
                            </td>
                            <td className="px-4 py-3 font-semibold" style={{ color: 'var(--color-text)' }}>{loan.deudor}</td>
                            <td className="px-4 py-3 font-mono font-medium" style={{ color: 'var(--color-text)' }}>{formatCOP(loan.capital_original)}</td>
                            <td className="px-4 py-3 font-mono font-medium" style={{ color: isActivo ? 'var(--color-danger)' : 'var(--color-success)' }}>{formatCOP(loan.capital_pendiente)}</td>
                            <td className="px-4 py-3 font-mono font-medium" style={{ color: 'var(--color-success)' }}>{formatCOP(loan.interes_mensual)}</td>
                            <td className="px-4 py-3 font-mono font-medium" style={{ color: parseFloat(loan.interes_pendiente) > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>{formatCOP(loan.interes_pendiente)}</td>
                            <td className="px-4 py-3 font-mono font-medium" style={{ color: 'var(--color-success)' }}>{formatCOP(loan.total_abonado_interes)}</td>
                            <td className="px-4 py-3">{parseFloat(loan.tasa_interes) === 0
                              ? <span className="px-1.5 py-0.5 rounded text-[10px]" style={{ background: 'var(--warning-bg)', color: 'var(--warning-text)', border: '1px solid var(--warning-border)' }}>Sin interés</span>
                              : <span style={{ color: 'var(--color-text)' }}>{loan.tasa_interes}%</span>
                            }</td>
                            <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{formatFecha(loan.fecha_inicio)}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold`}
                                style={{ background: isActivo ? 'var(--success-bg)' : 'var(--danger-bg)', color: isActivo ? 'var(--success-text)' : 'var(--danger-text)', border: `1px solid ${isActivo ? 'var(--success-border)' : 'var(--danger-border)'}` }}>
                                {isActivo ? 'Activo' : 'Pagado'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                {isActivo && <button onClick={() => handleQuickAbonar(loan)} className="min-h-[44px] px-2.5 rounded-xl border text-xs font-medium transition-all hover:bg-gray-50" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }} title="Abonar"><Receipt size={15} /></button>}
                                <button onClick={() => handleGenerarPDF(loan)} disabled={generandoPDF === loan.id} className="min-h-[44px] px-2.5 rounded-xl border text-xs font-medium transition-all hover:bg-gray-50 inline-flex items-center gap-1" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }} title="PDF">
                                  {generandoPDF === loan.id ? '...' : <><FileDown size={14} /> PDF</>}
                                </button>
                                <button onClick={() => handleEditClick(loan)} className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border transition-all hover:bg-gray-50" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }} title="Editar"><Edit size={14} /></button>
                                <button onClick={() => handleDeletePrestamo(loan.id)} className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border transition-all hover:bg-red-50" style={{ borderColor: 'rgba(255,71,87,0.2)', color: 'var(--color-danger)' }} title="Eliminar"><Trash2 size={14} /></button>
                              </div>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr>
                              <td colSpan={11} className="px-4 py-3" style={{ background: 'var(--color-accent-soft)' }}>
                                <div className="pl-4 border-l-[3px]" style={{ borderColor: 'var(--color-primary)' }}>
                                  <h4 className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: 'var(--color-text-secondary)' }}><Receipt size={13} /> Historial de Abonos</h4>
                                  {loadingAbonos && !loanAbonos[loan.id] ? (
                                    <p className="text-xs py-2" style={{ color: 'var(--color-text-secondary)' }}>Cargando historial...</p>
                                  ) : !loanAbonos[loan.id] || loanAbonos[loan.id].length === 0 ? (
                                    <p className="text-xs py-2" style={{ color: 'var(--color-text-muted)' }}>No se han registrado abonos.</p>
                                  ) : (
                                    <table className="w-full text-left text-xs mt-2" style={{ fontSize: '0.8rem' }}>
                                      <thead><tr><th className="px-3 py-2 font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>Fecha</th><th className="px-3 py-2 font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>Monto</th><th className="px-3 py-2 font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>Tipo</th><th className="px-3 py-2 font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>Nota</th><th className="px-3 py-2 font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>Acciones</th></tr></thead>
                                      <tbody>
                                        {loanAbonos[loan.id].map((abono) => (
                                          <tr key={abono.id} className="border-b last:border-b-0" style={{ borderColor: 'var(--color-border)' }}>
                                            <td className="px-3 py-2">{formatFecha(abono.fecha)}</td>
                                            <td className="px-3 py-2 font-semibold font-mono" style={{ color: abono.tipo === 'capital' ? 'var(--color-success)' : 'var(--color-warning)' }}>{formatCOP(abono.monto)}</td>
                                            <td className="px-3 py-2"><span className="px-1.5 py-0.5 rounded text-[10px]" style={{ background: abono.tipo === 'capital' ? 'var(--success-bg)' : 'var(--warning-bg)', color: abono.tipo === 'capital' ? 'var(--success-text)' : 'var(--warning-text)' }}>{abono.tipo === 'capital' ? 'A Capital' : 'A Interés'}</span></td>
                                            <td className="px-3 py-2" style={{ color: 'var(--color-text-secondary)' }}>{abono.nota || '—'}</td>
                                            <td className="px-3 py-2">
                                              <button onClick={() => handleDeleteAbono(abono.id, loan.id)} className="min-h-[36px] min-w-[36px] flex items-center justify-center" style={{ color: 'var(--color-danger)', background: 'none', border: 'none', cursor: 'pointer' }} title="Eliminar"><Trash2 size={12} /></button>
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
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-0 sm:p-6 animate-fade-in" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }} onClick={() => setIsModalOpen(false)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] flex flex-col sm:animate-modal-enter" style={{ background: 'var(--color-card)' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b flex-shrink-0" style={{ borderColor: 'var(--color-border)' }}>
              <h3 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>{editingLoanId ? 'Editar Préstamo' : 'Nuevo Préstamo'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-lg transition-all" style={{ color: 'var(--color-text-secondary)' }} aria-label="Cerrar">×</button>
            </div>
            <form onSubmit={handleCreatePrestamo} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                {cajaSaldo !== null && !editingLoanId && (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium" style={{
                    background: cajaSaldo >= capitalNumerico ? 'var(--success-bg)' : 'var(--danger-bg)',
                    border: `1px solid ${cajaSaldo >= capitalNumerico ? 'var(--success-border)' : 'var(--danger-border)'}`,
                    color: cajaSaldo >= capitalNumerico ? 'var(--success-text)' : 'var(--danger-text)',
                  }}>
                    <DollarSign size={16} />
                    <span>Disponible en caja: <strong>{formatCOP(cajaSaldo)}</strong>
                      {capitalNumerico > 0 && <> — {cajaSaldo >= capitalNumerico ? 'Fondos suficientes ✅' : '⚠️ Saldo insuficiente'}</>}
                    </span>
                  </div>
                )}
                {modalError && <div className="px-4 py-3 rounded-xl text-sm font-medium text-center" style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)', border: '1px solid var(--danger-border)' }}>{modalError}</div>}

                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-soft)' }}>Cliente *</label>
                  {clientes.length === 0 ? (
                    <div className="px-4 py-3 rounded-xl text-sm" style={{ background: 'var(--color-accent-soft)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                      ⚠️ No hay clientes registrados.{' '}
                      <span className="font-semibold underline cursor-pointer" style={{ color: 'var(--color-accent)' }} onClick={() => setActiveTab('clientes')}>Crea un cliente primero</span>
                    </div>
                  ) : (
                    <select value={clienteSeleccionado} onChange={e => { setClienteSeleccionado(e.target.value); const c = clientes.find(cl => cl.id === parseInt(e.target.value)); if (c) setDeudor(c.nombre); }}
                      style={{ ...inputFocusStyle, width: '100%', padding: '12px 14px', borderRadius: '12px', fontSize: '16px', cursor: 'pointer' }}>
                      <option value="" disabled>Selecciona un cliente</option>
                      {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}{parseFloat(c.deuda_total) > 0 ? ` — Deuda: $${parseFloat(c.deuda_total).toLocaleString('es-CO')}` : ' — Sin deuda activa'}</option>)}
                    </select>
                  )}
                </div>

                <div>
                  <label htmlFor="modal-capital" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-soft)' }}>Capital Original (COP) *</label>
                  <div className="relative">
                    <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
                    <input id="modal-capital" type="text" inputMode="decimal" className="w-full rounded-xl border px-4 py-2.5 pl-9 text-sm outline-none transition-all" placeholder="monto en COP (ej: 1.000.000)" value={capitalDisplay} onChange={(e) => setCapitalDisplay(formatear(e.target.value))} disabled={creating} required style={inputFocusStyle} />
                  </div>
                </div>

                <div>
                  <label htmlFor="modal-tasa" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-soft)' }}>Tasa de Interés (% Mensual)</label>
                  <div className="relative">
                    <Percent size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
                    <input id="modal-tasa" type="number" min="0" step="0.01" className="w-full rounded-xl border px-4 py-2.5 pl-9 text-sm outline-none transition-all" value={tasaInteres} onChange={(e) => setTasaInteres(e.target.value)} disabled={creating} required style={inputFocusStyle} />
                  </div>
                </div>

                {capitalNumerico > 0 && tasaNum > 0 && (
                  <div className="px-4 py-3 rounded-xl text-sm" style={{ background: 'color-mix(in srgb, var(--color-primary) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--color-primary) 30%, transparent)' }}>
                    💡 Interés mensual estimado: <strong>${interesMensualPreview.toLocaleString('es-CO')}</strong>
                  </div>
                )}

                <div>
                  <label htmlFor="modal-fecha" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-soft)' }}>Fecha de Inicio *</label>
                  <div className="relative">
                    <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
                    <input id="modal-fecha" type="date" className="w-full rounded-xl border px-4 py-2.5 pl-9 text-sm outline-none transition-all" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} disabled={creating} required style={inputFocusStyle} />
                  </div>
                </div>

                {editingLoanId && (
                  <>
                    <div>
                      <label htmlFor="modal-capital-pendiente" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-soft)' }}>Capital Pendiente</label>
                      <div className="relative">
                        <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
                        <input id="modal-capital-pendiente" type="text" inputMode="decimal" className="w-full rounded-xl border px-4 py-2.5 pl-9 text-sm outline-none transition-all" placeholder="monto pendiente" value={capitalPendienteDisplay} onChange={(e) => setCapitalPendienteDisplay(formatear(e.target.value))} disabled={creating} style={inputFocusStyle} />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="modal-concepto" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-soft)' }}>Concepto</label>
                      <input id="modal-concepto" type="text" className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all" placeholder="Ej: Préstamo para negocio" value={concepto} onChange={(e) => setConcepto(e.target.value)} disabled={creating} style={inputFocusStyle} />
                    </div>
                    <label className="flex items-center gap-2.5 cursor-pointer font-medium min-h-[44px]" style={{ color: 'var(--color-text)' }}>
                      <input type="checkbox" checked={estadoActivo} onChange={(e) => setEstadoActivo(e.target.checked)} style={{ accentColor: 'var(--color-accent)', width: '18px', height: '18px' }} disabled={creating} />
                      <span className="text-sm">Préstamo activo</span>
                    </label>
                  </>
                )}
              </div>
              <div className="px-5 pb-5 pt-4 border-t flex-shrink-0" style={{ borderColor: 'var(--color-border)' }}>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} disabled={creating}
                    className="flex-1 min-h-[44px] rounded-xl border text-sm font-medium transition-all"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)', background: 'var(--color-card)' }}>
                    Cancelar
                  </button>
                  <button type="submit" disabled={creating}
                    className="flex-1 min-h-[44px] rounded-xl text-sm font-bold text-white transition-all shadow-sm"
                    style={{ background: 'linear-gradient(135deg, #6C63FF, #5A52E0)' }}>
                    {creating ? 'Guardando...' : (editingLoanId ? 'Actualizar' : 'Guardar préstamo')}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirm && <ModalConfirm mensaje={confirm.mensaje} onConfirmar={confirm.onConfirmar} onCancelar={confirm.onCancelar} />}
    </div>
  );
}
