import { useNavigate } from 'react-router-dom';
import { IoDocumentOutline } from 'react-icons/io5';
import { useTheme, useTranslation } from '../contexts/ThemeContext';
import { useHistory } from '../hooks/useAnalysis';
import Card from '../components/Card';
import ScoreCircle from '../components/ScoreCircle';
import Button from '../components/Button';
import './HomePage.css';

export default function HomePage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const t = useTranslation();
  const { data: history } = useHistory();

  const lastAnalysis = history?.[0];
  const recentItems = history?.slice(0, 3) || [];

  return (
    <div className="home">
      <h1 className="home__title">{t('appName')}</h1>
      <p className="home__subtitle">{t('appSubtitle')}</p>

      {lastAnalysis?.status === 'completed' ? (
        <Card className="home__last-card">
          <div className="home__last-header">
            <div className="home__last-info">
              <p className="home__last-filename">
                {lastAnalysis.filename || t('textInput')}
              </p>
              <p className="home__last-date">
                {new Date(lastAnalysis.created_at).toLocaleDateString('ru-RU')}
              </p>
              <p className="home__last-meta">
                {t('remarks')}: {lastAnalysis.issues_count}
                {lastAnalysis.critical_count > 0
                  ? ` (${lastAnalysis.critical_count} ${t('critical')})`
                  : ''}
              </p>
            </div>
            <ScoreCircle score={lastAnalysis.total_score ?? 0} size={80} />
          </div>
          <button
            className="home__view-btn"
            onClick={() => navigate(`/result/${lastAnalysis.id}`)}
          >
            {t('viewResult')}
          </button>
        </Card>
      ) : (
        <Card className="home__empty-card">
          <IoDocumentOutline className="home__empty-icon" />
          <p className="home__empty-text">{t('noAnalyses')}</p>
        </Card>
      )}

      <Button
        title={t('newAnalysis')}
        onClick={() => navigate('/upload')}
        className="home__cta"
      />

      {recentItems.length > 1 && (
        <>
          <h2 className="home__section-title">{t('recentAnalyses')}</h2>
          {recentItems.map((item) => {
            const score = item.total_score ?? 0;
            const scoreColor =
              score >= 70 ? theme.success : score >= 40 ? theme.warning : theme.critical;
            return (
              <div
                key={item.id}
                className="home__recent-item"
                onClick={() =>
                  item.status === 'completed' && navigate(`/result/${item.id}`)
                }
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && item.status === 'completed')
                    navigate(`/result/${item.id}`);
                }}
              >
                <span className="home__recent-icon">
                  <IoDocumentOutline />
                </span>
                <div className="home__recent-info">
                  <p className="home__recent-name">
                    {item.filename || t('textInput')}
                  </p>
                  <p className="home__recent-date">
                    {new Date(item.created_at).toLocaleDateString('ru-RU')}
                  </p>
                </div>
                <span className="home__recent-score" style={{ color: scoreColor }}>
                  {item.total_score != null ? Math.round(item.total_score) : '\u2014'}
                </span>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
