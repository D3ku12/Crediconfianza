import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import Sidebar from './components/Sidebar';
import Login from './components/Login';
import { ToastProvider } from './components/Toast';
import { Shield, Bell, Menu, BarChart3, Receipt as ReceiptIcon, CircleDollarSign, Users, Wallet, MoreHorizontal } from 'lucide-react';
import { api } from './utils/api';
import { SelectorTema } from './components/SelectorTema';
import { useTema } from './hooks/useTema';

const Resumen = lazy(() => import('./components/Resumen'));
const Prestamos = lazy(() => import('./components/Prestamos'));
const Clientes = lazy(() => import('./components/Clientes'));
const Abonos = lazy(() => import('./components/Abonos'));
const AdminUsuarios = lazy(() => import('./components/AdminUsuarios'));
const Caja = lazy(() => import('./components/Caja'));

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

export default function App() {
  useTema();
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('resumen');
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [prestamos, setPrestamos] = useState([]);
  const [verNotifs, setVerNotifs] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showMobileMore, setShowMobileMore] = useState(false);

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
    mensaje: `⚠️ ${p.deudor} lleva más de 3 meses sin abonar`
  })) || [];

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
      default: return <Resumen />;
    }
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case 'resumen': return 'Dashboard';
      case 'prestamos': return 'Cartera de Préstamos';
      case 'clientes': return 'Gestión de Clientes';
      case 'abonos': return 'Procesamiento de Abonos';
      case 'caja': return 'Control de Caja';
      case 'usuarios': return 'Administración';
      default: return 'Dashboard';
    }
  };

  const mobileNavItems = [
    { id: 'resumen', icon: BarChart3, label: 'Resumen' },
    { id: 'prestamos', icon: CircleDollarSign, label: 'Préstamos' },
    { id: 'clientes', icon: Users, label: 'Clientes' },
    { id: 'abonos', icon: ReceiptIcon, label: 'Abonos' },
    { id: 'more', icon: MoreHorizontal, label: 'Más' },
  ];

  return (
    <ToastProvider>
    <div className="flex min-h-screen" style={{ background: 'var(--color-bg)' }}>
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        user={user} 
        onLogout={handleLogout}
        isMobileOpen={mobileMenuOpen}
        closeMobileMenu={() => setMobileMenuOpen(false)}
      />
      
      <main className="flex-1 flex flex-col min-w-0" style={{ marginLeft: '260px' }}>
        <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm" style={{ background: 'var(--color-card)' }}>
          <div className="flex items-center gap-3 px-4 py-3 lg:px-6">
            <button className="lg:hidden flex-shrink-0 p-2 rounded-lg hover:bg-gray-100" onClick={() => setMobileMenuOpen(true)} aria-label="Abrir menú">
              <Menu size={22} />
            </button>
            <h1 className="text-lg font-bold truncate flex-1" style={{ color: 'var(--color-text)' }}>
              {getTabTitle()}
            </h1>
            <div className="flex items-center gap-2 flex-shrink-0">
              <SelectorTema />
              <div className="relative">
                <button className="relative w-9 h-9 rounded-full border flex items-center justify-center" style={{ borderColor: 'var(--color-border)', background: 'var(--color-card)', color: 'var(--color-text-soft)' }} onClick={() => setVerNotifs(!verNotifs)} aria-label="Notificaciones">
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
                      <p className="px-4 py-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>✅ Todo al día, sin alertas pendientes</p>
                    ) : (
                      notificaciones.map(n => (
                        <div key={n.id} className="px-4 py-2.5 text-sm border-b last:border-b-0" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
                          {n.mensaje}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-4 lg:px-6 pb-3">
            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              Hola, <strong style={{ color: 'var(--color-text)' }}>{user.nombre_usuario?.split(' ')[0]}</strong>
            </span>
            {user.es_admin && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ color: 'var(--warning-text)', background: 'var(--warning-bg)', border: '1px solid var(--warning-border)' }}>
                <Shield size={8} /> Admin
              </span>
            )}
          </div>
        </header>

        <section className="flex-1 p-4 lg:p-6 min-w-0 pt-[76px] sm:pt-4 lg:pt-6">
          <Suspense fallback={<Spinner />}>
            {renderTabContent()}
          </Suspense>
        </section>
      </main>

      {/* Mobile Bottom Navbar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 safe-area-bottom shadow-lg" style={{ background: 'var(--color-card)' }}>
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
        <div className="lg:hidden fixed inset-0 z-[60]" onClick={() => setShowMobileMore(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute bottom-16 left-4 right-4 rounded-2xl shadow-2xl border overflow-hidden animate-slide-up" style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
            {user.es_admin && (
              <button
                onClick={() => { setActiveTab('usuarios'); setShowMobileMore(false); }}
                className="w-full flex items-center gap-3 px-5 py-4 text-sm font-medium border-b transition-colors hover:bg-gray-50"
                style={{ borderColor: 'var(--color-border)', color: activeTab === 'usuarios' ? 'var(--color-primary)' : 'var(--color-text)' }}
              >
                <Shield size={18} /> Usuarios
              </button>
            )}
            <button
              onClick={() => { setActiveTab('caja'); setShowMobileMore(false); }}
              className="w-full flex items-center gap-3 px-5 py-4 text-sm font-medium border-b transition-colors hover:bg-gray-50"
              style={{ borderColor: 'var(--color-border)', color: activeTab === 'caja' ? 'var(--color-primary)' : 'var(--color-text)' }}
            >
              <Wallet size={18} /> Caja
            </button>
            <button
              onClick={() => { handleLogout(); setShowMobileMore(false); }}
              className="w-full flex items-center gap-3 px-5 py-4 text-sm font-medium transition-colors hover:bg-red-50"
              style={{ color: 'var(--color-danger)' }}
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
    </ToastProvider>
  );
}
