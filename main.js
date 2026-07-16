const { app, BrowserWindow, Menu, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

// ===== 부팅 로그 — 창이 안 뜨는 환경 진단용 =====
// 사용자 안내: Win+R → %TEMP% → moa-goods-maker-boot.log 파일을 보내주세요
const BOOT_LOG = path.join(os.tmpdir(), 'moa-goods-maker-boot.log');
function blog(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try { fs.appendFileSync(BOOT_LOG, line); } catch (e) {}
  try { console.log(line.trim()); } catch (e) {}
}
try { if (fs.existsSync(BOOT_LOG) && fs.statSync(BOOT_LOG).size > 512 * 1024) fs.unlinkSync(BOOT_LOG); } catch (e) {}
blog(`===== 시작: v${app.getVersion()} / electron ${process.versions.electron} / ${process.platform} ${os.release()} / argv: ${process.argv.slice(1).join(' ')}`);

// ===== 단일 인스턴스 — 좀비 프로세스가 쌓여 새 창이 안 뜨는 상황 방지 =====
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  blog('이미 실행 중인 인스턴스 존재 → 종료 (기존 창을 앞으로)');
  app.quit();
} else {

app.on('second-instance', () => {
  blog('두 번째 실행 감지 → 기존 창 표시');
  if (win) { if (win.isMinimized()) win.restore(); win.show(); win.focus(); }
});

// ===== GPU 자동 폴백 — GPU 프로세스가 죽는 환경에서 소프트웨어 렌더링으로 =====
const GPU_FLAG = path.join(app.getPath('userData'), 'disable-gpu.flag');
let gpuDisabled = false;
try {
  if (fs.existsSync(GPU_FLAG) || process.argv.includes('--disable-gpu')) {
    app.disableHardwareAcceleration();
    gpuDisabled = true;
    blog('하드웨어 가속 비활성 (플래그/옵션)');
  }
} catch (e) {}

app.on('child-process-gone', (e, details) => {
  blog(`자식 프로세스 사망: type=${details.type} reason=${details.reason} exitCode=${details.exitCode}`);
  if (details.type === 'GPU' && !gpuDisabled && (details.reason === 'crashed' || details.reason === 'abnormal-exit')) {
    try { fs.writeFileSync(GPU_FLAG, '1'); } catch (e2) {}
    blog('GPU 크래시 감지 → 폴백 플래그 기록 후 재시작');
    app.relaunch();
    app.exit(0);
  }
});

let win = null;

function createWindow() {
  blog('createWindow 진입');
  const iconPath = path.join(__dirname, 'build', 'icon.png');
  const winOpts = {
    width: 1180, height: 820, minWidth: 720, minHeight: 600,
    backgroundColor: '#fff7f9',
    title: '모아 굿즈메이커',
    autoHideMenuBar: true,
    show: false, // ready-to-show에서 명시적으로 표시 (흰 화면·유령 창 방지)
    webPreferences: { contextIsolation: true }
  };
  try { if (fs.existsSync(iconPath) && process.platform !== 'darwin') winOpts.icon = iconPath; } catch (e) {}
  win = new BrowserWindow(winOpts);
  blog('BrowserWindow 생성됨');

  if (process.platform === 'darwin') {
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      { label: app.name, submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' }, { type: 'separator' }, { role: 'quit' }] },
      { label: '편집', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
      { label: '창', submenu: [{ role: 'minimize' }, { role: 'zoom' }, { role: 'togglefullscreen' }, { type: 'separator' }, { role: 'close' }] }
    ]));
  } else {
    Menu.setApplicationMenu(null);
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url) || url.startsWith('mailto:')) shell.openExternal(url);
    return { action: 'deny' };
  });

  win.once('ready-to-show', () => {
    blog('ready-to-show → 창 표시');
    win.show(); win.center(); win.focus();
  });
  win.webContents.on('did-finish-load', () => blog('페이지 로드 완료'));
  win.webContents.on('did-fail-load', (e, code, desc) => blog(`★ 페이지 로드 실패: ${code} ${desc}`));
  win.webContents.on('render-process-gone', (e, details) => blog(`★ 렌더러 사망: ${details.reason}`));
  win.on('unresponsive', () => blog('★ 창 응답 없음'));
  win.on('show', () => blog('창 표시됨(show 이벤트)'));

  blog('loadFile 호출');
  win.loadFile(path.join(__dirname, 'app', 'index.html'));

  // 감시자: 15초 안에 창이 안 보이면 강제 표시 시도 + 로그 위치 안내
  setTimeout(() => {
    if (win && !win.isDestroyed() && !win.isVisible()) {
      blog('★ 15초 경과에도 창 미표시 → 강제 show 시도');
      try { win.show(); win.center(); win.focus(); } catch (e) {}
      setTimeout(() => {
        if (win && !win.isDestroyed() && !win.isVisible()) {
          blog('★★ 강제 표시도 실패 — 환경이 창 생성을 차단 중');
          try {
            dialog.showErrorBox('모아 굿즈메이커 — 창 표시 실패',
              `앱은 실행됐지만 창을 화면에 띄우지 못했어요.\n\n진단 로그가 여기 저장됐어요:\n${BOOT_LOG}\n\n이 파일을 개발자(X @Modi_ing)에게 보내주시면 원인을 찾을 수 있어요.\n임시 방편으로 웹 버전(MoaGoodsMaker-web.html)을 쓰실 수 있어요.`);
          } catch (e) {}
        }
      }, 3000);
    }
  }, 15000);
}

function setupAutoUpdate() {
  if (process.platform !== 'win32') return;
  if (process.env.PORTABLE_EXECUTABLE_DIR) return;
  if (!app.isPackaged) return;
  let autoUpdater;
  try { ({ autoUpdater } = require('electron-updater')); } catch (e) { blog('electron-updater 로드 실패'); return; }
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('update-downloaded', async (info) => {
    blog(`업데이트 다운로드 완료: ${info.version}`);
    const r = await dialog.showMessageBox(win, {
      type: 'info', buttons: ['지금 재시작', '나중에'], defaultId: 0, cancelId: 1,
      title: '업데이트 준비 완료',
      message: `모아 굿즈메이커 ${info.version} 이(가) 준비됐어요 🍓`,
      detail: '지금 재시작하면 바로 새 버전으로 열려요. 나중을 누르면 앱을 닫을 때 자동으로 설치돼요.'
    });
    if (r.response === 0) setImmediate(() => autoUpdater.quitAndInstall());
  });
  autoUpdater.on('error', () => {});
  setTimeout(() => { autoUpdater.checkForUpdates().catch(() => {}); }, 4000);
}

process.on('uncaughtException', (err) => {
  blog(`★ uncaughtException: ${err && err.stack || err}`);
  try { dialog.showErrorBox('모아 굿즈메이커 오류', String(err && err.stack || err)); } catch (e) {}
});

app.whenReady().then(() => {
  blog('app ready');
  createWindow();
  setupAutoUpdate();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => {
  blog('모든 창 닫힘');
  if (process.platform !== 'darwin') app.quit();
});

} // gotLock
