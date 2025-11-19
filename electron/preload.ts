const { contextBridge, ipcRenderer } = require('electron');

// Define the API types
export interface ElectronAPI {
  // File system operations
  fs: {
    readFile: (filePath: string) => Promise<{ success: boolean; data?: string; error?: string }>;
    writeFile: (filePath: string, data: string) => Promise<{ success: boolean; error?: string }>;
    ensureDir: (dirPath: string) => Promise<{ success: boolean; error?: string }>;
    getDefaultDataDir: () => Promise<string>;
    selectDirectory: () => Promise<{ success: boolean; path?: string }>;
  };

  // Platform information
  platform: {
    isMac: boolean;
    isWindows: boolean;
    isLinux: boolean;
    isElectron: boolean;
  };

  // Menu event listeners
  onMenuNewTask: (callback: () => void) => void;
  onMenuSave: (callback: () => void) => void;
  onMenuExport: (callback: () => void) => void;
  onMenuImport: (callback: () => void) => void;

  // Auto-update listeners
  onUpdateAvailable: (callback: (info: any) => void) => void;
  onUpdateDownloaded: (callback: (info: any) => void) => void;
}

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
const api: ElectronAPI = {
  fs: {
    readFile: (filePath: string) => ipcRenderer.invoke('fs:readFile', filePath),
    writeFile: (filePath: string, data: string) =>
      ipcRenderer.invoke('fs:writeFile', filePath, data),
    ensureDir: (dirPath: string) => ipcRenderer.invoke('fs:ensureDir', dirPath),
    getDefaultDataDir: () => ipcRenderer.invoke('fs:getDefaultDataDir'),
    selectDirectory: () => ipcRenderer.invoke('fs:selectDirectory'),
  },

  platform: {
    isMac: process.platform === 'darwin',
    isWindows: process.platform === 'win32',
    isLinux: process.platform === 'linux',
    isElectron: true,
  },

  onMenuNewTask: (callback: () => void) => {
    ipcRenderer.on('menu-new-task', callback);
  },

  onMenuSave: (callback: () => void) => {
    ipcRenderer.on('menu-save', callback);
  },

  onMenuExport: (callback: () => void) => {
    ipcRenderer.on('menu-export', callback);
  },

  onMenuImport: (callback: () => void) => {
    ipcRenderer.on('menu-import', callback);
  },

  onUpdateAvailable: (callback: (info: any) => void) => {
    ipcRenderer.on('update-available', (_, info) => callback(info));
  },

  onUpdateDownloaded: (callback: (info: any) => void) => {
    ipcRenderer.on('update-downloaded', (_, info) => callback(info));
  },
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', api);

// Type declaration for window object (will be used in renderer process)
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
