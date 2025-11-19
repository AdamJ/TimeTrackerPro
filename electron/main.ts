const { app, BrowserWindow, ipcMain, Menu, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs/promises');

// Lazy load autoUpdater after app is ready to avoid initialization issues
let autoUpdater: any;

// Disable security warnings in development
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';

let mainWindow: BrowserWindow | null = null;
const isDev = process.env.NODE_ENV === 'development';
const isMac = process.platform === 'darwin';

// User data directory for storing app data (will be initialized when app is ready)
let userDataPath: string;
let defaultDataDir: string;

interface WindowState {
  width: number;
  height: number;
  x?: number;
  y?: number;
  isMaximized?: boolean;
}

// Window state management
async function loadWindowState(): Promise<WindowState> {
  const statePath = path.join(userDataPath, 'window-state.json');
  try {
    const data = await fs.readFile(statePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return { width: 1200, height: 800 };
  }
}

async function saveWindowState(state: WindowState): Promise<void> {
  const statePath = path.join(userDataPath, 'window-state.json');
  await fs.writeFile(statePath, JSON.stringify(state, null, 2));
}

// Create the main application window
async function createWindow() {
  const windowState = await loadWindowState();

  mainWindow = new BrowserWindow({
    width: windowState.width,
    height: windowState.height,
    x: windowState.x,
    y: windowState.y,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: path.join(__dirname, '../preload/preload.cjs'),
    },
    backgroundColor: '#ffffff',
    show: false, // Show after ready-to-show event
    titleBarStyle: isMac ? 'hiddenInset' : 'default',
  });

  // Restore maximized state
  if (windowState.isMaximized) {
    mainWindow.maximize();
  }

  // Load the app
  if (isDev) {
    // In development, load from Vite dev server
    await mainWindow.loadURL('http://localhost:8080');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load from built files
    const indexPath = path.join(__dirname, '../renderer/index.html');
    await mainWindow.loadFile(indexPath);
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Save window state before close
  mainWindow.on('close', async () => {
    if (!mainWindow) return;

    const bounds = mainWindow.getBounds();
    const isMaximized = mainWindow.isMaximized();

    await saveWindowState({
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
      isMaximized,
    });
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Create application menu
  createMenu();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Create application menu
function createMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' as const },
              { type: 'separator' as const },
              {
                label: 'Check for Updates...',
                click: () => {
                  autoUpdater.checkForUpdates();
                },
              },
              { type: 'separator' as const },
              { role: 'services' as const },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const },
            ],
          },
        ]
      : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'New Task',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow?.webContents.send('menu-new-task');
          },
        },
        { type: 'separator' },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            mainWindow?.webContents.send('menu-save');
          },
        },
        { type: 'separator' },
        {
          label: 'Export...',
          click: () => {
            mainWindow?.webContents.send('menu-export');
          },
        },
        {
          label: 'Import...',
          click: () => {
            mainWindow?.webContents.send('menu-import');
          },
        },
        { type: 'separator' },
        isMac ? { role: 'close' as const } : { role: 'quit' as const },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' as const },
        { role: 'redo' as const },
        { type: 'separator' as const },
        { role: 'cut' as const },
        { role: 'copy' as const },
        { role: 'paste' as const },
        { role: 'selectAll' as const },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' as const },
        { role: 'forceReload' as const },
        { role: 'toggleDevTools' as const },
        { type: 'separator' as const },
        { role: 'resetZoom' as const },
        { role: 'zoomIn' as const },
        { role: 'zoomOut' as const },
        { type: 'separator' as const },
        { role: 'togglefullscreen' as const },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' as const },
        { role: 'zoom' as const },
        ...(isMac
          ? [
              { type: 'separator' as const },
              { role: 'front' as const },
              { type: 'separator' as const },
              { role: 'window' as const },
            ]
          : [{ role: 'close' as const }]),
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Learn More',
          click: async () => {
            await shell.openExternal('https://github.com/yourusername/TimeTrackerPro');
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Initialize file system storage
async function initializeFileSystem() {
  try {
    await fs.access(defaultDataDir);
  } catch {
    await fs.mkdir(defaultDataDir, { recursive: true });
  }
}

// App lifecycle
app.whenReady().then(async () => {
  // Initialize paths after app is ready
  userDataPath = app.getPath('userData');
  defaultDataDir = path.join(userDataPath, 'data');

  // IPC Handlers for file operations - register after app is ready
  ipcMain.handle('fs:readFile', async (_, filePath: string) => {
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      return { success: true, data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('fs:writeFile', async (_, filePath: string, data: string) => {
    try {
      await fs.writeFile(filePath, data, 'utf-8');
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('fs:ensureDir', async (_, dirPath: string) => {
    try {
      await fs.mkdir(dirPath, { recursive: true });
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('fs:getDefaultDataDir', async () => {
    return defaultDataDir;
  });

  ipcMain.handle('fs:selectDirectory', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory', 'createDirectory'],
      title: 'Select Data Storage Location',
    });

    if (!result.canceled && result.filePaths.length > 0) {
      return { success: true, path: result.filePaths[0] };
    }
    return { success: false };
  });

  // Load autoUpdater after app is ready
  const { autoUpdater: updater } = require('electron-updater');
  autoUpdater = updater;

  await initializeFileSystem();
  await createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  // Auto-updater configuration (only check in production)
  if (!isDev) {
    // Setup auto-updater event listeners
    autoUpdater.on('update-available', (info: any) => {
      mainWindow?.webContents.send('update-available', info);
    });

    autoUpdater.on('update-downloaded', (info: any) => {
      mainWindow?.webContents.send('update-downloaded', info);
    });

    autoUpdater.on('error', (error: Error) => {
      console.error('Auto-updater error:', error);
    });

    autoUpdater.checkForUpdatesAndNotify();
  }
});

app.on('window-all-closed', () => {
  if (!isMac) {
    app.quit();
  }
});
