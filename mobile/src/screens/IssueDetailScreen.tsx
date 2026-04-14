import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../contexts/ThemeContext';
import { agentMeta } from '../constants/agents';
import Badge from '../components/Badge';
import Card from '../components/Card';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'IssueDetail'>;

export default function IssueDetailScreen() {
  const route = useRoute<Props['route']>();
  const theme = useTheme();
  const { issue } = route.params;
  const agent = agentMeta[issue.agent_name];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Badge severity={issue.severity} />
        <View style={styles.agentTag}>
          <Ionicons name={agent?.icon as any || 'help-circle-outline'} size={14} color={theme.text.tertiary} />
          <Text style={[styles.agentLabel, { color: theme.text.tertiary }]}>{agent?.label || issue.agent_name}</Text>
        </View>
      </View>

      <Text style={[styles.title, { color: theme.text.primary }]}>{issue.title}</Text>
      <Text style={[styles.description, { color: theme.text.secondary }]}>{issue.description}</Text>

      {issue.document_quote && (
        <Card style={[styles.quoteCard, { backgroundColor: theme.surfaceSecondary }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="chatbox-ellipses-outline" size={14} color={theme.text.tertiary} />
            <Text style={[styles.cardLabel, { color: theme.text.tertiary }]}>Цитата из документа</Text>
          </View>
          <Text style={[styles.quoteText, { color: theme.text.primary }]}>«{issue.document_quote}»</Text>
        </Card>
      )}

      {issue.standard_reference && (
        <Card style={[styles.refCard, { backgroundColor: theme.accentLight }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="link-outline" size={14} color={theme.accent} />
            <Text style={[styles.cardLabel, { color: theme.accent }]}>Ссылка на стандарт</Text>
          </View>
          <Text style={[styles.refText, { color: theme.accent }]}>{issue.standard_reference}</Text>
        </Card>
      )}

      <Card style={[styles.recCard, { backgroundColor: theme.successLight }]}>
        <View style={styles.cardHeader}>
          <Ionicons name="bulb-outline" size={14} color={theme.success} />
          <Text style={[styles.cardLabel, { color: theme.success }]}>Рекомендация</Text>
        </View>
        <Text style={[styles.recText, { color: theme.text.primary }]}>{issue.recommendation}</Text>
      </Card>

      {issue.penalty > 0 && (
        <View style={[styles.penaltyBox, { backgroundColor: theme.criticalLight }]}>
          <Ionicons name="trending-down" size={16} color={theme.critical} />
          <Text style={[styles.penaltyText, { color: theme.critical }]}>
            Штраф: -{issue.penalty} баллов
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  agentTag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  agentLabel: { fontSize: 13 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  description: { fontSize: 15, lineHeight: 22, marginBottom: 16 },
  quoteCard: { marginBottom: 12 },
  refCard: { marginBottom: 12 },
  recCard: { marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  cardLabel: { fontSize: 12, fontWeight: '600' },
  quoteText: { fontSize: 14, fontStyle: 'italic', lineHeight: 20, fontFamily: 'monospace' },
  refText: { fontSize: 14, fontWeight: '500' },
  recText: { fontSize: 14, lineHeight: 20 },
  penaltyBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10 },
  penaltyText: { fontWeight: '600', fontSize: 14 },
});
