import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Login from './components/Login';
import Resumen from './components/Resumen';
import Prestamos from './components/Prestamos';
import Abonos from './components/Abonos';
import AdminUsuarios from './components/AdminUsuarios';
import { Shield } from 'lucide-react';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('resumen');
  
  // Compartir préstamo seleccionado al presionar "Abonar" rápido
  const [selectedLoan, setSelectedLoan] = useState(null);

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

  const handleLoginSuccess = (newToken, loggedUser) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(loggedUser));
    setToken(newToken);
    setUser(loggedUser);
    setActiveTab('resumen');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken('');
    setUser(null);
  };

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
      case 'abonos':
        return (
          <Abonos 
            selectedLoan={selectedLoan} 
            setSelectedLoan={setSelectedLoan} 
          />
        );
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
      case 'abonos': return 'Procesamiento de Abonos';
      case 'usuarios': return 'Administración de Usuarios';
      default: return 'Dashboard';
    }
  };

  return (
    <div className="app-container">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        user={user} 
        onLogout={handleLogout} 
      />
      
      <main className="main-content">
        <header className="app-header">
          <div>
            <h1>{getTabTitle()}</h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              PRESTAMOEXPRESS — Moneda: COP ($)
            </p>
          </div>
          
          <div className="user-badge">
            <span style={{ color: 'var(--text-secondary)' }}>Hola,</span>
            <span style={{ fontWeight: '600', color: 'white' }}>{user.nombre_usuario}</span>
            {user.es_admin && (
              <span 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.2rem',
                  fontSize: '0.7rem', 
                  color: 'var(--warning)', 
                  background: 'var(--warning-bg)', 
                  padding: '0.15rem 0.5rem', 
                  borderRadius: '99px',
                  border: '1px solid rgba(245,158,11,0.2)'
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
        </header>

        <section style={{ flex: 1 }}>
          {renderTabContent()}
        </section>
      </main>
    </div>
  );
}
