import { useState } from 'react';
import { useTema } from '../hooks/useTema';

export function SelectorTema() {
  const { temaActual, setTemaActual, TEMAS } = useTema();
  const [abierto, setAbierto] = useState(false);

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setAbierto(!abierto)}
        title="Cambiar tema"
        style={{
          background: 'none', border: 'none',
          fontSize: '20px', cursor: 'pointer', padding: '8px'
        }}
      >
        🎨
      </button>

      {abierto && (
        <div style={{
          position: 'absolute', top: '44px', right: 0,
          background: 'var(--color-card)',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          padding: '8px', zIndex: 1000,
          display: 'flex', flexDirection: 'column', gap: '4px',
          minWidth: '160px'
        }}>
          {Object.entries(TEMAS).map(([key, val]) => (
            <button
              key={key}
              onClick={() => { setTemaActual(key); setAbierto(false); }}
              style={{
                background: temaActual === key ? val.primary : 'transparent',
                color: temaActual === key ? '#fff' : 'inherit',
                border: 'none', borderRadius: '8px',
                padding: '10px 14px', cursor: 'pointer',
                fontSize: '13px', fontWeight: '500',
                textAlign: 'left', width: '100%'
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
