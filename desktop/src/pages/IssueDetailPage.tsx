import { useLocation, useNavigate } from 'react-router-dom';
import {
  IoLayers,
  IoBook,
  IoGitBranch,
  IoCheckboxOutline,
  IoFlask,
  IoChatboxEllipses,
  IoLink,
  IoBulb,
} from 'react-icons/io5';
import { useTheme } from '../contexts/ThemeContext';
import Badge from '../components/Badge';
import Card from '../components/Card';
import type { Issue } from '../types/analysis';
import './IssueDetailPage.css';

const AGENT_META: Record<string, { label: string; icon: React.ReactNode }> = {
  structural: { label: '\u0421\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u0430', icon: <IoLayers /> },
  terminological: { label: '\u0422\u0435\u0440\u043C\u0438\u043D\u043E\u043B\u043E\u0433\u0438\u044F', icon: <IoBook /> },
  logical: { label: '\u041B\u043E\u0433\u0438\u043A\u0430', icon: <IoGitBranch /> },
  completeness: { label: '\u041F\u043E\u043B\u043D\u043E\u0442\u0430', icon: <IoCheckboxOutline /> },
  scientific: { label: '\u041D\u0430\u0443\u0447\u043D\u043E\u0441\u0442\u044C', icon: <IoFlask /> },
};

export default function IssueDetailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const issue = (location.state as { issue: Issue })?.issue;

  if (!issue) {
    return (
      <div className="issue-detail">
        <p style={{ color: 'var(--text-tertiary)' }}>No issue data available.</p>
      </div>
    );
  }

  const agent = AGENT_META[issue.agent_name];

  return (
    <div className="issue-detail">
      <button className="issue-detail__back" onClick={() => navigate(-1)}>
        &larr; Back
      </button>

      <div className="issue-detail__header">
        <Badge severity={issue.severity} />
        <div className="issue-detail__agent-tag">
          <span className="issue-detail__agent-icon">
            {agent?.icon || <IoLayers />}
          </span>
          <span>{agent?.label || issue.agent_name}</span>
        </div>
      </div>

      <h1 className="issue-detail__title">{issue.title}</h1>
      <p className="issue-detail__description">{issue.description}</p>

      {issue.document_quote && (
        <Card className="issue-detail__quote-card">
          <div className="issue-detail__card-header">
            <IoChatboxEllipses
              className="issue-detail__card-icon"
              style={{ color: theme.text.tertiary }}
            />
            <span className="issue-detail__card-label" style={{ color: theme.text.tertiary }}>
              {'\u0426\u0438\u0442\u0430\u0442\u0430 \u0438\u0437 \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u0430'}
            </span>
          </div>
          <p className="issue-detail__quote-text">
            &laquo;{issue.document_quote}&raquo;
          </p>
        </Card>
      )}

      {issue.standard_reference && (
        <Card className="issue-detail__ref-card">
          <div className="issue-detail__card-header">
            <IoLink className="issue-detail__card-icon" style={{ color: theme.accent }} />
            <span className="issue-detail__card-label" style={{ color: theme.accent }}>
              {'\u0421\u0441\u044B\u043B\u043A\u0430 \u043D\u0430 \u0441\u0442\u0430\u043D\u0434\u0430\u0440\u0442'}
            </span>
          </div>
          <p className="issue-detail__ref-text">{issue.standard_reference}</p>
        </Card>
      )}

      <Card className="issue-detail__rec-card">
        <div className="issue-detail__card-header">
          <IoBulb className="issue-detail__card-icon" style={{ color: theme.success }} />
          <span className="issue-detail__card-label" style={{ color: theme.success }}>
            {'\u0420\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0430\u0446\u0438\u044F'}
          </span>
        </div>
        <p className="issue-detail__rec-text">{issue.recommendation}</p>
      </Card>

      {issue.penalty > 0 && (
        <div className="issue-detail__penalty">
          <span className="issue-detail__penalty-icon">&darr;</span>
          <span className="issue-detail__penalty-text">
            {'\u0428\u0442\u0440\u0430\u0444'}: -{issue.penalty} {'\u0431\u0430\u043B\u043B\u043E\u0432'}
          </span>
        </div>
      )}
    </div>
  );
}
