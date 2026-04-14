import { create } from 'zustand';
import type { Folder } from '../types/analysis';
import {
  getFolders as apiFetchFolders,
  createFolder as apiCreateFolder,
  deleteFolder as apiDeleteFolder,
  renameFolder as apiRenameFolder,
} from '../services/api';

interface FolderState {
  folders: Folder[];
  selectedFolderId: string | null;
  fetchFolders: () => Promise<void>;
  createFolder: (name: string) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  renameFolder: (id: string, name: string) => Promise<void>;
  selectFolder: (id: string | null) => void;
}

export const useFolderStore = create<FolderState>()((set, get) => ({
  folders: [],
  selectedFolderId: null,

  fetchFolders: async () => {
    try {
      const folders = await apiFetchFolders();
      set({ folders });
    } catch {
      // silently fail — server may not support folders yet
    }
  },

  createFolder: async (name: string) => {
    await apiCreateFolder(name);
    await get().fetchFolders();
  },

  deleteFolder: async (id: string) => {
    await apiDeleteFolder(id);
    const state = get();
    if (state.selectedFolderId === id) {
      set({ selectedFolderId: null });
    }
    await state.fetchFolders();
  },

  renameFolder: async (id: string, name: string) => {
    await apiRenameFolder(id, name);
    await get().fetchFolders();
  },

  selectFolder: (id: string | null) => {
    set({ selectedFolderId: id });
  },
}));
