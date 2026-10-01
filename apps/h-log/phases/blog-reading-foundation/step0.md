# Step 0: preserve-fenced-code

## 개선 사항

빈 줄이 있는 코드 블록 보존. 2026-10-01 사용자 요청에 따른 다음 로컬 실행 단계다.

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
- `apps/h-log/lib/blog-content-model.ts`
- `apps/h-log/app/blog/[slug]/page.tsx`

## 작업

공개 Markdown 블록 분리를 fence-aware 처리로 바꾼다. 코드 내부 빈 줄·공백·Markdown/HTML 문자열을 코드로 보존하고 앞뒤 문단과 분리한다. 같은 문자와 충분한 길이의 닫는 fence만 인정하고, 닫히지 않은 fence는 문서 끝까지 코드로 취급한다. 저장 Markdown/HTML/hash와 crawler 원문은 바꾸지 않는다.

## 인수 기준

Fence 문자·길이·들여쓰기·인접 문단 경계는 [CommonMark fenced code 정의](https://spec.commonmark.org/0.31.2/#fenced-code-blocks)를 참고한다. 이번 범위는 top-level fence이며 전체 Markdown 문법 지원을 주장하지 않는다.

빈 줄과 인접 문단, 서로 다른 fence·짧은 fence·미종료 fence, raw HTML 문자열의 React escaping을 검증한다. 기존 diagram 삽입·비공개 글 배제·version hash 회귀 테스트를 유지한다.

앱 디렉터리에서 가까운 검증 후 기본 gate를 실행한다.

```bash
node --no-warnings --test --experimental-strip-types lib/blog-public.test.ts lib/blog-content-model.test.ts
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

## 완료 기록 (2026-10-01)

- RED: 빈 줄/인접 문단, 서로 다른 문자·짧은 닫는 fence, 미종료 fence의 3개 회귀 테스트가 코드 대신 문단/제목을 반환해 실패했다.
- GREEN: 공개 block reader가 fence를 먼저 구분한다. 코드 안의 빈 줄·literal Markdown/HTML·본문 공백과 앞뒤 문단을 보존하며 저장된 version은 변경하지 않는다.
- 검증: focused public/content model 27/27, 전체 unit 159 pass/12 DB environment skip, lint/typecheck/build, phase JSON/참조 파일 검증, git diff --check 통과.
- 개발 서버: 격리 local PostgreSQL에 가상 public/private 글을 넣고 1440/390/320px에서 code 3개·실제 heading 3개·키보드 가로 스크롤·페이지 넘침 없음·HTML 미실행을 확인했다. Markdown 원문은 동일하고 private 상세는 HTTP 404였다.
- 로컬 검증용 개발 서버와 메모리 DB를 종료했다. Schema/repository/worker는 수정하지 않았으며 DB integration suite는 이번 변경의 필수 대상이 아니다.
- 다음 단계: Step 1 `safe-inline-links`. 나머지 Markdown 문법·목차·코드 복사는 아직 구현하지 않았다. Discord 스타일·레이더 전체 영역과 OCI 보류는 유지한다.
