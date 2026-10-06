# Step 2: graph-and-reading

## 읽을 파일

- `AGENTS.md`
- `.codex/docs/harness/PRD.md`
- `.codex/docs/harness/ADR.md`
- `.codex/docs/harness/ARCHITECTURE.md`
- `.codex/docs/harness/WORKFLOW.md`
- `.codex/docs/harness/AGENT_LOOP.md`
- `.codex/docs/harness/SECOND_BRAIN_PLAN.md`
- `../../.codex/skills/harness/SKILL.md`
- `../../.codex/skills/tdd/SKILL.md`
- `lib/brain.ts`
- `lib/brain-catalog.ts`
- `lib/site.ts`
- `components/layout/Header.tsx`
- `app/sitemap.xml/route.ts`
- `.codex/docs/harness/UI_GUIDE.md`

## 작업

/brain과 /brain/[slug], 독립 메뉴, 그래프/목록/검색/주제 필터/관계 상세를 연결한다. 선택과 필터를 URL로 복원하고 모바일은 목록을 우선한다. 상세에는 근거 수준과 정리 날짜를 표시한다.

## 인수 기준

공개 노드의 검색·상세·뒤로 가기·키보드·안전한 출처 링크가 동작한다. 비공개/없는 slug는 404, 검색·카운트·사이트맵에는 비공개 기록이 없다. 1440/390/320px에서 overflow가 없다.

## 검증

1. 변경의 focused RED를 확인한 뒤 최소 구현으로 같은 GREEN을 확인한다.
2. npm run test && npm run lint && npm run typecheck && npm run build
3. 코드 변경 시 앱의 전체 필수 gate를 통과한다. UI 변경은 데스크톱/모바일에서 직접 확인한다.
4. 완료한 실제 범위와 미구현 범위를 phase index에 기록한다.

## 하지 말 것

- 회사 원문·내부 식별자·비공개 근거 경로를 공개 카탈로그나 fixture에 넣지 않는다. 이유: 개인 기술 기록으로 일반화하는 범위만 승인됐다.
- 추측한 당시 감정·개인 기여·성과·도입 이력을 경험으로 확정하지 않는다. 이유: 코드 조사로는 증명할 수 없다.
- Home 레이더 전체, Blog DB source, OCI·timer·배포 상태를 변경하지 않는다. 이유: 이번 기능의 범위 밖이다.
- 방문자 챗봇이나 자동 기억 공개를 추가하지 않는다. 이유: 개인 기록과 읽기 기능이 우선이다.
