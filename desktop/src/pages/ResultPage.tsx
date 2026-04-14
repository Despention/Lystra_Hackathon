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
  IoCopy,
  IoCheckmark,
  IoSparkles,
  IoDocumentText,
  IoGrid,
  IoTrendingUp,
  IoShieldCheckmark,
  IoArrowForward,
  IoBulb,
  IoAlertCircle,
  IoSpeedometer,
} from 'react-icons/io5';
import { useTheme, useTranslation } from '../contexts/ThemeContext';
import { useAnalysisResult } from '../hooks/useAnalysis';
import {
  getExportUrl,
  downloadAnalysisXlsx,
  downloadExpertEvalXlsx,
  generateTzStructure,
  generateTzExample,
} from '../services/api';
import Card from '../components/Card';
import ProgressBar from '../components/ProgressBar';
import CorrectionCard from '../components/CorrectionCard';
import Spinner from '../components/Spinner';
import ChatPanel from '../components/ChatPanel';
import './ResultPage.css';

const AGENT_ICONS: Record<string, React.ReactNode> = {
  structural: <IoLayers />,
  terminological: <IoBook />,
  logical: <IoGitBranch />,
  completeness: <IoCheckboxOutline />,
  scientific: <IoFlask />,
};

const AGENT_LABELS: Record<string, string> = {
  structural: 'Структура',
  terminological: 'Терминология',
  logical: 'Логика',
  completeness: 'Полнота',
  scientific: 'Научность',
};

const SEV_ICON: Record<string, React.ReactNode> = {
  critical: <IoAlertCircle />,
  serious: <IoSpeedometer />,
  warning: <IoWarning />,
  advice: <IoBulb />,
};

