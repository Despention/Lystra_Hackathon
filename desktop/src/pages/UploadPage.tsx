import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IoDocumentOutline,
  IoCreateOutline,
  IoCloudUpload,
  IoDocumentText,
  IoCloseCircle,
  IoFlash,
  IoSpeedometer,
} from 'react-icons/io5';
import { useTranslation } from '../contexts/ThemeContext';
import { analyzeDocument } from '../services/api';
import { useAnalysisStore } from '../store/analysisStore';
import Card from '../components/Card';
import Button from '../components/Button';
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
    if (files && files[0]) {
      setFile(files[0]);
    }
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

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

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
      <h1 className="upload__title">{t('newAnalysis')}</h1>

      {/* Tabs */}
      <div className="upload__tabs">
        <button
          className={`upload__tab ${tab === 'file' ? 'upload__tab--active' : ''}`}
          onClick={() => setTab('file')}
        >
          <span className="upload__tab-icon"><IoDocumentOutline /></span>
          {t('file')}
        </button>
        <button
          className={`upload__tab ${tab === 'text' ? 'upload__tab--active' : ''}`}
          onClick={() => setTab('text')}
        >
          <span className="upload__tab-icon"><IoCreateOutline /></span>
          {t('text')}
        </button>
      </div>

      {/* File upload with drag & drop */}
      {tab === 'file' && (
        <Card className="upload__dropzone">
          {file ? (
            <div className="upload__file-selected">
              <IoDocumentText className="upload__file-icon" />
              <span className="upload__file-name">{file.name}</span>
              <button className="upload__file-remove" onClick={() => setFile(null)}>
                <IoCloseCircle />
              </button>
            </div>
          ) : (
            <div
              className={`upload__dropzone-area ${dragOver ? 'upload__dropzone-area--dragover' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <IoCloudUpload className="upload__dropzone-icon" />
              <p className="upload__dropzone-text">{t('pickFile')}</p>
              <p className="upload__dropzone-hint">{t('pickFileHint')}</p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            className="upload__file-input"
            accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            onChange={(e) => handleFilePick(e.target.files)}
          />
        </Card>
      )}

      {/* Text input */}
      {tab === 'text' && (
        <Card className="upload__text-card">
          <textarea
            className="upload__textarea"
            placeholder={t('textPlaceholder')}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <p className="upload__char-count">
            {text.length} {t('chars')} {text.length < 50 && t('minChars')}
          </p>
        </Card>
      )}

      {/* Mode selector */}
      <h3 className="upload__section-title">{t('analysisMode')}</h3>
      <div className="upload__modes">
        <button
          className={`upload__mode-card ${mode === 'full' ? 'upload__mode-card--active' : ''}`}
          onClick={() => setMode('full')}
        >
          <IoFlash className="upload__mode-icon" />
          <span className="upload__mode-title">{t('fullMode')}</span>
          <span className="upload__mode-desc">{t('fullModeDesc')}</span>
        </button>
        <button
          className={`upload__mode-card ${mode === 'quick' ? 'upload__mode-card--active' : ''}`}
          onClick={() => setMode('quick')}
        >
          <IoSpeedometer className="upload__mode-icon" />
          <span className="upload__mode-title">{t('quickMode')}</span>
          <span className="upload__mode-desc">{t('quickModeDesc')}</span>
        </button>
      </div>

      <Button
        title={t('startAnalysis')}
        onClick={handleSubmit}
        disabled={!canSubmit}
        loading={loading}
        className="upload__submit"
      />
    </div>
  );
}
