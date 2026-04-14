import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  IoWarning,
  IoShare,
  IoRefresh,
  IoLayers,
  IoBook,
  IoGitBranch,
  IoCheckboxOutline,
  IoFlask,
  IoDownload,
} from 'react-icons/io5';
import { useTheme, useTranslation } from '../contexts/ThemeContext';
import { useAnalysisResult } from '../hooks/useAnalysis';
import { getExportUrl, downloadAnalysisXlsx } from '../services/api';
import Card from '../components/Card';
import ScoreCircle from '../components/ScoreCircle';
import ProgressBar from '../components/ProgressBar';
import IssueCard from '../components/IssueCard';
import SeverityFilter from '../components/SeverityFilter';
import SummaryCard from '../components/SummaryCard';
import CorrectionCard from '../components/CorrectionCard';
import Spinner from '../components/Spinner';
import './ResultPage.css';

const AGENT_ICONS: Record<string, React.ReactNode> = {
  structural: <IoLayers />,
  terminological: <IoBook />,
  logical: <IoGitBranch />,
  completeness: <IoCheckboxOutline />,
  scientific: <IoFlask />,
};

const AGENT_LABELS: Record<string, string> = {
  structural: '\u0421\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u0430',
  terminological: '\u0422\u0435\u0440\u043C\u0438\u043D\u043E\u043B\u043E\u0433\u0438\u044F',
  logical: '\u041B\u043E\u0433\u0438\u043A\u0430',
  completeness: '\u041F\u043E\u043B\u043D\u043E\u0442\u0430',
  scientific: '\u041D\u0430\u0443\u0447\u043D\u043E\u0441\u0442\u044C',
};

const SEVERITY_BORDER: Record<string, string> = {
  critical: '#EF4444',
  serious: '#F97316',
  warning: '#F59E0B',
  advice: '#6B7280',
};

export default function ResultPage() {
  const { id: analysisId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const t = useTranslation();
  const { data: result, isLoading } = useAnalysisResult(analysisId ?? null);

  const [activeTab, setActiveTab] = useState<'overview' | 'issues' | 'recommendations' | 'corrections'>('overview');
  const [severityFilter, setSeverityFilter] = useState('all');

  if (isLoading || !result) {
    return (
      <div className="result__loading">
        <Spinner size="large" color={theme.accent} />
      </div>
    );
  }

  if (result.status === 'failed') {
    return (
      <div className="result">
        <Card className="result__error-card">
          <div className="result__error-header">
            <IoWarning className="result__error-icon" />
            <span className="result__error-title">{t('analysisError')}</span>
          </div>
          <p className="result__error-text">{result.filename || t('textInput')}</p>
          {result.not_ready && (
            <p className="result__error-reason">{result.not_ready}</p>
          )}
          <p className="result__error-date">
            {result.created_at ? new Date(result.created_at).toLocaleString('ru-RU') : ''}
          </p>
          <button className="result__retry-btn" onClick={() => navigate(-1)}>
            <IoRefresh />
            {t('retry')}
          </button>
        </Card>
      </div>
    );
  }

  const filteredIssues =
    severityFilter === 'all'
      ? result.issues
      : result.issues.filter((i) => i.severity === severityFilter);

  const severityCounts = {
    critical: result.issues.filter((i) => i.severity === 'critical').length,
    serious: result.issues.filter((i) => i.severity === 'serious').length,
    warning: result.issues.filter((i) => i.severity === 'warning').length,
    advice: result.issues.filter((i) => i.severity === 'advice').length,
  };

  const corrections = result.corrections ?? [];

  const TABS = [
    { key: 'overview' as const, label: t('overview') },
    { key: 'issues' as const, label: `${t('issues')} (${result.issues.length})` },
    { key: 'recommendations' as const, label: t('recommendations') },
    { key: 'corrections' as const, label: `${t('corrections')} (${corrections.length})` },
  ];

  return (
    <div className="result">
      {/* Score header */}
      <div className="result__score-header">
        <ScoreCircle score={result.total_score ?? 0} size={120} />
        <div className="result__file-info">
          <p className="result__filename">{result.filename || t('textInput')}</p>
          <p className="result__date">
            {result.created_at ? new Date(result.created_at).toLocaleDateString('ru-RU') : ''}
          </p>
          <p className="result__meta">
            {result.mode === 'full' ? t('fullAnalysis') : t('quickAnalysis')}
          </p>
        </div>
      </div>

      {result.not_ready && (
        <div className="result__not-ready">
          <IoWarning className="result__not-ready-icon" />
          <span className="result__not-ready-text">{t('notReady')}</span>
        </div>
      )}

      <div className="result__export-row">
        <button
          className="result__export-btn"
          onClick={() => {
            if (analysisId) window.open(getExportUrl(analysisId), '_blank');
          }}
        >
          <IoShare className="result__export-icon" />
          {t('exportReport')}
        </button>
        <button
          className="result__export-btn result__export-btn--xlsx"
          onClick={() => {
            if (analysisId) downloadAnalysisXlsx(analysisId);
          }}
        >
          <IoDownload className="result__export-icon" />
          XLSX
        </button>
      </div>

      {result.summary && <SummaryCard summary={result.summary} />}

      {/* Tabs */}
      <div className="result__tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`result__tab ${activeTab === tab.key ? 'result__tab--active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === 'overview' &&
        result.agent_results.map((ar) => {
          const s = ar.score ?? 0;
          const barColor = s >= 70 ? theme.success : s >= 40 ? theme.warning : theme.critical;
          return (
            <Card key={ar.agent_name} className="result__category-card">
              <div className="result__category-header">
                <span className="result__category-icon">
                  {AGENT_ICONS[ar.agent_name] || <IoLayers />}
                </span>
                <span className="result__category-name">
                  {AGENT_LABELS[ar.agent_name] || ar.agent_name}
                </span>
                <span className="result__category-score" style={{ color: barColor }}>
                  {Math.round(s)}/100
                </span>
              </div>
              <ProgressBar progress={s / 100} color={barColor} height={6} />
            </Card>
          );
        })}

      {/* Issues */}
      {activeTab === 'issues' && (
        <div>
          <SeverityFilter
            selected={severityFilter}
            onSelect={setSeverityFilter}
            counts={severityCounts}
          />
          {filteredIssues.map((issue) => (
            <IssueCard
              key={issue.id}
              issue={issue}
              onPress={() =>
                navigate('/issue-detail', { state: { issue } })
              }
            />
          ))}
          {filteredIssues.length === 0 && (
            <p className="result__empty-issues">{t('noIssuesFilter')}</p>
          )}
        </div>
      )}

      {/* Recommendations */}
      {activeTab === 'recommendations' &&
        result.issues
          .filter((i) => i.severity === 'critical' || i.severity === 'serious')
          .map((issue) => (
            <Card
              key={issue.id}
              className="result__rec-card"
              style={{ borderLeftColor: SEVERITY_BORDER[issue.severity] || 'var(--border)' }}
            >
              <p className="result__rec-title">{issue.title}</p>
              <p className="result__rec-text">{issue.recommendation}</p>
            </Card>
          ))}

      {/* Corrections */}
      {activeTab === 'corrections' && (
        <div className="result__corrections">
          {corrections.length > 0 ? (
            corrections.map((c, i) => (
              <CorrectionCard key={c.id} correction={c} index={i} />
            ))
          ) : (
            <p className="result__empty-issues">{t('noCorrections')}</p>
          )}
        </div>
      )}
    </div>
  );
}
