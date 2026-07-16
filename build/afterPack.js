// 맥 adhoc 서명 훅 — electron-builder가 인증서 없이는 서명을 건너뛰므로 직접 수행.
// v1.4.9에서 x86_64 슬라이스가 무서명이라 맥에서 실행 즉시 종료됐던 문제의 해결책.
//
// 중요: universal 빌드는 x64/arm64를 각각 만든 뒤(-temp 폴더) 병합하는데,
// temp 단계에서 서명하면 두 빌드의 서명 파일이 달라져 병합이 실패함
// ("Expected all non-binary files to have identical SHAs").
// → 병합이 끝난 '최종 universal 앱'만 서명한다. codesign은 fat 바이너리의
//   모든 아키텍처 슬라이스를 한 번에 서명하므로 결과는 동일.
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
  console.log(`[afterPack] adhoc 서명 (최종 universal): ${appPath}`);
  execSync(`codesign --force --deep --sign - "${appPath}"`, { stdio: 'inherit' });
  execSync(`codesign -dv "${appPath}"`, { stdio: 'inherit' });
  console.log('[afterPack] 서명 완료');
};
