import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { agentMeta } from '../constants/agents';
import ProgressBar from './ProgressBar';

interface Props {
  agentName: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  score: number | null;
}

export default function AgentStatusCard({ agentName, status, score }: Props) {
  const theme = useTheme();
  const meta = agentMeta[agentName] || { label: agentName, icon: 'help-circle-outline', weight: 0 };

  const statusColor =
    status === 'completed' ? theme.success :
    status === 'failed' ? theme.critical :
    theme.text.tertiary;

  const barColor = status === 'completed'
    ? ((score ?? 0) >= 70 ? theme.success : (score ?? 0) >= 40 ? theme.warning : theme.critical)
    : theme.accent;

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.header}>
        <View style={[styles.iconBox, { backgroundColor: theme.surfaceSecondary }]}>
          <Ionicons name={meta.icon as any} size={20} color={theme.accent} />
        </View>
        <View style={styles.info}>
          <Text style={[styles.name, { color: theme.text.primary }]}>{meta.label}</Text>
          <Text style={[styles.status, { color: statusColor }]}>
            {status === 'pending' && 'Ожидание'}
            {status === 'running' && 'Анализ...'}
            {status === 'completed' && `${score ?? 0}/100`}
            {status === 'failed' && 'Ошибка'}
          </Text>
        </View>
        <View style={styles.statusIndicator}>
          {status === 'running' && (
            <ActivityIndicator size="small" color={theme.accent} />
          )}
          {status === 'completed' && (
            <Ionicons name="checkmark-circle" size={22} color={theme.success} />
          )}
          {status === 'failed' && (
            <Ionicons name="close-circle" size={22} color={theme.critical} />
          )}
          {status === 'pending' && (
            <View style={[styles.pendingDot, { backgroundColor: theme.border }]} />
          )}
        </View>
      </View>
      {status !== 'pending' && (
        <ProgressBar progress={(score ?? 0) / 100} color={barColor} height={4} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '600' },
  status: { fontSize: 12, marginTop: 2 },
  statusIndicator: { width: 24, alignItems: 'center' },
  pendingDot: { width: 8, height: 8, borderRadius: 4 },
});
