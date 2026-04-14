import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { severityIcons } from '../constants/agents';

const SEVERITY_COLORS = {
  critical: { text: '#EF4444' },
  serious:  { text: '#F97316' },
  warning:  { text: '#F59E0B' },
  advice:   { text: '#6B7280' },
};

const SEVERITY_LABELS: Record<string, { ru: string }> = {
  critical: { ru: 'Критично' },
  serious:  { ru: 'Серьёзно' },
  warning:  { ru: 'Замечание' },
  advice:   { ru: 'Совет' },
};

interface Props {
  severity: string;
}

export default function Badge({ severity }: Props) {
  const theme = useTheme();
  const colorSet = SEVERITY_COLORS[severity as keyof typeof SEVERITY_COLORS] ?? SEVERITY_COLORS.advice;
  const label = SEVERITY_LABELS[severity]?.ru ?? severity;
  const icon = severityIcons[severity] ?? 'information-circle';

  const bg = severity === 'critical' ? theme.criticalLight
    : severity === 'serious' ? theme.seriousLight
    : severity === 'warning' ? theme.warningLight
    : theme.adviceLight;

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Ionicons name={icon as any} size={12} color={colorSet.text} />
      <Text style={[styles.text, { color: colorSet.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  text: { fontSize: 12, fontWeight: '600' },
});
