# 모아 굿즈메이커 2.0 설계

> 2026-09 확정. 흐름은 `docs/mockup-v2.html`(눌러볼 수 있는 목업)이 기준. 이 문서는 그 목업을 코드로 옮길 때의 데이터 모델과 순서.

## 1. 사용자 흐름 (6단계 위자드)

왼쪽 단계 레일 + 가운데 단계 패널 + 오른쪽 캔버스(고정). 지난 단계로 자유 이동, 아직 안 온 단계는 흐림.

| 단계 | 내용 | 비고 |
|---|---|---|
| 1 제품 | 스티커 / 아크릴 / 조립 굿즈 | 설명 없이 이름만 |
| 2 종류 · 이미지 | 종류 선택 → 이미지 드롭존. 스탠드=받침 방식, 코롯토=일반/오뚝이. DPI는 파일에서 읽어 표시. 스티커=대지(낱장 자동/직접, 시트 크기) | 조립 굿즈는 제품 프리셋이 아이템을 자동 생성 |
| 3 칼선 | 여백·둥글리기·틈 좁히기·구멍 메우기, 앵커 미리보기/최소화, 인식 기준은 접힘. 스티커는 여백 프리셋 + 배치(간격·가장자리·자동/직접). 판형 아이템은 "판 모양"(규격 도형 / 가이드 파일) | |
| 4 부품 | 종류별: 타공 / 고리 / 촉·받침 / 바닥(오뚝이) / 집게·자석 도형. 도형(프리셋·모양·크기·모서리·위치·색)은 모든 아크릴 종류에 얹기 가능. **스티커에는 없음** | 조립 굿즈는 짝 제약(슬롯↔촉, 모듈 자리↔모듈, 타공 공유) |
| 5 화이트 / 배경 | 아크릴: 그림 그대로 / 직접 만든 파일(불투명 % 표시), 여백, 형식(벡터/이미지), 미리보기 토글. 스티커: 배경 인쇄 켜기/끄기, 단색 / 배경 파일 | 조립 굿즈는 판별 규칙(뒷면 전체·창 제외·없음) |
| 6 저장 | 대지 크기 고정, 본체·받침 분리, 판마다 대지 나누기, 두께 다른 판 안내, 형식(PDF/PSD/SVG/PNG 묶음) | 형식 카드에 설명 없음 |

캔버스: 아이템 선택·이동·회전(손잡이 + 도구줄 15°/0°/90°), 아이템 목록(그림/판 배지), **도안 / 완성 미리보기** 토글.
사이드바 하단: 언어 → 라이트/다크 → 포인트 컬러 5색 → 버전 · 업데이트 확인 · 새 소식 팝오버 · "최신 버전을 쓰고 있어요 ✓".

## 2. 제품 규칙 (확정)

- **스티커 = 대지 + 스티커 N개.** 낱장·시트 구분은 N과 대지 크기 자동 여부뿐. 배경(단색/파일)은 **대지 전체**에 깔리고, 스티커는 **반칼**, 대지 외곽만 **완칼**. 배경 파일은 자르지 않고 파일 크기가 곧 대지 크기. 투명 여백을 원하면 배경을 끔. (현재 앱의 "실루엣+여백 대지"는 폐기)
- **아크릴 화이트**는 실루엣 기준(칼선 여백과 무관). 벡터 패스가 기본. 그라데이션·컬러 커스텀처럼 패스로 못 만드는 화이트는 래스터 폴백을 유지하되 **내보내기 전에 경고**(B안).
- **일반 아크릴에도 부품 단계가 있음** — 집게·자석 도형이 본체.
- **PDF는 칼선·도형·화이트 전부 패스.** 디자인 페이지만 이미지.
- **조립 굿즈**: 스핀 스탠드 / 디오라마 3면 / 쉐이커 키링 / 누들 스토퍼. 인쇄소 가이드 파일은 앱에 내장하지 않고 **사용자가 가져오기**(SVG/PDF/PNG). 내장은 원·사각·둥근사각 규격 도형뿐. 회전 부자재(15mm)는 그리지 않고 조건만 검사(본체 바닥폭 ≥ 15mm, 받침대에 자리 표시).

