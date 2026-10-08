import type { CSSProperties } from 'react';
import type { ReliabilityTier } from '../types/ecg';

export type ThemeMode = 'light' | 'dark';

export interface Palette {
  bg: string;
  panel: string;
  panel2: string;
  line: string;
  ink: string;
  dim: string;
  faint: string;
  primary: string;
  primaryHover: string;
  primarySoft: string;
  signal: string;
  amber: string;
  rose: string;
  grid: string;
}

// Cardiac-themed palette: bright red accent in both modes. Reliability-tier
// hues (signal/amber/rose) stay semantic and are not touched by the brand
// accent, so "low confidence" red never competes with the primary brand red.
const dark: Palette = {
  bg: '#0a0e17', panel: '#111826', panel2: '#0d1420', line: '#241820',
  ink: '#f1e6ea', dim: '#9c8791', faint: '#4a3540',
  primary: '#f0384c', primaryHover: '#ff5568', primarySoft: 'rgba(240,56,76,0.18)',
  signal: '#7dd3c0', amber: '#e0a458', rose: '#e0607a',
  grid: '#16202f',
};

const light: Palette = {
  bg: '#faf7f6', panel: '#ffffff', panel2: '#f5eeee', line: '#e8d9db',
  ink: '#241419', dim: '#6b5158', faint: '#a98a90',
  primary: '#d7263d', primaryHover: '#b81f33', primarySoft: 'rgba(215,38,61,0.10)',
  signal: '#1f8f76', amber: '#a5680f', rose: '#c2415c',
  grid: '#eee2e3',
};

export const themes: Record<ThemeMode, Palette> = { light, dark };

// Legacy static export — kept as the dark palette so any not-yet-migrated
// call site keeps working, but new code should use useTheme() instead.
export const C = dark;

export const type = {
  xs: 10, sm: 11, base: 13, md: 15, lg: 20, xl: 28,
  weightRegular: 400, weightMedium: 600, weightBold: 700,
  family: "'Inter', system-ui, -apple-system, sans-serif",
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 8, md: 12, lg: 16 } as const;

export function tierColor(p: Palette): Record<ReliabilityTier, string> {
  return { reliable: p.signal, marginal: p.amber, low_confidence: p.rose };
}

export const tierLabel: Record<ReliabilityTier, string> = {
  reliable: 'Reliable',
  marginal: 'Uncertain',
  low_confidence: 'Low confidence',
};

export function cardStyle(p: Palette): CSSProperties {
  return {
    background: p.panel,
    border: `1px solid ${p.line}`,
    borderRadius: radius.md,
    padding: space.md,
  };
}
