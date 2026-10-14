# Step 2: rea-reference-refresh

## 범위와 기준

2026-10-14 사용자가 REA로 지정한 로컬 `brain/ui/index.html` UI에 H-Log Second Brain을 맞추도록 요청했다. 이전 Step 1 이후 원본이 변경됐으므로 현재 로컬 HTML을 기준으로 `/brain`만 갱신한다. 회사 문서 데이터는 이식하지 않는다.

## 읽을 파일

- `apps/h-log/AGENTS.md`, `.codex/skills/harness/SKILL.md`, `.codex/skills/tdd/SKILL.md`
- `apps/h-log/.codex/docs/harness/PRD.md`, `ADR.md`, `ARCHITECTURE.md`, `LOCAL_BRAIN_UI_REFERENCE.md`
- `apps/h-log/.codex/docs/harness/WORKFLOW.md`, `AGENT_LOOP.md`, `IMPLEMENTATION_PLAN.md`, `UI_GUIDE.md`
- `apps/h-log/components/brain/BrainExplorer.tsx`, `BrainScene.tsx`
- `apps/h-log/app/brain/memory.css`, `apps/h-log/lib/brain-layout.ts`
- REA `reverse-engineer-anything/SKILL.md`와 runtime observation guide

## 작업

- 260px 밝은 사이드바, 그래프 상단 검색, 사이드바 안의 배치/색상/간격 도구를 현재 원본에 맞춘다.
- 오른쪽 440px 세로 상세 패널, 하단 미리보기/범례와 화면 크기에 맞는 그래프 투영을 반영한다.
- 기존 공개 기록/관계/근거 수준, URL 상태, 접근성/모바일 drawer, 목록 대체와 모션 설정을 보존한다.
- 밝은 패널은 `/brain` 전용 스타일이다. 다른 경로의 Discord 테마와 Home/레이더를 변경하지 않는다.

## 인수 기준과 검증

1. REA의 원본 식별·스크립트 분석·화면 evidence와 한계를 기록한다.
2. 브라우저 geometry 및 그래프 투영 RED → GREEN. 1440/768/390/320px에서 검색/선택/필터/도구/긴 본문/키보드/URL/넘침을 검증한다.
3. `node --no-warnings --test --experimental-strip-types lib/brain.test.ts lib/brain-layout.test.ts lib/brain-curation.test.ts`
4. `npm run test`, `npm run lint`, `npm run typecheck`, `npm run build`, phase JSON과 `git diff --check`.
5. UI 기준 문서와 phase 상태를 동기화하고 검증한 파일만 커밋·푸시한다.

## 하지 말 것

- 회사 embedded graph/본문/경로/AI prompt, 원본 캡처나 HTML을 공개 파일에 포함하지 않는다.
- 화면을 채우기 위해 개인 경험이나 노드/관계를 만들어 내지 않는다.
- DB/schema/worker, Home/레이더, OCI·실제 발행·timer를 변경하지 않는다.

## 완료 기록 — 2026-10-14

- `BrainExplorer.tsx`, `memory.css`, `BrainScene.tsx`만 production 변경했다. 원본의 밝은 260px sidebar, 상단 검색과 `/` 단축키, sidebar 도구, 460px preview와 440px 세로 본문 및 viewport fit 투영을 적용했다.
- REA `analyze_javascript_application`은 directory/HTML 식별까지만 확인했다. Inline script는 `analyze_web_bundle`로 전용 loopback 브라우저에서 2개를 파싱했다. `capture_web_screenshot`과 Playwright 실측을 함께 사용했다. Hash/evidence와 관측 한계는 [기준 문서](../../.codex/docs/harness/LOCAL_BRAIN_UI_REFERENCE.md)에 기록했다.
- RED: 원본 비교에서 sidebar `340 !== 260`, 1440/390/320px 투영 좌표 불일치. GREEN: sidebar·제목·검색·필터 치수와 색상 일치, 실제 노드 투영 오차 0.001px 미만. 긴 본문 dialog 높이와 모바일 필터 버튼 표시도 실패 재현 후 수정했다.
- Focused `lib/brain.test.ts lib/brain-layout.test.ts lib/brain-curation.test.ts`: **10/10 통과**.
- `npm run test`: **207 pass / 13 DB skip / 0 fail**. DB/schema/worker 변경이 없어 integration은 추가 실행하지 않았다.
- `npm run lint`, `npm run typecheck`, `npm run build` 통과. 첫 build는 제한 환경에서 Turbopack의 하위 Node 프로세스 연결이 종료돼 실패했고, 같은 명령을 일반 권한으로 재실행해 성공했다.
- `.codex/tmp/brain-rea/compare.mjs`, `camera-check.mjs`, `interactions.mjs`, `.codex/tmp/brain-ui-parity/gestures-motion.mjs`: 1440/1024/768/390/320px, hover/긴 본문/5종 배치/필터/검색/URL·뒤로가기·새로고침/관련 기록/keyboard·focus·Escape/drag·rotate·pinch/모션·정지/WebGL 실패·context loss·404 검증 통과. `/` 포커스와 모바일 검색을 별도로 확인했다. Script와 캡처는 ignored 로컬 검증 자료로만 보존한다.
- Phase JSON/참조 경로 검사와 `git diff --check` 통과. PRD/ADR-030/ARCHITECTURE/UI 기준/계획/phase 상태를 동기화했다.
- 기존 공개 28개 노드/42개 연결, 비공개 작성과 공개 사본 경계, 실제 날짜와 근거 수준을 유지한다. 회사 payload·HTML·캡처는 커밋에 포함하지 않는다.

현재 요청의 남은 UI step은 없다. 다음 일반 단계는 `blog-discovery-and-home / Step 2: home-recent-posts`이며 이번 변경에서 시작하지 않았다. 운영 배포와 영구 DB 구성은 기존 OCI 보류를 따른다.
