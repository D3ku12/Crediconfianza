import { useState, useEffect, useRef } from 'react';
import { useTema } from '../hooks/useTema';

export function SelectorTema() {
  const { temaActual, setTemaActual, TEMAS } = useTema();
  const [abierto, setAbierto] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!abierto) return;
    const cerrar = (e) => { if (ref.current && !ref.current.contains(e.target)) setAbierto(false); };
    document.addEventListener('mousedown', cerrar);
    document.addEventListener('touchstart', cerrar);
    return () => { document.removeEventListener('mousedown', cerrar); document.removeEventListener('touchstart', cerrar); };
  }, [abierto]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setAbierto(!abierto)}
        title="Personalizar tema"
        className="min-h-[44px] px-3 rounded-xl border transition-all flex items-center gap-1 text-sm font-medium flex-shrink-0"
        style={{
          borderColor: 'var(--color-border)',
          color: 'var(--color-text)',
          background: abierto ? 'var(--color-accent-soft)' : 'transparent',
        }}
      >
        🎨
        <span className="hidden sm:inline">Tema</span>
      </button>

      {abierto && <div onClick={() => setAbierto(false)} className="fixed inset-0 z-[9998] animate-fade-in" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }} />}

      {abierto && (
        <div
          className="absolute top-full right-0 mt-2 w-56 rounded-2xl border shadow-xl z-[9999] overflow-hidden animate-slide-up"
          style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <span>🎨</span>
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text)' }}>Elige tu tema</span>
          </div>
          <div className="p-2">
            {Object.entries(TEMAS).map(([key, val]) => {
              const activo = temaActual === key;
              return (
                <button
                  key={key}
                  onClick={() => { setTemaActual(key); setAbierto(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all min-h-[44px]"
                  style={{
                    border: activo ? '1.5px solid var(--color-primary)' : '1.5px solid transparent',
                    background: activo ? 'var(--color-accent-soft)' : 'transparent',
                  }}
                >
                  <div className="flex gap-0.5 flex-shrink-0">
                    {[val.primarySolid, val.bgSolid, val.cardSolid].map((c, i) => (
                      <div key={i} className="w-[10px] h-5 rounded-sm" style={{ background: c, border: '1px solid rgba(0,0,0,0.08)' }} />
                    ))}
                  </div>
                  <span className="text-sm flex-1 text-left" style={{
                    fontWeight: activo ? '600' : '400',
                    color: activo ? 'var(--color-primary)' : 'var(--color-text)',
                  }}>
                    {val.nombre}
                  </span>
                  {activo && <span style={{ color: 'var(--color-primary)' }}>✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
