# 로컬 Second Brain UI 이식 기준

2026-10-14 사용자가 REA로 지정한 로컬 `brain/ui/index.html`을 다시 확인해 UI를 맞추도록 요청했다. 현재 기준은 아래 Step 2와 ADR-030이다. 이전 이식 당시와 원본 파일이 달라졌으며, [Memory 분석](MEMORY_UI_REFERENCE.md)과 아래 Step 1 결과는 이력으로 남긴다.

## 현재 기준: Step 2 REA 재분석

REA directory 분석에서 HTML 한 개를 식별했지만 inline JavaScript는 파싱하지 못했다. 해당 파일만 제공하는 loopback 서버와 전용 브라우저를 열고 REA runtime 분석으로 두 script를 파싱했다. 원본 데이터가 든 첫 script와 UI를 구성하는 두 번째 script를 구분하고, UI와 화면 치수만 반영했다.

- REA directory digest: `c51c00f31e1b05d28ae916f22534be3f980ba7214263deac8ff90ffe23e83304`
- 원본 HTML SHA-256: `9c297b9c86019f84298a058c088ed826dda0b3e09826e4a6e652670d04bdd818`
- UI script SHA-256: `323c0d9c21dd9bc4c7aede2d8e520dbed36f91ec3d59439af5babfd525bb01cb`
- Directory evidence: `ev_80d67afc858b0fd02dc1dc6eadd78f5d0afad0ab48ae55bfc5de090149ac63df`
- Runtime evidence: `ev_08f6b4df5912bb3abd59d42e899e7ea9ef826aa52bad8737ab042053573ce652` — 2 script, 14,441 AST node, parse failure 0.
- 화면 evidence: `ev_28d6f0f1fd5f2bea792ccf36704fe92251b6382ccb7180f8e78a05dbd2175307` — 1440×1000 캡처. 이 관측만으로 전체 동작을 입증하지 않으며 아래 브라우저 검증을 함께 사용했다.

| 항목 | 현재 원본 및 H-Log 기준 (1440×1000) |
| --- | --- |
| Sidebar | 260px, padding 24px 20px, `#ecebe3`, 제목 18px/27px |
| 그래프 | x=260px, 1180×1000px, `#0a0a0a` |
| 검색 | 그래프 상단 중앙 x=530px/y=20px, 640×49px, `/`로 포커스 |
| 도구 | Sidebar 아래의 배치·색상·간격·다시 정렬 |
| Hover preview | Stage 하단 중앙, 너비 460px, bottom 28px |
| 선택 본문 | x=976px/y=88px, 440×888px, right/bottom 24px, 내부 스크롤 |
| 모바일 | 전체 폭 그래프, 상단 검색, 최대 280px 필터 drawer, 하단 본문 dialog |

밝은 sidebar는 `/brain` 전용 예외다. 공개 기록과 URL 상태, 근거 표시, 목록 대체, 모션 정지와 dialog 접근성은 유지한다. 원본의 회사 문서·태그·검색 데이터·경로·AI prompt는 가져오지 않는다. H-Log의 28개 노드/42개 관계와 원본의 데이터가 달라 연결 모양과 텍스트 줄바꿈은 달라진다.

그래프 투영은 `max(.1, min((width-64)/900, (height-180)/1100))`를 배율에 곱하고 화면 높이의 50%를 중심으로 삼는다. 이전 모바일 전용 초기 축소는 제거했다. 실제 정리일과 긴 한글 라벨의 충돌 방지는 H-Log 의미에 맞게 유지한다.

검증에서 sidebar 폭 `340 !== 260`, 그래프 좌표 오차(1440/390/320px)를 먼저 재현했다. 변경 뒤 sidebar·제목·검색·필터의 실측이 일치하고 투영 오차가 0.001px 미만임을 확인했다. 긴 본문이 패널 높이를 넘던 문제와 모바일 필터 버튼 표시도 재현 후 수정했다. 1440/1024/768/390/320px에서 검색·5종 배치·URL·키보드·drag/pinch·모션·WebGL fallback을 통과했다. 비교 script와 캡처는 ignored `.codex/tmp/brain-rea/` 및 `.codex/tmp/brain-ui-parity/`에만 둔다.

## 이전 이식 이력: 2026-10-06 Step 1

아래 치수와 검증은 당시 원본 기준이며 현재 UI 기준이 아니다.

