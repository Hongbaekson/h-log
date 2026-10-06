# Memory UI 재분석

이 문서는 Step 0의 분석 이력이다. 사용자가 해당 구현을 거절하고 로컬 UI의 직접 이식을 요청했으므로, 현재 기준은 [로컬 UI 이식](LOCAL_BRAIN_UI_REFERENCE.md)과 ADR-021이다. 아래 밝은 sidebar/Three.js 구현은 현재 화면을 설명하지 않는다.

2026-10-06 사용자 수정 요청. [Career Hacker Memory](https://www.careerhackeralex.com/memory)의 실제 1440×1000/390×844 화면, DOM/computed styles와 브라우저가 내려받는 공개 JS/CSS를 분석했다. 서버 원본 저장소를 확인했다는 뜻은 아니다.

## 확인한 구조

- 데스크톱은 높이 100vh, 260px 왼쪽 sidebar와 나머지 graph의 2열이다. 일반 사이트 header/footer나 hero가 없다.
- 왼쪽은 밝은 회색 `rgb(236,235,227)`, 기본 3D canvas는 `#0a0a0a`다. sidebar만 독립 스크롤된다. 위로가기·제목·노드/관계 수 → 렌즈 → 태그/주제 → 유형 → 관계 → 배치/색/간격/라벨 순이다.
- 상단 중앙 입력은 최대 약 640px, 둥근 capsule이다. 원본은 인증된 질문 기능이며 H-Log는 기록 검색으로 연결한다.
- 노드 선택 시 오른쪽 overlay reader가 최대 560px로 열린다. 초기에는 본문 칼럼이 없다. 모바일은 sidebar가 숨고 280px drawer로 열린다.
- 공개 chunk `2seosf1m56jwv.js`에서 Three.js WebGLRenderer, PerspectiveCamera, OrbitControls, 3차원 force simulation과 raycasting을 확인했다. 브레인 기본 모드는 3D이고 나머지 배치는 SVG 2D다. 배치 계산 후 좌표를 유지하며 미세한 움직임/회전, 점의 발광과 가는 선으로 깊이를 표현한다. reduced-motion에서는 자동 움직임을 줄인다.
- 공개 chunk `1-qciro822f5o.js`에서 전체 화면 grid, 렌즈 presets, color/layout/spacing/labels 상태, hover/selection과 drawer 조합을 확인했다. 모드가 바뀌어도 원문의 출처·관계를 함께 읽게 한다.

## 기존 구현이 어긋난 이유

큰 제목과 카드 안의 고정 격자, 항상 열린 본문, 모바일 목록 기본값은 원본의 핵심인 공간 탐색과 다르다. 작은 데이터라는 이유로 3D를 제외한 ADR-019의 UI 결정은 최신 사용자 요청으로 대체한다.

## 구현 기준

| 원본 | H-Log |
| --- | --- |
| 260px 밝은 sidebar + 검은 전체 화면 graph | `/brain` 전용 동일 구성. 다른 경로는 기존 Discord 스타일 |
| 3D constellation + 2D layouts | Three.js/OrbitControls + d3-force-3d. 브레인/자유/주제별/계층/시간순 |
| 렌즈·태그·종류·관계 | H-Log의 실제 주제/경험·해결·생각·배움·질문/4종 관계 |
| 질문 입력 | 기존 공개 기록의 본문까지 검색. 방문자 챗봇 없음 |
| 오른쪽 reader | 선택했을 때만 열리는 최대 560px 패널과 기존 개별 URL |
| 모바일 full canvas | 필터 drawer와 본문 dialog, focus 복원, 목록 대체 탐색 |

시각적 밀도는 원본의 실측 506개/2163개와 H-Log의 실제 28개/42개가 다르다. 밀도를 맞추려고 가짜 기억·연결을 추가하지 않는다. 공개 JS 원문을 복제하지 않고 확인한 구조와 상호작용을 새로 구현한다. 로컬 참고 UI/회사 문서 콘텐츠는 import하지 않는다.

렌더링 API 기준: [Three.js OrbitControls](https://threejs.org/docs/pages/OrbitControls.html), [Sprite](https://threejs.org/docs/pages/Sprite.html), [d3-force-3d](https://github.com/vasturiano/d3-force-3d). WebGL 실패 시 검색/목록/상세를 유지한다. 렌더러는 `/brain` 클라이언트에서 지연 로드하고 정리 시 이벤트·애니메이션·GPU 자원을 해제한다.

## 반영 결과

`second-brain-memory-interface / Step 0`에서 이 구성을 구현했다. 원본 공개 소스의 구조 분석을 우선했으며 로컬 참고 UI/콘텐츠를 이식하지 않았다. 브레인은 3D, 나머지 네 배치는 같은 Three.js renderer의 평면 좌표를 사용한다. 원본과 renderer 구현을 동일하게 복제할 필요 없이 회전·확대·이동과 같은 사용 동작을 제공한다. 초기 화면은 공간을 크게 보여 주고, 전체 보기 버튼으로 모든 노드를 한 번에 볼 수 있다.

실제 canvas 크기는 1440×1000 화면에서 1180×1000이며 sidebar는 260×1000이다. 선택 시 오른쪽 reader는 560px, 모바일 filter는 280px(max 85vw)다. 모바일 축척과 숨긴 라벨, 닫기 후 검색 focus 회귀를 재현·수정했다. 1440/1024/768/390/320px, 다섯 배치, 키보드/URL 복원, 자동 회전/정지/reduced-motion, WebGL unavailable/context loss, 상세/404를 확인했다.

2D 모드의 한 손가락 pan과 빈 canvas 클릭 닫기도 실제 브라우저 touch/pointer event로 RED/GREEN을 확인했다. 그래프를 끌었을 때는 본문을 열거나 닫지 않는다.
