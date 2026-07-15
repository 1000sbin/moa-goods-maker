const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    icon: require('path').join(__dirname,'build','icon.png'),
    width: 1180,
    height: 820,
    minWidth: 720,
    minHeight: 600,
    backgroundColor: '#fff7f9',
    title: '모아 굿즈메이커',
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true } // 렌더러에 node 노출 안 함 → ag-psd가 window.agPsd로 로드됨
  });
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, 'app', 'index.html'));
  // 저장(다운로드) 시 setSavePath를 호출하지 않으므로 Electron 기본 "다른 이름으로 저장" 창이 뜸
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
