# H-Log Site Instructions

이 앱은 손홍백 개인 사이트입니다. 포트폴리오만이 아니라 Resume, Portfolio, Blog, Contact를 포함하는 개인 브랜딩 사이트로 개발합니다.

## Stack Definition

- Language: TypeScript
- Frontend: React + Next.js App Router
- Styling: Tailwind CSS
- Content: MDX file-based content
- MVP backend: none
- MVP database: none
- Deploy target: OCI server with Docker Compose and Nginx

## Product Direction

- UI copy language: Korean
- `Projects` 화면 표기는 `Portfolio`로 사용한다. 라우트는 `/projects`를 유지한다.
- 핵심 메시지: `백엔드 개발자 손홍백입니다`
- 보조 메시지: `Java/Spring 기반 백엔드를 개발합니다. 반복되는 작업은 줄이고, 운영하기 쉬운 구조를 고민합니다.`
- 디자인 방향: Clean Dark Engineer Portfolio + Subtle AI Workflow Console
- MVP pages: `/`, `/resume`, `/projects`, `/projects/[slug]`, `/blog`, `/blog/[slug]`, `/contact`
- MVP 제외: DB CMS, 관리자, 로그인, 댓글, 조회수, RAG 챗봇

## Lazy-Load Documents

필요한 경우에만 아래 문서를 읽는다.

- `.codex/docs/implementation-roadmap.md`: 작은 단위 구현 순서
- `.codex/docs/deployment-ci-cd.md`: OCI, Docker, Nginx, CI/CD 작업
- `.codex/rules/frontend.md`: UI, 컴포넌트, 스타일 작성 규칙
- `.codex/rules/content-seo-privacy.md`: 콘텐츠, SEO, 개인정보 공개 기준
- `../../plans/personal-portfolio-site-development-plan.md`: 기준 개발 계획
- `../../plans/personal-portfolio-design-direction.md`: 디자인 기준
- `../../plans/portfolio-content-adaptation-plan.md`: 콘텐츠 기준

## Development Process

큰 작업을 한 번에 처리하지 않는다. 항상 아래 순서로 쪼갠다.

1. Project setup
2. Design tokens and base UI
3. Content pipeline
4. Projects list and detail
5. Home page
6. Resume page
7. Blog list and detail
8. Contact page
9. SEO and quality
10. Docker and deployment
11. CI/CD

한 단위가 끝날 때마다 가능한 검증을 수행하고, 다음 단위로 넘어간다.

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
- Contact Form 실제 발송, DB, 챗봇은 MVP 이후로 미룬다.
- 한 작업 단위에서 페이지 여러 개와 배포 설정을 동시에 바꾸지 않는다.
