import { create } from 'zustand';
import type { AnalysisResult } from '../types/analysis';
import { AGENT_NAMES } from '../constants/agents';

type AgentStatus = 'pending' | 'running' | 'completed' | 'failed';

interface AnalysisState {
  currentAnalysisId: string | null;
  agentStatuses: Record<string, AgentStatus>;
  agentOutputs: Record<string, string>;
  agentScores: Record<string, number | null>;
  totalScore: number | null;
  isAnalyzing: boolean;
  isDone: boolean;
  completedResult: AnalysisResult | null;
  error: string | null;
  cancelledAt: string | null;

  startAnalysis: (id: string) => void;
  setAgentStart: (agent: string) => void;
  appendAgentOutput: (agent: string, token: string) => void;
  setAgentDone: (agent: string, score: number) => void;
  setAnalysisDone: (totalScore: number) => void;
  setResult: (result: AnalysisResult) => void;
  setError: (message: string) => void;
  setCancelled: () => void;
  reset: () => void;
}

const initialAgentStatuses = (): Record<string, AgentStatus> =>
  Object.fromEntries(AGENT_NAMES.map((n) => [n, 'pending']));

const initialAgentOutputs = (): Record<string, string> =>
  Object.fromEntries(AGENT_NAMES.map((n) => [n, '']));

const initialAgentScores = (): Record<string, number | null> =>
  Object.fromEntries(AGENT_NAMES.map((n) => [n, null]));

export const useAnalysisStore = create<AnalysisState>((set) => ({
  currentAnalysisId: null,
  agentStatuses: initialAgentStatuses(),
  agentOutputs: initialAgentOutputs(),
  agentScores: initialAgentScores(),
  totalScore: null,
  isAnalyzing: false,
  isDone: false,
  completedResult: null,
  error: null,
  cancelledAt: null,

  startAnalysis: (id) =>
    set({
      currentAnalysisId: id,
      agentStatuses: initialAgentStatuses(),
      agentOutputs: initialAgentOutputs(),
      agentScores: initialAgentScores(),
      totalScore: null,
      isAnalyzing: true,
      isDone: false,
      completedResult: null,
      error: null,
      cancelledAt: null,
    }),

  setAgentStart: (agent) =>
    set((state) => ({
      agentStatuses: { ...state.agentStatuses, [agent]: 'running' },
    })),

  appendAgentOutput: (agent, token) =>
    set((state) => ({
      agentOutputs: {
        ...state.agentOutputs,
        [agent]: (state.agentOutputs[agent] || '') + token,
      },
    })),

  setAgentDone: (agent, score) =>
    set((state) => ({
      agentStatuses: { ...state.agentStatuses, [agent]: 'completed' },
      agentScores: { ...state.agentScores, [agent]: score },
    })),

  setAnalysisDone: (totalScore) =>
    set({
      totalScore,
      isAnalyzing: false,
      isDone: true,
    }),

  setResult: (result) =>
    set({ completedResult: result }),

  setError: (message) =>
    set({ isAnalyzing: false, error: message }),

  setCancelled: () =>
    set({ isAnalyzing: false, cancelledAt: new Date().toISOString() }),

  reset: () =>
    set({
      currentAnalysisId: null,
      agentStatuses: initialAgentStatuses(),
      agentOutputs: initialAgentOutputs(),
      agentScores: initialAgentScores(),
      totalScore: null,
      isAnalyzing: false,
      isDone: false,
      completedResult: null,
      error: null,
      cancelledAt: null,
    }),
}));
