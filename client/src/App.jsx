import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import Sidebar from './components/Sidebar';
import Login from './components/Login';
import { ToastProvider } from './components/Toast';
import { RealtimeProvider } from './contexts/RealtimeContext';
import { Shield, Bell, BarChart3, Receipt as ReceiptIcon, CircleDollarSign, Users, Wallet, MoreHorizontal, User } from 'lucide-react';
import { SelectorTema } from './components/SelectorTema';
import { useTema } from './hooks/useTema';
import useNotifications from './hooks/useNotifications';

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

const typeColors = { danger: '#ef4444', warning: '#f59e0b', info: '#3b82f6', success: '#22c55e' };

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'ahora mismo';
  if (min < 60) return `hace ${min} min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `hace ${hr} h`;
  const d = Math.floor(hr / 24);
  if (d === 1) return 'hace 1 día';
  return `hace ${d} días`;
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
  const [verNotifs, setVerNotifs] = useState(false);
  const [showMobileMore, setShowMobileMore] = useState(false);
  const { notifications, unreadCount, markAllRead } = useNotifications();

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
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-white text-[9px] font-bold flex items-center justify-center" style={{ background: '#ef4444' }}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
              {verNotifs && (
                <div className="absolute top-12 right-0 w-80 lg:w-96 z-[1000] rounded-xl shadow-xl border overflow-hidden animate-fade-in" style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
                  <div className="px-4 py-3 border-b text-sm font-semibold flex justify-between items-center" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
                    <span>Notificaciones {notifications.length > 0 && `(${notifications.length})`}</span>
                    {notifications.length > 0 && (
                      <button
                        onClick={markAllRead}
                        className="text-[11px] px-2 py-0.5 rounded-md transition-colors"
                        style={{ background: 'var(--color-primary)', color: 'white' }}
                      >
                        Marcar todo como leído
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="px-4 py-4 text-sm text-center" style={{ color: 'var(--color-text-secondary)' }}>✅ Todo al día, sin alertas pendientes</p>
                    ) : (
                      notifications.map(n => {
                        const color = typeColors[n.type] || '#64748b';
                        const isLink = !!n.link;
                        return (
                          <div
                            key={n.id}
                            onClick={() => { if (isLink) { setActiveTab(n.link.replace('/', '')); setVerNotifs(false); } }}
                            className={`px-4 py-2.5 text-sm border-b last:border-b-0 transition-colors ${isLink ? 'cursor-pointer hover:bg-black/5' : ''}`}
                            style={{
                              borderColor: 'var(--color-border)',
                              color: 'var(--color-text)',
                              borderLeft: `3px solid ${color}`,
                              background: `color-mix(in srgb, ${color} 8%, transparent)`,
                            }}
                          >
                            <div className="flex items-start gap-2.5">
                              <span className="text-base leading-none mt-0.5">{n.icon || ''}</span>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-semibold text-[13px] truncate">{n.title}</span>
                                  <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>{timeAgo(n.createdAt)}</span>
                                </div>
                                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{n.message}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
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
