import { useState, memo, createContext, useContext, useCallback } from 'react';
import { createPortal } from 'react-dom';

const ToastContext = createContext(null);

const ToastItem = memo(function ToastItem({ toast }) {
  return (
    <div style={{
      background: toast.tipo === 'error' ? 'var(--color-danger)'
                : toast.tipo === 'exito' ? 'var(--color-success)' : 'var(--color-primary)',
      color: '#fff', padding: '12px 24px',
      borderRadius: '12px', fontSize: '14px',
      fontWeight: '500', boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
      animation: 'slideUp 0.3s ease',
      pointerEvents: 'auto', maxWidth: '320px',
      textAlign: 'center'
    }}>
      {toast.mensaje}
    </div>
  );
});

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((mensaje, tipo = 'info', duracion = 3500) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, mensaje, tipo }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duracion);
  }, []);

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      {createPortal(
        <div style={{
          position: 'fixed', bottom: '80px', left: '50%',
          transform: 'translateX(-50%)', zIndex: 9999,
          display: 'flex', flexDirection: 'column', gap: '8px',
          alignItems: 'center', pointerEvents: 'none'
        }}>
          {toasts.map(t => (
            <ToastItem key={t.id} toast={t} />
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
