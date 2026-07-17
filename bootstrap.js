'use strict';
// Electron/Chromium 초기화 전에 환경·스위치를 넣어야 Tahoe에서 먹힘 (main.js보다 먼저 실행)
const os = require('os');

function darwinMajor() {
  return parseInt(String(os.release() || '0').split('.')[0], 10);
}

// macOS 26 Tahoe = Darwin 25.x — probe157.js에서 검증한 우회
if (process.platform === 'darwin' && darwinMajor() >= 25) {
  process.env.ELECTRON_DISABLE_SANDBOX = '1';
}

require('./main.js');
