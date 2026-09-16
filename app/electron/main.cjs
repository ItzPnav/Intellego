const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#1a1a1a',
    title: 'Intellego',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';

  if (isDev) {
    win.loadURL('http://localhost:5173').catch(() => {
      // Fallback if dev server is not yet ready or loaded directly
      win.loadFile(path.join(__dirname, '../dist/index.html'));
    });
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

// Native OS folder picker handler per SPEC.md Section 1
ipcMain.handle('dialog:openDirectory', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Select Workspace Root',
    properties: ['openDirectory', 'createDirectory']
  });
  if (canceled || !filePaths || filePaths.length === 0) {
    return null;
  }
  return filePaths[0];
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
