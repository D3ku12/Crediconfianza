import { useState, useEffect } from 'react';

const TEMAS = {
  oceano: {
    nombre:       '🌊 Océano',
    bg:           'linear-gradient(135deg, #e8f4fd 0%, #dbeafe 50%, #ede9fe 100%)',
    bgSolid:      '#eef2ff',
    card:         'rgba(255,255,255,0.85)',
    cardSolid:    '#ffffff',
    primary:      'linear-gradient(135deg, #1e40af 0%, #1e3a5f 100%)',
    primarySolid: '#1e40af',
    primaryHover: 'linear-gradient(135deg, #1d4ed8 0%, #2d5a9e 100%)',
    glass:        'rgba(255,255,255,0.6)',
    glassBorder:  'rgba(255,255,255,0.8)',
    text:         '#0f172a',
    textSoft:     '#334155',
    textMuted:    '#64748b',
    onPrimary:    '#ffffff',
    success:      '#15803d',
    danger:       '#b91c1c',
    warning:      '#92400e',
    border:       'rgba(148,163,184,0.3)',
    shadow:       '0 4px 24px rgba(30,64,175,0.10)',
    shadowHover:  '0 8px 32px rgba(30,64,175,0.18)',
    accent:       '#6366f1',
    accentSoft:   'rgba(99,102,241,0.12)',
  },
  aurora: {
    nombre:       '🌅 Aurora',
    bg:           'linear-gradient(135deg, #fdf4ff 0%, #fce7f3 50%, #fff1f2 100%)',
    bgSolid:      '#fdf2f8',
    card:         'rgba(255,255,255,0.85)',
    cardSolid:    '#ffffff',
    primary:      'linear-gradient(135deg, #be185d 0%, #9d174d 100%)',
    primarySolid: '#be185d',
    primaryHover: 'linear-gradient(135deg, #db2777 0%, #be185d 100%)',
    glass:        'rgba(255,255,255,0.6)',
    glassBorder:  'rgba(255,255,255,0.8)',
    text:         '#1a0a12',
    textSoft:     '#4a1942',
    textMuted:    '#9d174d',
    onPrimary:    '#ffffff',
    success:      '#15803d',
    danger:       '#b91c1c',
    warning:      '#92400e',
    border:       'rgba(236,72,153,0.2)',
    shadow:       '0 4px 24px rgba(190,24,93,0.10)',
    shadowHover:  '0 8px 32px rgba(190,24,93,0.18)',
    accent:       '#f43f5e',
    accentSoft:   'rgba(244,63,94,0.10)',
  },
  bosque: {
    nombre:       '🌿 Bosque',
    bg:           'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 50%, #ecfdf5 100%)',
    bgSolid:      '#f0fdf4',
    card:         'rgba(255,255,255,0.85)',
    cardSolid:    '#ffffff',
    primary:      'linear-gradient(135deg, #14532d 0%, #166534 100%)',
    primarySolid: '#15803d',
    primaryHover: 'linear-gradient(135deg, #166534 0%, #15803d 100%)',
    glass:        'rgba(255,255,255,0.6)',
    glassBorder:  'rgba(255,255,255,0.8)',
    text:         '#052e16',
    textSoft:     '#166534',
    textMuted:    '#4ade80',
    onPrimary:    '#ffffff',
    success:      '#15803d',
    danger:       '#b91c1c',
    warning:      '#92400e',
    border:       'rgba(74,222,128,0.25)',
    shadow:       '0 4px 24px rgba(20,83,45,0.10)',
    shadowHover:  '0 8px 32px rgba(20,83,45,0.18)',
    accent:       '#22c55e',
    accentSoft:   'rgba(34,197,94,0.12)',
  },
  galaxia: {
    nombre:       '🌌 Galaxia',
    bg:           'linear-gradient(135deg, #0f0c29 0%, #1a1040 50%, #24243e 100%)',
    bgSolid:      '#0f0c29',
    card:         'rgba(255,255,255,0.06)',
    cardSolid:    '#1e1b4b',
    primary:      'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
    primarySolid: '#6d28d9',
    primaryHover: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
    glass:        'rgba(255,255,255,0.05)',
    glassBorder:  'rgba(255,255,255,0.12)',
    text:         '#f1f5f9',
    textSoft:     '#a5b4fc',
    textMuted:    '#6366f1',
    onPrimary:    '#ffffff',
    success:      '#4ade80',
    danger:       '#f87171',
    warning:      '#fbbf24',
    border:       'rgba(99,102,241,0.25)',
    shadow:       '0 4px 24px rgba(99,102,241,0.20)',
    shadowHover:  '0 8px 32px rgba(99,102,241,0.35)',
    accent:       '#a78bfa',
    accentSoft:   'rgba(167,139,250,0.15)',
  },
  carbon: {
    nombre:       '⚫ Carbón',
    bg:           'linear-gradient(135deg, #09090b 0%, #18181b 100%)',
    bgSolid:      '#09090b',
    card:         'rgba(255,255,255,0.04)',
    cardSolid:    '#18181b',
    primary:      'linear-gradient(135deg, #52525b 0%, #3f3f46 100%)',
    primarySolid: '#52525b',
    primaryHover: 'linear-gradient(135deg, #71717a 0%, #52525b 100%)',
    glass:        'rgba(255,255,255,0.04)',
    glassBorder:  'rgba(255,255,255,0.08)',
    text:         '#fafafa',
    textSoft:     '#a1a1aa',
    textMuted:    '#52525b',
    onPrimary:    '#fafafa',
    success:      '#4ade80',
    danger:       '#f87171',
    warning:      '#fbbf24',
    border:       'rgba(82,82,91,0.4)',
    shadow:       '0 4px 24px rgba(0,0,0,0.4)',
    shadowHover:  '0 8px 32px rgba(0,0,0,0.6)',
    accent:       '#e4e4e7',
    accentSoft:   'rgba(228,228,231,0.08)',
  },
};

export function useTema() {
  const [temaActual, setTemaActual] = useState(
    () => localStorage.getItem('tema') || 'oceano'
  );

  const tema = TEMAS[temaActual];

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--color-bg',           tema.bg);
    root.style.setProperty('--color-bg-solid',     tema.bgSolid);
    root.style.setProperty('--color-card',         tema.card);
    root.style.setProperty('--color-card-solid',   tema.cardSolid);
    root.style.setProperty('--color-primary',      tema.primary);
    root.style.setProperty('--color-primary-solid',tema.primarySolid);
    root.style.setProperty('--color-primary-hover',tema.primaryHover);
    root.style.setProperty('--color-glass',        tema.glass);
    root.style.setProperty('--color-glass-border', tema.glassBorder);
    root.style.setProperty('--color-text',         tema.text);
    root.style.setProperty('--color-text-soft',    tema.textSoft);
    root.style.setProperty('--color-text-muted',   tema.textMuted);
    root.style.setProperty('--color-on-primary',   tema.onPrimary);
    root.style.setProperty('--color-success',      tema.success);
    root.style.setProperty('--color-danger',       tema.danger);
    root.style.setProperty('--color-warning',      tema.warning);
    root.style.setProperty('--color-border',       tema.border);
    root.style.setProperty('--color-shadow',       tema.shadow);
    root.style.setProperty('--color-shadow-hover', tema.shadowHover);
    root.style.setProperty('--color-accent',       tema.accent);
    root.style.setProperty('--color-accent-soft',  tema.accentSoft);
    localStorage.setItem('tema', temaActual);
  }, [temaActual, tema]);

  return { temaActual, setTemaActual, tema, TEMAS };
}
