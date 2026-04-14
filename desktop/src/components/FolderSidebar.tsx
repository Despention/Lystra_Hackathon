import React, { useState, useRef, useEffect } from 'react';
import { IoFolder, IoAdd, IoEllipsisHorizontal, IoDownload } from 'react-icons/io5';
import { useTranslation } from '../contexts/ThemeContext';
import { downloadHistoryXlsx } from '../services/api';
import type { Folder } from '../types/analysis';
import './FolderSidebar.css';

interface Props {
  folders: Folder[];
  selectedFolderId: string | null;
  onSelectFolder: (id: string | null) => void;
  onCreateFolder: () => void;
  onRenameFolder: (folder: Folder) => void;
  onDeleteFolder: (folder: Folder) => void;
}

export default function FolderSidebar({
  folders,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
}: Props) {
  const t = useTranslation();
  const [menuFolderId, setMenuFolderId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuFolderId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMenuClick = (e: React.MouseEvent, folderId: string) => {
    e.stopPropagation();
    setMenuFolderId((prev) => (prev === folderId ? null : folderId));
  };

  return (
    <div className="folder-sidebar">
      <div className="folder-sidebar__header">
        <span className="folder-sidebar__header-title">{t('allAnalyses')}</span>
        <button
          className="folder-sidebar__add-btn"
          onClick={onCreateFolder}
          title={t('createFolder')}
        >
          <IoAdd />
        </button>
      </div>

      <div
        className={`folder-item ${selectedFolderId === null ? 'folder-item--active' : ''}`}
        onClick={() => onSelectFolder(null)}
      >
        <IoFolder className="folder-item__icon" />
        <span className="folder-item__name">{t('allAnalyses')}</span>
      </div>

      {folders.map((folder) => (
        <div
          key={folder.id}
          className={`folder-item ${selectedFolderId === folder.id ? 'folder-item--active' : ''}`}
          onClick={() => onSelectFolder(folder.id)}
        >
          <IoFolder className="folder-item__icon" />
          <span className="folder-item__name">{folder.name}</span>
          <span className="folder-count">{folder.analyses_count}</span>
          <button
            className="folder-item__menu-btn"
            onClick={(e) => handleMenuClick(e, folder.id)}
          >
            <IoEllipsisHorizontal />
          </button>

          {menuFolderId === folder.id && (
            <div className="folder-item__menu" ref={menuRef}>
              <button
                className="folder-item__menu-option"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuFolderId(null);
                  onRenameFolder(folder);
                }}
              >
                {t('renameFolder')}
              </button>
              <button
                className="folder-item__menu-option"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuFolderId(null);
                  downloadHistoryXlsx(folder.id);
                }}
              >
                <IoDownload /> {t('exportXlsx')}
              </button>
              <button
                className="folder-item__menu-option folder-item__menu-option--danger"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuFolderId(null);
                  onDeleteFolder(folder);
                }}
              >
                {t('deleteFolder')}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
