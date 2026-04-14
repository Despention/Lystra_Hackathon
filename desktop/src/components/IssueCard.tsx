
import Badge from './Badge';
import type { Issue } from '../types/analysis';
import './IssueCard.css';

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#EF4444',
  serious: '#F97316',
  warning: '#F59E0B',
  advice: '#6B7280',
};

const AGENT_LABELS: Record<string, string> = {
  structural: '\u0421\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u0430',
  terminological: '\u0422\u0435\u0440\u043C\u0438\u043D\u043E\u043B\u043E\u0433\u0438\u044F',
  logical: '\u041B\u043E\u0433\u0438\u043A\u0430',
  completeness: '\u041F\u043E\u043B\u043D\u043E\u0442\u0430',
  scientific: '\u041D\u0430\u0443\u0447\u043D\u043E\u0441\u0442\u044C',
};

interface Props {
  issue: Issue;
  onPress: () => void;
}

export default function IssueCard({ issue, onPress }: Props) {
  const borderColor = SEVERITY_COLORS[issue.severity] || 'var(--border)';
  const agentLabel = AGENT_LABELS[issue.agent_name] || issue.agent_name;

  return (
    <div
      className="issue-card"
      style={{ borderLeftColor: borderColor }}
      onClick={onPress}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onPress(); }}
    >
      <div className="issue-card__header">
        <Badge severity={issue.severity} />
        <span className="issue-card__agent">{agentLabel}</span>
      </div>
      <p className="issue-card__title">{issue.title}</p>
      {issue.standard_reference && (
        <span className="issue-card__ref">{issue.standard_reference}</span>
      )}
    </div>
  );
}
