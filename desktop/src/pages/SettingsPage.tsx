import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  IoSunny,
  IoMoon,
  IoPhonePortrait,
  IoHardwareChip,
  IoLink,
  IoRefresh,
  IoCheckmark,
  IoCloudOutline,
  IoEyeOutline,
  IoEyeOffOutline,
} from 'react-icons/io5';
import { useTheme, useTranslation } from '../contexts/ThemeContext';
import { useSettingsStore } from '../store/settingsStore';
import type { CloudProvider } from '../store/settingsStore';
import { checkHealth, getServerSettings, updateServerSettings } from '../services/api';
import type { ServerLLMSettings } from '../services/api';
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

  // Cloud API state
  const [serverSettings, setServerSettings] = useState<ServerLLMSettings | null>(null);
  const [apiKeyDraft, setApiKeyDraft] = useState('');
  const [cloudModelDraft, setCloudModelDraft] = useState(store.cloudModel);
  const [savingCloud, setSavingCloud] = useState(false);
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const apiKeyRef = useRef<HTMLInputElement>(null);

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

  const fetchServerSettings = useCallback(async () => {
    try {
      const s = await getServerSettings();
      setServerSettings(s);
    } catch {
      // server may be offline
    }
  }, []);

  // Poll every 10 seconds
  useEffect(() => {
    fetchHealth();
    fetchServerSettings();
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, [fetchHealth, fetchServerSettings]);

  function saveUrl() {
    const trimmed = urlDraft.trim();
    if (!trimmed.startsWith('http')) {
      window.alert('URL must start with http:// or https://');
      return;
    }
    store.setServerUrl(trimmed.replace(/\/$/, ''));
    window.alert('Server URL saved');
    setTimeout(fetchHealth, 500);
    setTimeout(fetchServerSettings, 600);
  }

  async function saveCloudSettings() {
    const provider = store.cloudProvider;
    const model = cloudModelDraft.trim();

    if (provider === 'none') {
      window.alert('Выберите провайдера: Anthropic или OpenAI');
      return;
    }
    if (!apiKeyDraft.trim() && !serverSettings?.cloud_api_key_set) {
      window.alert('Введите API ключ');
      return;
    }

    try {
      setSavingCloud(true);
      const payload: Parameters<typeof updateServerSettings>[0] = {
        cloud_provider: provider,
        use_cloud_llm: true,
        use_mock_llm: false,
      };
      if (apiKeyDraft.trim()) payload.cloud_api_key = apiKeyDraft.trim();
      if (model) payload.cloud_model = model;

      const updated = await updateServerSettings(payload);
      store.setCloudProvider(provider);
      store.setCloudModel(model);
      if (apiKeyDraft.trim()) {
        store.setCloudApiKey('***');
        setApiKeyDraft('');
      }
      setServerSettings(updated);
      window.alert(`Облачная модель ${provider} активирована`);
    } catch (e: any) {
      window.alert(e?.message || 'Не удалось сохранить настройки');
    } finally {
      setSavingCloud(false);
    }
  }

  async function disableCloudAndUseMock() {
    try {
      const updated = await updateServerSettings({ use_cloud_llm: false, use_mock_llm: true });
      store.setCloudProvider('none');
      setServerSettings(updated);
      window.alert('Переключено на Mock режим');
    } catch (e: any) {
      window.alert(e?.message || 'Не удалось переключить режим');
    }
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

      {/* Cloud API */}
      <p className="settings__section-header">
        <IoCloudOutline className="settings__section-icon" />
        Облачная модель
      </p>
      <div className="settings__card">
        {/* Provider selector */}
        <p className="settings__label">Провайдер</p>
        <div className="settings__segmented">
          {(['none', 'anthropic', 'openai'] as CloudProvider[]).map((p) => (
            <button
              key={p}
              className={`settings__segment ${store.cloudProvider === p ? 'settings__segment--active' : ''}`}
              onClick={() => store.setCloudProvider(p)}
            >
              <span className="settings__segment-text">
                {p === 'none' ? 'Нет' : p === 'anthropic' ? 'Anthropic' : 'OpenAI'}
              </span>
            </button>
          ))}
        </div>

        {store.cloudProvider !== 'none' && (
          <>
            <p className="settings__label settings__label--mt">
              API ключ{serverSettings?.cloud_api_key_set ? ' (уже задан)' : ''}
            </p>
            <div className="settings__api-key-row">
              <input
                ref={apiKeyRef}
                className="settings__input settings__input--flex"
                type={apiKeyVisible ? 'text' : 'password'}
                value={apiKeyDraft}
                onChange={(e) => setApiKeyDraft(e.target.value)}
                placeholder={
                  serverSettings?.cloud_api_key_set
                    ? '••••••• (обновить)'
                    : store.cloudProvider === 'anthropic'
                      ? 'sk-ant-api03-...'
                      : 'sk-...'
                }
                autoComplete="off"
                spellCheck={false}
              />
              <button
                className="settings__eye-btn"
                onClick={() => setApiKeyVisible((v) => !v)}
                title={apiKeyVisible ? 'Скрыть' : 'Показать'}
              >
                {apiKeyVisible ? <IoEyeOffOutline /> : <IoEyeOutline />}
              </button>
            </div>

            <p className="settings__label settings__label--mt">Модель (необязательно)</p>
            <input
              className="settings__input"
              value={cloudModelDraft}
              onChange={(e) => setCloudModelDraft(e.target.value)}
              placeholder={
                store.cloudProvider === 'anthropic' ? 'claude-sonnet-4-6' : 'gpt-4o-mini'
              }
              autoComplete="off"
              spellCheck={false}
            />

            <button
              className="settings__save-btn"
              onClick={saveCloudSettings}
              disabled={savingCloud}
              style={{ opacity: savingCloud ? 0.6 : 1 }}
            >
              {savingCloud ? <Spinner size="small" color="#fff" /> : 'Применить и активировать'}
            </button>

            {serverSettings?.use_cloud_llm && (
              <button
                className="settings__save-btn settings__save-btn--secondary"
                onClick={disableCloudAndUseMock}
                style={{ marginTop: 8 }}
              >
                Отключить (вернуть Mock)
              </button>
            )}
          </>
        )}

        {/* Current mode indicator */}
        {serverSettings && (
          <div className="settings__status-row settings__cloud-status">
            <div
              className="settings__status-dot"
              style={{
                backgroundColor: serverSettings.use_cloud_llm
                  ? 'var(--success)'
                  : serverSettings.use_mock_llm
                    ? 'var(--warning)'
                    : 'var(--critical)',
              }}
            />
            <span className="settings__status-text" style={{ marginLeft: 0 }}>
              {serverSettings.use_cloud_llm
                ? `Активно: ${serverSettings.cloud_provider} / ${serverSettings.cloud_model || 'default'}`
                : serverSettings.use_mock_llm
                  ? 'Mock режим'
                  : 'Локальная модель (llama.cpp)'}
            </span>
          </div>
        )}
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
