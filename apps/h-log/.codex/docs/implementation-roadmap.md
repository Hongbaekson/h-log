# Implementation Roadmap

이 문서는 `apps/hongbaek-site`를 작은 단위로 구현하기 위한 실행 순서다.

## Unit 0: Decisions

목표:

- 앱 이름은 `hongbaek-site`로 고정한다.
- MVP는 DB 없이 Next.js 정적/하이브리드 사이트로 시작한다.
- Contact Form은 우선 UI 또는 mailto로 둔다.

확인 필요:

- 고객사명 공개 여부
- 성과 수치 공개 여부
- 이메일 공개 방식
- 이력서 PDF 공개 여부
- 프로필 사진 사용 여부

## Unit 1: Project Setup

작업:

- Next.js App Router 프로젝트 생성
- TypeScript, Tailwind CSS 구성
- ESLint 구성
- 기본 layout, global styles, site config 생성
- Header/Footer 최소 구현

검증:

- `npm run lint`
- `npm run build`
- `npm run dev`

## Unit 2: Design Foundation

작업:

- CSS variables 또는 Tailwind theme token 정의
- 기본 typography, background, link, focus 스타일 정의
- `Container`, `Button`, `Card`, `Badge`, `Metric`, `SectionHeader`, `PageHero` 구현

검증:

- 임시 페이지에서 컴포넌트 렌더링
- 모바일 폭에서 텍스트 overflow 없음

## Unit 3: Content Pipeline

작업:

- `content/projects`와 `content/posts` 생성
- MDX 또는 Markdown frontmatter 스키마 결정
- 프로젝트 로더와 글 로더 구현
- 샘플 프로젝트 3개, 샘플 글 1개 추가

검증:

- 목록 데이터 정렬 확인
- 잘못된 slug나 frontmatter가 빌드에서 드러나는지 확인

## Unit 4: Projects

작업:

- `/projects` 목록 구현
- Featured project 카드 구현
- 카테고리 필터 구현
- `/projects/[slug]` 상세 구현

검증:

- 목록, 필터, 상세 이동 확인
- 모바일에서 카드 간격과 제목 줄바꿈 확인

## Unit 5: Home

작업:

- Hero
- Automation Status Card
- Featured Projects
- Core Strengths
- Recent Posts
- Contact CTA

검증:

- CTA 링크 확인
- 프로젝트/글 데이터 연동 확인
- 첫 화면에서 핵심 메시지가 바로 보이는지 확인

## Unit 6: Resume

작업:

- Summary
- Core Strengths
- Skills Matrix
- Experience
- Education
- PDF link placeholder

검증:

- 민감정보 노출 없음
- 공개 전 확인 필요한 정보가 별도 표시되었는지 확인

## Unit 7: Blog

작업:

- `/blog` 목록 구현
- 태그 필터와 검색 구현
- `/blog/[slug]` 상세 구현
- 코드블록 스타일링

검증:

- 검색/필터 동작
- MDX 본문 가독성 확인

## Unit 8: Contact

작업:

- Email, GitHub, Blog 카드
- 이메일 복사 버튼
- Contact Form UI
- mailto fallback

검증:

- 링크 이동 확인
- 복사 버튼 확인
- 실제 발송 기능은 추가하지 않음

## Unit 9: SEO and Quality

작업:

- 페이지별 metadata
- canonical URL
- JSON-LD
- sitemap
- robots
- OG metadata
- 404 page

검증:

- `npm run build`
- Lighthouse SEO 90+ 목표

## Unit 10: Docker Deployment

작업:

- Next.js standalone output
- Dockerfile
- docker-compose.yml
- Nginx reverse proxy config
- OCI 수동 배포 확인

검증:

- 컨테이너 기동
- 도메인 또는 서버 IP 접속
- 새로고침 라우팅

## Unit 11: CI/CD

작업:

- GitHub Actions 또는 Gitea Actions 선택
- lint/build 검증
- Docker image build
- registry push
- OCI SSH deploy
- health check

검증:

- main push 후 자동 배포
- 실패 시 이전 컨테이너 유지 또는 명확한 실패 로그 확인
