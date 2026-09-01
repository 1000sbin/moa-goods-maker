# 개발 메모

## 구조 (1.7.0부터)
- `src/` 가 소스. `app/index.html` 과 `모아굿즈메이커_단일파일.html` 은 **빌드 산출물** — 직접 고치지 말 것.
  - `src/head.html` `src/styles.css` `src/body.html` `src/tail.html` + `src/js/NN-이름.js` (번호 순서로 이어붙임)
- `npm run build` → 두 파일 생성 (단일파일은 app/*.js 라이브러리를 인라인)
- `npm run bump 1.7.1` → package.json · APP_VER · 푸터 배지 한 번에 바꾸고 빌드
- `npm test` → jsdom + node-canvas 로 앱을 띄워 검증
  - `test/export-white.test.js` 커스텀 화이트 PDF (`GTYPE=stand` 등 환경변수로 케이스 변경)
  - `test/items.test.js` Project/Item 모델 — 아이템 전환·설정 보존
  - `test/multi.test.js` 파일 여러 장 → 아이템, 나누기
  - `test/board.test.js` 자동 배치·전체 보기·합본 PDF/SVG/ZIP/PSD
  - `test/wizard.test.js` 6단계 레일·제품 필터·잠금·완성 미리보기
  - `test/sticker.test.js` 스티커 모델 — 대지 배경·반칼/완칼·배경 파일 크기
  - `test/assembly.test.js` 조립 굿즈 — 프리셋·판형·가이드·dpi 재합성·드래그 배치
  - `test/assembly2.test.js` 촉↔슬롯 짝 맞춤·여러 캐릭터·파츠 여러 장·그림 모양 판
  - 새 테스트는 `test/harness.js`의 `boot()`를 쓰면 됨
  - 처음 한 번 `npm install` (jsdom, canvas 가 devDependencies)

## 릴리스
```
npm run bump 1.7.1
npm test
git add . && git commit -m "v1.7.1 - ..." && git push
git tag v1.7.1 && git push origin v1.7.1
```
태그 푸시 → GitHub Actions 가 Windows/macOS/Linux 빌드 + Release 업로드.

## 2.0
`DESIGN_2.0.md` 와 `docs/mockup-v2.html` 참고.
