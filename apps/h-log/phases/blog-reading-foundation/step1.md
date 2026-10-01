# Step 1: safe-inline-links

## 개선 사항

안전한 본문 링크. 같은 phase의 Step 0 완료 후 실행한다.

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
- `apps/h-log/lib/public-source-url.ts`
- `apps/h-log/lib/public-source-url.test.ts`
- `apps/h-log/app/blog/[slug]/page.tsx`
- `apps/h-log/package.json`
- `apps/h-log/package-lock.json`

## 작업

본문 Markdown 링크를 typed inline node와 React anchor로 출력한다. 기존 public URL 검증을 재사용하고 허용할 상대 경로/fragment/HTTPS 정책을 테스트로 명시한다. 위험한 scheme·private host는 링크로 만들지 않으며 code span 안의 링크 문법은 그대로 둔다. 중첩 문법이 필요한 경우 검증된 parser 재사용을 먼저 평가하고 임시 정규식 문법을 무한히 확장하지 않는다.

## 인수 기준

정상 링크·한글 label·괄호와 escape·code span·javascript/data/private URL 사례를 확인한다. 외부 링크의 키보드 접근과 새 창 안내를 확인한다.

앱 디렉터리에서 가까운 검증 후 기본 gate를 실행한다.

```bash
node --no-warnings --test --experimental-strip-types lib/blog-public.test.ts lib/public-source-url.test.ts
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

- RED: 링크가 일반 텍스트로 남는 기본 사례, 괄호/escape/중첩 강조, 여러 backtick code span과 escape, 차단 주소의 label 처리, 내부 도메인 검증에서 총 5개 실패를 확인했다.
- GREEN: `marked@18.0.14`의 inline lexer만 사용한다. HTML 생성기는 호출하지 않으며 link/strong/code/text 허용 노드를 React로 렌더링한다. 저장 Markdown/HTML/hash 생성과 Markdown endpoint는 그대로다.
- URL 정책: 공개 HTTPS, `/`로 시작하는 사이트 경로, `#` fragment를 허용한다. `//`, backslash, 공백/제어 문자, 일반 상대 경로와 위험한 scheme은 거부한다. HTTPS는 기존 public source validator로 검사하며 `.internal`, `.corp`, `.lan`도 차단하도록 보강했다. 거부된 목적지는 anchor 없이 label만 표시한다.
- 읽기: 한글 label, 괄호가 있는 URL, escape, 강조/코드 label을 지원한다. raw HTML·이미지·미지원 inline 문법은 text로 두며 fenced code와 code span 안의 링크는 변환하지 않는다. 참조식 링크, HTML entity 해석과 전체 CommonMark 지원은 이번 완료 범위가 아니다.
- 접근성: 공개 HTTPS 링크는 외부 아이콘·새 창 안내·`noopener noreferrer`와 Blurple focus outline을 사용한다. 내부 경로/fragment는 같은 창에서 이동하고 긴 label은 본문 안에서 줄바꿈한다.
- 검증: `node --no-warnings --test --experimental-strip-types lib/blog-public.test.ts lib/public-source-url.test.ts` 17/17, `npm run test` 164 pass/12 DB environment skip, `npm run lint`, `npm run typecheck`, `npm run build`, phase JSON/참조 파일 검사와 `git diff --check` 통과.
- 개발 서버: 격리 PostgreSQL의 합성 public/private 글로 1440/390/320px을 검증했다. 링크 6개, 중첩 강조/코드, Tab focus/Enter 새 창, opener 차단, 내부 경로/fragment 이동, 긴 글/긴 링크 줄바꿈, 빈 태그 결과, private/missing 상세 404와 private Markdown 404, 원문 동일성, HTML 미실행을 확인했다. 외부 이동은 브라우저에서 intercept해 실제 사이트 요청 없이 검사했다.
- 검증용 개발 서버와 임시 메모리 DB를 종료했다. Schema/repository/worker/migration 변경이 없어 별도 DB integration suite는 실행하지 않았다.
- 남은 일: Step 2 `semantic-lists-and-quotes`. 레이더 전체 영역·Discord 스타일·OCI 보류를 유지한다. 설치 시 `npm audit`에서 기존 의존성 7건(moderate 1/high 5/critical 1)이 보고됐고 새 Marked는 포함되지 않았다. 기존 Next.js 16.2.11/하위 의존성 보안 패치는 배포 재개 전 별도 범위로 검증해야 한다.
