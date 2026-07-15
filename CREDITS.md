# 모아 굿즈메이커 — 라이선스 및 출처 (CREDITS)

**모아 굿즈메이커 (MOA Goods Maker)** © 2026 Modi · X [@Modi_ing](https://x.com/Modi_ing) · 1000sbin@gmail.com

---

## 1. 이 프로젝트의 코드

칼선 생성 파이프라인(마스크 생성, 거리 변환, 등고선 추출, 스무딩, 곡선 피팅, 꼭지점 둥글리기, 인물 판정, 부속 스탬프, 화이트 레이어, 내보내기)은 **이 프로젝트를 위해 작성된 코드**입니다. 아래 3의 공개 알고리즘을 참고 구현한 부분을 포함하며, 특정 개인·프로젝트의 소스 코드를 복사한 부분은 없습니다.

## 2. 번들된 외부 라이브러리

단일 파일 배포판에는 아래 라이브러리가 인라인되어 있으며, 각 라이브러리의 라이선스 고지는 인라인된 코드 내에 그대로 보존되어 있습니다.

| 라이브러리 | 버전 | 라이선스 | 용도 |
|---|---|---|---|
| [ag-psd](https://github.com/Agamnentzar/ag-psd) | 31.0.2 | MIT | PSD (RGB) 읽기/쓰기 |
| [JSZip](https://stuk.github.io/jszip/) | 3.10.1 | MIT 또는 GPL-3.0-or-later | PNG 묶음 ZIP 생성 |
| [jsPDF](https://github.com/parallax/jsPDF) | 4.2.1 | MIT | PDF 벡터 내보내기 |

## 3. 참고한 공개 알고리즘

아래는 논문·교과서로 공개된 표준 알고리즘이며, 원 논문의 수식·절차를 참고해 이 프로젝트의 자료구조에 맞게 새로 구현했습니다.

- **곡선 피팅**: Philip J. Schneider, *"An Algorithm for Automatically Fitting Digitized Curves"*, Graphics Gems (Academic Press, 1990) — 최소자승 베지어 피팅 + 뉴턴-랩슨 재매개변수화
- **유클리드 거리 변환(EDT)**: P. Felzenszwalb & D. Huttenlocher, *"Distance Transforms of Sampled Functions"*, Theory of Computing 8 (2012) — 2패스 포물선 하한 포락선 방식
- **등고선 추출**: Marching Squares (표준 컴퓨터 그래픽스 알고리즘, 안장점 중앙값 판정 포함)
- **폴리라인 단순화**: Ramer–Douglas–Peucker 알고리즘
- **곡선 세분화**: Chaikin's corner cutting algorithm (1974)
- **모폴로지 연산**: 거리 변환 기반 팽창/침식/클로징/오프닝 (표준 이미지 처리)
- **연결 성분 라벨링**: BFS 기반 4-연결 라벨링 (표준)

## 4. 파일 포맷 구현

- **CMYK PSD 라이터**: Adobe Photoshop File Formats Specification 공개 문서를 기준으로 직접 구현 (채널 4개 + 알파, CMYK 반전 저장 규약, ResolutionInfo(1005) 리소스, UTF-16 레이어명(luni))
- **PNG pHYs / JPEG JFIF 밀도 파싱**: 각 포맷 공개 스펙 기준 직접 구현
- **SVG / PDF 출력**: W3C SVG 1.1 · PDF 사양 기준 (PDF는 jsPDF 경유)

## 5. 폰트·에셋

- UI 폰트: 시스템 폰트 스택 사용 (별도 폰트 번들 없음)
- 아이콘: 제작자 본인 제작
