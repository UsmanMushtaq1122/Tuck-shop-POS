const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isPackaged: process.env.NODE_ENV === 'production',
  print: (receipt) => ipcRenderer.send('print-receipt', receipt),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  isPackagedAsync: () => ipcRenderer.invoke('is-packaged'),
});
