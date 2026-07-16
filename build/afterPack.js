// 맥 adhoc 서명 훅 — electron-builder가 인증서 없이는 서명을 건너뛰므로 직접 수행.
// afterPack은 앱 폴더가 완성된 직후, dmg/zip으로 묶이기 '전'에 실행됨 → 서명된 앱이 배포본에 들어감.
// v1.4.9에서 x86_64 슬라이스가 무서명이라 맥에서 실행 즉시 종료됐던 문제의 해결책.
const { execSync } = require('child_process');
const path = require('path');

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return;
  const appName = context.packager.appInfo.productFilename;
  const appPath = path.join(context.appOutDir, `${appName}.app`);
  console.log(`[afterPack] adhoc 서명: ${appPath}`);
  // --deep: 내부 프레임워크·헬퍼까지 / --sign - : adhoc (인증서 불필요, 전체 아키텍처 서명)
  execSync(`codesign --force --deep --sign - "${appPath}"`, { stdio: 'inherit' });
  execSync(`codesign -dv "${appPath}"`, { stdio: 'inherit' });
  console.log('[afterPack] 서명 완료');
};
