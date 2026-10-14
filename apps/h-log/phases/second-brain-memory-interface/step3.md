# Step 3: career-memory-ui-parity

## 범위와 기준

2026-10-15 사용자가 비동기 질문에 답해 최종 기준을 `https://www.careerhackeralex.com/memory`로 확정했다. Step 2의 로컬 HTML 기준보다 이번 답변을 우선한다. REA로 공개 브라우저 bundle과 실제 화면을 확인하고 H-Log `/brain`에 화면 구성과 조작 방식을 반영한다.

## 읽을 파일

- `apps/h-log/AGENTS.md`, `.codex/skills/harness/SKILL.md`, `tdd/SKILL.md`, `sync-repos/SKILL.md`
- `apps/h-log/.codex/docs/harness/PRD.md`, `ADR.md`, `ARCHITECTURE.md`, `WORKFLOW.md`, `AGENT_LOOP.md`, `IMPLEMENTATION_PLAN.md`
- `apps/h-log/.codex/docs/harness/UI_GUIDE.md`, `MEMORY_UI_REFERENCE.md`, `LOCAL_BRAIN_UI_REFERENCE.md`
- `apps/h-log/components/brain/BrainExplorer.tsx`, `BrainScene.tsx`, `app/brain/memory.css`
- `apps/h-log/lib/brain-layout.ts`, `brain-layout.test.ts`, `brain.ts`
- REA skill와 runtime observation guide, 공개 페이지의 관측 결과

## 작업과 성공 기준

- 260px 밝은 sidebar, 유형/관계 행 필터, 도구·안내의 위치를 실제 사이트와 비교한다.
- Hover는 480px 하단 미리보기, 선택 시 데스크톱 560px 전체 높이 reader, 모바일 전체 화면 reader로 맞춘다. 검색은 열린 reader를 피해서 배치한다.
- 브레인 모드는 공개 노드와 관계에 따른 3D 배치·카메라와 얇은 선/발광점으로 표시한다. 나머지 배치는 밝은 평면으로 전환하며 회전 대신 이동한다.
- 기록 검색, URL 복원, 근거 수준과 실제 날짜, 직접 연결, 모바일 focus/dialog, 목록 fallback과 reduced-motion을 유지한다.
- 사람·콘텐츠·언어 설정은 H-Log에 맞춘다. 질문 UI를 방문자 AI로 연결하거나 없는 번역 기능을 표시하지 않는다.

## 검증

1. 원본 대비 패널/미리보기/필터 치수와 그래프 배치/평면 동작의 실패를 먼저 확인한다.
2. 가까운 unit/browser test RED → GREEN 후 `npm run test`, `npm run lint`, `npm run typecheck`, `npm run build`를 실행한다.
3. 1440/1024/768/390/320px에서 검색·선택·필터·다섯 배치·키보드·URL·긴 본문·터치·모션·WebGL 실패를 확인한다.
4. REA evidence/관측 한계와 필요한 차이를 기록하고 phase JSON/문서 링크 및 `git diff --check`를 검증한다.
5. 검증한 파일만 커밋·푸시한다.

## 하지 말 것

- 원본 본문·노드·태그·회사 Wiki를 복제하지 않는다. 실제 개인 기록과 관계만 표시한다.
- 그래프 밀도를 맞추려고 가짜 노드·연결을 추가하지 않는다.
- 원본 번들/전체 HTML/캡처를 공개 repository에 넣지 않는다. 로컬 ignored 분석 자료로만 보존한다.
- Home/레이더, Blog/Brain DB 계약, 소유자 작성 기능과 OCI 보류를 변경하지 않는다.

## 완료 기록 — 2026-10-15

- `BrainExplorer.tsx`/`memory.css`: 원본 실측에 맞춘 유형·관계 행 필터, 1px 구분선, 48.5px 상단 검색, 480px 미리보기, 560px 전체 높이 본문과 모바일 전체 화면 읽기를 적용했다. 본문은 고정 제목/요약과 내부 스크롤로 나누며 열린 패널을 피해서 검색 영역을 줄인다. 모드에 따라 배경/패널 색상을 전환한다.
- `brain-layout.ts`/`BrainScene.tsx`: 공개 연결의 force 배치와 데이터 범위 기반 카메라, 작은 발광점·중성 선·11px 라벨, 3D 회전과 2D pan/노드 이동을 구현했다. `d3-force-3d@3.0.6`과 사용 API에 한정한 타입 선언을 추가했다. 원본 catalog는 복사해 계산한다.
- REA `list_browser_targets`, `capture_web_screenshot`, `analyze_web_bundle` 사용. 28 scripts, parse failure 0. Evidence/hash·한계는 [현재 UI 기준](../../.codex/docs/harness/MEMORY_UI_REFERENCE.md)에 남겼다.
- UI RED → GREEN: preview `460 → 480px`, reader `440×888 → 560×1000px`, 모바일 reader `366×548.6 → 390×844px`, 유형 행 `11 → 12.5px`, 모바일 버튼 `32 → 36px`, 검색/본문 겹침 해소.
- Graph RED → GREEN: 연결 관계와 무관하던 배치, 3D로 남아 있던 다른 모드, 평면 이동량 불일치를 재현했다. 수정 후 실제 연결이 공간 배치에 영향을 주며 다른 모드는 z=0, 방향키 이동은 모든 노드가 25px 평행 이동한다. 간격의 투영 변화 `0 → 최대 248.43px`, 2D 분야별 색상 픽셀 변경도 확인했다.
- `node --no-warnings --test --experimental-strip-types lib/brain-layout.test.ts`: **5/5 통과**.
- `npm run test`: **208 pass / 13 DB skip / 0 fail**. DB/schema/worker 변경은 없으므로 별도 integration 실행은 생략했다.
- `npm run lint`, `npm run typecheck`, `npm run build` 통과.
- 로컬 ignored `.codex/tmp/brain-career/ui-check.mjs`, `interactions.mjs`, `graph-pan.mjs`, `graph-spacing.mjs`, `graph-color.mjs`, `graph-validation.mjs` 및 기존 `gestures-motion.mjs` 통과. 1440/1024/768/390/320px, 5종 배치, 검색·필터·색상·간격·라벨, hover/긴 본문/모바일 dialog, keyboard/focus/Escape, URL/history/reload/관련 기록, pinch/정지/reduced-motion, WebGL 실패/context loss/상세404를 확인했다. 캡처로 어두운 3D·밝은 평면·모바일 읽기를 검수했다.
- Phase/package JSON, 문서 상대 경로와 `git diff --check`를 확인했다. PRD/ADR-031/ARCHITECTURE/UI 기준/계획/phase 상태를 동기화했다.

기존 28개/42개 및 소유자 작성 기능은 그대로다. 원본 506개/2163개의 밀도나 개인 콘텐츠는 복제하지 않았다. 원본의 bloom 대신 native glow, drag 후 주변 재시뮬레이션 없는 직접 이동, 카메라 비행 없는 검색 선택은 의도한 차이로 기록했다.

이번 UI 요청의 남은 step은 없다. 기본 다음 단계는 `blog-discovery-and-home / Step 2: home-recent-posts`이며 이번 작업에서 시작하지 않았다. 운영 배포와 영구 DB 구성은 기존 OCI 보류를 따른다.
