import React, { useState, useEffect } from 'react';
import { useTranslation } from '../contexts/ThemeContext';
import './FolderModal.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  initialName?: string;
}

export default function FolderModal({ isOpen, onClose, onSave, initialName = '' }: Props) {
  const t = useTranslation();
  const [name, setName] = useState(initialName);

  useEffect(() => {
    if (isOpen) {
      setName(initialName);
    }
  }, [isOpen, initialName]);

  if (!isOpen) return null;

  const isRenaming = initialName.length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(trimmed);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-content__title">
          {isRenaming ? t('renameFolder') : t('createFolder')}
        </h3>
        <form onSubmit={handleSubmit}>
          <label className="modal-content__label">{t('folderName')}</label>
          <input
            className="modal-content__input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            placeholder={t('folderName')}
          />
          <div className="modal-content__actions">
            <button
              type="button"
              className="modal-content__btn modal-content__btn--cancel"
              onClick={onClose}
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              className="modal-content__btn modal-content__btn--primary"
              disabled={!name.trim()}
            >
              {isRenaming ? t('rename') : t('create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
