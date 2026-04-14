import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { agentMeta, severityIcons } from '../constants/agents';
import Badge from './Badge';
import type { Issue } from '../types/analysis';

const SEVERITY_COLORS = {
  critical: '#EF4444',
  serious:  '#F97316',
  warning:  '#F59E0B',
  advice:   '#6B7280',
};

interface Props {
  issue: Issue;
  onPress: () => void;
}

export default function IssueCard({ issue, onPress }: Props) {
  const theme = useTheme();
  const borderColor = SEVERITY_COLORS[issue.severity as keyof typeof SEVERITY_COLORS] || theme.border;
  const agentLabel = agentMeta[issue.agent_name]?.label || issue.agent_name;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, borderLeftColor: borderColor }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <Badge severity={issue.severity} />
        <Text style={[styles.agent, { color: theme.text.tertiary }]}>{agentLabel}</Text>
      </View>
      <Text style={[styles.title, { color: theme.text.primary }]} numberOfLines={2}>
        {issue.title}
      </Text>
      {issue.standard_reference && (
        <Text style={[styles.ref, { color: theme.accent }]}>{issue.standard_reference}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderLeftWidth: 4,
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
  agent: { fontSize: 12 },
  title: { fontSize: 14, fontWeight: '500', marginBottom: 4 },
  ref: { fontSize: 12 },
});