## 3. 데이터 모델

```js
Project {
  version: 2,
  product: 'sticker' | 'acrylic' | 'assembly',
  kind:    'single'|'sheet' | 'plain'|'ring_hole'|'ring_tab'|'stand'|'korotto' | 'spin'|'diorama'|'shaker'|'noodle',
  sheet: { dpi, unit:'mm', board:{ auto:bool, w, h }, background:{ on, mode:'solid'|'file', color, file } }, // 스티커·공통 대지
  items: [ Item, ... ],
  selection: [itemId],
  ui: { step, view:'draft'|'final', showAnchors, whitePreview, dragging, moveMode }   // 계산과 무관
}

Item {
  id, name,
  kind: 'art' | 'plate',                    // A 그림형 / B 판형
  role: 'body'|'base'|'module'|'panel'|'part'|'sticker'|…,   // 프리셋이 부여
  src:  { image, w, h, dpi, rot },          // 그림형: 원본. 판형: 판에 넣을 그림(선택)
  plate:{ tpl:'circle'|'rect'|'rrect'|'guide', w, h, r, guide:{svg|pdf|png, slots[] , cavity?} },  // 판형만
  settings: {                               // 지금 DOM에서 읽던 값 전부 여기로
    cut:   { off, round, gap, fillHoles, fillMax, thresh, bgmode, anchorMin },
    parts: { hole:{d,pos}, ring:{d,wall}, tab:{w,h}, base:{mode,thick,slotShift}, korotto:{flat,roly,strength}, shape:{on,preset,kind,w,h,r,pos,col} },
    white: { on, src:'auto'|'custom', file, off, fmt:'vector'|'raster', rule:'full'|'back'|'window'|'none' },
  },
  derived: { mask, srcMask, loops, baseLoops, whiteLoops, holes, comps, rolyInfo, bbox },  // 캐시. settings 바뀌면 무효
  placement: { x, y, rot, z },
  links: [ { type:'slot-tab'|'module-seat'|'shared-holes', to:itemId } ],   // 짝 제약
}
```

- `computeCore(S)` → `computeItem(item, project)`. 기하 함수군(EDT·marching squares·베지어 피팅·오뚝이)은 이미 전역 `S`와 분리돼 있어 그대로 씀.
- 패널은 `selection`의 아이템 settings를 **보여주기만** 하고, 입력은 settings에 쓰고 재계산을 요청한다. DOM 직접 읽기(135개 id) 제거.
- 프리셋 = `items`를 만들어 주는 함수. `ASSEMBLY.spin()` → 본체(art) + 받침대(plate rect 70×70) + 모듈(plate circle 70, 인쇄 없음), links 포함.

## 4. 진행 순서

1. **파일 분리 + 빌드** — 완료 (`src/`, `scripts/build.js`, 출력 바이트 동일 검증). `npm run build`, `npm run bump 1.x.y`, `npm test`.
2. `S` → `Project/Item` — **완료.** `src/js/03-state.js`: `project.items[]`, `S`는 현재 아이템 바인딩(let), 패널 값은 `item.settings`/`project.sheet`에 자동 저장·복원(`setActiveItem`). 계산 코드는 아직 DOM을 읽지만 아이템별로 독립 동작함(`test/items.test.js`).
3. 다중 아이템 — **완료(짝 제약 제외).**
   - `src/js/07b-items.js`: 캔버스 아래 아이템 바(썸네일·선택·삭제·＋이미지 추가·✂나누기·▦전체 보기). 파일 여러 장 → 아이템 여러 개. `splitCurrentItem()`: `personComps`로 개체 분리, 4mm² 미만 파편도 가장 가까운 개체에 붙여 픽셀 손실 없음.
   - `src/js/09b-board.js`: `autoLayout()`(선반 채우기, 대지 고정 시 넘침 경고), `renderBoard()` 전체 보기(클릭으로 아이템 선택), `withItem()`(다른 아이템의 설정을 DOM에 잠시 얹어 실행), 합본 내보내기 `exportPdfBoard / exportPsdBoard / exportSvgBoard / exportZipBoard` — 아이템별 `boardDoc`을 `withDoc`에 넣어 기존 그리기 코드를 재사용.
   - PDF 그리기는 `pdfDrawPage(doc,kind)`로 분리, SVG 는 `svgPaths()`/`buildSvgString()` 분리.
   - 내보내기 패널 "여러 아이템: 한 대지에 모아서 / 현재 아이템만", 아이템 간격(mm).
   - 남은 것: 전체 보기에서 드래그 배치·회전(지금은 자동 배치만), 짝 제약(`links`) → 5단계 조립 굿즈에서.
