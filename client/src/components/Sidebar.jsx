import React from 'react';
import { BarChart3, Receipt, CircleDollarSign, Users, LogOut, Wallet } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, user, onLogout }) {
  const menuItems = [
    { id: 'resumen', label: 'Resumen', icon: BarChart3 },
    { id: 'prestamos', label: 'Préstamos', icon: CircleDollarSign },
    { id: 'abonos', label: 'Abonos', icon: Receipt },
    { id: 'caja', label: 'Caja', icon: Wallet },
  ];

  // Agregar menú de administración solo si el usuario es administrador
  if (user && user.es_admin) {
    menuItems.push({ id: 'usuarios', label: 'Administración', icon: Users });
  }

  return (
    <aside className="sidebar">
      <div className="logo-container">
        <span className="logo-icon">🤝</span>
        <span className="logo-text">CREDIALIADO</span>
      </div>

      <ul className="nav-menu">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.id}>
              <div
                className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => setActiveTab(item.id)}
              >
                <Icon className="nav-icon" size={20} />
                <span>{item.label}</span>
              </div>
            </li>
          );
        })}
        
        <li>
          <div className="nav-item logout-btn" onClick={onLogout} style={{ marginTop: '2rem' }}>
            <LogOut size={20} />
            <span>Cerrar Sesión</span>
          </div>
        </li>
      </ul>

      {user && (
        <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem' }}>
            <div 
              style={{ 
                width: '32px', 
                height: '32px', 
                borderRadius: '50%', 
                background: 'linear-gradient(135deg, var(--accent) 0%, #6ee7b7 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '0.85rem'
              }}
            >
              {user.nombre_usuario ? user.nombre_usuario.charAt(0).toUpperCase() : 'U'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: '600', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                {user.nombre_usuario}
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                {user.es_admin ? 'Administrador' : 'Gestor'}
              </span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
