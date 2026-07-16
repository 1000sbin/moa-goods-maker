// macOS 26 (Tahoe) + electron-builder adhoc 재서명 시 ElectronMain에서
// EXC_BREAKPOINT (SIGTRAP) 크래시 — electron/electron#49522, electron-builder#9396.
// identity: null(무서명)이 유일한 우회책이라 afterPack 서명 훅은 사용하지 않음.
// Developer ID 공증 빌드가 필요해지면 여기서 공식 인증서로 서명하고 macOS 26에서 재검증할 것.
