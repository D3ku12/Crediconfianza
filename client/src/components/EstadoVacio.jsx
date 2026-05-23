import { memo } from 'react';

export const EstadoVacio = memo(function EstadoVacio({ icono, titulo, descripcion, accion, textoAccion }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '48px 24px', textAlign: 'center'
    }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>{icono}</div>
      <h3 style={{ fontSize: '18px', fontWeight: '600',
                   color: 'var(--color-text)', marginBottom: '8px' }}>
        {titulo}
      </h3>
      <p style={{ fontSize: '14px', color: 'var(--color-text-soft)',
                  marginBottom: '24px', maxWidth: '260px' }}>
        {descripcion}
      </p>
      {accion && (
        <button onClick={accion} style={{
          background: 'var(--color-primary)', color: '#fff', border: 'none',
          padding: '12px 24px', borderRadius: '10px',
          fontSize: '14px', fontWeight: '600', cursor: 'pointer'
        }}>
          {textoAccion}
        </button>
      )}
    </div>
  );
});
