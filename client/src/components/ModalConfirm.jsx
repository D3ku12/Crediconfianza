import { memo } from 'react';
import { createPortal } from 'react-dom';

export const ModalConfirm = memo(function ModalConfirm({ mensaje, onConfirmar, onCancelar }) {
  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 animate-fade-in" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
      <div className="rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center animate-modal-enter" style={{ background: 'var(--color-card)' }}>
        <p className="text-base mb-6 leading-relaxed" style={{ color: 'var(--color-text)' }}>
          {mensaje}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={onCancelar}
            className="px-6 py-2.5 rounded-xl border text-sm font-medium transition-all min-h-[44px]"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)', background: 'var(--color-bg)' }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            className="px-6 py-2.5 rounded-xl border-0 text-sm font-medium text-white transition-all min-h-[44px]"
            style={{ background: 'var(--color-danger)' }}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
});
