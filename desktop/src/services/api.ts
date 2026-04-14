import axios from 'axios';
import { useSettingsStore } from '../store/settingsStore';
import type { AnalysisListItem, AnalysisResult, Folder } from '../types/analysis';

const api = axios.create({ timeout: 30000 });

// Dynamically read server URL from settings store on every request
api.interceptors.request.use((config) => {
  config.baseURL = useSettingsStore.getState().serverUrl;
  return config;
});

export async function analyzeDocument(
  file: File | null,
  text: string | null,
  mode: 'quick' | 'full' = 'full',
): Promise<{ analysis_id: string; status: string }> {
  const formData = new FormData();
  if (file) {
    formData.append('file', file);
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

// Folders
export async function getFolders(): Promise<Folder[]> {
  const { data } = await api.get('/api/folders');
  return data;
}

export async function createFolder(name: string, parentId?: string): Promise<Folder> {
  const { data } = await api.post('/api/folders', { name, parent_id: parentId || null });
  return data;
}

export async function deleteFolder(id: string): Promise<void> {
  await api.delete(`/api/folders/${id}`);
}

export async function renameFolder(id: string, name: string): Promise<void> {
  await api.put(`/api/folders/${id}`, { name });
}

export async function moveAnalysisToFolder(analysisId: string, folderId: string | null): Promise<void> {
  await api.put(`/api/analysis/${analysisId}/folder`, { folder_id: folderId });
}

// XLSX Export
export async function downloadAnalysisXlsx(id: string): Promise<void> {
  const response = await api.get(`/api/export/${id}/xlsx`, { responseType: 'blob' });
  const url = URL.createObjectURL(response.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = `analysis-${id}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadHistoryXlsx(folderId?: string): Promise<void> {
  const params: Record<string, string> = {};
  if (folderId) params.folder_id = folderId;
  const response = await api.get('/api/export/history/xlsx', { params, responseType: 'blob' });
  const url = URL.createObjectURL(response.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'history.xlsx';
  a.click();
  URL.revokeObjectURL(url);
}

export default api;
