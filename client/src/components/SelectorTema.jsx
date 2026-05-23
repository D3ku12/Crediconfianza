import { useState, useEffect } from 'react';
import { useTema } from '../hooks/useTema';

export function SelectorTema() {
  const { temaActual, setTemaActual, TEMAS } = useTema();
  const [abierto, setAbierto] = useState(false);
  const esMobile = window.innerWidth < 640;

  useEffect(() => {
    if (!abierto) return;
    const cerrar = (e) => {
      if (!e.target.closest('[data-selector-tema]')) {
        setAbierto(false);
      }
    };
    document.addEventListener('mousedown', cerrar);
    document.addEventListener('touchstart', cerrar);
    return () => {
      document.removeEventListener('mousedown', cerrar);
      document.removeEventListener('touchstart', cerrar);
    };
  }, [abierto]);

  return (
    <div style={{ position: 'relative' }} data-selector-tema>
      <button
        onClick={() => setAbierto(!abierto)}
        title="Cambiar tema"
        style={{
          background: 'none',
          border: 'none',
          fontSize: '20px',
          cursor: 'pointer',
          padding: '10px',
          minWidth: '44px',
          minHeight: '44px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '10px',
          transition: 'background 0.15s ease',
        }}
      >
        🎨
      </button>

      {abierto && esMobile && (
        <div
          onClick={() => setAbierto(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.3)',
            zIndex: 999,
          }}
        />
      )}

      {abierto && (
        <div style={{
          position: 'fixed',
          ...(esMobile ? {
            bottom: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '90vw',
            maxWidth: '320px',
          } : {
            top: '44px',
            right: 0,
            minWidth: '160px',
          }),
          background: 'var(--color-card)',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          padding: '8px',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}>
          {Object.entries(TEMAS).map(([key, val]) => (
            <button
              key={key}
              onClick={() => { setTemaActual(key); setAbierto(false); }}
              style={{
                background: temaActual === key ? val.primary : 'transparent',
                color: temaActual === key ? 'var(--color-on-primary)' : 'var(--color-primary)',
                border: temaActual === key
                  ? 'none'
                  : '1px solid transparent',
                borderRadius: '10px',
                padding: '12px 16px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                textAlign: 'left',
                width: '100%',
                minHeight: '44px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'background 0.2s ease',
              }}
            >
              {val.nombre}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
