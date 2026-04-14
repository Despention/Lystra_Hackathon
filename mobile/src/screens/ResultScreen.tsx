import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme, useTranslation } from '../contexts/ThemeContext';
import { agentMeta } from '../constants/agents';
import { useAnalysisResult } from '../hooks/useAnalysis';
import { getExportUrl } from '../services/api';
import Card from '../components/Card';
import ScoreCircle from '../components/ScoreCircle';
import ProgressBar from '../components/ProgressBar';
import IssueCard from '../components/IssueCard';
import SeverityFilter from '../components/SeverityFilter';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Result'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

const SEVERITY_BORDER: Record<string, string> = {
  critical: '#EF4444', serious: '#F97316', warning: '#F59E0B', advice: '#6B7280',
};

export default function ResultScreen() {
  const route = useRoute<Props['route']>();
  const navigation = useNavigation<Nav>();
  const theme = useTheme();
  const t = useTranslation();
  const { analysisId } = route.params;
  const { data: result, isLoading } = useAnalysisResult(analysisId);

  const [activeTab, setActiveTab] = useState<'overview' | 'issues' | 'recommendations'>('overview');
  const [severityFilter, setSeverityFilter] = useState('all');

  if (isLoading || !result) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bg }}>
      <ActivityIndicator size="large" color={theme.accent} />
    </View>;
  }

  if (result.status === 'failed') {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={styles.content}>
        <Card style={styles.errorCard}>
          <View style={styles.errorCardHeader}>
            <Ionicons name="warning" size={32} color={theme.critical} />
            <Text style={[styles.errorCardTitle, { color: theme.critical }]}>{t('analysisError')}</Text>
          </View>
          <Text style={[styles.errorCardText, { color: theme.text.secondary }]}>
            {result.filename || t('textInput')}
          </Text>
          <Text style={[styles.errorCardDate, { color: theme.text.tertiary }]}>
            {result.created_at ? new Date(result.created_at).toLocaleString('ru-RU') : ''}
          </Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: theme.accent }]}
            onPress={() => { navigation.goBack(); }}
          >
            <Ionicons name="refresh" size={16} color="#FFF" />
            <Text style={styles.retryBtnText}>{t('retry')}</Text>
          </TouchableOpacity>
        </Card>
      </ScrollView>
    );
  }

  const filteredIssues = severityFilter === 'all' ? result.issues : result.issues.filter((i) => i.severity === severityFilter);
  const severityCounts = {
    critical: result.issues.filter((i) => i.severity === 'critical').length,
    serious: result.issues.filter((i) => i.severity === 'serious').length,
    warning: result.issues.filter((i) => i.severity === 'warning').length,
    advice: result.issues.filter((i) => i.severity === 'advice').length,
  };

  const TABS = [
    { key: 'overview', label: t('overview') },
    { key: 'issues', label: `${t('issues')} (${result.issues.length})` },
    { key: 'recommendations', label: t('recommendations') },
  ] as const;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={styles.content}>
      {/* Score header */}
      <View style={styles.scoreHeader}>
        <ScoreCircle score={result.total_score ?? 0} size={110} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.filename, { color: theme.text.primary }]} numberOfLines={2}>
            {result.filename || t('textInput')}
          </Text>
          <Text style={[styles.date, { color: theme.text.tertiary }]}>
            {result.created_at ? new Date(result.created_at).toLocaleDateString('ru-RU') : ''}
          </Text>
          <Text style={[styles.meta, { color: theme.text.secondary }]}>
            {result.mode === 'full' ? t('fullAnalysis') : t('quickAnalysis')}
          </Text>
        </View>
      </View>

      {result.not_ready && (
        <View style={[styles.notReady, { backgroundColor: theme.criticalLight }]}>
          <Ionicons name="warning" size={16} color={theme.critical} />
          <Text style={[styles.notReadyText, { color: theme.critical }]}>{t('notReady')}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.exportBtn, { backgroundColor: theme.accentLight }]}
        onPress={async () => {
          try {
            await Share.share({
              title: t('exportReport'),
              url: getExportUrl(analysisId),
              message: `${result.filename || t('textInput')} — ${t('exportReport')}: ${getExportUrl(analysisId)}`,
            });
          } catch {
            // user cancelled share
          }
        }}
      >
        <Ionicons name="share-outline" size={15} color={theme.accent} />
        <Text style={[styles.exportText, { color: theme.accent }]}>{t('share')}</Text>
      </TouchableOpacity>

      {/* Tabs */}
      <View style={[styles.tabs, { borderBottomColor: theme.border }]}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && { borderBottomColor: theme.accent }]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, { color: activeTab === tab.key ? theme.accent : theme.text.tertiary },
              activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Overview */}
      {activeTab === 'overview' && result.agent_results.map((ar) => {
        const meta = agentMeta[ar.agent_name];
        const s = ar.score ?? 0;
        const barColor = s >= 70 ? theme.success : s >= 40 ? theme.warning : theme.critical;
        return (
          <Card key={ar.agent_name} style={styles.categoryCard}>
            <View style={styles.categoryHeader}>
              <Ionicons name={meta?.icon as any || 'help-circle-outline'} size={18} color={theme.accent} />
              <Text style={[styles.categoryName, { color: theme.text.primary }]}>{meta?.label || ar.agent_name}</Text>
              <Text style={[styles.categoryScore, { color: barColor }]}>{Math.round(s)}/100</Text>
            </View>
            <ProgressBar progress={s / 100} color={barColor} height={6} />
          </Card>
        );
      })}

      {/* Issues */}
      {activeTab === 'issues' && (
        <View>
          <SeverityFilter selected={severityFilter} onSelect={setSeverityFilter} counts={severityCounts} />
          {filteredIssues.map((issue) => (
            <IssueCard key={issue.id} issue={issue} onPress={() => navigation.navigate('IssueDetail', { issue })} />
          ))}
          {filteredIssues.length === 0 && (
            <Text style={[styles.emptyIssues, { color: theme.text.tertiary }]}>{t('noIssuesFilter')}</Text>
          )}
        </View>
      )}

      {/* Recommendations */}
      {activeTab === 'recommendations' && result.issues
        .filter((i) => i.severity === 'critical' || i.severity === 'serious')
        .map((issue) => (
          <Card key={issue.id} style={[styles.recCard, { borderLeftColor: SEVERITY_BORDER[issue.severity] || theme.border }]}>
            <Text style={[styles.recTitle, { color: theme.text.primary }]} numberOfLines={2}>{issue.title}</Text>
            <Text style={[styles.recText, { color: theme.success }]}>{issue.recommendation}</Text>
          </Card>
        ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20 },
  scoreHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 20 },
  filename: { fontSize: 18, fontWeight: '600' },
  date: { fontSize: 13, marginTop: 4 },
  meta: { fontSize: 13, marginTop: 2 },
  notReady: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 12, borderRadius: 10, marginBottom: 12 },
  notReadyText: { fontWeight: '600' },
  exportBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-end', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, marginBottom: 16 },
  exportText: { fontWeight: '600', fontSize: 13 },
  tabs: { flexDirection: 'row', marginBottom: 16, borderBottomWidth: 1 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontSize: 13, fontWeight: '500' },
  tabTextActive: { fontWeight: '700' },
  categoryCard: { marginBottom: 8 },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  categoryName: { flex: 1, fontSize: 14, fontWeight: '500' },
  categoryScore: { fontSize: 15, fontWeight: '700' },
  emptyIssues: { textAlign: 'center', paddingVertical: 32 },
  recCard: { marginBottom: 8, borderLeftWidth: 4 },
  recTitle: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  recText: { fontSize: 13, lineHeight: 20 },
  errorCard: { alignItems: 'center', padding: 24, marginTop: 40 },
  errorCardHeader: { alignItems: 'center', gap: 12, marginBottom: 16 },
  errorCardTitle: { fontSize: 20, fontWeight: '700' },
  errorCardText: { fontSize: 15, textAlign: 'center', marginBottom: 4 },
  errorCardDate: { fontSize: 13, marginBottom: 20 },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryBtnText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
});
