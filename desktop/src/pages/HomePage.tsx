import { useNavigate } from 'react-router-dom';
import {
  IoAddCircle,
  IoArrowForward,
  IoTimeOutline,
  IoDocumentOutline,
} from 'react-icons/io5';
import { useTranslation } from '../contexts/ThemeContext';
import { useHistory } from '../hooks/useAnalysis';
import './HomePage.css';

function getStatusInfo(status: string): { label: string; cls: string } {
  if (status === 'completed') return { label: 'ЗАВЕРШЕНО', cls: 'cyan' };
  if (status === 'pending' || status === 'processing') return { label: 'ОБРАБОТКА', cls: 'primary' };
  return { label: 'АРХИВ', cls: 'gray' };
}

export default function HomePage() {
  const navigate = useNavigate();
  const t = useTranslation();
  const { data: history } = useHistory();

  const recentItems = history?.slice(0, 3) ?? [];

  return (
    <div className="home">
      {/* 1. Welcome Header */}
      <header className="home__welcome">
        <div className="home__welcome-deco" />
        <div className="home__welcome-body">
          <div className="home__status-row">
            <span className="home__status-dot" />
            <span className="home__status-text">Система: Оптимально · ГОСТ 34.602-89 · ISO 29148</span>
          </div>
          <h1 className="home__welcome-title">
            Добро пожаловать,{' '}
            <span className="home__welcome-accent">Аналитик</span>.
          </h1>
          <p className="home__welcome-desc">
            AI-движок синхронизирован. Аналитическая среда подготовлена для высокоточного
            синтеза данных. Изучите последние результаты или начните новый анализ.
          </p>
        </div>
      </header>

      {/* 2. Large New Analysis Card */}
      <div className="home__new-wrap">
        <button className="home__new-btn" onClick={() => navigate('/upload')}>
          <div className="home__new-inner">
            <div className="home__new-icon">
              <IoAddCircle size={52} />
            </div>
            <h2 className="home__new-title">Новый анализ</h2>
            <p className="home__new-desc">Инициировать AI-обработку технического задания</p>
          </div>
        </button>
        <div className="home__new-deco home__new-deco--tr" />
        <div className="home__new-deco home__new-deco--bl" />
      </div>

      {/* 3. Recent Analyses */}
      <section className="home__recent-section">
        <div className="home__recent-hdr">
          <div className="home__recent-hdr-left">
            <IoTimeOutline size={18} className="home__recent-hdr-icon" />
            <h3 className="home__recent-hdr-title">Последние анализы</h3>
          </div>
          <button className="home__recent-all" onClick={() => navigate('/history')}>
            Вся история <IoArrowForward size={13} />
          </button>
        </div>

        {recentItems.length > 0 ? (
          <div className="home__hist-grid">
            {recentItems.map((item) => {
              const { label, cls } = getStatusInfo(item.status);
              const projectName = (item.filename || 'Текстовый ввод')
                .replace(/\.[^.]+$/, '')
                .slice(0, 18)
                .toUpperCase();
              return (
                <div
                  key={item.id}
                  className={`home__hist-card home__hist-card--${cls}`}
                  onClick={() => item.status === 'completed' && navigate(`/result/${item.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && item.status === 'completed') navigate(`/result/${item.id}`);
                  }}
                >
                  <div className="home__hist-card-top">
                    <span className="home__hist-project">{projectName}</span>
                    <span className={`home__hist-badge home__hist-badge--${cls}`}>{label}</span>
                  </div>
                  <h4 className="home__hist-title">{item.filename || t('textInput')}</h4>
                  <div className="home__hist-date">
                    <IoDocumentOutline size={11} />
                    <span>
                      {new Date(item.created_at).toLocaleDateString('ru-RU', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  {item.status === 'completed' && item.total_score != null && (
                    <div className="home__hist-score">
                      <span
                        style={{
                          color:
                            item.total_score >= 70
                              ? 'var(--success)'
                              : item.total_score >= 40
                              ? 'var(--warning)'
                              : 'var(--critical)',
                        }}
                      >
                        {Math.round(item.total_score)}
                      </span>
                      <span className="home__hist-score-label">/ 100</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="home__hist-empty">
            <IoDocumentOutline size={32} />
            <p>Анализов ещё нет. Начните новый анализ.</p>
          </div>
        )}
      </section>
    </div>
  );
}
