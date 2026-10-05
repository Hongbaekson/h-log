# Step 2: semantic-lists-and-quotes

## 개선 사항

목록과 인용문. 같은 phase의 Step 1 완료 후 실행한다.

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
- `apps/h-log/package.json`

## 작업

순서/비순서 목록과 인용문을 의미 있는 React 요소로 렌더링한다. 연속 문단·중첩·코드와의 경계를 먼저 fixture로 고정한다. 기존 narrow parser로 복잡해지면 유지되는 표준 parser와 allowlist 모델의 최소 조합을 비교해 결정하며 raw HTML 주입은 허용하지 않는다.

## 인수 기준

목록 순서·인용문·중첩과 코드의 경계, 스크린 리더 구조, 모바일 들여쓰기/넘침을 확인한다. fenced-code 및 inline-link 회귀 검증이 통과한다.

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

## 완료 기록 (2026-10-06)

- RED: 목록/시작 번호/주변 문단, 여러 문단과 혼합 중첩, 인용문과 inline 내용, 중첩 코드 경계, 인용 제목과 실제 diagram anchor를 구분하는 5개 테스트의 실패를 확인했다.
- GREEN: 설치된 Marked의 block lexer를 재사용하고 `list`/`blockquote` typed node를 추가했다. 목록의 `start`가 null이면 비순서, 숫자이면 해당 번호부터 시작하며 각 항목과 인용문은 block children을 재귀 렌더링한다. 새 패키지는 추가하지 않았다.
- 코드 호환: Marked 18.0.14 기본 fence tokenizer가 종료 구분자의 trailing tab을 놓치는 회귀를 확인했다. Step 0의 fence scanner를 공식 tokenizer override로 옮겨 동일 문자/최소 길이/공백·탭 종료 조건과 literal code를 유지했다. 중첩된 backtick/tilde fence 및 indented code도 검증했다.
- 허용 목록: 기존 heading/paragraph/inline 링크 경계를 재사용한다. raw HTML, 미지원 블록과 참조식 링크는 text로 남고 저장 Markdown/HTML/hash 및 crawler 출력은 바꾸지 않는다. Verified diagram은 최상위 H2 또는 paragraph에만 삽입한다.
- UI: native `ol`/`ul`/`li`/`blockquote`, Discord Blurple 인용 구분선, 좁은 들여쓰기와 긴 문장 줄바꿈을 적용했다. 인용문 안 H1까지 1×1px로 숨겨지는 browser RED를 확인하고 중복 제목 숨김을 최상위 H1으로 제한했다.
- 검증: focused `lib/blog-public.test.ts` 21/21, `npm run test` 170 pass/12 DB environment skip, `npm run lint`, `npm run typecheck`, `npm run build`, phase JSON/참조 파일 검사, `git diff --check` 통과.
- 개발 서버: 격리 PostgreSQL의 합성 public/private 글로 1440/390/320px을 확인했다. 목록 5개/항목 10개/인용문 2개가 browser accessibility tree에 노출되고 시작 번호 3/0, 여러 문단과 중첩, inline link focus, 코드 내부 키보드 스크롤, 제목 표시, 페이지 넘침 없음, HTML 미실행을 검증했다. Markdown 원문 동일성, private/missing 상세 404, private Markdown 404와 빈 태그 결과도 통과했다.
- 임시 개발 서버와 메모리 DB를 종료했다. DB/schema/repository/worker 변경이 없어 별도 DB integration suite는 실행하지 않았다.
- 다음 단계: Step 3 `accessible-tables`. 레이더 전체 영역과 OCI 보류는 유지하며 기존 의존성 보안 패치는 별도 후속 기록을 따른다.