4. 위자드 UI — **완료(스티커 모델 전환은 4b로 분리).**
   - `src/js/13b-wizard.js`: 기존 그룹을 id 기준으로 찾아 6개 `.step-page`로 재배치(핸들러·id 유지). 레일(`#rail`)은 패널 왼쪽, 하단에 언어·테마(설정 패널에서 이동)·버전·업데이트 확인·새 소식 링크.
   - 1단계 제품(스티커/아크릴/조립 굿즈) → 2단계 종류 버튼 필터(`PRODUCT_TYPES`). 조립 굿즈는 안내만(5단계에서 열림). 스티커면 4단계 부품이 레일에서 사라짐. 이미지 전엔 3단계부터 잠김.
   - `renderFinal()`(07-render): 완성 미리보기 — 아크릴은 유리질 판+단면+화이트+그림(화이트 없으면 그림 반투명)+타공(고리)+도형, 스티커는 종이/배경 파일. 아이템 바의 👁 완성 보기 토글, `project.ui.view='final'`.
   - 스타일: 모아보드 톤으로 토큰 교체(`--accent` 포인트 5색 + 라이트/다크 `body.dark`, 연회색 바탕·흰 카드). 기존 변수명(`--pink`, `--milk-2` …)은 유지해 파생값만 바뀜(color-mix, 미지원 시 고정값). 캔버스 상단 도구줄(도안/완성/전체 + mm·dpi).
   - **4b 완료 — 스티커 모델**: `isStickerType()`이면 `whiteBaseMask`=대지 전체, `whiteVectorLoops`=대지 사각, `whiteLayerCanvas`=단색/배경 파일(색 그대로, 대지에 맞춤), `customWhiteAlpha`는 파일을 대지 전체에. 배경 파일을 올리면 대지 크기 고정을 파일 크기(mm)로 자동 설정. `fullCutRect()` 완칼이 미리보기·PDF(`doc.rect`)·SVG(`<rect id="fullcut">`)·PSD(`rectToBezierPath`)에 모두 들어감. 스티커 5단계는 화이트 여백·형식·표시색 숨기고 배경 인쇄/배경 색/배경 파일만. PDF·SVG 배경은 표시색이 아닌 인쇄색. `test/sticker.test.js`.
   - **창·제목 표시줄**(Electron): 처음 크기 작업영역 92%(최대 1680×1050), 최소 1100×700. `titleBarStyle:'hidden'`+`titleBarOverlay`(mac은 hiddenInset)로 38px 제목 표시줄을 앱이 그림(`.titlebar`, 드래그 영역, 오른쪽에 크레딧). 다크 모드면 `preload.js`의 `moa.setTitleBar`로 창 버튼 색 동기화. 옛 헤더(제목+부제)는 제거.
   - **레이아웃**: 목업과 같은 풀블리드 셸 — 46px 헤더, `grid 190px | 330px | 1fr`, 레일·패널은 카드 대신 구분선, 캔버스만 카드. 레일 하단 언어 세그먼트(4개)·라이트/다크·포인트 5색·버전·크레딧. 위자드 이전/다음은 패널 하단 고정.
