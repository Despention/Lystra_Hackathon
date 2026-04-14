export interface Issue {
  id: string;
  agent_name: string;
  severity: 'critical' | 'serious' | 'warning' | 'advice';
  title: string;
  description: string;
  document_quote: string | null;
  standard_reference: string | null;
  recommendation: string;
  penalty: number;
}

export interface Correction {
  id: string;
  analysis_id: string;
  section: string;
  original_text: string;
  suggested_text: string;
  reason: string;
  severity: string;
}

export interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
  analyses_count: number;
}

export interface AgentResultData {
  agent_name: string;
  status: string;
  score: number | null;
  weight: number;
  started_at: string | null;
  completed_at: string | null;
}

export interface AnalysisResult {
  id: string;
  filename: string | null;
  file_type: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  total_score: number | null;
  created_at: string;
  completed_at: string | null;
  mode: string;
  not_ready: string | null;
  agent_results: AgentResultData[];
  issues: Issue[];
  summary: string | null;
  corrections: Correction[];
  folder_id: string | null;
}

export interface AnalysisListItem {
  id: string;
  filename: string | null;
  status: string;
  total_score: number | null;
  created_at: string;
  mode: string;
  issues_count: number;
  critical_count: number;
  folder_id: string | null;
}

export interface WSMessage {
  type: 'agent_start' | 'agent_stream' | 'agent_done' | 'agent_error' | 'analysis_done' | 'error';
  agent?: string;
  token?: string;
  score?: number;
  issues_count?: number;
  duration_ms?: number;
  total_score?: number;
  categories?: Record<string, number>;
  not_ready?: boolean;
  blocked_categories?: string[];
  message?: string;
  error?: string;
}
