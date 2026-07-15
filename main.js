const { app, BrowserWindow, Menu, shell, dialog } = require('electron');
const path = require('path');

let win = null;

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(__dirname, 'build', 'icon.png'),
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
  // 외부 링크(업데이트 배너·X·메일)는 기본 브라우저로 — 앱 창이 납치되지 않게
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url) || url.startsWith('mailto:')) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.loadFile(path.join(__dirname, 'app', 'index.html'));
  // 저장(다운로드) 시 setSavePath를 호출하지 않으므로 Electron 기본 "다른 이름으로 저장" 창이 뜸
}

// ===== 자동 업데이트 (Windows 설치판 전용) =====
// macOS는 코드 서명이 없으면 자동 업데이트가 동작하지 않고, portable/AppImage도 구조상 제외.
// 해당 플랫폼은 앱 안의 업데이트 배너(수동 다운로드)가 대신 알려줌.
function setupAutoUpdate() {
  if (process.platform !== 'win32') return;          // 윈도우만
  if (process.env.PORTABLE_EXECUTABLE_DIR) return;   // portable 빌드 제외
  if (!app.isPackaged) return;                       // 개발 실행 제외

  let autoUpdater;
  try {
    ({ autoUpdater } = require('electron-updater'));
  } catch (e) { return; }

  autoUpdater.autoDownload = true;          // 조용히 받아두고
  autoUpdater.autoInstallOnAppQuit = true;  // 앱 종료 시 자동 설치

  autoUpdater.on('update-downloaded', async (info) => {
    const r = await dialog.showMessageBox(win, {
      type: 'info',
      buttons: ['지금 재시작', '나중에'],
      defaultId: 0,
      cancelId: 1,
      title: '업데이트 준비 완료',
      message: `모아 굿즈메이커 ${info.version} 이(가) 준비됐어요 🍓`,
      detail: '지금 재시작하면 바로 새 버전으로 열려요. 나중을 누르면 앱을 닫을 때 자동으로 설치돼요.'
    });
    if (r.response === 0) {
      setImmediate(() => autoUpdater.quitAndInstall());
    }
  });

  autoUpdater.on('error', () => { /* 오프라인·서버 문제 — 조용히 무시, 앱 동작엔 영향 없음 */ });

  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {});
  }, 4000); // 앱이 뜬 뒤 여유 있게
}

app.whenReady().then(() => {
  createWindow();
  setupAutoUpdate();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
