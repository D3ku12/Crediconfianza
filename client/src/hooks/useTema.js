import { useState, useEffect } from 'react';

const TEMAS = {
  oceano: {
    nombre:      '🌊 Océano',
    primary:     '#1e3a5f',
    primaryHover:'#2d5a9e',
    bg:          '#f0f4f8',
    card:        '#ffffff',
    text:        '#0f172a',
    textSoft:    '#475569',
    textMuted:   '#94a3b8',
    border:      '#cbd5e1',
    success:     '#15803d',
    danger:      '#b91c1c',
    warning:     '#92400e',
    onPrimary:   '#ffffff',
  },
  bosque: {
    nombre:      '🌿 Bosque',
    primary:     '#14532d',
    primaryHover:'#166534',
    bg:          '#f0fdf4',
    card:        '#ffffff',
    text:        '#052e16',
    textSoft:    '#166534',
    textMuted:   '#4ade80',
    border:      '#bbf7d0',
    success:     '#15803d',
    danger:      '#b91c1c',
    warning:     '#92400e',
    onPrimary:   '#ffffff',
  },
  purpura: {
    nombre:      '💜 Púrpura',
    primary:     '#6d28d9',
    primaryHover:'#7c3aed',
    bg:          '#faf5ff',
    card:        '#ffffff',
    text:        '#2e1065',
    textSoft:    '#6d28d9',
    textMuted:   '#a78bfa',
    border:      '#ddd6fe',
    success:     '#15803d',
    danger:      '#b91c1c',
    warning:     '#92400e',
    onPrimary:   '#ffffff',
  },
  oscuro: {
    nombre:      '🌙 Oscuro',
    primary:     '#818cf8',
    primaryHover:'#6366f1',
    bg:          '#0f172a',
    card:        '#1e293b',
    text:        '#f1f5f9',
    textSoft:    '#94a3b8',
    textMuted:   '#475569',
    border:      '#334155',
    success:     '#4ade80',
    danger:      '#f87171',
    warning:     '#fbbf24',
    onPrimary:   '#0f172a',
  },
  carbon: {
    nombre:      '⚫ Carbón',
    primary:     '#e4e4e7',
    primaryHover:'#ffffff',
    bg:          '#09090b',
    card:        '#18181b',
    text:        '#fafafa',
    textSoft:    '#a1a1aa',
    textMuted:   '#52525b',
    border:      '#27272a',
    success:     '#4ade80',
    danger:      '#f87171',
    warning:     '#fbbf24',
    onPrimary:   '#09090b',
  },
};

export function useTema() {
  const [temaActual, setTemaActual] = useState(
    () => localStorage.getItem('tema') || 'oceano'
  );

  const tema = TEMAS[temaActual];

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--color-primary',      tema.primary);
    root.style.setProperty('--color-primary-hover', tema.primaryHover);
    root.style.setProperty('--color-bg',            tema.bg);
    root.style.setProperty('--color-card',          tema.card);
    root.style.setProperty('--color-text',          tema.text);
    root.style.setProperty('--color-text-soft',     tema.textSoft);
    root.style.setProperty('--color-text-muted',    tema.textMuted);
    root.style.setProperty('--color-border',        tema.border);
    root.style.setProperty('--color-success',       tema.success);
    root.style.setProperty('--color-danger',        tema.danger);
    root.style.setProperty('--color-warning',       tema.warning);
    root.style.setProperty('--color-on-primary',    tema.onPrimary);
    localStorage.setItem('tema', temaActual);
  }, [temaActual, tema]);

  return { temaActual, setTemaActual, tema, TEMAS };
}
