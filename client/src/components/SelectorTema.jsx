import { useState, useEffect, useRef } from 'react';
import { useTema } from '../hooks/useTema';

export function SelectorTema() {
  const { temaActual, setTemaActual, TEMAS } = useTema();
  const [abierto, setAbierto] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!abierto) return;
    const cerrar = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
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
    <div ref={ref} style={{ position: 'relative' }}>

      <button
        onClick={() => setAbierto(!abierto)}
        title="Personalizar tema"
        className="theme-selector-btn"
        style={{
          background: abierto ? 'var(--color-accent-soft)' : 'transparent',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: '8px 10px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          color: 'var(--color-text)',
          fontSize: '13px',
          fontWeight: '500',
          minHeight: '44px',
          transition: 'all 0.2s ease',
          flexShrink: 0,
        }}
      >
        🎨
        <span className="theme-label">Tema</span>
      </button>

      {abierto && (
        <div
          onClick={() => setAbierto(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(2px)',
            zIndex: 9998,
            animation: 'fadeIn 0.2s ease',
          }}
        />
      )}

      {abierto && (
        <div
          className="theme-dropdown"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '220px',
            background: 'var(--color-card-solid)',
            backdropFilter: 'blur(20px)',
            border: '1px solid var(--color-glass-border)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'var(--color-shadow-hover)',
            overflow: 'hidden',
            zIndex: 9999,
            animation: 'slideUp 0.25s ease',
          }}
        >
          <div style={{
            padding: '14px 16px 10px',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <span style={{ fontSize: '16px' }}>🎨</span>
            <span style={{
              fontSize: '13px',
              fontWeight: '700',
              color: 'var(--color-text)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}>
              Elige tu tema
            </span>
          </div>

          <div style={{ padding: '8px' }}>
            {Object.entries(TEMAS).map(([key, val]) => {
              const activo = temaActual === key;
              return (
                <button
                  key={key}
                  onClick={() => { setTemaActual(key); setAbierto(false); }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: activo
                      ? '1.5px solid var(--color-primary-solid)'
                      : '1.5px solid transparent',
                    background: activo ? 'var(--color-accent-soft)' : 'transparent',
                    cursor: 'pointer',
                    minHeight: '44px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{
                    display: 'flex',
                    gap: '3px',
                    flexShrink: 0,
                  }}>
                    {[val.primarySolid, val.bgSolid, val.cardSolid].map((c, i) => (
                      <div key={i} style={{
                        width: '12px',
                        height: '24px',
                        borderRadius: '4px',
                        background: c,
                        border: '1px solid rgba(0,0,0,0.1)',
                      }} />
                    ))}
                  </div>

                  <span style={{
                    fontSize: '14px',
                    fontWeight: activo ? '600' : '400',
                    color: activo ? 'var(--color-primary-solid)' : 'var(--color-text)',
                    flex: 1,
                    textAlign: 'left',
                  }}>
                    {val.nombre}
                  </span>

                  {activo && (
                    <span style={{
                      fontSize: '16px',
                      color: 'var(--color-primary-solid)',
                    }}>
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