로컬 HTML의 첫 번째 script에는 embedded 문서 데이터가 있고, 두 번째 script가 UI를 만든다. UI script가 추가하는 세 번의 CSS 선언을 모두 읽고 최종 override를 기준으로 확인했다. 첫 번째 light CSS만 보면 실제 검은 화면과 다른 결론이 나온다. 원본을 file URL로 직접 열어 1440×1000/390×844에서 확인했다.

| 항목 | 데스크톱 원본 및 H-Log 실측 |
| --- | --- |
| Sidebar | 340×1000px, padding 28px 24px, rgba(12,12,14,.96) |
| 내부 콘텐츠 | 292px, 제목 22px/650, 제목 y=105.39px |
| 검색 | Sidebar 내부 x=24px/y=413.17px, 292×44px, 999px radius |
| 첫 필터 | x=24px/y=252.78px, 높이 33px, 13px 글꼴, padding 7px 12px |
| 그래프 | x=340px, 1100×1000px, WebGL + 2D label canvas |
| 상단 도구 | x=358px/y=18px, 너비 1064px, hover/focus로 표시 |
| Hover preview | Stage 하단 중앙, 너비 520px, bottom 28px, padding 22px, radius 18px |
| 선택 본문 | 우측 하단 x=892px/y=372px, 520×600px, right/bottom 28px |

단순한 검은 테마 변경이 아니다. 원본 constellation 좌표식, 초기 rotation/zoom/perspective, additive point shader, screen-space soft line, 빛/미세 움직임, label canvas와 panel 구조를 TypeScript/React에 이식했다. 원본과 동일한 ID/순서/노드 수일 때 기본 좌표가 같아야 하며, 첫 공개 노드의 x/y/z를 수치 테스트로 고정했다. Three.js/d3-force-3d와 전용 타입은 더 이상 사용하지 않는다.

## 콘텐츠와 필요한 차이

- 회사 embedded graph, 본문, 검색 인덱스, 파일 경로, context pack/AI prompt와 runtime JSON fetch는 이식하지 않는다. H-Log의 승인된 공개 DTO 28개 노드/42개 연결만 사용한다. 노드 수·제목·관계가 달라 그래프의 실제 연결 모양도 달라진다.
- Sidebar 구조/스타일은 유지하면서 렌즈·태그·토픽·유형·관계는 개인 기록에 연결한다. 검색은 실제 기록의 본문/질문까지 검색한다.
- 원본의 390px 화면은 고정 320px sidebar 때문에 graph가 70px로 좁아졌다. 767px 이하에서는 같은 sidebar를 native modal drawer로 열고 graph가 전체 폭을 사용한다. 본문은 하단 modal로 표시한다.
- 원본의 32개 이하 전체 라벨 표시 예외는 긴 한글 제목에서 겹침 3건을 만들었다. 원본의 label budget/collision guard를 작은 카탈로그에도 적용하며 hover/focus로 제목·미리보기를 읽는다.
- 원본의 노드 drag는 포인터를 기록하지만 좌표를 바꾸지 않았다. 실제 노드 이동, touch pinch, 키보드 제어, 움직임 정지, WebGL 실패 목록 대체와 자원 정리를 연결했다.
- 시간순은 실제 정리일, 계층은 실제 기록 유형을 사용한다. 존재하지 않는 과거 사건이나 관계를 만들어 화면 밀도를 채우지 않는다.
- 상세에는 기존 기록의 근거 수준·연결 이유·안전한 출처와 개별 URL을 유지한다. 다른 route의 Discord 스타일, Home/레이더와 운영 보류는 그대로다.

## 검증

- RED: 원본 비교에서 sidebar `260 !== 340`, constellation 기준 좌표 불일치를 확인했다.
- GREEN: Sidebar/제목/검색/필터/topbar의 geometry, 글꼴과 색상이 일치했다. Hover 520px 중앙 panel과 detail 520×600px 우측 하단을 실제 브라우저에서 확인했다.
- 1440/1024/768/390/320px, 검색·필터·5종 배치·색상·간격·라벨·목록, 노드 drag/회전/zoom, touch pinch, URL reload/back, 연결 탐색, dialog focus/Escape, reduced-motion/정지, WebGL 생성 실패/context loss와 개별 상세/404를 확인했다.
- Browser 캡처와 비교 script는 로컬 ignored `.codex/tmp/brain-ui-parity/`에 보관한다. 원본 스크린샷과 HTML 데이터는 공개 asset이나 Git에 포함하지 않는다.
