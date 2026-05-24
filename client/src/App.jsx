import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import Sidebar from './components/Sidebar';
import Login from './components/Login';
import { ToastProvider } from './components/Toast';
import { Shield, Bell, Menu, X } from 'lucide-react';
import { api } from './utils/api';
import { SelectorTema } from './components/SelectorTema';
import { useTema } from './hooks/useTema';

const Resumen = lazy(() => import('./components/Resumen'));
const Prestamos = lazy(() => import('./components/Prestamos'));
const Clientes = lazy(() => import('./components/Clientes'));
const Abonos = lazy(() => import('./components/Abonos'));
const AdminUsuarios = lazy(() => import('./components/AdminUsuarios'));
const Caja = lazy(() => import('./components/Caja'));

const suspenseFallback = (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', fontSize: '14px', color: 'var(--color-text-soft)' }}>
    Cargando...
  </div>
);

export default function App() {
  useTema();
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('resumen');
  
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [prestamos, setPrestamos] = useState([]);
  const [verNotifs, setVerNotifs] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  // Mapear pestaña activa al componente
  const renderTabContent = () => {
    switch (activeTab) {
      case 'resumen':
        return <Resumen />;
      case 'prestamos':
        return (
          <Prestamos 
            setActiveTab={setActiveTab} 
            setSelectedLoanForAbono={setSelectedLoan} 
          />
        );
      case 'clientes':
        return <Clientes />;
      case 'abonos':
        return (
          <Abonos 
            selectedLoan={selectedLoan} 
            setSelectedLoan={setSelectedLoan} 
          />
        );
      case 'caja':
        return <Caja />;
      case 'usuarios':
        return user.es_admin ? <AdminUsuarios /> : <Resumen />;
      default:
        return <Resumen />;
    }
  };

  // Obtener nombre amigable de la pestaña activa
  const getTabTitle = () => {
    switch (activeTab) {
      case 'resumen': return 'Dashboard';
      case 'prestamos': return 'Cartera de Préstamos';
      case 'clientes': return 'Gestión de Clientes';
      case 'abonos': return 'Procesamiento de Abonos';
      case 'caja': return 'Control de Caja';
      case 'usuarios': return 'Administración de Usuarios';
      default: return 'Dashboard';
    }
  };

  return (
    <ToastProvider>
    <div className="app-container">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        user={user} 
        onLogout={handleLogout}
        isMobileOpen={mobileMenuOpen}
        closeMobileMenu={() => setMobileMenuOpen(false)}
      />
      
      <main className="main-content">
        <header className="app-header" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          background: 'var(--color-glass)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--color-border)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          gap: '8px',
          marginBottom: 0,
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            minWidth: 0,
            flex: 1,
          }}>
            <h1 style={{
              fontSize: 'clamp(14px, 4vw, 20px)',
              fontWeight: '700',
              color: 'var(--color-text)',
              margin: 0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {getTabTitle()}
            </h1>
            <p style={{
              fontSize: 'clamp(11px, 2.5vw, 13px)',
              color: 'var(--text-secondary)',
              margin: 0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              CREDIALIADO — COP ($)
            </p>
          </div>
          
          <button className="mobile-menu-trigger" onClick={() => setMobileMenuOpen(true)} aria-label="Abrir menú">
            <Menu size={24} />
          </button>
          <div className="header-actions" style={{ flexShrink: 0 }}>
            <SelectorTema />
            <button className="notification-btn" aria-label="Notificaciones" onClick={() => setVerNotifs(!verNotifs)} style={{ position: 'relative' }}>
              <Bell size={20} />
              {notificaciones.length > 0 && (
                <span style={{
                  position: 'absolute', top: '-4px', right: '-4px',
                  background: 'var(--color-danger)', color: '#fff',
                  borderRadius: '50%', width: '18px', height: '18px',
                  fontSize: '11px', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontWeight: 'bold'
                }}>
                  {notificaciones.length}
                </span>
              )}
            </button>
            {verNotifs && (
              <div style={{
                position: 'absolute', top: '60px', right: '16px',
                background: 'var(--color-card)', borderRadius: '12px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                width: 'clamp(260px, 90vw, 360px)', zIndex: 1000, overflow: 'hidden'
              }}>
                <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)' }}>
                  <strong style={{ fontSize: '14px' }}>Notificaciones</strong>
                </div>
                {notificaciones.length === 0 ? (
                  <p style={{ padding: '16px', color: 'var(--color-text-soft)', fontSize: '14px' }}>
                    ✅ Todo al día, sin alertas pendientes
                  </p>
                ) : (
                  notificaciones.map(n => (
                    <div key={n.id} style={{
                      padding: '12px 16px', borderBottom: '1px solid var(--border-light)',
                      fontSize: '13px', color: 'var(--color-text)'
                    }}>
                      {n.mensaje}
                    </div>
                  ))
                )}
              </div>
            )}
            <div className="user-badge">
              <span style={{ color: 'var(--text-secondary)' }}>Hola,</span>
              <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{user.nombre_usuario}</span>
              {user.es_admin && (
                <span 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.2rem',
                    fontSize: '0.7rem', 
                    color: 'var(--warning-text)', 
                    background: 'var(--warning-bg)', 
                    padding: '0.15rem 0.5rem', 
                    borderRadius: '99px',
                    border: '1px solid var(--warning-border)'
                  }}
                >
                  <Shield size={10} />
                  Admin
                </span>
              )}
              <div className="avatar">
                {user.nombre_usuario.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        <section style={{ flex: 1, minWidth: 0 }}>
          <Suspense fallback={suspenseFallback}>
            {renderTabContent()}
          </Suspense>
        </section>
      </main>
    </div>
    </ToastProvider>
  );
}
