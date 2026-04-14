import React, { useCallback, useEffect, useState } from 'react';
import {
  IoSunny,
  IoMoon,
  IoPhonePortrait,
  IoHardwareChip,
  IoLink,
  IoRefresh,
  IoCheckmark,
} from 'react-icons/io5';
import { useTheme, useTranslation } from '../contexts/ThemeContext';
import { useSettingsStore } from '../store/settingsStore';
import { checkHealth } from '../services/api';
import Spinner from '../components/Spinner';
import type { ThemeMode } from '../constants/themes';
import type { Language } from '../constants/translations';
import './SettingsPage.css';

interface HealthStatus {
  serverOnline: boolean;
  llmAvailable: boolean;
  modelName: string | null;
  llmUrl: string | null;
  useMock: boolean;
}

export default function SettingsPage() {
  const theme = useTheme();
  const t = useTranslation();
  const store = useSettingsStore();

  const [urlDraft, setUrlDraft] = useState(store.serverUrl);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [checking, setChecking] = useState(true);

  const fetchHealth = useCallback(async () => {
    try {
      setChecking(true);
      const data = await checkHealth();
      setHealth({
        serverOnline: data.status === 'ok',
        llmAvailable: data.llm_available,
        modelName: (data as any).llm_model ?? null,
        llmUrl: (data as any).llm_url ?? null,
        useMock: (data as any).use_mock ?? false,
      });
    } catch {
      setHealth({
        serverOnline: false,
        llmAvailable: false,
        modelName: null,
        llmUrl: null,
        useMock: false,
      });
    } finally {
      setChecking(false);
    }
  }, []);

  // Poll every 10 seconds
  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  function saveUrl() {
    const trimmed = urlDraft.trim();
    if (!trimmed.startsWith('http')) {
      window.alert('URL must start with http:// or https://');
      return;
    }
    store.setServerUrl(trimmed.replace(/\/$/, ''));
    window.alert('Server URL saved');
    setTimeout(fetchHealth, 500);
  }

  const themeOptions: { value: ThemeMode; icon: React.ReactNode; label: string }[] = [
    { value: 'light', icon: <IoSunny />, label: t('themeLight') },
    { value: 'dark', icon: <IoMoon />, label: t('themeDark') },
    { value: 'system', icon: <IoPhonePortrait />, label: t('themeSystem') },
  ];

  const langOptions: { value: Language; label: string }[] = [
    { value: 'ru', label: '\u0420\u0443\u0441\u0441\u043A\u0438\u0439' },
    { value: 'en', label: 'English' },
  ];

  return (
    <div className="settings">
      <h1 className="settings__title">{t('settings')}</h1>

      {/* System Status */}
      <p className="settings__section-header">{t('serverStatus')}</p>
      <div className="settings__card">
        {checking && !health ? (
          <div className="settings__status-row">
            <Spinner size="small" color={theme.accent} />
            <span className="settings__status-text">{t('checking')}</span>
          </div>
        ) : (
          <>
            {/* Server status */}
            <div className="settings__status-row">
              <div
                className="settings__status-dot"
                style={{
                  backgroundColor: health?.serverOnline ? theme.success : theme.critical,
                }}
              />
              <span className="settings__status-label">Backend</span>
              <span
                className="settings__status-value"
                style={{ color: health?.serverOnline ? theme.success : theme.critical }}
              >
                {health?.serverOnline ? t('serverOnline') : t('serverOffline')}
              </span>
              <button className="settings__refresh-btn" onClick={fetchHealth}>
                {checking ? (
                  <Spinner size="small" color={theme.accent} />
                ) : (
                  <IoRefresh />
                )}
              </button>
            </div>

            {/* LLM / Model status */}
            <div className="settings__status-row">
              <div
                className="settings__status-dot"
                style={{
                  backgroundColor: health?.llmAvailable ? theme.success : theme.critical,
                }}
              />
              <span className="settings__status-label">{t('model')}</span>
              <span
                className="settings__status-value"
                style={{ color: health?.llmAvailable ? theme.success : theme.critical }}
              >
                {health?.useMock
                  ? t('mockMode')
                  : health?.llmAvailable
                    ? t('modelOnline')
                    : t('modelOffline')}
              </span>
            </div>

            {/* Model name */}
            {health?.llmAvailable && health?.modelName && !health?.useMock && (
              <div className="settings__model-info-row">
                <IoHardwareChip className="settings__model-info-icon" />
                <span className="settings__model-info-text">{health.modelName}</span>
              </div>
            )}

            {/* LLM URL */}
            {health?.llmUrl && !health?.useMock && (
              <div className="settings__model-info-row">
                <IoLink className="settings__model-info-icon" />
                <span className="settings__model-info-text">{health.llmUrl}</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Server URL */}
      <p className="settings__section-header">{t('serverUrl')}</p>
      <div className="settings__card">
        <p className="settings__label">{t('serverUrlDesc')}</p>
        <input
          className="settings__input"
          value={urlDraft}
          onChange={(e) => setUrlDraft(e.target.value)}
        />
        <button className="settings__save-btn" onClick={saveUrl}>
          {t('save')}
        </button>
      </div>

      {/* Appearance */}
      <p className="settings__section-header">{t('appearance')}</p>
      <div className="settings__card">
        <p className="settings__label">{'\u0422\u0435\u043C\u0430'}</p>
        <div className="settings__segmented">
          {themeOptions.map((opt) => (
            <button
              key={opt.value}
              className={`settings__segment ${store.theme === opt.value ? 'settings__segment--active' : ''}`}
              onClick={() => store.setTheme(opt.value)}
            >
              <span className="settings__segment-icon">{opt.icon}</span>
              <span className="settings__segment-text">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Language */}
      <p className="settings__section-header">{t('language')}</p>
      <div className="settings__card">
        {langOptions.map((opt) => (
          <div
            key={opt.value}
            className="settings__row"
            onClick={() => store.setLanguage(opt.value)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter') store.setLanguage(opt.value);
            }}
            style={{ cursor: 'pointer' }}
          >
            <span className="settings__row-label">{opt.label}</span>
            {store.language === opt.value && (
              <IoCheckmark className="settings__row-check" />
            )}
          </div>
        ))}
      </div>

      {/* Notifications */}
      <p className="settings__section-header">{t('notifications')}</p>
      <div className="settings__card">
        <div className="settings__switch-row">
          <div className="settings__switch-info">
            <p className="settings__row-label">{t('notifications')}</p>
            <p className="settings__row-desc">{t('notificationsDesc')}</p>
          </div>
          <label className="settings__toggle">
            <input
              type="checkbox"
              checked={store.notificationsEnabled}
              onChange={(e) => store.setNotificationsEnabled(e.target.checked)}
            />
            <span className="settings__toggle-slider" />
          </label>
        </div>
      </div>

      {/* About */}
      <p className="settings__section-header">{t('about')}</p>
      <div className="settings__card">
        <div className="settings__about-header">
          <div className="settings__about-logo">TZ</div>
          <div className="settings__about-info">
            <p className="settings__about-name">TZ Analyzer</p>
            <p className="settings__about-desc">{t('aboutDesc')}</p>
          </div>
        </div>
        <div className="settings__divider" />
        <div className="settings__row">
          <span className="settings__row-label">{t('version')}</span>
          <span className="settings__row-value">0.1.0 MVP</span>
        </div>
        <div className="settings__row">
          <span className="settings__row-label">{'\u0421\u0442\u0430\u043D\u0434\u0430\u0440\u0442\u044B'}</span>
          <span className="settings__row-value">{'\u0413\u041E\u0421\u0422 34.602, ISO 29148'}</span>
        </div>
        <div className="settings__row" style={{ borderBottom: 'none' }}>
          <span className="settings__row-label">AI {'\u0434\u0432\u0438\u0436\u043E\u043A'}</span>
          <span className="settings__row-value">Gemma 4 + llama.cpp</span>
        </div>
      </div>
    </div>
  );
}
