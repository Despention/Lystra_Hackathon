import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoSearch, IoCloseCircle, IoTime, IoTrash, IoDownload, IoFolder, IoWarning, IoGrid } from 'react-icons/io5';
import { useTheme, useTranslation } from '../contexts/ThemeContext';
import { useHistory } from '../hooks/useAnalysis';
import { deleteAnalysis, moveAnalysisToFolder, downloadHistoryXlsx, downloadExpertEvalXlsx } from '../services/api';
import { useFolderStore } from '../store/folderStore';
import FolderSidebar from '../components/FolderSidebar';
import FolderModal from '../components/FolderModal';
import type { AnalysisListItem, Folder } from '../types/analysis';
import './HistoryPage.css';

export default function HistoryPage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const t = useTranslation();
  const { data: history, refetch } = useHistory();
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Folder state
  const { folders, selectedFolderId, fetchFolders, createFolder, deleteFolder, renameFolder, selectFolder } =
    useFolderStore();
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [renamingFolder, setRenamingFolder] = useState<Folder | null>(null);
  const [movingItemId, setMovingItemId] = useState<string | null>(null);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  const handleSearch = useCallback((text: string) => {
    setSearchText(text);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedSearch(text), 300);
  }, []);

  const filteredHistory = useMemo(() => {
    if (!history) return [];
    let items = history;
    // Filter by folder
    if (selectedFolderId) {
      items = items.filter((item) => item.folder_id === selectedFolderId);
    }
    if (!debouncedSearch.trim()) return items;
    const query = debouncedSearch.toLowerCase();
    return items.filter((item) => (item.filename || '').toLowerCase().includes(query));
  }, [history, debouncedSearch, selectedFolderId]);

  const handleDelete = useCallback(
    (e: React.MouseEvent, item: AnalysisListItem) => {
      e.stopPropagation();
      const confirmed = window.confirm(t('deleteConfirm'));
      if (!confirmed) return;
      deleteAnalysis(item.id)
        .then(() => refetch())
        .catch(() => {});
    },
    [t, refetch],
  );

  const handleMoveToFolder = useCallback(
    (analysisId: string, folderId: string | null) => {
      moveAnalysisToFolder(analysisId, folderId)
        .then(() => {
          refetch();
          fetchFolders();
          setMovingItemId(null);
        })
        .catch(() => {});
    },
    [refetch, fetchFolders],
  );

  const handleCreateFolder = useCallback(
    (name: string) => {
      createFolder(name).catch(() => {});
    },
    [createFolder],
  );

  const handleRenameFolder = useCallback(
    (name: string) => {
      if (renamingFolder) {
        renameFolder(renamingFolder.id, name).catch(() => {});
        setRenamingFolder(null);
      }
    },
    [renamingFolder, renameFolder],
  );

  const handleDeleteFolder = useCallback(
    (folder: Folder) => {
      const confirmed = window.confirm(t('deleteFolderConfirm'));
      if (!confirmed) return;
      deleteFolder(folder.id).catch(() => {});
    },
    [t, deleteFolder],
  );

  const selectedFolderName = useMemo(() => {
    if (!selectedFolderId) return null;
    return folders.find((f) => f.id === selectedFolderId)?.name ?? null;
  }, [selectedFolderId, folders]);

  return (
    <div className="history-layout">
      <FolderSidebar
        folders={folders}
        selectedFolderId={selectedFolderId}
        onSelectFolder={selectFolder}
        onCreateFolder={() => {
          setRenamingFolder(null);
          setFolderModalOpen(true);
        }}
        onRenameFolder={(folder) => {
          setRenamingFolder(folder);
          setFolderModalOpen(true);
        }}
        onDeleteFolder={handleDeleteFolder}
      />

      <div className="history-main">
        <div className="history">
          <h1 className="history__title">{t('history')}</h1>

          {selectedFolderName && (
            <div className="history__breadcrumb">
              <span
                className="history__breadcrumb-link"
                onClick={() => selectFolder(null)}
              >
                {t('allAnalyses')}
              </span>
              <span className="history__breadcrumb-sep">/</span>
              <span className="history__breadcrumb-current">{selectedFolderName}</span>
            </div>
          )}

          <div className="history__toolbar">
            <div className="history__search">
              <span className="history__search-icon"><IoSearch /></span>
              <input
                className="history__search-input"
                placeholder={t('searchPlaceholder')}
                value={searchText}
                onChange={(e) => handleSearch(e.target.value)}
              />
              {searchText.length > 0 && (
                <button className="history__search-clear" onClick={() => handleSearch('')}>
                  <IoCloseCircle />
                </button>
              )}
            </div>
            <button
              className="history__xlsx-btn"
              onClick={() => downloadHistoryXlsx(selectedFolderId ?? undefined)}
            >
              <IoDownload />
              {t('exportXlsx')}
            </button>
            <button
              className="history__xlsx-btn history__xlsx-btn--expert"
              onClick={() => downloadExpertEvalXlsx()}
              title="Скачать шаблон экспертной оценки для жюри (с автозаполненными баллами)"
            >
              <IoGrid />
              Экспертная оценка
            </button>
          </div>

          {filteredHistory.length > 0 ? (
            <table className="history__table">
              <thead>
                <tr>
                  <th>{t('file')}</th>
                  <th>Date</th>
                  <th>Mode</th>
                  <th>{t('remarks')}</th>
                  <th>Score</th>
                  <th></th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((item) => {
                  const score = item.total_score ?? 0;
                  const scoreColor =
                    score >= 70 ? theme.success : score >= 40 ? theme.warning : theme.critical;

                  return (
                    <tr
                      key={item.id}
                      onClick={() =>
                        item.status === 'completed' && navigate(`/result/${item.id}`)
                      }
                    >
                      <td>
                        <span className="history__filename">
                          {item.filename || t('textInput')}
                        </span>
                      </td>
                      <td>{new Date(item.created_at).toLocaleString('ru-RU')}</td>
                      <td>
                        <span className="history__mode">
                          {item.mode === 'full' ? t('fullMode') : t('quickMode')}
                        </span>
                      </td>
                      <td>{item.issues_count}</td>
                      <td>
                        {item.status === 'completed' ? (
                          <span className="history__score" style={{ color: scoreColor }}>
                            {Math.round(score)}
                          </span>
                        ) : item.status === 'failed' ? (
                          <span className="history__status-failed" title={t('analysisError')}>
                            <IoWarning /> {t('analysisError')}
                          </span>
                        ) : (
                          <span className="history__status-text">
                            {item.status === 'processing' ? t('analyzing') : item.status}
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="history__move-wrapper">
                          <button
                            className="history__move-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMovingItemId(movingItemId === item.id ? null : item.id);
                            }}
                            title={t('moveToFolder')}
                          >
                            <IoFolder />
                          </button>
                          {movingItemId === item.id && (
                            <div className="history__move-dropdown">
                              <button
                                className="history__move-option"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveToFolder(item.id, null);
                                }}
                              >
                                {t('noFolder')}
                              </button>
                              {folders.map((f) => (
                                <button
                                  key={f.id}
                                  className="history__move-option"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMoveToFolder(item.id, f.id);
                                  }}
                                >
                                  {f.name}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <button
                          className="history__delete-btn"
                          onClick={(e) => handleDelete(e, item)}
                          title={t('delete')}
                        >
                          <IoTrash />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="history__empty">
              <IoTime className="history__empty-icon" />
              <p className="history__empty-text">
                {debouncedSearch ? t('noIssuesFilter') : t('noAnalyses')}
              </p>
            </div>
          )}
        </div>
      </div>

      <FolderModal
        isOpen={folderModalOpen}
        onClose={() => {
          setFolderModalOpen(false);
          setRenamingFolder(null);
        }}
        onSave={renamingFolder ? handleRenameFolder : handleCreateFolder}
        initialName={renamingFolder?.name}
      />
    </div>
  );
}
