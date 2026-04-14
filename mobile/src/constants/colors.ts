export const colors = {
  bg: '#FAFAFA',
  surface: '#FFFFFF',
  border: '#E5E7EB',
  text: {
    primary: '#111827',
    secondary: '#6B7280',
    tertiary: '#9CA3AF',
  },
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

export const severityColors: Record<string, { bg: string; text: string }> = {
  critical: { bg: colors.criticalLight, text: colors.critical },
  serious: { bg: colors.seriousLight, text: colors.serious },
  warning: { bg: colors.warningLight, text: colors.warning },
  advice: { bg: colors.adviceLight, text: colors.advice },
};

export const severityLabels: Record<string, string> = {
  critical: 'Критично',
  serious: 'Серьёзно',
  warning: 'Замечание',
  advice: 'Совет',
};
