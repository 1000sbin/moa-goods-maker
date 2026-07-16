const { app, BrowserWindow, Menu, shell, dialog } = require('electron');
const path = require('path');

let win = null;

function createWindow() {
  const iconPath = path.join(__dirname, 'build', 'icon.png');
  const winOpts = {
    width: 1180,
    height: 820,
    minWidth: 720,
    minHeight: 600,
    backgroundColor: '#fff7f9',
    title: '모아 굿즈메이커',
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true } // 렌더러에 node 노출 안 함 → ag-psd가 window.agPsd로 로드됨
  };
  // 아이콘은 있으면 쓰고 없으면 생략 — 경로 문제로 앱이 죽지 않게 (맥은 번들 아이콘을 씀)
  try { if (require('fs').existsSync(iconPath) && process.platform !== 'darwin') winOpts.icon = iconPath; } catch (e) {}
  win = new BrowserWindow(winOpts);
  // 맥은 메뉴를 없애면 ⌘Q·⌘C/V 같은 기본 단축키까지 사라짐 → 최소 메뉴 유지
  if (process.platform === 'darwin') {
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      { label: app.name, submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' }, { type: 'separator' }, { role: 'quit' }] },
      { label: '편집', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
      { label: '창', submenu: [{ role: 'minimize' }, { role: 'zoom' }, { role: 'togglefullscreen' }, { type: 'separator' }, { role: 'close' }] }
    ]));
  } else {
    Menu.setApplicationMenu(null);
  }
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

// 예기치 못한 오류로 조용히 죽지 않게 — 사용자에게 알리고 로그를 남김
process.on('uncaughtException', (err) => {
  try {
    dialog.showErrorBox('모아 굿즈메이커 오류', String(err && err.stack || err));
  } catch (e) { console.error(err); }
});

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
