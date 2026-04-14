import { useEffect } from 'react';
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

  useAnalysisWebSocket(analysisId ?? null);

  const completedCount = AGENT_NAMES.filter(
    (n) => store.agentStatuses[n] === 'completed',
  ).length;
  const progress = AGENT_NAMES.length > 0 ? completedCount / AGENT_NAMES.length : 0;

  useEffect(() => {
    if (store.isDone && analysisId) {
      getAnalysis(analysisId).then((result) => {
        store.setResult(result);
        navigate(`/result/${analysisId}`, { replace: true });
      });
    }
  }, [store.isDone, analysisId, navigate]);

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

      {/* Live streaming output */}
      {AGENT_NAMES.filter((n) => store.agentStatuses[n] === 'running').map((name) => {
        const output = store.agentOutputs[name];
        if (!output) return null;
        return (
          <div key={name} className="analysis__stream-box">
            <div className="analysis__stream-header">
              <span className="analysis__stream-pulse">&#9679;</span>
              <span className="analysis__stream-label">{name}</span>
            </div>
            <div className="analysis__stream-scroll">
              <pre className="analysis__stream-text">{output.slice(-500)}</pre>
            </div>
          </div>
        );
      })}

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
