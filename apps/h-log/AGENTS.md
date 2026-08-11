# H-Log Site Instructions

이 앱은 손홍백 개인 사이트입니다. Resume, Portfolio, Blog를 포함하는 개인 브랜딩 사이트로 개발합니다.

## Source of Truth

- 현재 phase 상태와 다음 작업은 `phases/index.json`과 해당 phase의 `index.json`을 순서대로 확인해 판단한다.
- 구현 현황과 운영 준비 상태를 이 문서에 복제하지 않는다. live phase 레지스트리와 현재 코드가 우선한다.
- Harness 작업은 `.codex/docs/harness/WORKFLOW.md`와 루트 `.codex/skills/harness/SKILL.md`를 따른다.
- Production code 변경은 루트 `.codex/skills/tdd/SKILL.md`에 따라 focused failing test를 먼저 확인한다.

## Stack Definition

- Language: TypeScript
- Frontend: React + Next.js App Router
- Styling: Tailwind CSS
- Blog content: PostgreSQL `posts`/`post_versions` 기반 Markdown/HTML. 기존 MD/MDX loader는 import/transition 용도로만 유지한다.
- Backend: Next.js route handlers와 필요한 worker/job entrypoint를 우선한다.
- Database: PostgreSQL + pgvector
- Deployment: OCI Compute의 Docker Compose와 Nginx. 별도 phase 또는 ADR 없이 새 런타임 계층을 추가하지 않는다.

## Product Direction

- UI copy language: Korean
- `Projects` 화면 표기와 canonical route는 `Portfolio`, `/portfolio`를 사용한다. `/projects`는 308 영구 redirect 호환 경로로만 유지한다.
- 핵심 메시지: `백엔드 개발자 손홍백입니다`
- 보조 메시지: `Java/Spring 기반 백엔드를 개발합니다. 반복되는 작업은 줄이고, 운영하기 쉬운 구조를 고민합니다.`
- 디자인 방향: Clean Dark Engineer Portfolio + Subtle AI Workflow Console
- MVP pages: `/`, `/resume`, `/portfolio`, `/portfolio/[slug]`, `/blog`, `/blog/[slug]`
- 제외: 방문자 RAG 챗봇, SSE 대화 UI, 방문자 세션 메모리, 댓글, 공개 조회수
- 관리자 기능은 preview/save/publish 중심의 최소 운영 화면만 허용한다.

## Lazy-Load Documents

작업에 필요한 문서만 읽는다.

- `.codex/docs/implementation-roadmap.md`: 작은 단위 구현 순서
- `.codex/docs/deployment-ci-cd.md`: OCI, Docker, Nginx, CI/CD 작업
- `.codex/docs/harness/PRD.md`: 제품 범위와 자동 블로그 전환 기준
- `.codex/docs/harness/ADR.md`: 기술 결정과 트레이드오프
- `.codex/docs/harness/ARCHITECTURE.md`: 현재 앱 구조와 자동 블로그 전환 구조
- `.codex/docs/harness/WORKFLOW.md`: Harness 실행 규칙
- `.codex/docs/harness/AGENT_LOOP.md`: 한 step 단위 반복 개발 루프
- `.codex/docs/harness/IMPLEMENTATION_PLAN.md`: phase 후보와 전환 단계
- `.codex/rules/frontend.md`: UI, 컴포넌트, 스타일 규칙
- `.codex/rules/content-seo-privacy.md`: 콘텐츠, SEO, 개인정보 공개 기준
- `../../plans/personal-portfolio-site-development-plan.md`: 기준 개발 계획
- `../../plans/personal-portfolio-design-direction.md`: 디자인 기준
- `../../plans/portfolio-content-adaptation-plan.md`: 콘텐츠 기준

## Development Process

1. `phases/index.json`과 현재 phase 문서에서 한 step의 범위와 성공 기준을 확인한다.
2. Production behavior 변경은 focused failing test를 먼저 재현하고 최소 코드로 통과시킨다.
3. 변경에 가까운 검증을 실행한 뒤 아래 필수 gate를 통과시킨다.
4. 기능 phase가 바뀐 경우에만 phase 상태와 관련 Harness 문서를 함께 갱신한다.

한 작업 단위에서 페이지 여러 개와 배포 설정을 동시에 바꾸지 않는다.

## Validation

Production code 변경의 기본 gate는 다음과 같다.

```bash
npm run test
npm run lint
npm run typecheck
npm run build
git diff --check
```

- 문서나 JSON만 변경하면 관련 파서 또는 형식 검사와 `git diff --check`만 실행한다.
- DB, repository, worker, migration을 변경하면 `package.json`의 관련 integration test를 추가로 실행한다.
- UI를 변경하면 `npm run dev`로 데스크톱과 모바일 뷰포트를 확인한다.

## Guardrails

- 루트 `plans` 문서를 기준으로 하되, 상세 내용은 앱 내부 문서로 필요한 만큼만 읽는다.
- Home H1 기본형은 `백엔드 개발자 손홍백입니다`로 둔다.
- 승인되지 않은 고객사·회사명과 내부 흐름은 일반화하고, 근거가 확인되지 않은 상세 성과 수치는 공개하지 않는다.
- 프로필 사진과 GitHub는 공개한다. 이메일과 Contact form은 공개하지 않으며, 안전하게 일반화된 교체본이 준비될 때까지 PDF 다운로드도 공개하지 않는다. PDF를 다시 공개할 때는 전 페이지를 검수하고 UI·파일명을 `이력서`로 통일한다.
- 도메인 공개 초기 theme은 dark-only로 유지한다. Light theme은 별도 token refactor 없이는 다시 추가하지 않는다.
- 전화번호, 생년월일, 내부 URL, 서버 IP, API key, 비공개 저장소명은 노출하지 않는다.
- OCI, DNS, TLS, production 환경값, live migration, canary, timer, 실제 외부 API 호출과 자동 발행 활성화는 사용자 명시 승인 없이 수행하지 않는다.
