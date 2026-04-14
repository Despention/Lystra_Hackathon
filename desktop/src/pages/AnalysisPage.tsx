import { useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { IoWarning } from 'react-icons/io5';
import { useTranslation } from '../contexts/ThemeContext';
import { AGENT_NAMES } from '../constants/agents';
import { useAnalysisStore } from '../store/analysisStore';
import { useAnalysisWebSocket } from '../hooks/useWebSocket';
import { getAnalysis, cancelAnalysis } from '../services/api';
import AgentStatusCard from '../components/AgentStatusCard';
import ProgressBar from '../components/ProgressBar';
import Button from '../components/Button';
import './AnalysisPage.css';

export default function AnalysisPage() {
  const { id: analysisId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const t = useTranslation();
  const store = useAnalysisStore();
  const navigatedRef = useRef(false);

  useAnalysisWebSocket(analysisId ?? null);

  const completedCount = AGENT_NAMES.filter(
    (n) => store.agentStatuses[n] === 'completed',
  ).length;
  const progress = AGENT_NAMES.length > 0 ? completedCount / AGENT_NAMES.length : 0;

  // Polling is the ONLY navigation trigger — waits until DB status = completed/failed.
  useEffect(() => {
    if (!analysisId) return;

    const poll = async () => {
      if (navigatedRef.current) return;
      try {
        const result = await getAnalysis(analysisId);
        if ((result.status === 'completed' || result.status === 'failed') && !navigatedRef.current) {
          navigatedRef.current = true;
          store.setAnalysisDone(result.total_score ?? 0);
          store.setResult(result);
          navigate(`/result/${analysisId}`, { replace: true });
        }
      } catch {
        // network hiccup — retry on next tick
      }
    };

    poll();
    const interval = setInterval(poll, 1500);
    return () => clearInterval(interval);
  }, [analysisId]);

  return (
    <div className="analysis">
      <h1 className="analysis__title">{t('analyzeDoc')}</h1>
      <p className="analysis__subtitle">
        {completedCount} {t('agentsCompleted')} {AGENT_NAMES.length}
      </p>

      <ProgressBar progress={progress} height={10} />

      {store.error && (
        <div className="analysis__error-banner">
          <IoWarning className="analysis__error-icon" />
          <span className="analysis__error-text">{store.error}</span>
        </div>
      )}

      <div className="analysis__agents">
        {AGENT_NAMES.map((name) => (
          <AgentStatusCard
            key={name}
            agentName={name}
            status={store.agentStatuses[name] || 'pending'}
            score={store.agentScores[name] ?? null}
          />
        ))}
      </div>

      <Button
        title={t('cancel')}
        variant="outline"
        onClick={() => {
          if (analysisId) cancelAnalysis(analysisId).catch(() => {});
          store.setCancelled();
          store.reset();
          navigate('/');
        }}
        className="analysis__cancel"
      />
    </div>
  );
}
