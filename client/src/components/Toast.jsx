import { useState, memo, createContext, useContext, useCallback } from 'react';
import { createPortal } from 'react-dom';

const ToastContext = createContext(null);

const ToastItem = memo(function ToastItem({ toast }) {
  const bgColor = toast.tipo === 'error' ? '#FF4757'
    : toast.tipo === 'exito' ? '#00C896'
    : '#6C63FF';
  const icon = toast.tipo === 'error' ? '❌'
    : toast.tipo === 'exito' ? '✅'
    : '⚠️';

  return (
    <div
      className="animate-slide-up pointer-events-auto"
      style={{
        background: bgColor,
        color: '#fff',
        borderRadius: '14px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        maxWidth: '360px',
        width: '100%',
        overflow: 'hidden',
      }}
    >
      <div className="flex items-center gap-3 px-4 py-3.5">
        <span className="text-base flex-shrink-0">{icon}</span>
        <span className="text-sm font-medium leading-snug">{toast.mensaje}</span>
      </div>
      <div className="h-1 bg-white/20">
        <div className="h-full bg-white/50 animate-progress" style={{ animationDuration: `${toast.duracion || 3000}ms` }} />
      </div>
    </div>
  );
});

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((mensaje, tipo = 'info', duracion = 3000) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, mensaje, tipo, duracion }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duracion);
  }, []);

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      {createPortal(
        <div className="fixed z-[9999] flex flex-col gap-2 pointer-events-none"
          style={{
            bottom: '24px',
            right: '24px',
          }}
        >
          {toasts.map(t => (
            <ToastItem key={t.id} toast={t} />
          ))}
        </div>,
        document.body
      )}
      {createPortal(
        <style>{`
          @media (max-width: 640px) {
            .fixed.z-\\[9999\\] {
              top: 16px !important;
              bottom: auto !important;
              right: 16px !important;
              left: 16px !important;
            }
          }
        `}</style>,
        document.head
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
