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
  accent: '#2563EB',
  accentLight: '#DBEAFE',
  critical: '#EF4444',
  criticalLight: '#FEE2E2',
  serious: '#F97316',
  seriousLight: '#FFEDD5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  advice: '#6B7280',
  adviceLight: '#F3F4F6',
  success: '#10B981',
  successLight: '#D1FAE5',
};

export const lightTheme: Theme = {
  bg: '#FAFAFA',
  surface: '#FFFFFF',
  surfaceSecondary: '#F3F4F6',
  border: '#E5E7EB',
  text: {
    primary: '#111827',
    secondary: '#6B7280',
    tertiary: '#9CA3AF',
  },
  statusBar: 'dark',
  ...semantic,
};

export const darkTheme: Theme = {
  bg: '#0F172A',
  surface: '#1E293B',
  surfaceSecondary: '#0F172A',
  border: '#334155',
  text: {
    primary: '#F1F5F9',
    secondary: '#94A3B8',
    tertiary: '#64748B',
  },
  statusBar: 'light',
  ...semantic,
  accentLight: '#1E3A5F',
  criticalLight: '#3B1212',
  seriousLight: '#3B1F0A',
  warningLight: '#3B2D05',
  adviceLight: '#1E293B',
  successLight: '#0A2E1E',
};

export type ThemeMode = 'light' | 'dark' | 'system';
