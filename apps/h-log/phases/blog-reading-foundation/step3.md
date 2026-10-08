# Step 3: accessible-tables

## 개선 사항

비교 표 읽기. 같은 phase의 Step 2 완료 후 실행한다.

## 읽을 파일

모든 경로는 저장소 루트 기준이다. 아래 파일과 수정 대상의 실제 caller를 확인한다.

- `AGENTS.md`
- `apps/h-log/AGENTS.md`
- `.codex/skills/harness/SKILL.md`
- `.codex/skills/tdd/SKILL.md`
- `apps/h-log/.codex/docs/harness/PRD.md`
- `apps/h-log/.codex/docs/harness/ADR.md`
- `apps/h-log/.codex/docs/harness/ARCHITECTURE.md`
- `apps/h-log/.codex/docs/harness/WORKFLOW.md`
- `apps/h-log/.codex/docs/harness/AGENT_LOOP.md`
- `apps/h-log/.codex/docs/harness/IMPLEMENTATION_PLAN.md`
- `apps/h-log/.codex/docs/harness/UI_GUIDE.md`
- `apps/h-log/.codex/rules/frontend.md`
- `apps/h-log/.codex/rules/content-seo-privacy.md`
- `apps/h-log/.codex/docs/harness/PUBLIC_EXPERIENCE_PLAN.md`
- `apps/h-log/phases/blog-reading-foundation/index.json`
- `apps/h-log/lib/blog-public.ts`
- `apps/h-log/lib/blog-public.test.ts`
- `apps/h-log/app/blog/[slug]/page.tsx`

## 작업

기술 비교용 Markdown 표를 header/body와 안전한 inline cell 모델로 렌더링한다. 모바일에서는 표 영역 안에서만 가로 이동하게 하고 keyboard focus를 제공한다. escaped pipe와 code cell 사례를 포함한다.

## 인수 기준

헤더/셀 관계·정렬·빈 셀·escaped pipe·긴 내용이 정확히 출력되고 320/390px에서 페이지 전체 가로 넘침이 없다.

앱 디렉터리에서 가까운 검증 후 기본 gate를 실행한다.

```bash
node --no-warnings --test --experimental-strip-types lib/blog-public.test.ts
npm run test
npm run lint
npm run typecheck
npm run build
git diff --check
```

## 검증

1. 바꾸는 public behavior의 RED를 확인한 뒤 최소 구현으로 같은 테스트의 GREEN을 확인한다. 순수 콘텐츠/문서 변경은 파서·링크·형식 검증으로 대체한다.
2. UI는 개발 서버와 격리 local DB의 synthetic fixture로 1440/390/320px, focus, 긴 글, 빈/오류 상태를 확인한다. DB/repository/worker/migration 변경 시 `npm run test:integration`을 추가한다.
3. phase index와 이 step에 실제 결과·검증 command·다음 단계를 기록한다. 완료된 기능만 completed로 표시한다.

## 하지 말 것

- 레이더의 데이터·축·형태·배치·주변 영역을 변경하지 말 것. 사용자가 명시적으로 보존을 요청했다.
- 저장 Markdown/HTML/hash나 기존 URL을 무단 재작성하지 말 것. 발행 무결성과 기존 링크를 유지해야 한다.
- raw HTML 주입, private 글/내부 evidence/근거 없는 실적 노출을 허용하지 말 것. 공개 콘텐츠 경계를 유지해야 한다.
- OCI·DNS/TLS·운영 timer·실제 provider 호출·공개 발행을 실행하지 말 것. 로컬 개선 계획이며 기존 OCI 보류는 유지된다.

## 완료 기록 (2026-10-08)

- `lib/blog-public.ts`에 typed table header/rows/align을 추가했다. Marked block 규칙만 표 인식에 사용하고 GFM task/inline 옵션과 저장 content는 유지했다. 셀은 기존 안전한 inline renderer로 출력한다.
- 상세 page는 native table/thead/tbody, `scope="col"`, 열 정렬과 focus 가능한 내부 스크롤 영역을 사용한다. 상대 위치를 지정해 외부 링크의 숨김 안내도 모바일 스크롤 경계 안에 둔다.
- RED: parser의 표 모델·안전한 셀·중첩/헤더 전용 표 3개 실패, 브라우저에서 table 0개, 이후 390px에서 페이지 scrollWidth 520px를 확인했다. 수정 후 같은 검증을 통과했다.
- GREEN: focused 25/25, `npm.cmd run test` 196 pass/13 DB skip, `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd run build`, phase JSON/path 검사와 `git diff --check`를 통과했다.
- 격리 local PostgreSQL의 synthetic 글로 1440/390/320px를 확인했다. Table 3개/열 헤더 8개가 접근성 트리에 나타나며 Tab focus와 방향키 스크롤, 페이지 넘침 없음, 긴 셀·빈 셀·escaped pipe·안전한 링크, 원문 일치, private/missing 404와 빈 목록을 확인했다. Raw HTML은 실행되지 않고 브라우저 오류도 없었다.
- DB/repository/worker/migration 변경은 없다. Home/레이더·Second Brain·OCI 보류를 유지한다. Foundation 전체 완료 후 다음은 [`blog-reading-navigation / Step 0`](../blog-reading-navigation/step0.md)의 제목 링크와 목차다.
