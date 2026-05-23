import { useState, useEffect } from 'react';

const TEMAS = {
  oceano:  {
    primary: '#1e3a5f', bg: '#f0f4f8',
    card: '#ffffff',    text: '#1e293b',
    textSoft: '#64748b', nombre: '🌊 Océano',
  },
  bosque:  {
    primary: '#14532d', bg: '#f0fdf4',
    card: '#ffffff',    text: '#1e293b',
    textSoft: '#64748b', nombre: '🌿 Bosque',
  },
  purpura: {
    primary: '#4c1d95', bg: '#faf5ff',
    card: '#ffffff',    text: '#1e293b',
    textSoft: '#64748b', nombre: '💜 Púrpura',
  },
  oscuro:  {
    primary: '#818cf8', bg: '#1e293b',
    card: '#334155',    text: '#f1f5f9',
    textSoft: '#94a3b8', nombre: '🌙 Oscuro',
  },
  carbon:  {
    primary: '#a1a1aa', bg: '#18181b',
    card: '#27272a',    text: '#fafafa',
    textSoft: '#a1a1aa', nombre: '⚫ Carbón',
  },
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
    root.style.setProperty('--color-text', tema.text);
    root.style.setProperty('--color-text-soft', tema.textSoft);
    localStorage.setItem('tema', temaActual);
  }, [temaActual, tema]);

  return { temaActual, setTemaActual, tema, TEMAS };
}
