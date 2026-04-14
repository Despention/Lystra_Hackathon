import { useEffect, useRef } from 'react';
import { getWsUrl } from '../services/api';
import { useAnalysisStore } from '../store/analysisStore';
import type { WSMessage } from '../types/analysis';

export function useAnalysisWebSocket(analysisId: string | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const retriedRef = useRef(false);
  const store = useAnalysisStore();

  useEffect(() => {
    if (!analysisId) return;

    function connect() {
      const url = getWsUrl(analysisId!);
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const msg: WSMessage = JSON.parse(event.data);

          switch (msg.type) {
            case 'agent_start':
              if (msg.agent) store.setAgentStart(msg.agent);
              break;
            case 'agent_stream':
              if (msg.agent && msg.token) store.appendAgentOutput(msg.agent, msg.token);
              break;
            case 'agent_done':
              if (msg.agent && msg.score != null) store.setAgentDone(msg.agent, msg.score);
              break;
            case 'agent_error':
              store.setError(msg.error || msg.message || 'Agent error');
              break;
            case 'analysis_done':
              if (msg.total_score != null) store.setAnalysisDone(msg.total_score);
              break;
            case 'error':
              store.setError(msg.message || msg.error || 'Unknown error');
              break;
          }
        } catch {
          // ignore parse errors
        }
      };

      ws.onerror = () => {
        if (!retriedRef.current) {
          retriedRef.current = true;
          ws.close();
          setTimeout(connect, 1500);
        } else {
          store.setError('WebSocket connection error');
        }
      };

      ws.onclose = (event) => {
        // If connection closed unexpectedly (not a normal close) and we haven't retried
        if (event.code !== 1000 && !retriedRef.current) {
          retriedRef.current = true;
          setTimeout(connect, 1500);
        }
      };
    }

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [analysisId]);

  return wsRef;
}
