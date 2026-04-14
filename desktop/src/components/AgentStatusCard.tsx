import React from 'react';
import { IoCheckmarkCircle, IoCloseCircle, IoLayers, IoBook, IoGitBranch, IoCheckboxOutline, IoFlask } from 'react-icons/io5';
import Spinner from './Spinner';
import ProgressBar from './ProgressBar';
import { useTheme, useTranslation } from '../contexts/ThemeContext';
import './AgentStatusCard.css';

const AGENT_ICONS: Record<string, React.ReactNode> = {
  structural:    <IoLayers />,
  terminological:<IoBook />,
  logical:       <IoGitBranch />,
  completeness:  <IoCheckboxOutline />,
  scientific:    <IoFlask />,
};

const AGENT_LABEL_KEYS: Record<string, string> = {
  structural:    'agentStructural',
  terminological:'agentTerminological',
  logical:       'agentLogical',
  completeness:  'agentCompleteness',
  scientific:    'agentScientific',
};

interface Props {
  agentName: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  score: number | null;
}

export default function AgentStatusCard({ agentName, status, score }: Props) {
  const theme = useTheme();
  const t = useTranslation();

  const icon  = AGENT_ICONS[agentName] ?? <IoLayers />;
  const label = AGENT_LABEL_KEYS[agentName] ? t(AGENT_LABEL_KEYS[agentName] as any) : agentName;

  const statusColor =
    status === 'completed' ? theme.success :
    status === 'failed'    ? theme.critical :
    theme.text.tertiary;

  const barColor = status === 'completed'
    ? ((score ?? 0) >= 70 ? theme.success : (score ?? 0) >= 40 ? theme.warning : theme.critical)
    : theme.accent;

  const statusText =
    status === 'pending'   ? t('waiting') :
    status === 'running'   ? t('analyzing') :
    status === 'completed' ? `${score ?? 0}/100` :
    t('agentError');

  return (
    <div className="agent-card">
      <div className="agent-card__header">
        <div className="agent-card__icon-box">
          {icon}
        </div>
        <div className="agent-card__info">
          <div className="agent-card__name">{label}</div>
          <div className="agent-card__status" style={{ color: statusColor }}>
            {statusText}
          </div>
        </div>
        <div className="agent-card__indicator">
          {status === 'running'   && <Spinner size="small" color={theme.accent} />}
          {status === 'completed' && <IoCheckmarkCircle className="agent-card__check-icon" />}
          {status === 'failed'    && <IoCloseCircle className="agent-card__fail-icon" />}
          {status === 'pending'   && <div className="agent-card__pending-dot" />}
        </div>
      </div>
      {status !== 'pending' && (
        <ProgressBar progress={(score ?? 0) / 100} color={barColor} height={4} />
      )}
    </div>
  );
}
