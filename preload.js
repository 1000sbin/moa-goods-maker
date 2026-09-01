// 렌더러에 노출하는 최소 API (contextIsolation)
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('moa', {
  isElectron: true,
  platform: process.platform,
  setTitleBar: (color, symbol) => ipcRenderer.send('moa:titlebar', { color, symbol }),
});
