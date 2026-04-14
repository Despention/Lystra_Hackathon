export interface Theme {
  bg: string;
  surface: string;
  surfaceSecondary: string;
  border: string;
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
  };
  statusBar: 'light' | 'dark';
  // semantic colors stay the same in both themes
  accent: string;
  accentLight: string;
  critical: string;
  criticalLight: string;
  serious: string;
  seriousLight: string;
  warning: string;
  warningLight: string;
  advice: string;
  adviceLight: string;
  success: string;
  successLight: string;
}

const semantic = {
  accent: '#1E88E5',
  accentLight: 'rgba(30,136,229,0.15)',
  critical: '#EF5350',
  criticalLight: 'rgba(239,83,80,0.12)',
  serious: '#FFA726',
  seriousLight: 'rgba(255,167,38,0.12)',
  warning: '#FFD54F',
  warningLight: 'rgba(255,213,79,0.10)',
  advice: '#78909C',
  adviceLight: 'rgba(120,144,156,0.12)',
  success: '#66BB6A',
  successLight: 'rgba(102,187,106,0.12)',
};

export const darkTheme: Theme = {
  bg: '#101214',
  surface: '#181C20',
  surfaceSecondary: '#1E2228',
  border: '#2A3040',
  text: {
    primary: '#E8ECF0',
    secondary: '#8A97A8',
    tertiary: '#4E5A68',
  },
  statusBar: 'light',
  ...semantic,
};

export const lightTheme: Theme = {
  bg: '#F0F3F7',
  surface: '#FFFFFF',
  surfaceSecondary: '#EAECF0',
  border: '#D0D7E2',
  text: {
    primary: '#0D1117',
    secondary: '#4A5568',
    tertiary: '#9AA5B4',
  },
  statusBar: 'dark',
  ...semantic,
  accent: '#1565C0',
  accentLight: 'rgba(21,101,192,0.10)',
  success: '#388E3C',
  successLight: 'rgba(56,142,60,0.08)',
  critical: '#E53935',
  criticalLight: 'rgba(229,57,53,0.08)',
  serious: '#EF6C00',
  seriousLight: 'rgba(239,108,0,0.10)',
};

export type ThemeMode = 'light' | 'dark' | 'system';

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;

  root.style.setProperty('--color-bg', theme.bg);
  root.style.setProperty('--color-surface', theme.surface);
  root.style.setProperty('--color-surface-secondary', theme.surfaceSecondary);
  root.style.setProperty('--color-border', theme.border);
  root.style.setProperty('--color-text-primary', theme.text.primary);
  root.style.setProperty('--color-text-secondary', theme.text.secondary);
  root.style.setProperty('--color-text-tertiary', theme.text.tertiary);
  root.style.setProperty('--color-accent', theme.accent);
  root.style.setProperty('--color-accent-light', theme.accentLight);
  root.style.setProperty('--color-critical', theme.critical);
  root.style.setProperty('--color-critical-light', theme.criticalLight);
  root.style.setProperty('--color-serious', theme.serious);
  root.style.setProperty('--color-serious-light', theme.seriousLight);
  root.style.setProperty('--color-warning', theme.warning);
  root.style.setProperty('--color-warning-light', theme.warningLight);
  root.style.setProperty('--color-advice', theme.advice);
  root.style.setProperty('--color-advice-light', theme.adviceLight);
  root.style.setProperty('--color-success', theme.success);
  root.style.setProperty('--color-success-light', theme.successLight);

  root.setAttribute('data-theme', theme.statusBar === 'light' ? 'dark' : 'light');
}
