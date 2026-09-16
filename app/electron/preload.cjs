const { contextBridge, ipcRenderer } = require('electron');

// Bridge exposing native OS capabilities (dialogs, platform)
// Renderer never executes Python directly per Section 3 platform hard rules
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  openDirectoryDialog: () => ipcRenderer.invoke('dialog:openDirectory')
});
