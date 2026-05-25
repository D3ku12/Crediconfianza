import { memo } from 'react';

export const EstadoVacio = memo(function EstadoVacio({ icono, titulo, descripcion, accion, textoAccion }) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-12">
      <div className="text-5xl mb-4">{icono}</div>
      <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text)' }}>{titulo}</h3>
      <p className="text-sm mb-6 max-w-xs" style={{ color: 'var(--color-text-secondary)' }}>{descripcion}</p>
      {accion && (
        <button
          onClick={accion}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all min-h-[44px]"
          style={{ background: 'linear-gradient(135deg, #6C63FF, #5A52E0)' }}
        >
          {textoAccion}
        </button>
      )}
    </div>
  );
});
