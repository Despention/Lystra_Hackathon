import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useTranslation } from '../contexts/ThemeContext';
import { useSettingsStore } from '../store/settingsStore';
import { checkHealth } from '../services/api';
import type { ThemeMode } from '../constants/themes';
import type { Language } from '../constants/translations';

interface HealthStatus {
  serverOnline: boolean;
  llmAvailable: boolean;
  modelName: string | null;
  llmUrl: string | null;
  useMock: boolean;
}

export default function SettingsScreen() {
  const theme = useTheme();
  const t = useTranslation();
  const store = useSettingsStore();

  const [urlDraft, setUrlDraft] = useState(store.serverUrl);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [checking, setChecking] = useState(true);

  const fetchHealth = useCallback(async () => {
    try {
      setChecking(true);
      const data = await checkHealth();
      setHealth({
        serverOnline: data.status === 'ok',
        llmAvailable: data.llm_available,
        modelName: (data as any).llm_model ?? null,
        llmUrl: (data as any).llm_url ?? null,
        useMock: (data as any).use_mock ?? false,
      });
    } catch {
      setHealth({
        serverOnline: false,
        llmAvailable: false,
        modelName: null,
        llmUrl: null,
        useMock: false,
      });
    } finally {
      setChecking(false);
    }
  }, []);

  // Poll every 10 seconds
  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  function saveUrl() {
    const trimmed = urlDraft.trim();
    if (!trimmed.startsWith('http')) {
      Alert.alert('Ошибка', 'URL должен начинаться с http:// или https://');
      return;
    }
    store.setServerUrl(trimmed.replace(/\/$/, ''));
    Alert.alert('Сохранено', 'URL сервера обновлён');
    // Re-check health with new URL
    setTimeout(fetchHealth, 500);
  }

  const themeOptions: { value: ThemeMode; icon: string }[] = [
    { value: 'light', icon: 'sunny-outline' },
    { value: 'dark', icon: 'moon-outline' },
    { value: 'system', icon: 'phone-portrait-outline' },
  ];

  const themeLabels: Record<ThemeMode, string> = {
    light: t('themeLight'),
    dark: t('themeDark'),
    system: t('themeSystem'),
  };

  const langOptions: { value: Language; label: string }[] = [
    { value: 'ru', label: 'Русский' },
    { value: 'en', label: 'English' },
  ];

  const s = makeStyles(theme);

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.pageTitle}>{t('settings')}</Text>

        {/* ── System Status ── */}
        <Text style={s.sectionHeader}>{t('serverStatus')}</Text>
        <View style={s.card}>
          {checking && !health ? (
            <View style={s.statusRow}>
              <ActivityIndicator size="small" color={theme.accent} />
              <Text style={s.statusText}>{t('checking')}</Text>
            </View>
          ) : (
            <>
              {/* Server status */}
              <View style={s.statusRow}>
                <View style={[s.statusDot, { backgroundColor: health?.serverOnline ? theme.success : theme.critical }]} />
                <Text style={s.statusLabel}>Backend</Text>
                <Text style={[s.statusValue, { color: health?.serverOnline ? theme.success : theme.critical }]}>
                  {health?.serverOnline ? t('serverOnline') : t('serverOffline')}
                </Text>
                <TouchableOpacity onPress={fetchHealth} style={s.refreshBtn}>
                  {checking ? (
                    <ActivityIndicator size="small" color={theme.accent} />
                  ) : (
                    <Ionicons name="refresh-outline" size={18} color={theme.accent} />
                  )}
                </TouchableOpacity>
              </View>

              {/* LLM / Model status */}
              <View style={[s.statusRow, { marginTop: 10 }]}>
                <View style={[s.statusDot, { backgroundColor: health?.llmAvailable ? theme.success : theme.critical }]} />
                <Text style={s.statusLabel}>{t('model')}</Text>
                <Text style={[s.statusValue, { color: health?.llmAvailable ? theme.success : theme.critical }]}>
                  {health?.useMock
                    ? t('mockMode')
                    : health?.llmAvailable
                      ? t('modelOnline')
                      : t('modelOffline')}
                </Text>
              </View>

              {/* Model name */}
              {health?.llmAvailable && health?.modelName && !health?.useMock && (
                <View style={s.modelInfoRow}>
                  <Ionicons name="hardware-chip-outline" size={14} color={theme.text.tertiary} />
                  <Text style={s.modelInfoText}>{health.modelName}</Text>
                </View>
              )}

              {/* LLM URL */}
              {health?.llmUrl && !health?.useMock && (
                <View style={s.modelInfoRow}>
                  <Ionicons name="link-outline" size={14} color={theme.text.tertiary} />
                  <Text style={s.modelInfoText}>{health.llmUrl}</Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* ── Server URL ── */}
        <Text style={s.sectionHeader}>{t('serverUrl')}</Text>
        <View style={s.card}>
          <Text style={s.label}>{t('serverUrlDesc')}</Text>
          <TextInput
            style={s.input}
            value={urlDraft}
            onChangeText={setUrlDraft}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            placeholderTextColor={theme.text.tertiary}
            selectionColor={theme.accent}
          />
          <TouchableOpacity style={s.saveBtn} onPress={saveUrl}>
            <Text style={s.saveBtnText}>{t('save')}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Appearance ── */}
        <Text style={s.sectionHeader}>{t('appearance')}</Text>
        <View style={s.card}>
          <Text style={s.label}>Тема</Text>
          <View style={s.segmented}>
            {themeOptions.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[s.segment, store.theme === opt.value && s.segmentActive]}
                onPress={() => store.setTheme(opt.value)}
              >
                <Ionicons
                  name={opt.icon as any}
                  size={18}
                  color={store.theme === opt.value ? theme.accent : theme.text.tertiary}
                />
                <Text
                  style={[
                    s.segmentText,
                    store.theme === opt.value && s.segmentTextActive,
                  ]}
                >
                  {themeLabels[opt.value]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Language ── */}
        <Text style={s.sectionHeader}>{t('language')}</Text>
        <View style={s.card}>
          {langOptions.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={s.row}
              onPress={() => store.setLanguage(opt.value)}
            >
              <Text style={s.rowLabel}>{opt.label}</Text>
              {store.language === opt.value && (
                <Ionicons name="checkmark" size={20} color={theme.accent} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Notifications ── */}
        <Text style={s.sectionHeader}>{t('notifications')}</Text>
        <View style={s.card}>
          <View style={s.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.rowLabel}>{t('notifications')}</Text>
              <Text style={s.rowDesc}>{t('notificationsDesc')}</Text>
            </View>
            <Switch
              value={store.notificationsEnabled}
              onValueChange={store.setNotificationsEnabled}
              trackColor={{ true: theme.accent, false: theme.border }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* ── About ── */}
        <Text style={s.sectionHeader}>{t('about')}</Text>
        <View style={s.card}>
          <View style={s.aboutHeader}>
            <View style={s.aboutLogo}>
              <Text style={s.aboutLogoText}>TZ</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.aboutName}>TZ Analyzer</Text>
              <Text style={s.aboutDesc}>{t('aboutDesc')}</Text>
            </View>
          </View>
          <View style={s.divider} />
          <View style={s.row}>
            <Text style={s.rowLabel}>{t('version')}</Text>
            <Text style={s.rowValue}>0.1.0 MVP</Text>
          </View>
          <View style={s.row}>
            <Text style={s.rowLabel}>Стандарты</Text>
            <Text style={s.rowValue}>ГОСТ 34.602, ISO 29148</Text>
          </View>
          <View style={[s.row, { borderBottomWidth: 0 }]}>
            <Text style={s.rowLabel}>AI движок</Text>
            <Text style={s.rowValue}>Gemma 4 + llama.cpp</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.bg },
    content: { padding: 20 },
    pageTitle: {
      fontSize: 28,
      fontWeight: '700',
      color: theme.text.primary,
      marginBottom: 20,
    },
    sectionHeader: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.text.tertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: 20,
      marginBottom: 8,
    },
    card: {
      backgroundColor: theme.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    // Status section
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    statusDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    statusLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text.primary,
      minWidth: 65,
    },
    statusValue: {
      flex: 1,
      fontSize: 13,
    },
    statusText: {
      fontSize: 14,
      color: theme.text.secondary,
      marginLeft: 8,
    },
    refreshBtn: {
      padding: 4,
    },
    modelInfoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 6,
      paddingLeft: 18,
    },
    modelInfoText: {
      fontSize: 12,
      color: theme.text.tertiary,
      fontFamily: 'monospace',
    },
    // Form elements
    label: { fontSize: 14, color: theme.text.secondary, marginBottom: 8 },
    input: {
      backgroundColor: theme.surfaceSecondary,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: theme.text.primary,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: 10,
    },
    saveBtn: {
      backgroundColor: theme.accent,
      borderRadius: 8,
      paddingVertical: 10,
      alignItems: 'center',
    },
    saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
    segmented: { flexDirection: 'row', gap: 6, marginTop: 4 },
    segment: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 8,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surfaceSecondary,
      gap: 4,
    },
    segmentActive: {
      borderColor: theme.accent,
      backgroundColor: theme.accentLight,
    },
    segmentText: { fontSize: 12, color: theme.text.tertiary },
    segmentTextActive: { color: theme.accent, fontWeight: '600' },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 4,
    },
    rowLabel: { fontSize: 15, color: theme.text.primary },
    rowDesc: { fontSize: 12, color: theme.text.tertiary, marginTop: 2 },
    rowValue: { fontSize: 14, color: theme.text.secondary },
    divider: { height: 1, backgroundColor: theme.border, marginVertical: 12 },
    aboutHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 4 },
    aboutLogo: {
      width: 48,
      height: 48,
      borderRadius: 12,
      backgroundColor: theme.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    aboutLogoText: { fontSize: 16, fontWeight: '800', color: '#fff' },
    aboutName: { fontSize: 16, fontWeight: '700', color: theme.text.primary },
    aboutDesc: { fontSize: 13, color: theme.text.secondary, marginTop: 2 },
  });
}