5. 조립 굿즈 — **완료(짝 제약 제외).** `src/js/09c-assembly.js`
   - **판형 아이템**: `newPlateItem()` — 판 모양(원/사각/둥근사각, mm)이나 가이드 파일(PNG/SVG)을 **불투명 이미지로 합성해 `S.img`로** 넣는다(`rebuildPlate`). 그래서 마스크→칼선→화이트→내보내기가 그대로 돌고, 가이드 PNG의 투명 구멍·슬롯은 자동으로 안쪽 칼선이 된다. 판 그림은 contain으로 넣고 판 밖은 잘림(`artScale`). dpi 바뀌면 `prepareSource`에서 재합성. 판 아이템 설정 기본값: 여백 0, 구멍 메우기 끔.
   - 3단계에서 판형이면 칼선·인식·다듬기 그룹 대신 **판 모양 패널**(`renderPlatePanel`): 규격 도형/가이드 파일, 크기, 모서리, 판 그림 올리기·크기.
   - **프리셋** `ASSEMBLY` — 스핀 스탠드(본체 stand_nb + 받침대 70 + 회전 모듈 원 70 인쇄 없음) / 쉐이커(둥근사각 60 × 3 + 파츠) / 디오라마(좌·우 70×100 + 바닥 100×70 + 캐릭터) / 누들 스토퍼(덮개 110×40 + 캐릭터). 2단계에서 고르면 `applyAssemblyPreset`이 아이템을 만들고 판은 즉시 계산, 내보내기는 한 대지로.
   - 판형 아이템에 이미지를 올리면 판 그림으로 들어감(`loadImage` 분기). 아이템 바에 판/그림 배지.
   - **전체 보기 드래그 배치**: `boardPointerDown/Move/Up`, `project.sheet.manual` — 손으로 옮기면 자동 배치가 덮어쓰지 않고 대지만 내용에 맞춤. ↺ 자동 배치 칩으로 복귀.
   - **5b 짝 맞춤(촉↔슬롯)**: 판에 `plate.tab{w,h,t}`(아래 촉, 캔버스를 촉 높이만큼 늘려 붙임)와 `plate.slotsFrom:'auto'`(같은 `group`의 촉 있는 아이템 = 촉 판 + 스탠드(받침 없음) 그림형 전부)를 두고, `slotLayout()`이 판 촉은 좌·우 가장자리 세로로, 캐릭터 촉은 가운데 줄 가로로 배치해 `destination-out`으로 뚫는다(여유 +0.1mm). 촉 폭/두께는 `tabSpec()`(판=plate.tab, 그림형=촉 너비·아크릴 두께 설정). 짝 값이 바뀌면 `_slotKey`로 감지해 `ensurePlateFresh`(setActiveItem·withItem·prepareSource)에서 재합성. 슬롯별 x/y 미세 조정(`slotAdj`)은 판 패널에서.
   - 디오라마: 좌·우판 촉 24×6, 바닥판 슬롯 자동, 캐릭터는 여러 장 업로드 → 각각 스탠드(받침 없음)로 바닥판에 슬롯이 생김. 누들: 덮개판 슬롯 자동. 쉐이커 파츠 여러 장 업로드는 현재 아이템의 타입·설정을 물려받음(그림형 기본값 `artDefaults()`를 쓰므로 판 기본값의 '구멍 메우기 끔'이 새지 않음 — 이전에 파츠에 구멍이 뚫리던 원인). 스핀 받침대: 판 패널의 **그림 모양** 버튼으로 그림에서 칼선(그림형) ↔ 규격 도형 전환.
   - **5c 디오라마 = 퍼즐 결합**(사진 기준): 왼쪽 벽·뒷벽·바닥판 100×100, 두께 `plate.thick` 3. `edgeFingers(it)`가 가장자리별 세그먼트(밖으로 돌출 out / 안으로 홈 in)를 만들고 `rebuildPlate`가 두께만큼 여유를 둔 캔버스에 그린다(`_plateInset`).
     - 벽 아래 `tab{w,h(=바닥 두께),n,edge}` → 촉 n개 돌출. 바닥판은 `slotsFrom`으로 같은 가장자리에 같은 비율·폭의 **가장자리 홈**(깊이 = 벽 두께 + 0.1)을 판다 — 더 이상 내부 슬롯이 아님.
     - 벽끼리 `corner{side,phase:'A'|'B',n,t}` **손가락 결합**: 옆 가장자리를 2n+1칸으로 나눠 A는 짝수 칸 돌출·홀수 칸 홈, B는 반대. 판 패널에서 A/B·끝·손가락 수 선택.
     - 캐릭터 촉은 여전히 바닥판 내부 슬롯(`slotLayout`, 가로).
   - **베지어 피팅 수정**(`toBezierKnots`): 다각형 사슬(점이 성기고 안쪽 꼭짓점이 전부 <4° 직진 또는 ≥25° 꺾임)은 곡선 피팅 대신 변마다 직선. 이전엔 이웃 점 거리로 접선을 추정해 핸들이 수백 px 튀었음(디오라마 PDF에서 발견). 처음엔 '성긴 사슬 전부'를 직선으로 바꿔 원·둥근 모서리 앵커가 폭증(원 8→52)했던 걸 꺾임 각도 판정으로 되돌림. 판 기본 `smooth` 3 — 원·둥근사각 판 앵커 174→14, 모서리 이탈 0.06mm 이내.
   - 스핀 받침대·누들 덮개판 `slotsFrom:'auto'`, `slotRow:0.5` — 본체·캐릭터 촉 슬롯이 가운데. **그림 모양 판**(`plate.tpl==='art'`)도 슬롯 유지: 그림에 뚫지 않고 `computeCore`에서 여백·둥글리기가 끝난 최종 형상에 뚫는다(여백 2mm가 3mm 슬롯을 메우던 문제). 슬롯 배치는 `artW/artH`(그림 크기) 기준.
   - 남은 것: 스핀 본체 바닥폭 ≥ 15mm 경고, 쉐이커 테두리판 가운데 뚫기(지금은 가이드 PNG로), 판 두께별 파일 분리 안내, 슬롯을 캔버스에서 드래그. 실제 주문해보며 규격을 맞추는 단계에서.
