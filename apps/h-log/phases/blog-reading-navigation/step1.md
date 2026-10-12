# Step 1: code-copy-and-language

## 개선 사항

코드 언어와 복사. 같은 phase의 Step 0 완료 후 실행한다.

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
- `apps/h-log/phases/blog-reading-navigation/index.json`
- `apps/h-log/lib/blog-public.ts`
- `apps/h-log/lib/blog-public.test.ts`
- `apps/h-log/app/blog/[slug]/page.tsx`

## 작업

fence의 언어 정보를 안전하게 전달하고 코드 복사 버튼을 최소 client component로 추가한다. 성공/실패 상태를 접근 가능한 방식으로 표시한다. 원문 공백은 보존한다. 구문 강조는 안전한 서버 렌더링과 실제 필요를 확인한 경우에만 포함한다.

## 인수 기준

다중 행·빈 줄·HTML 문자열이 보이는 코드와 동일하게 복사된다. Clipboard 실패·키보드 focus·상태 안내·모바일 가로 스크롤을 확인한다.

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

## 완료 기록 (2026-10-12)

- `lib/blog-public.ts`의 code 모델에 `language: string | null`을 추가했다. Fence info의 첫 토큰 중 짧은 ASCII 식별자만 표시하고 파일명 등 부가 정보는 넘기지 않는다. 저장 Markdown/HTML/hash와 기존 code 문자열은 유지한다.
- `components/blog/CodeBlock.tsx`에서 같은 문자열을 화면과 `navigator.clipboard.writeText`에 사용한다. 한국어 polite status로 진행/성공/실패를 안내하고 API 미지원/거부 시 직접 복사 안내와 재시도를 제공한다. Pending 동안 `aria-disabled`와 handler guard로 중복 요청을 막고 초점은 유지한다.
- RED: 언어 정보/식별자 경계/중첩·미종료 fence 3개 실패, 브라우저 복사 버튼 0개를 확인했다. 첫 UI 구현의 native disabled가 복사 후 키보드 초점을 잃는 실패를 확인하고 수정했다. 기존 UI contract의 pre 검사 경로도 새 컴포넌트로 옮겼다.
- GREEN: `node --no-warnings --test --experimental-strip-types lib/blog-public.test.ts` 31/31, `lib/blog-detail-ui.test.ts` 4/4, `npm.cmd run test` 202 pass/13 DB skip, `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd run build`, phase JSON/path 검사와 `git diff --check`를 통과했다.
- 격리 local PostgreSQL의 synthetic 글과 Clipboard stub으로 1440/390/320px에서 일반/빈/중첩 코드 6개의 표시 문자열과 API 입력이 공백·빈 줄·탭·HTML 문자열까지 일치함을 확인했다. 성공·실패·API 미지원·대기 중 중복 방지·재시도, 키보드 focus/방향키 스크롤, 페이지 가로 넘침 없음과 화면을 검증했다. 실제 사용자 clipboard는 읽거나 쓰지 않았다. JavaScript 없이 코드 본문 읽기, 원문 일치, private/missing 404와 브라우저 오류 없음도 확인했다.
- 새 의존성·구문 강조·DB/repository/worker/migration 변경은 없다. Home/레이더·Second Brain·OCI 보류를 유지한다. 다음은 [Step 2: 관련 글과 이전·다음](step2.md)이다.
