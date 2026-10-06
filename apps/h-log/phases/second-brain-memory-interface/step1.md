# Step 1: local-reference-ui-parity

## 읽을 파일

- `AGENTS.md`, `.codex/rules/frontend.md`
- `.codex/docs/harness/{PRD,ADR,ARCHITECTURE,WORKFLOW,AGENT_LOOP,IMPLEMENTATION_PLAN}.md`
- `../../.codex/skills/{harness,tdd,sync-repos}/SKILL.md`
- `components/brain/{BrainExplorer,BrainScene,BrainNote}.tsx`
- `app/brain/memory.css`, `lib/brain-layout.ts`, `lib/brain.ts`
- 사용자가 지정한 로컬 `brain/ui/index.html`의 CSS와 UI script (embedded data 제외)

## 작업

사용자는 Step 0의 재해석된 화면을 거절하고 로컬 UI와 같은 모양을 요청했다. ADR-020의 화면 결정을 대체한다. 340px 검은 sidebar, sidebar 검색, pill 필터, 상단 hover controls, native WebGL constellation, 하단 hover preview와 우측 하단 detail을 원본 수치와 코드로 이식한다. React에는 공개 DTO만 연결한다.

원본 390px 화면의 320px 고정 sidebar/70px graph 문제만 모바일 drawer로 보정한다. 키보드·reduced-motion·목록/WebGL fallback·URL 복원과 개별 상세를 유지한다. 원본의 경로/AI prompt/회사 문서를 가져오지 않는다.

## 인수 기준

- 원본과 1440×1000 화면을 비교해 sidebar 340px, padding 28px 24px, 제목 22px, 검색 높이 44px, canvas 1100×1000, preview/detail 크기·위치·색상이 일치한다.
- 원본 constellation 좌표와 projection, 실제 28개/42개 보존을 focused test로 확인한다.
- 검색/필터/hover/select/연결 탐색, 5종 배치/간격/색상/라벨, drag/zoom, URL reload/back, WebGL 실패를 실제 브라우저에서 확인한다.
- 1440/1024/768/390/320px에서 overflow 없이 탐색한다. 모바일 drawer와 reader의 focus/닫기를 확인한다.
- `npm run test`, `npm run lint`, `npm run typecheck`, `npm run build`, `git diff --check` 통과.

## 검증

RED: 원본과 현재 화면을 비교한 브라우저 assertion이 sidebar 260 !== 340으로 실패했다. 원본 source와 화면을 먼저 확인한 뒤 수정한다. 완료 시 결과를 phase index에 기록한다.

완료: Sidebar/제목/검색/필터/topbar의 수치·색상·font가 원본과 일치했다. Hover preview 520px, detail 520×600px와 하단 위치를 확인했다. 기준 좌표 및 한글 라벨 겹침 RED→GREEN, unit 178 pass/12 DB skip, lint/typecheck/build, 다섯 viewport와 drag/pinch/URL/dialog/reduced-motion/WebGL failure 검증을 통과했다. 자세한 대응은 [로컬 UI 이식 기준](../../.codex/docs/harness/LOCAL_BRAIN_UI_REFERENCE.md)을 따른다.

## 하지 말 것

- 다른 참조 사이트에 맞춰 다시 해석하지 않는다. 이유: 최신 요청은 지정한 로컬 UI의 직접 이식이다.
- 회사 embedded data, Wiki, 내부 경로를 복사하지 않는다. 이유: UI 이식만 요청됐다.
- Home/레이더, 공개 카탈로그, Blog DB, OCI 설정을 바꾸지 않는다. 이유: 이 step의 범위 밖이다.
