import React, { useState, useMemo, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme, useTranslation } from '../contexts/ThemeContext';
import { useHistory } from '../hooks/useAnalysis';
import { deleteAnalysis } from '../services/api';
import type { AnalysisListItem } from '../types/analysis';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function HistoryScreen() {
  const navigation = useNavigation<Nav>();
  const theme = useTheme();
  const t = useTranslation();
  const { data: history, isLoading, refetch } = useHistory();
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback((text: string) => {
    setSearchText(text);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedSearch(text), 300);
  }, []);

  const filteredHistory = useMemo(() => {
    if (!history) return [];
    if (!debouncedSearch.trim()) return history;
    const query = debouncedSearch.toLowerCase();
    return history.filter((item) => (item.filename || '').toLowerCase().includes(query));
  }, [history, debouncedSearch]);

  const handleDelete = useCallback((item: AnalysisListItem) => {
    Alert.alert(
      t('deleteAnalysis'),
      t('deleteConfirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAnalysis(item.id);
              refetch();
            } catch {
              // silently fail
            }
          },
        },
      ],
    );
  }, [t, refetch]);

  const renderItem = ({ item }: { item: AnalysisListItem }) => {
    const score = item.total_score ?? 0;
    const scoreColor = score >= 70 ? theme.success : score >= 40 ? theme.warning : theme.critical;

    return (
      <TouchableOpacity
        style={[styles.item, { backgroundColor: theme.surface, borderColor: theme.border }]}
        onPress={() => item.status === 'completed' && navigation.navigate('Result', { analysisId: item.id })}
        onLongPress={() => handleDelete(item)}
      >
        <Ionicons name="document-text-outline" size={20} color={theme.text.tertiary} style={{ marginRight: 10 }} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.filename, { color: theme.text.primary }]} numberOfLines={1}>
            {item.filename || t('textInput')}
          </Text>
          <Text style={[styles.meta, { color: theme.text.tertiary }]}>
            {new Date(item.created_at).toLocaleString('ru-RU')} ·{' '}
            {item.mode === 'full' ? t('fullMode') : t('quickMode')} ·{' '}
            {item.issues_count} {t('remarks').toLowerCase()}
          </Text>
        </View>
        {item.status === 'completed' ? (
          <View style={styles.itemRight}>
            <Text style={[styles.score, { color: scoreColor }]}>{Math.round(score)}</Text>
            <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="trash-outline" size={18} color={theme.text.tertiary} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.itemRight}>
            <Text style={[styles.statusText, { color: theme.text.tertiary }]}>
              {item.status === 'processing' ? '...' : item.status}
            </Text>
            <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="trash-outline" size={18} color={theme.text.tertiary} />
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <Text style={[styles.title, { color: theme.text.primary }]}>{t('history')}</Text>
      <View style={[styles.searchContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Ionicons name="search-outline" size={18} color={theme.text.tertiary} />
        <TextInput
          style={[styles.searchInput, { color: theme.text.primary }]}
          placeholder={t('searchPlaceholder')}
          placeholderTextColor={theme.text.tertiary}
          value={searchText}
          onChangeText={handleSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Ionicons name="close-circle" size={18} color={theme.text.tertiary} />
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        data={filteredHistory}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => refetch()} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="time-outline" size={48} color={theme.text.tertiary} />
            <Text style={[styles.emptyText, { color: theme.text.tertiary }]}>
              {debouncedSearch ? t('noIssuesFilter') : t('noAnalyses')}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '700', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 12, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, gap: 8 },
  searchInput: { flex: 1, fontSize: 15, padding: 0 },
  list: { paddingHorizontal: 20 },
  item: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 10, marginBottom: 8, borderWidth: 1 },
  filename: { fontSize: 15, fontWeight: '500' },
  meta: { fontSize: 12, marginTop: 4 },
  itemRight: { alignItems: 'center', marginLeft: 12, gap: 6 },
  score: { fontSize: 22, fontWeight: '700' },
  statusText: { fontSize: 13 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15 },
});
