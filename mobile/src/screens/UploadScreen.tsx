import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme, useTranslation } from '../contexts/ThemeContext';
import Button from '../components/Button';
import Card from '../components/Card';
import { analyzeDocument } from '../services/api';
import { useAnalysisStore } from '../store/analysisStore';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function UploadScreen() {
  const navigation = useNavigation<Nav>();
  const theme = useTheme();
  const t = useTranslation();
  const startAnalysis = useAnalysisStore((s) => s.startAnalysis);

  const [file, setFile] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [text, setText] = useState('');
  const [mode, setMode] = useState<'full' | 'quick'>('full');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'file' | 'text'>('file');

  const canSubmit = tab === 'file' ? !!file : text.trim().length > 50;

  async function pickFile() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'],
    });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      setFile({ uri: asset.uri, name: asset.name, type: asset.mimeType || 'application/octet-stream' });
    }
  }

  async function handleSubmit() {
    setLoading(true);
    try {
      const resp = await analyzeDocument(tab === 'file' ? file : null, tab === 'text' ? text : null, mode);
      startAnalysis(resp.analysis_id);
      navigation.navigate('Analysis', { analysisId: resp.analysis_id });
    } catch (err: any) {
      Alert.alert('Ошибка', err.message || t('uploadError'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={styles.content}>
      {/* Tabs */}
      <View style={styles.tabs}>
        {(['file', 'text'] as const).map((tabName) => (
          <TouchableOpacity
            key={tabName}
            style={[styles.tab, { backgroundColor: theme.surface, borderColor: theme.border },
              tab === tabName && { backgroundColor: theme.accentLight, borderColor: theme.accent }]}
            onPress={() => setTab(tabName)}
          >
            <Ionicons
              name={tabName === 'file' ? 'document-outline' : 'create-outline'}
              size={16}
              color={tab === tabName ? theme.accent : theme.text.secondary}
            />
            <Text style={[styles.tabText, { color: tab === tabName ? theme.accent : theme.text.secondary },
              tab === tabName && styles.tabTextActive]}>
              {tabName === 'file' ? t('file') : t('text')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* File upload */}
      {tab === 'file' && (
        <Card style={styles.uploadCard}>
          {file ? (
            <View style={styles.fileSelected}>
              <Ionicons name="document-text" size={28} color={theme.accent} />
              <Text style={[styles.fileName, { color: theme.text.primary }]} numberOfLines={1}>{file.name}</Text>
              <TouchableOpacity onPress={() => setFile(null)}>
                <Ionicons name="close-circle" size={22} color={theme.critical} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.dropzone} onPress={pickFile}>
              <Ionicons name="cloud-upload-outline" size={44} color={theme.text.tertiary} />
              <Text style={[styles.dropzoneText, { color: theme.text.primary }]}>{t('pickFile')}</Text>
              <Text style={[styles.dropzoneHint, { color: theme.text.tertiary }]}>{t('pickFileHint')}</Text>
            </TouchableOpacity>
          )}
        </Card>
      )}

      {/* Text input */}
      {tab === 'text' && (
        <Card style={styles.textCard}>
          <TextInput
            style={[styles.textInput, { color: theme.text.primary }]}
            placeholder={t('textPlaceholder')}
            placeholderTextColor={theme.text.tertiary}
            value={text}
            onChangeText={setText}
            multiline
            textAlignVertical="top"
          />
          <Text style={[styles.charCount, { color: theme.text.tertiary }]}>
            {text.length} {t('chars')} {text.length < 50 && t('minChars')}
          </Text>
        </Card>
      )}

      {/* Mode */}
      <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>{t('analysisMode')}</Text>
      <View style={styles.modes}>
        {([{ key: 'full', icon: 'flash', label: t('fullMode'), desc: t('fullModeDesc') },
           { key: 'quick', icon: 'speedometer', label: t('quickMode'), desc: t('quickModeDesc') }] as const
        ).map((opt) => (
          <TouchableOpacity
            key={opt.key}
            style={[styles.modeCard, { backgroundColor: theme.surface, borderColor: theme.border },
              mode === opt.key && { borderColor: theme.accent, backgroundColor: theme.accentLight }]}
            onPress={() => setMode(opt.key as 'full' | 'quick')}
          >
            <Ionicons name={opt.icon as any} size={22} color={mode === opt.key ? theme.accent : theme.text.tertiary} />
            <Text style={[styles.modeTitle, { color: mode === opt.key ? theme.accent : theme.text.primary }]}>
              {opt.label}
            </Text>
            <Text style={[styles.modeDesc, { color: theme.text.tertiary }]}>{opt.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Button title={t('startAnalysis')} onPress={handleSubmit} disabled={!canSubmit} loading={loading} style={styles.submitBtn} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20 },
  tabs: { flexDirection: 'row', marginBottom: 16, gap: 8 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  tabText: { fontSize: 14, fontWeight: '500' },
  tabTextActive: { fontWeight: '600' },
  uploadCard: { marginBottom: 20 },
  dropzone: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  dropzoneText: { fontSize: 16, fontWeight: '500' },
  dropzoneHint: { fontSize: 13 },
  fileSelected: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  fileName: { flex: 1, fontSize: 14, fontWeight: '500' },
  textCard: { marginBottom: 20 },
  textInput: { minHeight: 200, fontSize: 14, lineHeight: 20 },
  charCount: { fontSize: 12, textAlign: 'right', marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 10 },
  modes: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  modeCard: { flex: 1, padding: 14, borderRadius: 10, borderWidth: 1, alignItems: 'center', gap: 6 },
  modeTitle: { fontSize: 15, fontWeight: '600' },
  modeDesc: { fontSize: 12, textAlign: 'center' },
  submitBtn: { marginTop: 8 },
});
