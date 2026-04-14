import React from 'react';
import { IoCheckmarkCircle, IoCloseCircle, IoLayers, IoBook, IoGitBranch, IoCheckboxOutline, IoFlask } from 'react-icons/io5';
import Spinner from './Spinner';
import ProgressBar from './ProgressBar';
import { useTheme } from '../contexts/ThemeContext';
import './AgentStatusCard.css';

const AGENT_META: Record<string, { label: string; icon: React.ReactNode }> = {
  structural: { label: '\u0421\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u0430', icon: <IoLayers /> },
  terminological: { label: '\u0422\u0435\u0440\u043C\u0438\u043D\u043E\u043B\u043E\u0433\u0438\u044F', icon: <IoBook /> },
  logical: { label: '\u041B\u043E\u0433\u0438\u043A\u0430', icon: <IoGitBranch /> },
  completeness: { label: '\u041F\u043E\u043B\u043D\u043E\u0442\u0430', icon: <IoCheckboxOutline /> },
  scientific: { label: '\u041D\u0430\u0443\u0447\u043D\u043E\u0441\u0442\u044C', icon: <IoFlask /> },
};

interface Props {
  agentName: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  score: number | null;
}

export default function AgentStatusCard({ agentName, status, score }: Props) {
  const theme = useTheme();
  const meta = AGENT_META[agentName] || { label: agentName, icon: <IoLayers /> };

  const statusColor =
    status === 'completed' ? theme.success :
    status === 'failed' ? theme.critical :
    theme.text.tertiary;

  const barColor = status === 'completed'
    ? ((score ?? 0) >= 70 ? theme.success : (score ?? 0) >= 40 ? theme.warning : theme.critical)
    : theme.accent;

  return (
    <div className="agent-card">
      <div className="agent-card__header">
        <div className="agent-card__icon-box">
          {meta.icon}
        </div>
        <div className="agent-card__info">
          <div className="agent-card__name">{meta.label}</div>
          <div className="agent-card__status" style={{ color: statusColor }}>
            {status === 'pending' && '\u041E\u0436\u0438\u0434\u0430\u043D\u0438\u0435'}
            {status === 'running' && '\u0410\u043D\u0430\u043B\u0438\u0437...'}
            {status === 'completed' && `${score ?? 0}/100`}
            {status === 'failed' && '\u041E\u0448\u0438\u0431\u043A\u0430'}
          </div>
        </div>
        <div className="agent-card__indicator">
          {status === 'running' && <Spinner size="small" color={theme.accent} />}
          {status === 'completed' && <IoCheckmarkCircle className="agent-card__check-icon" />}
          {status === 'failed' && <IoCloseCircle className="agent-card__fail-icon" />}
          {status === 'pending' && <div className="agent-card__pending-dot" />}
        </div>
      </div>
      {status !== 'pending' && (
        <ProgressBar progress={(score ?? 0) / 100} color={barColor} height={4} />
      )}
    </div>
  );
}
