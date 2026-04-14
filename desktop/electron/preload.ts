import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  openFileDialog: (): Promise<{ path: string; name: string; content: Buffer } | null> => {
    return ipcRenderer.invoke('open-file-dialog')
  },
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
})
