import React from 'react';
import { BarChart3, Receipt, CircleDollarSign, Users, LogOut, Wallet, Shield, User } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, user, onLogout }) {
  const menuItems = [
    { id: 'resumen', label: 'Resumen', icon: BarChart3 },
    { id: 'prestamos', label: 'Pr\u00e9stamos', icon: CircleDollarSign },
    { id: 'clientes', label: 'Clientes', icon: Users },
    { id: 'abonos', label: 'Abonos', icon: Receipt },
    { id: 'caja', label: 'Caja', icon: Wallet },
  ];

  if (user && user.es_admin) {
    menuItems.push({ id: 'usuarios', label: 'Usuarios', icon: Shield });
  }

  return (
    <aside className="hidden md:flex fixed top-0 left-0 bottom-0 z-[100] flex-col w-[260px] bg-white border-r border-gray-100 px-4 py-3" style={{ background: 'var(--color-card-solid, #ffffff)' }}>
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
              onClick={() => setActiveTab(item.id)}
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
            onClick={() => setActiveTab('perfil')}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-all"
            style={{ color: 'var(--color-text-secondary)' }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(99,102,241,0.08)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <User size={20} className="flex-shrink-0" />
            <span>Mi Perfil</span>
          </button>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-all"
            style={{ color: '#EF4444' }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239,68,68,0.06)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <LogOut size={20} className="flex-shrink-0" />
            <span>Cerrar Sesi\u00f3n</span>
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
    </aside>
  );
}