export default function ResultPage() {
  const { id: analysisId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const t = useTranslation();
  const { data: result, isLoading } = useAnalysisResult(analysisId ?? null);

  const [activeTab, setActiveTab] = useState<'overview' | 'issues' | 'recommendations' | 'corrections' | 'improved'>('overview');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [copied, setCopied] = useState(false);
  const [genModal, setGenModal] = useState<{ title: string; content: string } | null>(null);
  const [genLoading, setGenLoading] = useState(false);
  const [expertName, setExpertName] = useState('');
  const [expertComment, setExpertComment] = useState('');

  if (isLoading || !result) {
    return (
      <div className="result result--loading">
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
          {result.not_ready && <p className="result__error-reason">{result.not_ready}</p>}
          <p className="result__error-date">
            {result.created_at ? new Date(result.created_at).toLocaleString('ru-RU') : ''}
          </p>
          <button className="result__retry-btn" onClick={() => navigate(-1)}>
            <IoRefresh /> {t('retry')}
          </button>
        </Card>
      </div>
    );
  }

  const score = result.total_score ?? 0;
  const filledBars = Math.max(0, Math.min(5, Math.round(score / 20)));
  const scoreColor = score >= 80 ? 'var(--success)' : score >= 50 ? 'var(--warning)' : 'var(--critical)';

  const filteredIssues =
    severityFilter === 'all'
      ? result.issues
      : result.issues.filter((i) => i.severity === severityFilter);

  const severityCounts = {
    critical: result.issues.filter((i) => i.severity === 'critical').length,
    serious:  result.issues.filter((i) => i.severity === 'serious').length,
    warning:  result.issues.filter((i) => i.severity === 'warning').length,
    advice:   result.issues.filter((i) => i.severity === 'advice').length,
  };

  const corrections = result.corrections ?? [];

  const TABS = [
    { key: 'overview'         as const, label: t('tabOverview') },
    { key: 'issues'           as const, label: t('tabObservations'), count: result.issues.length },
    { key: 'recommendations'  as const, label: t('tabRecommendations') },
    { key: 'corrections'      as const, label: t('tabFixes'), count: corrections.length },
    ...(result.improved_text  ? [{ key: 'improved' as const, label: t('tabImproved') }] : []),
  ];

  const handleCopyImproved = () => {
    if (result.improved_text) {
      navigator.clipboard.writeText(result.improved_text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleGenerateStructure = async () => {
    setGenLoading(true);
    try {
      const topic = result.filename?.replace(/\.[^/.]+$/, '') || 'Проект';
      const structure = await generateTzStructure(topic);
      setGenModal({ title: 'Рекомендуемая структура ТЗ', content: structure });
    } catch {
      setGenModal({ title: 'Ошибка', content: 'Не удалось сгенерировать структуру.' });
    } finally {
      setGenLoading(false);
    }
  };

  const handleGenerateExample = async () => {
    setGenLoading(true);
    try {
      const topic = result.filename?.replace(/\.[^/.]+$/, '') || 'Проект';
      const example = await generateTzExample(topic);
      setGenModal({ title: 'Пример технического задания', content: example });
    } catch {
      setGenModal({ title: 'Ошибка', content: 'Не удалось сгенерировать пример ТЗ.' });
    } finally {
      setGenLoading(false);
    }
  };

  return (
    <div className="result">

      {/* ── HEADER ── */}
      <section className="result__header">
        <div className="result__header-left">

          {/* Square score block */}
          <div className="result__score-block">
            <div className="result__score-block-label">{t('qualityScore')}</div>
            <div className="result__score-block-value">
              <span className="result__score-num" style={{ color: scoreColor }}>{score}</span>
              <span className="result__score-unit">/100</span>
            </div>
            <div className="result__score-trend" style={{ color: severityCounts.critical === 0 ? 'var(--cyan)' : 'var(--critical)' }}>
              <IoTrendingUp />
              <span>{severityCounts.critical === 0 ? t('noCritical') : `${severityCounts.critical} ${t('criticalCount')}`}</span>
            </div>
            <div className="result__score-bars">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className={`result__score-bar ${i <= filledBars ? 'result__score-bar--filled' : ''}`} />
              ))}
            </div>
          </div>

          {/* File name + date */}
          <div className="result__file-info">
            <h1 className="result__filename">
              {result.filename || t('textInput')}
              <IoShieldCheckmark className="result__verified-icon" />
            </h1>
            <div className="result__file-meta">
              <span className="result__file-meta-item">
                <IoDocumentText />
                {result.created_at ? new Date(result.created_at).toLocaleDateString('ru-RU') : '—'}
              </span>
              <span className="result__file-meta-item">
                {result.created_at
                  ? new Date(result.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
                  : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="result__actions">
          <button
            className="result__action-btn result__action-btn--primary"
            onClick={() => analysisId && window.open(getExportUrl(analysisId), '_blank')}
          >
            <IoShare /> {t('exportReportBtn')}
          </button>
          <button
            className="result__action-btn result__action-btn--surface"
            onClick={() => analysisId && downloadAnalysisXlsx(analysisId)}
          >
            <IoDownload /> XLSX
          </button>

          {/* Expert inputs */}
          <input
            className="result__expert-input"
            type="text"
            placeholder={t('expertNamePlaceholder')}
            value={expertName}
            onChange={(e) => setExpertName(e.target.value)}
            maxLength={80}
          />
          <input
            className="result__expert-input result__expert-input--wide"
            type="text"
            placeholder={t('expertCommentPlaceholder')}
            value={expertComment}
            onChange={(e) => setExpertComment(e.target.value)}
            maxLength={300}
          />

          <button
            className="result__action-btn result__action-btn--expert"
            onClick={() => downloadExpertEvalXlsx(expertName, expertComment)}
          >
            <IoGrid /> {t('expertEvaluation')}
          </button>
        </div>
      </section>

      {/* ── BRIEF SUMMARY ── */}
      {result.summary && (
        <section className="result__brief">
          <div className="result__brief-inner">
            <div className="result__brief-header">
              <span className="result__brief-dot" />
              <span className="result__brief-label">{t('briefSummary')}</span>
              <div className="result__brief-actions">
                <button className="result__gen-btn" onClick={handleGenerateStructure} disabled={genLoading}>
                  {genLoading ? <Spinner size="small" /> : <IoDocumentText />}
                  {t('generateStructure')}
                </button>
                <button className="result__gen-btn" onClick={handleGenerateExample} disabled={genLoading}>
                  {genLoading ? <Spinner size="small" /> : <IoSparkles />}
                  {t('generateExample')}
                </button>
              </div>
            </div>

            <p className="result__brief-text">{result.summary}</p>

            <div className="result__brief-stats">
              <div className="result__brief-stat">
                <div className="result__brief-stat-label">{t('statMode')}</div>
                <div className="result__brief-stat-value">
                  {result.mode === 'full' ? t('fullMode') : t('quickMode')}
                </div>
              </div>
              <div className="result__brief-stat">
                <div className="result__brief-stat-label">{t('statIssues')}</div>
                <div className="result__brief-stat-value" style={{ color: 'var(--accent)' }}>
                  {result.issues.length}
                </div>
              </div>
              <div className="result__brief-stat">
                <div className="result__brief-stat-label">{t('statCritical')}</div>
                <div className="result__brief-stat-value" style={{ color: severityCounts.critical > 0 ? 'var(--critical)' : 'var(--success)' }}>
                  {severityCounts.critical > 0 ? severityCounts.critical : '—'}
                </div>
              </div>
              <div className="result__brief-stat">
                <div className="result__brief-stat-label">{t('statScore')}</div>
                <div className="result__brief-stat-value" style={{ color: 'var(--cyan)' }}>
                  {score}/100
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── TABS ── */}
      <div className="result__tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`result__tab ${activeTab === tab.key ? 'result__tab--active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="result__tab-badge">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {activeTab === 'overview' && (
        <div className="result__overview-grid">
          {result.agent_results.map((ar) => {
            const s = ar.score ?? 0;
            const color = s >= 70 ? theme.success : s >= 40 ? theme.warning : theme.critical;
            return (
              <Card key={ar.agent_name} className="result__overview-card">
                <div className="result__category-header">
                  <span className="result__category-icon">{AGENT_ICONS[ar.agent_name] || <IoLayers />}</span>
                  <span className="result__category-name">{AGENT_LABELS[ar.agent_name] || ar.agent_name}</span>
                  <span className="result__category-score" style={{ color }}>{Math.round(s)}/100</span>
                </div>
                <ProgressBar progress={s / 100} color={color} height={6} />
              </Card>
            );
          })}
        </div>
      )}

      {/* ── OBSERVATIONS ── */}
      {activeTab === 'issues' && (
        <div>
          {/* Severity filter pills */}
          <div className="result__severity-filters">
            {([
              { key: 'critical', label: t('filterCritical'),    count: severityCounts.critical },
              { key: 'serious',  label: t('filterSerious'),     count: severityCounts.serious  },
              { key: 'warning',  label: t('filterWarning'),     count: severityCounts.warning  },
              { key: 'advice',   label: t('filterSuggestions'), count: severityCounts.advice   },
            ] as const).filter((f) => f.count > 0).map((f) => (
              <button
                key={f.key}
                className={`result__sev-btn result__sev-btn--${f.key} ${severityFilter === f.key ? 'result__sev-btn--active' : ''}`}
                onClick={() => setSeverityFilter(severityFilter === f.key ? 'all' : f.key)}
              >
                <span className="result__sev-dot" />
                {f.label} ({f.count})
              </button>
            ))}
          </div>

          {/* 3-column issue cards */}
          <div className="result__issues-grid">
            {filteredIssues.map((issue) => (
              <div
                key={issue.id}
                className={`result__issue-card result__issue-card--${issue.severity}`}
                onClick={() => navigate('/issue-detail', { state: { issue } })}
              >
                <div className="result__issue-card-top">
                  <span className={`result__issue-id result__issue-id--${issue.severity}`}>
                    ID: {String(issue.id).slice(0, 6).toUpperCase()}
                  </span>
                  <span className={`result__issue-icon-wrap result__issue-icon-wrap--${issue.severity}`}>
                    {SEV_ICON[issue.severity] || <IoWarning />}
                  </span>
                </div>
                <h3 className="result__issue-title">{issue.title}</h3>
                <p className="result__issue-desc">{issue.description}</p>
                <div className="result__issue-footer">
                  <span className="result__issue-location">
                    {AGENT_LABELS[issue.agent_name] || issue.agent_name}
                  </span>
                  <button
                    className="result__issue-details"
                    onClick={(e) => { e.stopPropagation(); navigate('/issue-detail', { state: { issue } }); }}
                  >
                    {t('issueDetails')} <IoArrowForward />
                  </button>
                </div>
              </div>
            ))}
            {filteredIssues.length === 0 && (
              <p className="result__empty-issues">{t('noIssuesFilter')}</p>
            )}
          </div>
        </div>
      )}

      {/* ── RECOMMENDATIONS ── */}
      {activeTab === 'recommendations' && (
        <div className="result__rec-list">
          {result.issues
            .filter((i) => i.severity === 'critical' || i.severity === 'serious')
            .map((issue) => (
              <Card key={issue.id} className={`result__rec-card result__rec-card--${issue.severity}`}>
                <p className="result__rec-title">{issue.title}</p>
                {issue.document_quote && (
                  <div className="result__rec-quote">
                    <span className="result__rec-quote-icon">❝</span>
                    <span className="result__rec-quote-text">{issue.document_quote}</span>
                  </div>
                )}
                <p className="result__rec-text">{issue.recommendation}</p>
              </Card>
            ))}
        </div>
      )}

      {/* ── FIXES (CORRECTIONS) ── */}
      {activeTab === 'corrections' && (
        <div className="result__corrections">
          {corrections.length > 0
            ? corrections.map((c, i) => <CorrectionCard key={c.id} correction={c} index={i} />)
            : <p className="result__empty-issues">{t('noCorrections')}</p>}
        </div>
      )}

      {/* ── IMPROVED VERSION ── */}
      {activeTab === 'improved' && result.improved_text && (
        <div className="result__improved">
          <div className="result__improved-header">
            <span className="result__improved-title">{t('improvedVersionTitle')}</span>
            <button className="result__improved-copy" onClick={handleCopyImproved}>
              {copied ? <IoCheckmark /> : <IoCopy />}
              {copied ? t('copiedText') : t('copyText')}
            </button>
          </div>
          <pre className="result__improved-text">{result.improved_text}</pre>
        </div>
      )}

      {/* ── GENERATE MODAL ── */}
      {genModal && (
        <div className="result__modal-overlay" onClick={() => setGenModal(null)}>
          <div className="result__modal" onClick={(e) => e.stopPropagation()}>
            <div className="result__modal-header">
              <span>{genModal.title}</span>
              <button className="result__modal-close" onClick={() => setGenModal(null)}>✕</button>
            </div>
            <pre className="result__modal-content">{genModal.content}</pre>
            <button
              className="result__improved-copy"
              onClick={() => navigator.clipboard.writeText(genModal.content)}
              style={{ margin: '12px 16px' }}
            >
              <IoCopy /> {t('copyText')}
            </button>
          </div>
        </div>
      )}

      {/* ── CHAT ── */}
      {analysisId && <ChatPanel analysisId={analysisId} />}
    </div>
  );
}
