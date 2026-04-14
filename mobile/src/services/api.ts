import axios from 'axios';
import { useSettingsStore } from '../store/settingsStore';
import type { AnalysisListItem, AnalysisResult } from '../types/analysis';

const api = axios.create({ timeout: 30000 });

// Dynamically read server URL from settings store on every request
api.interceptors.request.use((config) => {
  config.baseURL = useSettingsStore.getState().serverUrl;
  return config;
});

export async function analyzeDocument(
  file: { uri: string; name: string; type: string } | null,
  text: string | null,
  mode: 'quick' | 'full' = 'full',
): Promise<{ analysis_id: string; status: string }> {
  const formData = new FormData();
  if (file) {
    formData.append('file', { uri: file.uri, name: file.name, type: file.type } as any);
  } else if (text) {
    formData.append('text', text);
  }
  formData.append('mode', mode);
  const { data } = await api.post('/api/analyze', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function getAnalysis(id: string): Promise<AnalysisResult> {
  const { data } = await api.get(`/api/analysis/${id}`);
  return data;
}

export async function getHistory(
  page = 1,
  params?: { search?: string; min_score?: number },
): Promise<AnalysisListItem[]> {
  const queryParams: Record<string, string | number> = { page };
  if (params?.search) queryParams.search = params.search;
  if (params?.min_score != null) queryParams.min_score = params.min_score;
  const { data } = await api.get('/api/history', { params: queryParams });
  return data;
}

export async function cancelAnalysis(id: string): Promise<void> {
  await api.post(`/api/analysis/${id}/cancel`);
}

export async function deleteAnalysis(id: string): Promise<void> {
  await api.delete(`/api/analysis/${id}`);
}

export function getExportUrl(id: string): string {
  return `${useSettingsStore.getState().serverUrl}/api/export/${id}/pdf`;
}

export async function checkHealth(): Promise<{ status: string; llm_available: boolean }> {
  const { data } = await api.get('/api/health');
  return data;
}

export function getWsUrl(analysisId: string): string {
  const base = useSettingsStore.getState().serverUrl.replace(/^http/, 'ws');
  return `${base}/ws/${analysisId}`;
}

export default api;
