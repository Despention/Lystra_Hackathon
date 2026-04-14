import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme, useTranslation } from '../contexts/ThemeContext';
import { AGENT_NAMES } from '../constants/agents';
import { useAnalysisStore } from '../store/analysisStore';
import { useAnalysisWebSocket } from '../hooks/useWebSocket';
import { getAnalysis, cancelAnalysis } from '../services/api';
import AgentStatusCard from '../components/AgentStatusCard';
import ProgressBar from '../components/ProgressBar';
import Button from '../components/Button';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Analysis'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function AnalysisScreen() {
  const route = useRoute<Props['route']>();
  const navigation = useNavigation<Nav>();
  const theme = useTheme();
  const t = useTranslation();
  const { analysisId } = route.params;
  const store = useAnalysisStore();

  useAnalysisWebSocket(analysisId);

  const completedCount = AGENT_NAMES.filter((n) => store.agentStatuses[n] === 'completed').length;
  const progress = AGENT_NAMES.length > 0 ? completedCount / AGENT_NAMES.length : 0;

  useEffect(() => {
    if (store.isDone) {
      getAnalysis(analysisId).then((result) => {
        store.setResult(result);
        navigation.replace('Result', { analysisId });
      });
    }
  }, [store.isDone]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: theme.text.primary }]}>{t('analyzeDoc')}</Text>
      <Text style={[styles.subtitle, { color: theme.text.secondary }]}>
        {completedCount} {t('agentsCompleted')} {AGENT_NAMES.length}
      </Text>

      <ProgressBar progress={progress} height={10} />

      {store.error && (
        <View style={[styles.errorBanner, { backgroundColor: theme.criticalLight }]}>
          <Ionicons name="warning" size={18} color={theme.critical} />
          <Text style={[styles.errorText, { color: theme.critical }]}>{store.error}</Text>
        </View>
      )}

      <View style={styles.agents}>
        {AGENT_NAMES.map((name) => (
          <AgentStatusCard key={name} agentName={name} status={store.agentStatuses[name] || 'pending'} score={store.agentScores[name] ?? null} />
        ))}
      </View>

      {/* Live streaming output */}
      {AGENT_NAMES.filter((n) => store.agentStatuses[n] === 'running').map((name) => {
        const output = store.agentOutputs[name];
        if (!output) return null;
        return (
          <View key={name} style={styles.streamBox}>
            <View style={styles.streamHeader}>
              <Ionicons name="pulse" size={14} color="#94A3B8" />
              <Text style={styles.streamLabel}>{name}</Text>
            </View>
            <ScrollView style={styles.streamScroll} nestedScrollEnabled>
              <Text style={styles.streamText}>{output.slice(-500)}</Text>
            </ScrollView>
          </View>
        );
      })}

      <Button title={t('cancel')} variant="outline" onPress={() => {
        cancelAnalysis(analysisId).catch(() => {});
        store.setCancelled();
        store.reset();
        navigation.goBack();
      }} style={styles.cancelBtn} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 14, marginBottom: 16 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, marginTop: 12 },
  errorText: { flex: 1, fontSize: 14, fontWeight: '600' },
  agents: { marginTop: 20 },
  streamBox: { marginTop: 16, backgroundColor: '#1E293B', borderRadius: 10, padding: 12, maxHeight: 200 },
  streamHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  streamLabel: { fontSize: 12, color: '#94A3B8' },
  streamScroll: { maxHeight: 160 },
  streamText: { fontSize: 12, color: '#E2E8F0', fontFamily: 'monospace', lineHeight: 18 },
  cancelBtn: { marginTop: 24 },
});
