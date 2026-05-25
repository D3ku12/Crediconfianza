import React from 'react';
import { BarChart3, Receipt, CircleDollarSign, Users, LogOut, Wallet, X, Shield } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, user, onLogout, isMobileOpen, closeMobileMenu }) {
  const menuItems = [
    { id: 'resumen', label: 'Resumen', icon: BarChart3 },
    { id: 'prestamos', label: 'Préstamos', icon: CircleDollarSign },
    { id: 'clientes', label: 'Clientes', icon: Users },
    { id: 'abonos', label: 'Abonos', icon: Receipt },
    { id: 'caja', label: 'Caja', icon: Wallet },
  ];

  if (user && user.es_admin) {
    menuItems.push({ id: 'usuarios', label: 'Usuarios', icon: Shield });
  }

  const handleNavClick = (id) => {
    setActiveTab(id);
    if (closeMobileMenu) closeMobileMenu();
  };

  const navContent = (
    <>
      <div className="flex items-center gap-3 px-3 py-4 mb-6">
        <span className="text-2xl">🤝</span>
        <span className="text-lg font-extrabold tracking-tight" style={{ color: 'var(--color-primary)' }}>
          CREDIALIADO
        </span>
      </div>

      <nav className="flex-1 space-y-0.5">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-all relative"
              style={{
                color: isActive ? '#4F46E5' : 'var(--color-text-secondary)',
                background: isActive ? 'rgba(99,102,241,0.08)' : 'transparent',
              }}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full" style={{ background: '#6C63FF' }} />
              )}
              <Icon size={20} className="flex-shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}

        <div className="pt-4 mt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-all"
            style={{ color: '#EF4444' }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239,68,68,0.06)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <LogOut size={20} className="flex-shrink-0" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </nav>

      {user && (
        <div className="mt-auto pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ background: 'var(--color-accent-soft)', color: 'var(--color-primary)' }}>
              {user.nombre_usuario ? user.nombre_usuario.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text)' }}>
                {user.nombre_usuario}
              </p>
              <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                {user.es_admin ? 'Administrador' : 'Gestor'}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed top-0 left-0 bottom-0 z-[100] flex-col w-[260px] bg-white border-r border-gray-100 px-4 py-3" style={{ background: 'var(--color-card-solid, #ffffff)' }}>
        {navContent}
      </aside>

      {/* Mobile drawer */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-[1000]" onClick={closeMobileMenu}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" />
          <aside className="absolute top-0 left-0 bottom-0 w-[280px] bg-white border-r shadow-2xl animate-slide-in-left overflow-y-auto" style={{ background: 'var(--color-card-solid, #ffffff)' }} onClick={(e) => e.stopPropagation()}>
            <button className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-lg border" style={{ borderColor: 'var(--color-border)' }} onClick={closeMobileMenu} aria-label="Cerrar menú">
              <X size={20} />
            </button>
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
}
