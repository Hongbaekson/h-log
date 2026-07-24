# H-Log Site Instructions

이 앱은 손홍백 개인 사이트입니다. 포트폴리오만이 아니라 Resume, Portfolio, Blog를 포함하는 개인 브랜딩 사이트로 개발합니다.

## Stack Definition

- Language: TypeScript
- Frontend: React + Next.js App Router
- Styling: Tailwind CSS
- Blog content direction: DB-backed `posts`/`post_versions` with generated Markdown/HTML
- Compatibility content: existing MD/MDX loader is import/transition support only
- Backend: Next.js route handlers first; automation contracts, a manual `--once` persistent worker, the local fake-provider end-to-end dry-run, a local-smoked Hermes Codex OAuth article adapter, a PostgreSQL private-persistence one-shot runner, and a bounded 09:00 KST Compose/systemd scheduler package exist, while the production timer remains disabled
- Database: PostgreSQL + pgvector schema migration, the minimal blog repository, the DB-backed public read path, the persistent worker, and the local end-to-end dry-run are implemented; `auto-publish-ops-hardening` is active with Steps 0-3 completed, Step 4 packaging deployed to the canonical OCI path, container-local Hermes OAuth verified, and a pre-migration logical backup plus isolated restore/migration rehearsal complete, while server-local credential rotation, production input, live migration, canary, timer activation, and live rollback remain pending
- Deploy target: OCI server with Docker Compose and Nginx
- Infrastructure: OCI Compute first; web, worker, PostgreSQL, Redis, and Nginx are Compose-managed unless a later ADR selects managed services

## Product Direction

- UI copy language: Korean
- `Projects` 화면 표기는 `Portfolio`로 사용한다. 라우트는 `/projects`를 유지한다.
- 핵심 메시지: `백엔드 개발자 손홍백입니다`
- 보조 메시지: `Java/Spring 기반 백엔드를 개발합니다. 반복되는 작업은 줄이고, 운영하기 쉬운 구조를 고민합니다.`
- 디자인 방향: Clean Dark Engineer Portfolio + Subtle AI Workflow Console
- MVP pages: `/`, `/resume`, `/projects`, `/projects/[slug]`, `/blog`, `/blog/[slug]`
- 제외: 방문자 RAG 챗봇, SSE 대화 UI, 방문자 세션 메모리, 댓글, 공개 조회수
- 관리자 기능은 DB phase에서 preview/save/publish 중심의 최소 운영 화면만 허용한다.

## Lazy-Load Documents

필요한 경우에만 아래 문서를 읽는다.

- `.codex/docs/implementation-roadmap.md`: 작은 단위 구현 순서
- `.codex/docs/deployment-ci-cd.md`: OCI, Docker, Nginx, CI/CD 작업
- `.codex/docs/harness/PRD.md`: h-log 제품 범위와 자동 블로그 전환 기준
- `.codex/docs/harness/ADR.md`: 기술 결정과 트레이드오프
- `.codex/docs/harness/ARCHITECTURE.md`: 현재 앱 구조와 자동 블로그 전환 구조
- `.codex/docs/harness/WORKFLOW.md`: Harness 기반 실행 규칙
- `.codex/docs/harness/AGENT_LOOP.md`: 한 step 단위 반복 개발 루프
- `.codex/docs/harness/IMPLEMENTATION_PLAN.md`: phase 후보와 전환 단계
- `.codex/rules/frontend.md`: UI, 컴포넌트, 스타일 작성 규칙
- `.codex/rules/content-seo-privacy.md`: 콘텐츠, SEO, 개인정보 공개 기준
- `../../plans/personal-portfolio-site-development-plan.md`: 기준 개발 계획
- `../../plans/personal-portfolio-design-direction.md`: 디자인 기준
- `../../plans/portfolio-content-adaptation-plan.md`: 콘텐츠 기준

## Development Process

큰 작업을 한 번에 처리하지 않는다. 항상 아래 순서로 쪼갠다.

1. Project setup
2. Design tokens and base UI
3. DB content model and publishing boundary
4. Projects list and detail
5. Home page
6. Resume page
7. DB-backed Blog list and detail
8. SEO and quality
9. OCI Docker Compose/Nginx deployment foundation
10. CI/CD

한 단위가 끝날 때마다 가능한 검증을 수행하고, 다음 단위로 넘어간다.

Harness 작업은 `.codex/docs/harness/WORKFLOW.md`와 루트 `.codex/skills/harness/SKILL.md`를 따른다. Production code 변경은 루트 `.codex/skills/tdd/SKILL.md` 기준으로 failing test를 먼저 확인한다.

## Expected Structure

```text
apps/h-log/
  app/
  components/
  content/
  lib/
  public/
  styles/
  .codex/
    docs/
    rules/
```

## Validation

앱 생성 후 기본 검증 명령은 다음과 같다.

```bash
npm run lint
npm run build
```

UI 작업을 한 경우 개발 서버를 띄워 데스크톱과 모바일 뷰포트를 확인한다.

```bash
npm run dev
```

## Guardrails

- 루트 `plans` 문서를 기준으로 하되, 상세 내용은 앱 내부 문서로 필요한 만큼만 읽는다.
- Home H1은 담백하게 쓴다. 기본형은 `백엔드 개발자 손홍백입니다`로 둔다.
- 공개 전 고객사명, 성과 수치, 이메일, PDF, 프로필 사진 공개 여부를 확인한다.
- 전화번호, 생년월일, 내부 URL, 서버 IP, API key, 비공개 저장소명은 노출하지 않는다.
- full CMS와 방문자 챗봇을 만들지 않는다. 다음 blog phase는 자동 발행 운영 안정화에 한정한다.
- 한 작업 단위에서 페이지 여러 개와 배포 설정을 동시에 바꾸지 않는다.
