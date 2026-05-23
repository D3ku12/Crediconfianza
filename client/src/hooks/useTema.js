import { useState, useEffect } from 'react';

const TEMAS = {
  oceano:   { primary: '#1e3a5f', bg: '#f0f4f8', card: '#ffffff', nombre: '🌊 Océano' },
  bosque:   { primary: '#14532d', bg: '#f0fdf4', card: '#ffffff', nombre: '🌿 Bosque' },
  purpura:  { primary: '#4c1d95', bg: '#faf5ff', card: '#ffffff', nombre: '💜 Púrpura' },
  oscuro:   { primary: '#0f172a', bg: '#1e293b', card: '#334155', nombre: '🌙 Oscuro'  },
  carbon:   { primary: '#18181b', bg: '#27272a', card: '#3f3f46', nombre: '⚫ Carbón'  },
};

export function useTema() {
  const [temaActual, setTemaActual] = useState(
    () => localStorage.getItem('tema') || 'oceano'
  );

  const tema = TEMAS[temaActual];

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--color-primary', tema.primary);
    root.style.setProperty('--color-bg', tema.bg);
    root.style.setProperty('--color-card', tema.card);
    localStorage.setItem('tema', temaActual);
  }, [temaActual, tema]);

  return { temaActual, setTemaActual, tema, TEMAS };
}
