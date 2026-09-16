import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import Sidebar from './components/Sidebar';
import Login from './components/Login';
import { ToastProvider } from './components/Toast';
import { RealtimeProvider } from './contexts/RealtimeContext';
import { Shield, Bell, BarChart3, Receipt as ReceiptIcon, CircleDollarSign, Users, Wallet, MoreHorizontal, User } from 'lucide-react';
import { api } from './utils/api';
import { SelectorTema } from './components/SelectorTema';
import { useTema } from './hooks/useTema';

const Resumen = lazy(() => import('./components/Resumen'));
const Prestamos = lazy(() => import('./components/Prestamos'));
const Clientes = lazy(() => import('./components/Clientes'));
const Abonos = lazy(() => import('./components/Abonos'));
const AdminUsuarios = lazy(() => import('./components/AdminUsuarios'));
const Caja = lazy(() => import('./components/Caja'));
const Perfil = lazy(() => import('./components/Perfil'));

function Spinner() {
  return (
    <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
        <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Cargando...</span>
      </div>
    </div>
  );
}

const menuItems = [
  { id: 'resumen', label: 'Resumen', icon: BarChart3 },
  { id: 'prestamos', label: 'Préstamos', icon: CircleDollarSign },
  { id: 'clientes', label: 'Clientes', icon: Users },
  { id: 'abonos', label: 'Abonos', icon: ReceiptIcon },
  { id: 'caja', label: 'Caja', icon: Wallet },
];

