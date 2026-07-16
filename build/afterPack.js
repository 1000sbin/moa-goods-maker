// 맥 adhoc 서명 훅 — 인증서 없이 전체 아키텍처 서명 + JIT entitlements.
// entitlements가 핵심: V8은 시작 직후 JIT용 메모리(쓰기+실행)를 요구하는데,
// 공증 없는 앱에서 이 권한이 없으면 macOS가 막아 V8 스냅샷 단계에서 SIGTRAP.
// (인텔 iMac + macOS 26 제보 — Electron 31/42, universal/x64 모두 같은 자리에서
//  죽고 디스코드(공증+JIT권한 보유)는 정상인 것이 근거)
const { execSync } = require('child_process');
const path = require('path');

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return;
  if (context.appOutDir.includes('-temp')) {
    console.log(`[afterPack] 임시 단계 건너뜀: ${context.appOutDir}`);
    return;
  }
  const appName = context.packager.appInfo.productFilename;
  const appPath = path.join(context.appOutDir, `${appName}.app`);
  const ent = path.join(__dirname, 'entitlements.plist');
  console.log(`[afterPack] adhoc 서명 + JIT entitlements: ${appPath}`);
  execSync(`codesign --force --deep --sign - --entitlements "${ent}" "${appPath}"`, { stdio: 'inherit' });
  execSync(`codesign -d --entitlements - "${appPath}"`, { stdio: 'inherit' }); // 권한 실렸는지 출력
  console.log('[afterPack] 서명 완료');
};
