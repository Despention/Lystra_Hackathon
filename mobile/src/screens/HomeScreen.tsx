import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme, useTranslation } from '../contexts/ThemeContext';
import { useHistory } from '../hooks/useAnalysis';
import Card from '../components/Card';
import ScoreCircle from '../components/ScoreCircle';
import Button from '../components/Button';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const theme = useTheme();
  const t = useTranslation();
  const { data: history, isLoading, refetch } = useHistory();

  const lastAnalysis = history?.[0];
  const recentItems = history?.slice(0, 3) || [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => refetch()} />}
      >
        <Text style={[styles.title, { color: theme.text.primary }]}>{t('appName')}</Text>
        <Text style={[styles.subtitle, { color: theme.text.secondary }]}>{t('appSubtitle')}</Text>

        {lastAnalysis?.status === 'completed' ? (
          <Card style={styles.lastCard}>
            <View style={styles.lastHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.lastFilename, { color: theme.text.primary }]} numberOfLines={1}>
                  {lastAnalysis.filename || t('textInput')}
                </Text>
                <Text style={[styles.lastDate, { color: theme.text.tertiary }]}>
                  {new Date(lastAnalysis.created_at).toLocaleDateString('ru-RU')}
                </Text>
                <Text style={[styles.lastMeta, { color: theme.text.secondary }]}>
                  {t('remarks')}: {lastAnalysis.issues_count}
                  {lastAnalysis.critical_count > 0 ? ` (${lastAnalysis.critical_count} ${t('critical')})` : ''}
                </Text>
              </View>
              <ScoreCircle score={lastAnalysis.total_score ?? 0} size={80} />
            </View>
            <TouchableOpacity
              style={styles.viewBtn}
              onPress={() => navigation.navigate('Result', { analysisId: lastAnalysis.id })}
            >
              <Text style={[styles.viewBtnText, { color: theme.accent }]}>{t('viewResult')}</Text>
            </TouchableOpacity>
          </Card>
        ) : (
          <Card style={styles.emptyCard}>
            <Ionicons name="document-text-outline" size={48} color={theme.text.tertiary} />
            <Text style={[styles.emptyText, { color: theme.text.secondary }]}>
              {t('noAnalyses')}
            </Text>
          </Card>
        )}

        <Button title={t('newAnalysis')} onPress={() => navigation.navigate('Upload')} style={styles.ctaBtn} />

        {recentItems.length > 1 && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
              {t('recentAnalyses')}
            </Text>
            {recentItems.map((item) => {
              const score = item.total_score ?? 0;
              const scoreColor = score >= 70 ? theme.success : score >= 40 ? theme.warning : theme.critical;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.recentItem, { backgroundColor: theme.surface, borderColor: theme.border }]}
                  onPress={() => item.status === 'completed' && navigation.navigate('Result', { analysisId: item.id })}
                >
                  <Ionicons name="document-outline" size={18} color={theme.text.tertiary} style={{ marginRight: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.recentName, { color: theme.text.primary }]} numberOfLines={1}>
                      {item.filename || t('textInput')}
                    </Text>
                    <Text style={[styles.recentDate, { color: theme.text.tertiary }]}>
                      {new Date(item.created_at).toLocaleDateString('ru-RU')}
                    </Text>
                  </View>
                  <Text style={[styles.recentScore, { color: scoreColor }]}>
                    {item.total_score != null ? Math.round(item.total_score) : '—'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 15, marginBottom: 24 },
  lastCard: { marginBottom: 16 },
  lastHeader: { flexDirection: 'row', alignItems: 'center' },
  lastFilename: { fontSize: 16, fontWeight: '600' },
  lastDate: { fontSize: 13, marginTop: 2 },
  lastMeta: { fontSize: 13, marginTop: 4 },
  viewBtn: { marginTop: 12 },
  viewBtnText: { fontWeight: '600', fontSize: 14 },
  emptyCard: { alignItems: 'center', paddingVertical: 32, marginBottom: 16, gap: 12 },
  emptyText: { fontSize: 15, textAlign: 'center' },
  ctaBtn: { marginBottom: 24 },
  sectionTitle: { fontSize: 17, fontWeight: '600', marginBottom: 12 },
  recentItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 10, marginBottom: 8, borderWidth: 1 },
  recentName: { fontSize: 14, fontWeight: '500' },
  recentDate: { fontSize: 12, marginTop: 2 },
  recentScore: { fontSize: 20, fontWeight: '700', marginLeft: 12 },
});