export default function App() {
  useTema();
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('resumen');
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [prestamos, setPrestamos] = useState([]);
  const [verNotifs, setVerNotifs] = useState(false);
  const [showMobileMore, setShowMobileMore] = useState(false);
  const [notifStatus, setNotifStatus] = useState({ id: null, loading: false, error: null, success: false });

  useEffect(() => {
    api.getPrestamos().then(setPrestamos).catch(() => {});
  }, []);

  const notificaciones = prestamos?.filter(p => {
    if (!p.activo) return false;
    const hoy = new Date();
    const inicio = new Date(p.fecha_inicio);
    const dias = (hoy - inicio) / (1000 * 60 * 60 * 24);
    return dias > 90 && p.total_abonado_interes === 0;
  }).map(p => ({
    id: p.id,
    deudor: p.deudor,
    mensaje: `⚠️ ${p.deudor} lleva más de 3 meses sin abonar`
  })) || [];

  const handleSendNotification = async (n) => {
    setNotifStatus({ id: n.id, loading: true, error: null, success: false });
    try {
      await api.sendNotification({ deudor: n.deudor, mensaje: n.mensaje });
      setNotifStatus({ id: n.id, loading: false, error: null, success: true });
      setTimeout(() => setNotifStatus({ id: null, loading: false, error: null, success: false }), 3000);
    } catch (err) {
      setNotifStatus({ id: n.id, loading: false, error: err.message, success: false });
    }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
    }
  }, [token]);

  const handleLoginSuccess = useCallback((newToken, loggedUser) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(loggedUser));
    setToken(newToken);
    setUser(loggedUser);
    setActiveTab('resumen');
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken('');
    setUser(null);
  }, []);

  const handleUserUpdate = useCallback((updated) => {
    setUser(prev => {
      const nuevo = { ...prev, ...updated };
      localStorage.setItem('user', JSON.stringify(nuevo));
      return nuevo;
    });
  }, []);

  if (!token || !user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'resumen': return <Resumen />;
      case 'prestamos':
        return <Prestamos setActiveTab={setActiveTab} setSelectedLoanForAbono={setSelectedLoan} />;
      case 'clientes': return <Clientes />;
      case 'abonos':
        return <Abonos selectedLoan={selectedLoan} setSelectedLoan={setSelectedLoan} />;
      case 'caja': return <Caja />;
      case 'usuarios': return user.es_admin ? <AdminUsuarios /> : <Resumen />;
      case 'perfil': return <Perfil user={user} onUserUpdate={handleUserUpdate} />;
      default: return <Resumen />;
    }
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case 'resumen': return 'Dashboard';
      case 'prestamos': return 'Cartera de Pr\u00e9stamos';
      case 'clientes': return 'Gesti\u00f3n de Clientes';
      case 'abonos': return 'Procesamiento de Abonos';
      case 'caja': return 'Control de Caja';
      case 'usuarios': return 'Administraci\u00f3n';
      case 'perfil': return 'Mi Perfil';
      default: return 'Dashboard';
    }
  };

  const mobileNavItems = [
    { id: 'resumen', icon: BarChart3, label: 'Resumen' },
    { id: 'prestamos', icon: CircleDollarSign, label: 'Pr\u00e9stamos' },
    { id: 'clientes', icon: Users, label: 'Clientes' },
    { id: 'abonos', icon: ReceiptIcon, label: 'Abonos' },
    { id: 'more', icon: MoreHorizontal, label: 'M\u00e1s' },
  ];

  return (
    <ToastProvider>
    <RealtimeProvider>
    <div className="min-h-screen w-full overflow-x-hidden" style={{ background: 'var(--color-bg)' }}>
      {/* Desktop Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onLogout={handleLogout}
      />

      {/* Main content area */}
      <main className="ml-0 md:ml-[260px] min-h-screen overflow-x-hidden flex flex-col">
        {/* Fixed Header */}
        <header
          className="fixed top-0 right-0 left-0 md:left-[260px] z-30 h-14 flex items-center gap-3 px-4 border-b shadow-sm"
          style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
          <h1 className="text-lg font-bold truncate flex-1" style={{ color: 'var(--color-text)' }}>
            {getTabTitle()}
          </h1>
          <div className="flex items-center gap-2 flex-shrink-0">
            <SelectorTema />
            <div className="relative">
              <button
                className="relative w-9 h-9 rounded-full border flex items-center justify-center"
                style={{ borderColor: 'var(--color-border)', background: 'var(--color-card)', color: 'var(--color-text-soft)' }}
                onClick={() => setVerNotifs(!verNotifs)}
                aria-label="Notificaciones"
              >
                <Bell size={16} />
                {notificaciones.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-white text-[9px] font-bold flex items-center justify-center" style={{ background: 'var(--color-danger)' }}>
                    {notificaciones.length}
                  </span>
                )}
              </button>
              {verNotifs && (
                <div className="absolute top-12 right-0 w-72 lg:w-80 z-[1000] rounded-xl shadow-xl border overflow-hidden animate-fade-in" style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
                  <div className="px-4 py-3 border-b text-sm font-semibold" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
                    Notificaciones
                  </div>
                  {notificaciones.length === 0 ? (
                    <p className="px-4 py-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>✅ Todo al d\u00eda, sin alertas pendientes</p>
                  ) : (
                    notificaciones.map(n => (
                      <div key={n.id} className="px-4 py-2.5 text-sm border-b last:border-b-0" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
                        <div className="flex justify-between items-start gap-2">
                          <p className="flex-1">{n.mensaje}</p>
                          <button 
                            onClick={() => handleSendNotification(n)}
                            disabled={notifStatus.loading && notifStatus.id === n.id}
                            className="px-2 py-1 text-xs rounded transition-colors disabled:opacity-50 flex-shrink-0"
                            style={{ background: 'var(--color-primary)', color: 'white' }}
                          >
                            {notifStatus.loading && notifStatus.id === n.id ? '...' : 'Notificar'}
                          </button>
                        </div>
                        {notifStatus.id === n.id && notifStatus.error && (
                          <div className="mt-2 text-[11px] p-1.5 rounded" style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)', border: '1px solid var(--danger-border)' }}>
                            ❌ {notifStatus.error}
                          </div>
                        )}
                        {notifStatus.id === n.id && notifStatus.success && (
                          <div className="mt-2 text-[11px] p-1.5 rounded" style={{ background: 'var(--success-bg)', color: 'var(--success-text)', border: '1px solid var(--success-border)' }}>
                            ✅ Enviado
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content with padding for fixed header */}
        <section className="flex-1 px-4 lg:px-6 pt-20 pb-24 md:pt-24 md:pb-6 min-w-0 overflow-x-hidden">
          <Suspense fallback={<Spinner />}>
            {renderTabContent()}
          </Suspense>
        </section>
      </main>

      {/* Mobile Bottom Navbar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t safe-area-bottom shadow-lg" style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
        <div className="flex items-center justify-around py-1.5">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === 'more' ? false : activeTab === item.id;
            const isMoreActive = item.id === 'more' && showMobileMore;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'more') {
                    setShowMobileMore(!showMobileMore);
                  } else {
                    setActiveTab(item.id);
                    setShowMobileMore(false);
                  }
                }}
                className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors min-h-[44px] min-w-[56px]"
                style={{ color: (isActive || isMoreActive) ? 'var(--color-primary)' : 'var(--color-text-secondary)' }}
              >
                <Icon size={20} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Mobile More Drawer */}
      {showMobileMore && (
        <div className="md:hidden fixed inset-0 z-40" onClick={() => setShowMobileMore(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute bottom-20 left-4 right-4 rounded-2xl shadow-2xl border overflow-hidden animate-slide-up" style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
            {user.es_admin && (
              <button
                onClick={() => { setActiveTab('usuarios'); setShowMobileMore(false); }}
                className="w-full flex items-center gap-3 px-5 py-4 text-sm font-medium border-b transition-all"
                style={{ borderColor: 'var(--color-border)', color: activeTab === 'usuarios' ? 'var(--color-primary)' : 'var(--color-text)', background: 'transparent' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <Shield size={18} /> Usuarios
              </button>
            )}
            <button
              onClick={() => { setActiveTab('perfil'); setShowMobileMore(false); }}
              className="w-full flex items-center gap-3 px-5 py-4 text-sm font-medium border-b transition-all"
              style={{ borderColor: 'var(--color-border)', color: activeTab === 'perfil' ? 'var(--color-primary)' : 'var(--color-text)', background: 'transparent' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <User size={18} /> Mi Perfil
            </button>
            <button
              onClick={() => { setActiveTab('caja'); setShowMobileMore(false); }}
              className="w-full flex items-center gap-3 px-5 py-4 text-sm font-medium border-b transition-all"
              style={{ borderColor: 'var(--color-border)', color: activeTab === 'caja' ? 'var(--color-primary)' : 'var(--color-text)', background: 'transparent' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <Wallet size={18} /> Caja
            </button>
            <button
              onClick={() => { handleLogout(); setShowMobileMore(false); }}
              className="w-full flex items-center gap-3 px-5 py-4 text-sm font-medium transition-all"
              style={{ color: 'var(--color-danger)', background: 'transparent' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              Cerrar sesi\u00f3n
            </button>
          </div>
        </div>
      )}
    </div>
    </RealtimeProvider>
    </ToastProvider>
  );
}