5. 조립 굿즈 프리셋(스핀 → 쉐이커 → 디오라마 → 누들) + 가이드 파일 가져오기.

6. 마무리 다듬기
   - **언어 전환 즉시 반영**: 위자드가 만든 정적 문구는 `data-ko` 스팬으로(applyLang이 갱신), 동적 부분(레일·다음 버튼·아이템 바·판 패널·타입 힌트)은 `refreshWizardLang()`이 다시 그림. 사전에 아크릴/화이트/저장 추가.
   - **스탠드 촉 자리 개선**(`bottomTabAnchor`): 최저점(발끝) 아래 4% 띠에서 가장 넓은 구간을 찾던 걸, 띠를 4→26%로 넓혀 가며 촉 폭의 85% 이상을 받칠 수 있는 구간을 고르고, 촉 윗변은 그 폭 안 열들의 '가장 높은 바닥'에서 시작. 발 하나가 내려온 치비에서 촉이 발끝 옆에 붙어 "연결 안 될 수 있음" 경고가 뜨던 문제. 1.8.0과 동일 입력으로 비교해 원래 동작임을 확인한 뒤 개선(`test/stand.test.js`).

## 5. 지금 앱에서 그대로 가져가는 것 / 버리는 것

가져감: 기하·피팅·오뚝이 물리, PSD/PDF/SVG 작성 코드, i18n 사전, 테마, 업데이트 확인(`checkUpdate` — 새 소식 팝오버는 릴리스 노트 본문을 같이 가져오면 됨), 받침 추출·업로드 로직(→ `base` role 아이템).
버림: 전역 `S` 단일 이미지 가정, DOM 직접 읽기, 탭 전환 UI, `runBatch`(아이템 목록이 대체), 스티커 "실루엣+여백" 대지.
