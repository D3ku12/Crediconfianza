// rebuild forzado - clientes fix
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
          flexDirection: 'column',
          padding: '8px 12px',
          background: 'var(--color-glass)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--color-border)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          gap: '4px',
          marginBottom: 0,
        }}>
          {/* Fila 1: hamburguesa + título + notificaciones */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            minWidth: 0,
          }}>
            <button className="mobile-menu-trigger" onClick={() => setMobileMenuOpen(true)} aria-label="Abrir menú" style={{ flexShrink: 0 }}>
              <Menu size={22} />
            </button>
            <h1 style={{
              fontSize: 'clamp(13px, 3.5vw, 18px)',
              fontWeight: '700',
              color: 'var(--color-text)',
              margin: 0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              flex: 1,
              minWidth: 0,
            }}>
              {getTabTitle()}
            </h1>
            <div className="header-actions" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <SelectorTema />
              <button className="notification-btn" aria-label="Notificaciones" onClick={() => setVerNotifs(!verNotifs)} style={{ position: 'relative', flexShrink: 0 }}>
                <Bell size={18} />
                {notificaciones.length > 0 && (
                  <span style={{
                    position: 'absolute', top: '-4px', right: '-4px',
                    background: 'var(--color-danger)', color: '#fff',
                    borderRadius: '50%', width: '16px', height: '16px',
                    fontSize: '10px', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontWeight: 'bold'
                  }}>
                    {notificaciones.length}
                  </span>
                )}
              </button>
              {verNotifs && (
                <div style={{
                  position: 'absolute', top: '52px', right: '12px',
                  background: 'var(--color-card)', borderRadius: '12px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                  width: 'clamp(240px, 85vw, 340px)', zIndex: 1000, overflow: 'hidden'
                }}>
                  <div style={{ padding: '14px', borderBottom: '1px solid var(--border-color)' }}>
                    <strong style={{ fontSize: '13px' }}>Notificaciones</strong>
                  </div>
                  {notificaciones.length === 0 ? (
                    <p style={{ padding: '14px', color: 'var(--color-text-soft)', fontSize: '13px' }}>
                      ✅ Todo al día, sin alertas pendientes
                    </p>
                  ) : (
                    notificaciones.map(n => (
                      <div key={n.id} style={{
                        padding: '10px 14px', borderBottom: '1px solid var(--border-light)',
                        fontSize: '12px', color: 'var(--color-text)'
                      }}>
                        {n.mensaje}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Fila 2: saludo + badge + avatar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            paddingLeft: '4px',
            minWidth: 0,
            overflow: 'hidden',
          }}>
            <span className="header-greeting" style={{
              fontSize: '12px',
              color: 'var(--text-secondary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              minWidth: 0,
            }}>
              Hola, <strong style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{user.nombre_usuario.split(' ')[0]}</strong>
            </span>
            {user.es_admin && (
              <span className="admin-badge" style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                fontSize: '10px',
                color: 'var(--warning-text)',
                background: 'var(--warning-bg)',
                padding: '1px 8px',
                borderRadius: '99px',
                border: '1px solid var(--warning-border)',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                minWidth: 'fit-content',
              }}>
                <Shield size={8} />
                Admin
              </span>
            )}
            <div className="avatar" style={{
              width: '24px', height: '24px', minWidth: '24px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--color-primary-solid) 0%, var(--color-primary-hover) 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--color-on-primary)', fontSize: '11px', fontWeight: '700',
              flexShrink: 0, marginLeft: 'auto',
            }}>
              {user.nombre_usuario.charAt(0).toUpperCase()}
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
