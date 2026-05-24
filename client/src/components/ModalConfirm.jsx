import { memo } from 'react';
import { createPortal } from 'react-dom';

export const ModalConfirm = memo(function ModalConfirm({ mensaje, onConfirmar, onCancelar }) {
  return createPortal(
    <div className="modal-overlay" style={{ padding: '24px', alignItems: 'center' }}>
      <div style={{
        background: 'var(--color-card)', borderRadius: '16px', padding: '28px',
        maxWidth: '340px', width: '100%', textAlign: 'center',
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
      }}>
        <p style={{ fontSize: '16px', marginBottom: '24px',
                    color: 'var(--color-text)', lineHeight: '1.5' }}>
          {mensaje}
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button onClick={onCancelar} style={{
            padding: '10px 24px', borderRadius: '8px',
            border: '1px solid var(--border-color)', background: 'var(--color-bg)',
            cursor: 'pointer', fontSize: '14px', fontWeight: '500',
            minHeight: '44px'
          }}>
            Cancelar
          </button>
          <button onClick={onConfirmar} style={{
            padding: '10px 24px', borderRadius: '8px',
            border: 'none', background: 'var(--color-danger)',
            color: '#fff', cursor: 'pointer',
            fontSize: '14px', fontWeight: '500',
            minHeight: '44px'
          }}>
            Confirmar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
});
