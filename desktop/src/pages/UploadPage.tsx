import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IoCloudUpload,
  IoDocumentText,
  IoCloseCircle,
  IoArrowForward,
  IoGridOutline,
  IoFlash,
} from 'react-icons/io5';
import { useTranslation } from '../contexts/ThemeContext';
import { analyzeDocument } from '../services/api';
import { useAnalysisStore } from '../store/analysisStore';
import Spinner from '../components/Spinner';
import './UploadPage.css';

export default function UploadPage() {
  const navigate = useNavigate();
  const t = useTranslation();
  const startAnalysis = useAnalysisStore((s) => s.startAnalysis);

  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState('');
  const [mode, setMode] = useState<'full' | 'quick'>('full');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'file' | 'text'>('file');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSubmit = tab === 'file' ? !!file : text.trim().length > 50;

  const handleFilePick = useCallback((files: FileList | null) => {
    if (files && files[0]) setFile(files[0]);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFilePick(e.dataTransfer.files);
    },
    [handleFilePick],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragOver(false), []);

  async function handleSubmit() {
    setLoading(true);
    try {
      const resp = await analyzeDocument(
        tab === 'file' ? file : null,
        tab === 'text' ? text : null,
        mode,
      );
      startAnalysis(resp.analysis_id);
      navigate(`/analysis/${resp.analysis_id}`);
    } catch (err: any) {
      window.alert(err.message || t('uploadError'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="upload">
      {/* Page Header */}
      <div className="upload__page-header">
        <div>
          <h1 className="upload__page-title">Новый анализ</h1>
          <p className="upload__page-sub">Инициализируйте новый процесс синтетического наблюдения</p>
        </div>
        <div className="upload__tab-seg">
          <button
            className={`upload__seg-btn ${tab === 'file' ? 'upload__seg-btn--active' : ''}`}
            onClick={() => setTab('file')}
          >
            Файл
          </button>
          <button
            className={`upload__seg-btn ${tab === 'text' ? 'upload__seg-btn--active' : ''}`}
            onClick={() => setTab('text')}
          >
            Текст
          </button>
        </div>
      </div>

      {/* File Upload Zone */}
      {tab === 'file' && (
        <div className="upload__zone-wrap">
          <div className="upload__zone-glow upload__zone-glow--primary" />
          <div className="upload__zone-glow upload__zone-glow--cyan" />
          <div
            className={`upload__zone ${dragOver ? 'upload__zone--dragover' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            {file ? (
              <div className="upload__file-selected">
                <IoDocumentText className="upload__file-icon" size={42} />
                <p className="upload__file-name">{file.name}</p>
                <button
                  className="upload__file-remove"
                  onClick={() => setFile(null)}
                >
                  <IoCloseCircle size={22} />
                </button>
              </div>
            ) : (
              <>
                <div className="upload__zone-icon-wrap">
                  <IoCloudUpload size={44} />
                </div>
                <h3 className="upload__zone-title">Drag & drop или выберите файл</h3>
                <p className="upload__zone-hint">
                  Поддерживаемые форматы: PDF, DOCX, TXT (макс. 50МБ)
                </p>
                <button
                  className="upload__zone-btn"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Выбрать на компьютере
                </button>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            className="upload__file-input"
            accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            onChange={(e) => handleFilePick(e.target.files)}
          />
        </div>
      )}

      {/* Text Zone */}
      {tab === 'text' && (
        <div className="upload__text-zone">
          <textarea
            className="upload__textarea"
            placeholder={t('textPlaceholder')}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <p className="upload__char-count">
            {text.length} символов{text.length < 50 ? ' · минимум 50' : ''}
          </p>
        </div>
      )}

      {/* Mode Selection */}
      <div className="upload__modes-section">
        <div className="upload__section-label">
          <span className="upload__section-bar" />
          <span>Режим анализа</span>
        </div>
        <div className="upload__modes">
          {/* Full Mode */}
          <button
            className={`upload__mode-card ${mode === 'full' ? 'upload__mode-card--active' : ''}`}
            onClick={() => setMode('full')}
          >
            <div className="upload__mode-top">
              <div className={`upload__mode-icon-wrap ${mode === 'full' ? 'upload__mode-icon-wrap--active' : ''}`}>
                <IoGridOutline size={20} />
              </div>
              <div className={`upload__mode-radio ${mode === 'full' ? 'upload__mode-radio--active' : ''}`}>
                {mode === 'full' && <div className="upload__mode-radio-dot" />}
              </div>
            </div>
            <h4 className="upload__mode-title">Полный</h4>
            <p className="upload__mode-desc">
              5 агентов ≈ 60 секунд. Глубокое сканирование всех взаимосвязей и скрытых паттернов.
            </p>
            <span className="upload__mode-badge">High Precision</span>
          </button>

          {/* Quick Mode */}
          <button
            className={`upload__mode-card ${mode === 'quick' ? 'upload__mode-card--active' : ''}`}
            onClick={() => setMode('quick')}
          >
            <div className="upload__mode-top">
              <div className={`upload__mode-icon-wrap ${mode === 'quick' ? 'upload__mode-icon-wrap--active' : ''}`}>
                <IoFlash size={20} />
              </div>
              <div className={`upload__mode-radio ${mode === 'quick' ? 'upload__mode-radio--active' : ''}`}>
                {mode === 'quick' && <div className="upload__mode-radio-dot" />}
              </div>
            </div>
            <h4 className="upload__mode-title">Быстрый</h4>
            <p className="upload__mode-desc">
              Два агента — 20 секунд. Поверхностный анализ основных метрик и быстрых инсайтов.
            </p>
            <span className="upload__mode-badge upload__mode-badge--gray">Speed Priority</span>
          </button>
        </div>
      </div>

      {/* Start Button */}
      <div className="upload__submit-area">
        <button
          className="upload__submit-btn"
          onClick={handleSubmit}
          disabled={!canSubmit || loading}
        >
          <div className="upload__submit-gradient" />
          <div className="upload__submit-overlay" />
          <span className="upload__submit-content">
            {loading ? (
              <Spinner size="small" color="#00315b" />
            ) : (
              <>
                Начать анализ
                <IoArrowForward size={20} />
              </>
            )}
          </span>
        </button>
        <p className="upload__submit-note">Протокол ALPHA-9 запущен</p>
      </div>
    </div>
  );
}
