# 챗봇 없는 완전 자동 블로그 발행 계획

작성일: 2026-06-25

이 문서는 기존 `personal-portfolio-site-plan.md`의 `MDX file-based content`, `DB 없음`, `챗봇 MVP 제외` 방향과 별개로, 블로그를 처음부터 DB/CMS/API/worker 기반 완전 자동 발행 시스템으로 확장할 때의 기준안이다.

전제:

- 방문자 챗봇은 만들지 않는다.
- 글 작성부터 발행까지는 완전 자동화한다.
- 사람이 승인하는 수동 단계 대신, 자동 검증 게이트를 통과하지 못하면 발행하지 않고 실패 상태로 남긴다.
- `zerry.co.kr`의 구조와 글쓰기 패턴은 참고하되, 카피/문체/디자인을 복제하지 않는다.
- 운영 인프라와 클라우드는 OCI를 기본값으로 둔다.

아키텍처:

![챗봇 없는 자동 블로그 발행 아키텍처](./automated-blog-publishing-architecture.svg)

## OCI 인프라/클라우드 기준

운영 클라우드는 OCI를 기본값으로 둔다. Vercel, Neon, Supabase 같은 managed runtime이나 managed DB는 기본안이 아니라 운영 단순화가 필요할 때 별도 ADR로 결정할 대안이다.

초기 production topology:

```text
Internet
  -> OCI network / security list
  -> Nginx 80/443
  -> h-log web container
  -> PostgreSQL + pgvector
  -> Redis

blog worker container
  -> PostgreSQL + pgvector
  -> Redis
  -> external APIs: LLM, embedding, IndexNow, Discord
```

초기 운영 기준:

```text
- OCI Compute 1대를 우선한다.
- Docker Compose로 web, worker, PostgreSQL + pgvector, Redis, Nginx를 관리한다.
- Nginx는 TLS 종료와 reverse proxy를 담당한다.
- PostgreSQL/Redis는 public internet에 열지 않는다.
- 외부 공개 포트는 80/443만 기본 허용하고, SSH는 제한된 접근으로 둔다.
- app image는 immutable artifact로 배포하고, DB/Redis data는 volume으로 분리한다.
- `.env.production`, DB password, API key, SSH key, 서버 IP는 저장소에 커밋하지 않는다.
- DB 백업은 PostgreSQL logical dump부터 시작하고, local/test restore rehearsal을 통과한 뒤에만 운영 복구 절차로 인정한다.
- 배포 smoke/rollback은 별도 runbook으로 두고, public route, Markdown endpoint, Nginx admin/internal 차단, container health, migration/content_hash gate를 확인한다.
- 이후 OCI Object Storage 보관은 선택 단계로 검토하되 credential, bucket URL, server IP는 저장소에 남기지 않는다.
- 운영 배포 전에는 Docker Compose config, Nginx config, DB backup/restore, deploy smoke, rollback 경로를 검증한다.
```

이 기준 때문에 DB phase는 "어떤 DB를 쓸지"를 다시 고르는 단계가 아니라, OCI에서 운영 가능한 PostgreSQL + pgvector 모델과 migration/query 전략을 고정하는 단계다.

## 핵심 원칙

이 시스템은 AI/IT 뉴스를 자동 요약하는 블로그가 아니다.

매일 수집한 기술 이슈를 홍백님의 실제 기술 맥락:

```text
OCI
Docker Compose
Nginx
PostgreSQL
Redis
Spring / Java
AI workflow
개인 포트폴리오 운영
자동화 파이프라인
```

에 대입해 “운영 판단 기록”으로 변환하는 시스템이다.

따라서 발행 기준은 “새로운 소식인가”가 아니라 다음 질문을 통과하는지다.

```text
1. 내 환경에서 검증하거나 판단할 가치가 있는가?
2. 운영/비용/보안/배포/자동화 관점의 함정이 있는가?
3. 출처와 증거를 남길 수 있는가?
4. 단순 요약이 아니라 내 기준의 선택/보류/우회로 끝낼 수 있는가?
```

## 개발 가능 여부와 전환 기준

이 계획은 기술적으로 개발 가능하다. 다만 현재 h-log의 기존 MVP 방향은 `MDX file-based content`, `DB 없음`, `DB CMS 제외`이므로, 이 계획은 작은 블로그 기능 추가가 아니라 블로그 플랫폼 전환에 가깝다.

따라서 구현 여부는 아래 두 선택지 중 하나로 명확히 결정해야 한다.

```text
선택지 A: 기존 MVP 유지
- MDX 기반 블로그를 먼저 공개한다.
- 자동 수집/작성/DB/검색/임베딩은 이후 확장으로 둔다.
- 장점: 빠르게 공개 가능
- 단점: 완전 자동 발행과는 구조가 다르므로 나중에 마이그레이션 필요

선택지 B: 자동 블로그 플랫폼으로 전환
- 처음부터 PostgreSQL, worker, 발행 job, 검색 인덱스를 둔다.
- 글은 DB에서 읽고, HTML/Markdown/검색 데이터는 생성물로 관리한다.
- 장점: 자동 발행 목표에 바로 맞다.
- 단점: MVP 구현량과 운영 책임이 커진다.
```

현재 목표가 “완전 자동화된 기술 블로그”라면 선택지 B가 맞다. 단, 첫 배포 단위는 자동 글 작성이 아니라 DB 기반 글 저장/렌더링이어야 한다.

권장 전환 순서:

```text
1. DB 기반 수동 발행 블로그
2. OCI 인프라/배포 foundation
3. 발행 후 자동화
4. 주제 수집과 조사 자동화
5. 글 생성 자동화
6. 자동 발행
7. 자동 실험과 다이어그램 생성
```

## 목표 파이프라인

```text
1. 매일 주제 수집
2. 관련 자료 검색/요약
3. persona.md로 문체 고정
4. LLM이 글 작성
5. CMS/DB/API에 글 저장 및 자동 발행
6. 발행 후 임베딩, 검색, IndexNow, Discord 알림 자동 실행
```

챗봇을 제외해도 남겨야 할 핵심 자동화:

- 글 저장 후 본문 청킹
- OpenAI/Gemini 등 임베딩 생성
- PostgreSQL + pgvector 기반 검색/관련 글 추천
- `/blog/:slug.md` 마크다운 엔드포인트
- `llms.txt`, `llms-full.txt`, `sitemap.xml`, `feed.xml` 자동 갱신
- IndexNow 제출
- Discord 발행/실패 알림
- 필요 시 handdrawn diagram SVG 생성 후 글에 첨부

상세 글 UX에 포함할 기능:

```text
- 코드블록별 코드 복사 버튼
- H2 anchor 및 목차 링크
- 태그별 이동 링크
- 공유 버튼
- 이전글/다음글
- 관련 글 섹션
- 관련 글 유사도 퍼센트 표시
- 댓글 또는 반응 영역은 선택 기능
```

관련 글은 단순 태그 기반보다 embedding similarity 기반을 우선한다.

```text
글 발행
-> post_chunks 생성
-> embedding 생성
-> post-to-post similarity 계산
-> 상세 페이지 하단에 관련 글 표시
```

## 주제 수집 소스

매일 수집기는 "많이 긁고, 적게 고르는" 방식으로 둔다. 단순 뉴스 요약이 아니라, 홍백님 블로그에 맞는 백엔드/운영/자동화 관점의 글감으로 재해석 가능한 후보만 남긴다.

우선 수집 소스:

```text
국내 큐레이션
- GeekNews: 국내 개발자 반응과 해외 기술 소식 큐레이션 확인
- 요즘IT
- 국내 기업 기술 블로그: 토스, 당근, 네이버, 카카오, 라인 등

공식 소스
- OpenAI / Anthropic / Google AI changelog
- Next.js / React / Vercel release notes
- Cloudflare blog / changelog
- PostgreSQL / Redis / Docker / Kubernetes release notes
- Spring / Java JEP / Gradle / Maven release notes

개발자 커뮤니티
- Hacker News
- GitHub Trending
- GitHub Releases
- Reddit programming/webdev/java 계열
- InfoQ, Martin Fowler, Thoughtworks Radar

보안/운영
- GitHub Security Advisory
- CVE feeds
- Cloudflare Radar
- 주요 클라우드 provider architecture/status blog
```

GeekNews 처리 기준:

```text
GeekNews는 "원출처"가 아니라 "후보 발견과 국내 관심도 신호"로 취급한다.
글 작성 시에는 GeekNews 글만 근거로 쓰지 않고, 원문 링크와 공식 문서를 추가로 확인한다.
GeekNews 댓글/반응은 국내 개발자 관점의 문제의식 파악에만 사용한다.
```

후보 점수화:

```text
score =
  홍백님 전문성과 관련 있음 +30
  공식 문서/릴리즈/원문 확인 가능 +25
  GeekNews 등 국내 큐레이션에서 관심 신호 있음 +15
  직접 실습/재현 가능 +20
  운영 관점 교훈 있음 +20
  백엔드 자동화 글감으로 재해석 가능 +20
  이미 흔한 요약글 주제 -20
  원출처가 약하거나 2차 요약만 있음 -30
  회사/고객사 내부정보 노출 위험 있음 -50
```

## 내 기술 맥락에 접목하는 단계

이 블로그의 주체는 자동화 시스템이 아니라 홍백님이다. 따라서 주제 수집기는 IT 뉴스를 그대로 요약하지 않고, 먼저 "내 기술스택과 운영 환경에 어떻게 걸리는가"를 판단한다.

핵심 원칙:

```text
뉴스 요약 블로그가 아니다.
홍백님의 백엔드/인프라/자동화 환경에 대입한 적용 기록이다.
```

자동화는 글 작성 전에 `apply-to-me` 단계를 반드시 수행한다.

```text
IT 이슈 발견
-> 홍백님 기술스택과 관련성 분석
-> 기술 카테고리와 실제 경험/운영 맥락 중 어디에 걸리는지 복수 매핑
-> 가능한 경우 작은 실험, 설정 검토, 비용 계산, API 호출, 로컬 재현 수행
-> 증거를 저장
-> 글 모드 결정
```

매핑 범위는 특정 서비스나 기술 몇 개로 제한하지 않는다.

```text
Portfolio / Site
- h-log
- 개인 포트폴리오
- 자동 블로그 발행 시스템
- CMS, SEO, sitemap, RSS, llms.txt, IndexNow

Language / Runtime
- Java
- SQL
- JavaScript / TypeScript
- JVM, GC, class loading
- Node.js runtime

Backend Framework
- Spring Boot
- Spring Framework
- JPA / Hibernate
- QueryDSL
- MyBatis
- Spring Batch
- OpenAPI Spec-First
- REST API 설계

Transaction / Concurrency
- 트랜잭션 경계
- TransactionalEventListener
- REQUIRES_NEW
- Pessimistic Lock
- READ_COMMITTED
- race condition
- idempotency

Database / Search
- PostgreSQL
- Oracle
- MySQL
- MS-SQL
- DB2
- pgvector
- indexing
- query tuning
- migration
- backup / restore

Cache / Queue / Messaging
- Redis
- Redisson
- RBlockingQueue
- DLQ
- Kafka
- cache-aside
- distributed lock
- ShedLock

Observability / Reliability
- OpenTelemetry
- Micrometer Tracing
- Spring Boot Actuator
- logging
- metrics
- tracing
- alerting
- failure recovery

Infrastructure / DevOps
- OCI
- Docker
- Docker Compose
- Nginx
- Cloudflare
- Linux
- Kubernetes
- Jenkins
- Gitea / GitHub Actions
- CI/CD
- blue-green deployment

Security / Privacy
- authentication / authorization
- JWT
- Cloudflare Access
- secret handling
- rate limit
- bot filtering
- robots.txt
- public content redaction

AI / Developer Workflow
- Codex
- Claude Code
- MCP
- Skill
- persona.md
- AI-assisted development workflow
- prompt / context management
- automated review

Legacy / Migration / Enterprise
- legacy modernization
- PHP -> Spring Boot
- DB2 -> MS-SQL
- JSP / Nexacro
- data migration
- batch migration

Business Domain Patterns
- 결제
- 주문
- CRM
- POS/KIOSK
- 백오피스
- 알림 자동화
- 정산/리포트성 데이터 처리
```

글 모드:

```text
실험형
- 실제 명령, 코드, 설정, API 호출, 로컬 재현을 수행했다.
- "해봤다", "붙여봤다", "측정했다", "돌려봤다"를 사용할 수 있다.

대입형
- 실제 배포나 코드 변경은 하지 않았지만, 내 구조에 적용하면 어디가 걸리는지 분석했다.
- "내 구조에 대입해봤다", "적용하면 어디가 걸리는지 봤다"를 사용한다.

문서분석형
- 공식 문서/릴리즈/원문을 읽고 영향만 분석했다.
- "문서를 뜯어봤다", "아직 직접 적용하진 않았다", "공개 자료 기준으로는"을 사용한다.

프로젝트 기록형
- 개인 포트폴리오, h-log, 자동화 워커, 배포 구조 등 실제 구현 과정을 기록한다.
- 구현 전 상태, 선택지, 실제 변경, 검증 결과를 순서대로 쓴다.

운영 사건형
- 로그, 비용, 트래픽, 장애 징후, 백업/복구, 배포 실패처럼 운영 중 발견한 이상 신호를 다룬다.
- 숫자, 로그, 명령, exit code, 응답 코드 중 최소 하나가 있어야 한다.
```

자동화는 글 모드와 근거 수준을 맞춰야 한다. 예를 들어 실험 로그가 없으면 실험형으로 발행하지 않고, 대입형 또는 문서분석형으로 낮춘다.

우선순위:

```text
1. 운영 사건형
2. 실험형
3. 대입형
4. 문서분석형
5. 프로젝트 기록형
6. 알고리즘/튜토리얼형은 자동 발행 핵심 모드에서 제외하거나 낮은 우선순위로 둔다.
```

최신 zerry식 글을 참고한 기본 형태:

```text
- H2 섹션 5~9개 권장
- 코드/로그/공식 인용/수치 중 최소 1개 필수
- 가능하면 구체 숫자 1개 이상 포함
- 마지막 섹션은 단순 “결론”보다 “남는 생각”, “운영 규칙”, “그래서 나는 이렇게 하기로 했다”에 가깝게 닫는다.
```

`apply-to-me` 질문:

```text
1. 이 이슈가 내 사이트, 서버, 블로그 자동화, 백엔드 업무 방식 중 어디에 연결되는가?
2. 지금 내 환경에서 작게 검증할 수 있는가?
3. 검증한다면 어떤 명령/코드/API/설정으로 증거를 남길 수 있는가?
4. 검증하지 못한다면 문서분석형으로 낮춰도 가치가 있는가?
5. 내 경험처럼 보이게 쓰는 것이 아니라, 실제로 확보한 근거 수준에 맞춰 쓸 수 있는가?
```

### 개인 맥락 원장

`apply-to-me`가 제대로 동작하려면 LLM이 매번 추측하지 않도록 홍백님의 공개 가능한 기술 맥락을 별도 데이터로 관리해야 한다.

`personal_context_ledger`에 담을 내용:

```text
- 공개 가능한 기술스택
- 공개 가능한 개인 프로젝트와 운영 환경
- 실제로 써본 기술과 아직 문서로만 본 기술
- 회사/고객사 정보처럼 공개하면 안 되는 범위
- "직접 해봤다"라고 써도 되는 근거가 있는 경험
- "내 구조에 대입해봤다"까지만 허용되는 분석 대상
- 선호하는 글 톤과 금지 표현
```

이 원장은 글 생성을 위한 프롬프트 재료이지만, 비공개 원본 문서나 민감 로그를 그대로 넣지 않는다. 공개 가능한 요약과 금지 규칙만 넣는다.

비즈니스 규칙:

```text
- 원장에 없는 경험은 "내가 해봤다"로 쓰지 않는다.
- 원장에 공개 불가로 표시된 기술/회사/프로젝트명은 본문에 쓰지 않는다.
- 새 글이 발행되면 사용된 개인 맥락 id를 generation run에 남긴다.
- 원장이 수정되면 persona처럼 version을 올린다.
```

## zerry 블로그 심층 분석

분석 기준:

- `https://zerry.co.kr/blog/db-restore-test-pgvector`
- `https://zerry.co.kr/blog/ai-crawler-markdown-llms-txt`
- `https://zerry.co.kr/portfolio/personal-blog`
- `https://zerry.co.kr/blog/blog-rag-ai-chatbot`
- `https://zerry.co.kr/blog/indexnow-integration`
- `https://zerry.co.kr/blog/nextjs-after-background-tasks`

2026-06-25 현재 라이브 HTML 기준 포트폴리오 페이지는 Next.js 16 App Router, PostgreSQL/pgvector, Redis, Tiptap, Cloudinary, Discord Bot, Cloudflare Access, Docker, OCI 자체 호스팅, IndexNow, 관리자 대시보드, draft/published 관리, 임베딩 상태 모니터링을 명시한다.

### 플랫폼 구조

zerry의 공개 설명과 글 내용을 종합하면 단순 MDX 블로그가 아니라 DB 중심 블로그 플랫폼이다.

```text
Browser/Admin SPA
  -> Cloudflare / Cloudflare Access
  -> Next.js App Router API
  -> PostgreSQL + pgvector / Redis
  -> LLM provider / Cloudinary / Discord / IndexNow
```

글 저장 방식은 파일이 아니라 CMS/DB에 가깝다. `ai-crawler-markdown-llms-txt` 글은 `posts.content`에 마크다운이 아니라 HTML이 저장되고, `.md` 엔드포인트에서 HTML을 마크다운으로 역변환한다고 설명한다. 즉 작성/편집의 원본은 HTML 또는 에디터 산출물이고, 마크다운은 배포/크롤러 친화 출력물이다.

우리에게 맞는 결론:

- 자동 작성 원본은 Markdown으로 만들어도 된다.
- DB 저장 전 `markdown -> sanitized HTML` 변환을 거친다.
- 크롤러용 `.md`는 DB의 canonical content에서 다시 생성한다.
- 공개 React 상세 페이지는 저장 HTML을 직접 주입하지 않고 canonical Markdown에서 허용된 렌더링 블록만 만든다.
- 원문, HTML, 마크다운 출력물이 서로 어긋나지 않도록 `content_version`을 둔다.

### zerry 참고 후 도입/제외 기준

현재 계획은 자동 발행 백엔드 구조는 충분히 강하다. zerry에서 추가로 가져올 것은 챗봇이 아니라 "DB 블로그 제품화, 관리자 운영 화면, 하이브리드 검색, 비용 방어, 공개 SEO/AI 크롤러 표면"이다.

이미 계획에 들어있는 방향:

```text
- DB 기반 글 저장
- /blog/:slug.md 마크다운 엔드포인트
- llms.txt, llms-full.txt, sitemap.xml, feed.xml
- PostgreSQL + pgvector 기반 검색/관련 글 추천
- IndexNow
- 발행 검증, 실패 상태, 롤백/정정
- 챗봇 제외
```

추가로 도입할 것:

```text
1. DB 기반 수동 발행 MVP
   - 자동 글 작성보다 먼저 /blog, /blog/[slug], /blog/[slug].md를 완성한다.
   - draft/published 상태와 status=published 최신 version만 공개하는 규칙을 먼저 고정한다.

2. 하이브리드 검색과 관련 글
   - 챗봇/RAG 대화 UI는 제외한다.
   - 키워드 검색 + 벡터 유사도 기반 검색과 관련 글 추천은 남긴다.
   - 검색 결과는 글 탐색 기능이지 방문자와 대화하는 기능이 아니다.

3. 최소 관리자 운영 화면
   - 글 상태, 발행 실패 사유, 임베딩 상태, IndexNow/llms/feed 반영 여부를 확인한다.
   - retry, unpublish, retract, correct 같은 운영 명령을 제공한다.
   - 모든 조작은 admin_actions에 감사 로그로 남긴다.

4. 검색 API 비용/봇 방어
   - /api/search는 임베딩 호출 비용이 붙을 수 있는 엔드포인트로 취급한다.
   - rate limit, 캐시, 짧거나 반복적인 검색어 차단, 비정상 패턴 탐지를 둔다.
   - 봇 방어는 검색 기능을 죽이지 않되 비용 폭주를 막는 선에서 설계한다.

5. 공개 블로그 제품 표면
   - /blog 목록에는 날짜, 제목, 요약, 태그, 태그별 카운트, 페이지네이션을 둔다.
   - 상세 페이지에는 관련 글, 태그, 코드블록, source 링크, OG 메타를 둔다.
   - "비슷한 글" 진입점은 챗봇 없이도 콘텐츠 탐색성을 높이는 핵심 UI다.

6. 배포 스택 유지
   - zerry가 Vercel/Neon을 쓰더라도 우리 기본 배포는 OCI Docker Compose 기준을 유지한다.
   - 외부 관리형 DB로 바꾸는 것은 운영 단순화가 필요할 때 별도 결정한다.
```

제외할 것:

```text
- 방문자 챗봇
- SSE 스트리밍 대화 UI
- 방문자 세션 기반 대화 메모리
- 챗봇용 RAG 답변 생성
- 방문자별 장기 메모리 또는 개인화 응답
```

경계:

```text
임베딩과 pgvector는 검색/관련 글/콘텐츠 운영 품질을 위해 쓴다.
챗봇을 만들지 않더라도 청킹, 임베딩, 검색 인덱스, 관련 글 추천은 유지한다.
```

### 글 구조 분석 1: DB 복구 테스트 글

측정값:

- 약 6,000자
- 섹션 heading 12개
- code block 7개
- bullet 7개
- 평균 문장 길이 약 39자
- 코드 언어: bash, text 중심

구조:

```text
제목: 평소 정상 신호 + 실제 복구 실패 + 숫자 + 피해 범위
요약: 어떤 절차가 실패했고, 무엇이 빠져 있었고, 한 줄 수정으로 해결됐는지
본문:
  1. 매일 백업은 있었다
  2. 문서상 복구 절차도 있었다
  3. 실제 실행 결과가 실패했다
  4. 에러 로그를 보고 원인을 좁혔다
  5. 최소 수정으로 복구했다
  6. 운영 규칙으로 결론을 냈다
```

문체 특징:

- 튜토리얼처럼 시작하지 않고 사건으로 시작한다.
- 추상적인 "백업이 중요하다"가 아니라 실제 로그, exit code, 에러 수, 컨테이너 이미지 차이를 먼저 보여준다.
- 해결책보다 "안 해봤으면 몰랐을 위험"을 더 크게 다룬다.
- 마지막은 감상문이 아니라 운영 규칙으로 닫는다.

자동 생성 규칙으로 바꾸면:

```text
운영/인프라 글은 반드시 실제 실패 신호를 포함한다.
제목에는 정상처럼 보였던 신호와 깨진 지점을 같이 넣는다.
본문에는 재현 명령, 실패 로그, 원인 후보, 최종 원인, 최소 수정, 새 운영 규칙을 넣는다.
```

### 글 구조 분석 2: AI 크롤러 마크다운 글

측정값:

- 약 4,100자
- 섹션 heading 8개
- code block 4개
- bullet 없음
- 평균 문장 길이 약 41자
- 코드 언어: TypeScript, HTML, Markdown

구조:

```text
제목: 막을 대상과 열어줄 대상을 대비
요약: 사람용 HTML과 AI용 Markdown을 분리
본문:
  1. 문제의 배경을 이전 글과 연결
  2. 같은 글을 HTML/Markdown 두 문으로 제공
  3. robots.txt와 llms.txt의 역할 분리
  4. Next.js 라우팅 함정 설명
  5. DB 저장 포맷과 Markdown 출력 포맷의 불일치 해결
  6. 비용이 나가는 검색 API와 봇 차단 정책의 충돌 설명
  7. 남는 판단을 정리
```

문체 특징:

- 기술 선택을 선악으로 단순화하지 않는다.
- "봇 차단"과 "AI 크롤러 허용"의 충돌처럼 운영 판단의 양면을 드러낸다.
- 구현 코드는 길게 늘어놓지 않고 핵심 파이프라인만 보여준다.
- 결론은 확신 과잉이 아니라 현재 판단과 비용 대비 효과로 끝낸다.

자동 생성 규칙으로 바꾸면:

```text
정책/SEO/AI 글은 반드시 상충하는 요구사항을 먼저 잡는다.
본문은 사람용 경로, 기계용 경로, 저장 포맷, 출력 포맷, 캐시, 봇 정책을 분리해서 설명한다.
결론은 "정답"이 아니라 현재 조건에서의 선택과 남은 불확실성으로 닫는다.
```

## zerry식 글쓰기 패턴

공통 패턴:

```text
1. 제목은 사건형이다.
2. 첫 문단은 추상 소개가 아니라 실제 상황이다.
3. 숫자, 로그, 명령, API 이름, 파일명 중 최소 2개 이상이 초반에 나온다.
4. 본문 heading은 "개념명"보다 "문장형 상황 설명"에 가깝다.
5. 코드블록은 장식이 아니라 증거다.
6. 해결책은 대단한 구조보다 작은 변경으로 제시된다.
7. 마지막은 교훈보다 운영 규칙에 가깝다.
```

피해야 할 것:

- "이번 글에서는 ..."으로 시작하는 튜토리얼 톤
- 근거 없는 성능 수치
- AI가 만든 듯한 과장 제목
- 일반론만 있고 실제 로그/명령/코드가 없는 글
- 회사/고객사 내부 정보가 드러나는 사례

### 핵심 변환: 요약이 아니라 사건화

자동 블로그에서 가장 흔한 실패는 IT 뉴스를 그대로 요약하는 것이다.

나쁜 흐름:

```text
오늘 OpenAI가 새 기능을 발표했다.
기능은 다음과 같다.
장점은 세 가지다.
결론적으로 유용하다.
```

zerry식 흐름:

```text
공식 문서엔 한 줄로 적혀 있었다.
그런데 그 한 줄이 내 서버/개발 방식/운영 비용에 걸렸다.
직접 계산하거나 재현해봤다.
결과는 생각보다 애매했다.
그래서 나는 이런 기준으로 쓰기로 했다.
```

주제 수집 에이전트는 후보를 바로 글로 쓰지 않는다. 먼저 아래 질문으로 사건형 앵글을 만든다.

```text
1. 이 소식이 내 백엔드/운영/자동화 환경에서 어디에 걸리는가?
2. 직접 재현하거나 계산할 수 있는가?
3. 정상처럼 보이지만 실제로는 위험한 신호가 있는가?
4. 공식 문서와 실제 운영 사이에 간극이 있는가?
5. "방법 소개"가 아니라 "판단 기록"으로 바꿀 수 있는가?
```

### 제목과 첫 문단 규칙

제목은 설명형보다 사건형을 우선한다.

```text
[정상처럼 보였던 것] — [처음 검증하니 드러난 구체적 실패]
[막아야 할 대상]은 막고, [살려야 할 대상]한텐 [우회로/정문]을 냈다
[숫자/로그]는 정상인데, [진짜 중요한 기능]은 비어 있었다
[기술명] 한 줄 때문에 [운영 결과]가 갈렸다
```

첫 문단은 개념 설명이 아니라 관찰 장면으로 시작한다.

```text
반복되는 정상 상태
-> 내가 믿고 있던 신호
-> 아직 실제 검증하지 않은 부분
-> 직접 해보니 드러난 문제
```

선호 표현:

```text
문서만 보면 쉬운데, 내 구조에 넣으면 이야기가 달라진다.
좋아 보였는데, 운영 기준으로 보면 애매했다.
일단 작은 범위에서만 검증했다.
지금 기준으로는 채택보다 보류에 가깝다.
이건 나중에 장애가 아니라 비용으로 먼저 터질 가능성이 있다.
기능보다 먼저 본 건 운영 부담이었다.
공식 문서 한 줄이 실제 배포에선 작업 여러 개로 늘어났다.
```

주의:

```text
zerry식 글의 “사건형 구조”는 참고하되, 특정 문장 습관을 그대로 복제하지 않는다.
홍백님 블로그의 문체는 백엔드/인프라/자동화 관점의 실무 판단 기록으로 잡는다.
```

금지 표현:

```text
오늘은 ~에 대해 알아보겠습니다.
혁신적입니다.
완벽한 해결책입니다.
생산성을 극대화합니다.
AI 시대에 필수입니다.
```

## persona.md 초안

```markdown
# persona.md

## Role

나는 Java/Spring 기반 백엔드 개발자다. 글은 실전 운영, 자동화, 장애 예방, 성능 개선, 개발 워크플로우 개선을 다룬다.

## Voice

- 한국어로 쓴다.
- 1인칭을 허용하되 과하게 드러내지 않는다.
- 튜토리얼보다 실전 회고형으로 쓴다.
- 문장은 짧게 쓴다.
- 문제를 숨기지 않는다.
- 해결책은 과장하지 않는다.
- "왜 이게 운영에서 위험한가"를 반드시 설명한다.

## Structure

1. 사건 또는 불편함으로 시작한다.
2. 기존 상태가 왜 안심을 줬는지 설명한다.
3. 실제로 깨진 지점을 로그/명령/코드로 보여준다.
4. 선택지를 비교한다.
5. 최소 수정과 검증 결과를 쓴다.
6. 다음부터 지킬 운영 규칙으로 닫는다.

## Ban

- 고객사명, 내부 URL, 서버 IP, 토큰, 비공개 저장소명 금지
- 확인하지 않은 숫자 금지
- "완벽", "혁신", "압도적" 같은 마케팅 표현 금지
- 이모지 금지
- 긴 면책성 문장 금지
- 독자를 가르치는 말투보다 내가 겪은 일을 정리하는 말투 우선

## Weak Evidence

- 근거가 약하면 단정하지 않는다.
- "공개 자료 기준으로는", "문서상으로는", "아직 직접 검증하진 않았다", "보장은 없다"를 사용한다.
- 직접 실험하지 않은 내용을 "해봤다", "돌려봤다", "측정했다"라고 쓰지 않는다.
```

## 자동 발행 품질 게이트

완전 자동화를 원하더라도 게이트는 필요하다. 다만 사람이 승인하지 않고 시스템이 결정한다.

발행 허용 조건:

- 외부 소식 기반 글은 출처가 3개 이상이고, 그중 하나는 공식 문서/릴리즈/원문이다.
- 본인 로컬/운영 로그 기반 글이면 증거 파일 또는 로그 스냅샷이 1개 이상 있다.
- 제목, description, tags, slug가 생성됐다.
- 제목은 단순 설명형보다 사건형/판단형을 우선한다.
- 금지 정보 스캐너를 통과했다.
- 외부 링크가 200/3xx 또는 허용된 4xx 예외 목록에 있다.
- 코드블록 언어가 명시됐다.
- 글 길이가 최소 기준을 넘는다.
- H2 섹션이 5~9개 범위에 가깝거나, 벗어날 경우 이유가 있다.
- 코드, 로그, 수치, 공식 인용 중 최소 1개 이상이 있다.
- 구체 숫자, 응답 코드, 명령어, 파일명, API명 중 최소 1개 이상이 초반부에 등장한다.
- 마지막 섹션은 단순 요약이 아니라 운영 판단, 남은 불확실성, 다음 행동 중 하나를 포함한다.
- `persona.md` 규칙 위반 점수가 기준 이하이다.
- 중복 주제 유사도가 기준 이하이다.
- "직접 해봤다", "돌려봤다", "측정했다" 같은 표현이 있으면 대응 로그/명령/결과가 있다.
- 글 모드가 `운영 사건형`이면 이상 신호와 원인 후보, 최종 판단이 있다.
- 글 모드가 `실험형`이면 적용/검증 로그가 있다.
- 글 모드가 `대입형`이면 내 시스템 구성요소와 연결된 분석 결과가 있다.
- 글 모드가 `문서분석형`이면 직접 적용하지 않았다는 표현을 본문에 명시한다.
- 코드, 로그, 수치, 공식 인용 중 하나도 없으면 발행하지 않는다.
- 제목이 설명형이면 사건형 제목으로 재작성한다.
- 빌드 또는 렌더링 검증이 통과했다.

실패 시:

```text
posts.status = gate_failed 또는 failed_generation
publish_jobs.status = failed
Discord로 실패 이유 전송
자동 재시도는 최대 1~2회
실패 글은 공개하지 않음
```

중요한 제한:

```text
- "발행 품질 게이트 통과"와 "공개 URL 노출"은 같은 단계가 아니다.
- 품질 게이트 통과 후에도 sitemap, markdown, 렌더링, 검색 검증 전에는 공개 상태로 바꾸지 않는다.
- 자동 발행은 하루 1개를 목표로 하되, 좋은 후보가 없으면 발행하지 않는 것이 정상 동작이다.
```

## 자동 실험 샌드박스 정책

완전 자동 발행에서 가장 위험한 부분은 “작은 실험”이 실제 운영 환경을 건드리는 것이다. 따라서 자동 실험은 반드시 샌드박스 범위 안에서만 실행한다.

허용:

```text
- 로컬 임시 디렉터리에서의 throwaway 실험
- disposable Docker container
- read-only HTTP GET
- 공식 문서/릴리즈 노트 fetch
- 공개 API의 낮은 빈도 조회
- 비용 계산
- 샘플 코드 컴파일
- 임시 SQLite/PostgreSQL 컨테이너
- mock 데이터 기반 성능/동작 비교
```

금지:

```text
- production DB 접근
- 운영 OCI 인스턴스 설정 변경
- 운영 Nginx 설정 변경
- 실제 배포 명령 실행
- 운영 Docker Compose 수정
- 유료 API 대량 호출
- 회사/고객사 코드 또는 비공개 저장소 사용
- 비공개 .env, 토큰, SSH 키 사용
- 고객사명/내부 URL/IP/계정명/토큰이 포함된 로그 사용
```

실험형 글의 조건:

```text
- evidence_path에 명령, 입력, 출력, exit code가 남아야 한다.
- 실험은 재실행 가능한 스크립트 또는 로그 형태로 보관한다.
- 실험이 실패해도 실패 로그 자체가 글감이 될 수 있지만, 실패 원인을 단정하지 않는다.
- 운영 환경에 적용하지 않았으면 “운영에 적용했다”고 쓰지 않는다.
```

## claim 단위 검증 정책

출처가 3개 있다는 것만으로는 충분하지 않다. 본문 안의 사실 주장(claim)마다 근거가 연결되어야 한다.

검증 대상 claim:

```text
- 버전 출시/변경
- 가격/과금/쿼터
- API deprecated 또는 breaking change
- 성능 수치
- 보안 취약점
- 장애/제한 사항
- 벤치마크 결과
- 특정 기술의 지원 여부
```

검증 흐름:

```text
본문 생성
-> 문장 단위 claim 추출
-> 사실 주장과 의견/판단 분리
-> 각 claim에 source_url 또는 evidence_path 연결
-> source 없는 강한 claim은 수정 또는 발행 차단
```

claim 예시:

```json
{
  "claim_text": "Next.js의 특정 기능은 현재 canary에서만 제공된다.",
  "claim_type": "version",
  "source_url": "https://nextjs.org/blog/...",
  "evidence_quote": "...",
  "confidence": 0.91,
  "verified": true
}
```

발행 차단 조건:

```text
- 날짜/버전/가격/API 동작 관련 claim에 출처가 없음
- claim의 출처가 2차 요약뿐이고 원문 확인이 없음
- claim과 source 내용이 모순됨
- 실험형 표현이 있지만 evidence_path가 없음
```

### 출처 저장 정책

외부 문서를 근거로 삼더라도 원문 전체를 무제한 저장하지 않는다. 저작권과 보관 리스크를 줄이기 위해 검증에 필요한 범위만 보관한다.

```text
- source URL, title, publisher, fetched_at, content_hash는 저장한다.
- 원문 전체 저장은 기본 금지한다.
- 필요한 경우 짧은 근거 excerpt, 요약, 구조화 claim만 저장한다.
- 공식 문서/릴리즈 노트는 source_role=official로 표시한다.
- GeekNews, HN, Reddit 등은 source_role=discovery 또는 reaction으로 표시한다.
- claim 검증은 discovery source만으로 통과시키지 않는다.
```

## 발행 후 검증과 롤백 정책

완전 자동 발행은 언젠가 틀릴 수 있다. 따라서 “틀리지 않게 만들기”뿐 아니라 “틀렸을 때 빠르게 내리기”가 필요하다.

공개 전 필수 검증:

```text
1. /blog/:slug 200 확인
2. /blog/:slug.md 200 확인
3. sitemap.xml에 URL 포함 확인
4. HTML/Markdown 렌더링 오류 없음
5. 공개 본문 민감정보 없음
6. post_versions의 최신 content_hash와 공개 본문 일치
```

발행 직후 검증:

```text
1. /blog/:slug 200 확인
2. /blog/:slug.md 200 확인
3. 상세 페이지 h1/date/tags/description 렌더링 확인
4. H2 anchor 링크 생성 확인
5. 코드블록이 있으면 코드 복사 버튼 렌더링 확인
6. 관련 글 섹션 생성 확인
7. 관련 글 유사도 퍼센트 또는 유사도 근거 표시 확인
8. 이전글/다음글 링크 확인
9. sitemap.xml에 URL 포함 확인
10. feed.xml에 URL 포함 확인
11. llms.txt에 URL 포함 확인
12. /api/search?q=<핵심 키워드> 에서 글 검색 확인
13. post_chunks/embedding 생성 확인
14. IndexNow 제출 결과 확인
15. Discord 발행 알림 전송 확인
```

자동 비공개 또는 정정 조건:

```text
- 공개 URL은 열리지만 본문 렌더링이 깨짐
- 핵심 출처가 삭제/변경되어 claim 검증 실패
- 발행 후 재검증에서 주요 claim이 틀린 것으로 확인
- privacy scanner가 뒤늦게 민감정보를 탐지
- Discord 수동 명령 또는 관리자 명령으로 unpublish 요청
- 같은 주제에 대한 공식 정정이 발견됨
```

상태 모델:

```text
posts.status:
- queued
- researching
- drafted
- gate_failed
- ready_to_publish
- publishing
- verifying
- published
- correction_pending
- corrected
- unpublished
- retracted
- failed_generation
- failed_publish
- failed_verification
```

상태 전이 규칙:

```text
queued -> researching
researching -> drafted
drafted -> gate_failed | ready_to_publish
ready_to_publish -> publishing
publishing -> verifying | failed_publish
verifying -> published | failed_verification
published -> correction_pending | unpublished | retracted
correction_pending -> corrected | retracted
corrected -> published
```

핵심 원칙:

```text
- public route는 status=published인 최신 post_version만 노출한다.
- ready_to_publish 상태의 글은 내부 미리보기에서만 볼 수 있다.
- failed_verification은 공개하지 않는다.
- corrected는 이력 상태이고, 실제 공개 상태는 corrected version을 가진 published로 본다.
- 정정 글은 재발행 시 기존 slug URL을 유지한다.
- unpublished와 retracted 글은 별도 tombstone route가 결정되기 전까지 public route에서 제거한다.
```

정정 이력:

```text
post_corrections
- id
- post_id
- post_version_id
- reason
- previous_content_hash
- corrected_content_hash
- corrected_at
- corrected_by: system | admin
```

### 발행 job 중요도

발행 후 job은 모두 같은 중요도가 아니다. 실패 시 공개를 막아야 하는 작업과, 나중에 재시도해도 되는 작업을 나눈다.

필수 job:

```text
- public_url: /blog/:slug 200
- md_url: /blog/:slug.md 200
- render: HTML/Markdown 렌더링 오류 없음
- privacy_scan: 공개 본문 민감정보 없음
- sitemap: sitemap.xml에 URL 포함
- content_version_match: post_versions의 최신 content_hash와 공개 본문 일치
```

재시도 가능 job:

```text
- embedding
- search_index
- related_posts
- llms.txt / llms-full.txt 갱신
- feed.xml 갱신
- IndexNow 제출
- Discord 발행 알림
- OG 이미지 생성
```

정책:

```text
- 필수 job 실패 시 status=failed_verification 또는 failed_publish로 둔다.
- 재시도 가능 job 실패는 글 공개를 막지 않되, publish_jobs에 실패를 남기고 재시도한다.
- 같은 optional job이 여러 번 실패하면 Discord에만 알리고 글은 유지한다.
```

## 비용과 쿼터 제한

자동화는 실패 루프에 빠지면 검색/LLM/임베딩 비용이 커진다. 일일·월간 제한을 둔다.

기본 제한 예시:

```text
daily_budget:
- topic_fetch_max: 100
- source_extract_max: 20
- llm_calls_max: 12
- embedding_jobs_max: 3
- diagram_generation_max: 1
- publish_max: 1
- retry_max_per_stage: 2
- estimated_cost_limit_usd: configurable
```

운영 규칙:

```text
- 동일 source URL은 캐시 TTL 안에서 재수집하지 않는다.
- 같은 실패 사유가 2회 반복되면 해당 일자는 발행을 포기한다.
- publish는 하루 최대 1회로 제한한다.
- 비용 한도 초과 시 status=failed_generation으로 남기고 Discord에 알린다.
```

추가로 모든 외부 호출은 `usage_events`에 남긴다.

```text
usage_events
- id
- run_id
- event_type: source_fetch | llm | embedding | diagram | indexnow | discord
- provider
- model
- input_tokens
- output_tokens
- estimated_cost
- status
- created_at
```

## 민감정보/비공개정보 보호

자동 글 생성에는 공개 가능한 정보만 들어가야 한다.

금지 데이터:

```text
- 회사/고객사 실명
- 내부 URL/IP/호스트명
- 토큰/API 키/쿠키/세션
- 비공개 저장소명
- 실제 장애 로그 중 식별 가능한 값
- 개인 연락처/계정 정보
- 운영 DB의 원본 데이터
```

처리 규칙:

```text
- LLM 입력 전 privacy scanner를 실행한다.
- 로그는 필요한 최소 부분만 남기고 민감값은 [REDACTED] 처리한다.
- 회사 업무 사례는 공개 가능한 범위로 일반화한다.
- private context를 자동 글 생성 프롬프트에 넣지 않는다.
- 민감정보 감지 시 발행하지 않고 failed_generation으로 남긴다.
```

## 자동 발행 실패 유형

```text
no_topic: 오늘 발행할 만큼 좋은 주제가 없음
weak_sources: 출처 부족
duplicate_topic: 기존 글과 중복
unsafe_claim: 출처 없는 강한 주장 존재
privacy_risk: 회사/고객사/비공개 정보 포함 위험
no_evidence: 코드/로그/수치/공식 인용 없음
style_drift: persona 기준 미달
sandbox_violation: 자동 실험이 허용 범위를 벗어남
budget_exceeded: 비용/쿼터 한도 초과
render_failed: HTML/Markdown 렌더링 실패
publish_failed: DB/API 저장 실패
post_publish_verification_failed: 공개 URL 또는 검색 반영 실패
```

## Article Output Schema

LLM writer는 자유 텍스트만 반환하지 않고, 검증 가능한 구조화 결과를 반환한다.

```json
{
  "title": "...",
  "slug": "...",
  "description": "...",
  "tags": ["..."],
  "article_mode": "experiment | applied_analysis | document_analysis",
  "content_markdown": "...",
  "claims": [
    {
      "text": "...",
      "type": "version | price | api | performance | security | opinion",
      "source_url": "...",
      "evidence_path": "...",
      "confidence": 0.0
    }
  ],
  "sources": ["..."],
  "evidence_paths": ["..."],
  "personal_context_ids": ["..."],
  "publish_decision": "publish | block",
  "block_reason": null
}
```

## 최소 DB 모델

```text
posts
- id
- slug
- title
- description
- article_mode: experiment | applied_analysis | document_analysis
- status: queued | researching | drafted | gate_failed | ready_to_publish | publishing | verifying | published | correction_pending | corrected | unpublished | retracted | failed_generation | failed_publish | failed_verification
- current_version_id
- published_at
- unpublished_at
- retracted_at
- created_at
- updated_at

post_versions
- id
- post_id
- version_no
- title
- description
- content_markdown
- content_html
- content_hash
- persona_version_id
- research_pack_id
- created_by: system | admin
- created_at

topic_candidates
- id
- source_type
- title
- url
- summary
- score
- relevance_reason
- apply_categories
- apply_targets
- status: new | selected | rejected | used
- rejection_reason
- collected_at

research_packs
- id
- topic_candidate_id
- summary
- source_ids
- selected_angle
- risk_notes
- created_at

post_sources
- id
- post_id
- research_pack_id
- url
- title
- publisher
- source_role: official | original | discovery | reaction | reference
- fetched_at
- summary
- snapshot_hash

post_generation_runs
- id
- post_id
- post_version_id
- model
- prompt_hash
- persona_version
- input_source_ids
- personal_context_ids
- article_mode
- apply_to_me_result_id
- output_hash
- gate_result
- created_at

apply_to_me_results
- id
- topic_candidate_id
- apply_categories
- apply_targets
- mode: experiment | applied_analysis | document_analysis
- hypothesis
- commands_or_checks
- evidence_path
- summary
- created_at

post_chunks
- id
- post_id
- post_version_id
- content_hash
- chunk_index
- content
- embedding

publish_jobs
- id
- post_id
- post_version_id
- type: public_url | md_url | render | privacy_scan | sitemap | content_version_match | embedding | search_index | related_posts | llms | feed | indexnow | discord | og | diagram
- importance: required | retryable
- idempotency_key
- status
- retry_count
- error
- started_at
- finished_at

post_assets
- id
- post_id
- type: image | diagram | og
- path
- alt
- generated_by

article_claims
- id
- post_id
- post_version_id
- claim_text
- claim_type: version | date | price | api | performance | security | benchmark | support | opinion
- source_id
- evidence_quote
- evidence_path
- confidence
- verified: boolean
- verifier_result
- created_at

source_snapshots
- id
- source_id
- extracted_text_path
- excerpt
- source_role
- hash
- fetched_at

persona_versions
- id
- version
- content
- hash
- active
- created_at

quality_gate_results
- id
- post_id
- post_version_id
- gate_name
- status: passed | failed | warning
- message
- created_at

publish_verifications
- id
- post_id
- post_version_id
- check_type: public_url | md_url | render | privacy_scan | content_version_match | search | sitemap | llms | feed | indexnow | embedding | discord
- status
- response_code
- result
- checked_at

post_corrections
- id
- post_id
- post_version_id
- reason
- previous_content_hash
- corrected_content_hash
- corrected_by: system | admin
- corrected_at

personal_context_items
- id
- category
- title
- summary
- allowed_usage: direct_experience | applied_analysis | reference_only | forbidden
- public_safe: boolean
- version
- created_at
- updated_at

usage_events
- id
- run_id
- event_type: source_fetch | llm | embedding | diagram | indexnow | discord
- provider
- model
- input_tokens
- output_tokens
- estimated_cost
- status
- created_at

admin_actions
- id
- action_type: preview | save | publish | retry | unpublish | retract | correct | block_topic | approve_preview
- actor_type: admin | system | discord | cli
- actor_id
- target_type
- target_id
- reason
- created_at
```

모델링 원칙:

```text
- post_sources는 “어떤 자료를 봤는가”를 저장한다.
- post_versions는 “어떤 본문 버전이 공개됐는가”를 저장한다.
- article_claims는 “본문 버전의 어떤 주장이 어떤 자료에 의해 뒷받침되는가”를 저장한다.
- source_snapshots는 원문 전체가 아니라 당시 검증 근거와 hash를 재현하기 위해 저장한다.
- post_chunks는 post_version_id와 content_hash를 가져야 글 수정 후 검색 인덱스가 어긋나지 않는다.
- quality_gate_results는 왜 발행됐거나 차단됐는지 감사 로그로 남긴다.
- publish_verifications는 발행 후 실제 공개/검색/SEO 반영 여부와 content_hash mismatch required failure를 기록한다. 공개 검증 로그에는 본문 excerpt를 저장하지 않는다.
- post_corrections는 자동 발행 이후 정정/비공개 처리 이력을 남긴다.
- personal_context_items는 글이 홍백님의 경험처럼 보일 수 있는 근거 범위를 제한한다.
- usage_events는 자동화 비용과 실패 루프를 추적한다.
- admin_actions는 Discord/CLI/관리자 조작을 감사 가능하게 남긴다. 감사 사유에는 raw log, 내부 URL/private host, credential-like 값을 저장하지 않는다.
```

## 구현 단계

### 실행 역할 분리

```text
Next.js / Node worker
- 스케줄 실행
- DB 저장
- 발행 상태 관리
- 임베딩/검색/IndexNow/Discord job 실행
- 공개 URL, Markdown URL, 검색 반영 검증

Hermes 또는 LLM agent
- 주제 수집
- 웹 조사
- 자료 요약
- 홍백님 기술 맥락에 접목
- 작은 실험/대입 분석 계획 생성
- 사건형 앵글 생성
- persona 기반 글 작성
- 스타일 자체 점검
```

일일 실행 흐름:

```text
daily-blog-cron
  -> collectTopics()
  -> rankTopics()
  -> buildResearchPack()
  -> applyToMyContext()
  -> runSmallExperimentOrAnalysis()
  -> buildIncidentAngle()
  -> generateArticle(persona.md)
  -> validateArticle()
  -> createPostVersion(status="ready_to_publish")
  -> runRequiredPublishJobs()
  -> verifyPublicUrlAndContentHash()
  -> markPublished()
  -> enqueueRetryableJobs()
  -> notifyDiscord()
```

발행 순서에서 중요한 점:

```text
- validateArticle()은 글 품질 검증이다.
- runRequiredPublishJobs()는 공개 전 기술 검증이다.
- markPublished() 이전에는 public route에서 글을 노출하지 않는다.
- embedding/search/IndexNow/Discord는 공개 후 재시도 가능한 job으로 둔다.
```

0단계: OCI 인프라/배포 foundation을 별도 phase로 둔다.

- OCI Compute 기반 production topology 확정
- Docker Compose 서비스 경계: web, worker, PostgreSQL + pgvector, Redis, Nginx
- Nginx reverse proxy, TLS, 보안 헤더, upload/body limit, 고정 upstream, 신뢰 가능한 client IP forwarding 정책
- DB/Redis volume, PostgreSQL logical dump, pgvector/migration/content_hash 복구 리허설 정책
- registry pull, compose restart, deploy smoke, rollback runbook
- 이전 image tag, server-local env, migration rollback 가능 여부를 기준으로 한 rollback 판단
- 실제 OCI 서버 접속, 배포, 방화벽 변경은 명시 승인 후 수행

1단계: 자동 글 생성 없이 DB/CMS 골격부터 만든다.

- `posts`, `post_versions`, `post_sources`, `publish_jobs` 스키마
- 초기에는 내부 API 또는 CLI로 글 저장
- `/blog`, `/blog/[slug]`, `/blog/[slug].md`
- `/blog` 목록: 날짜, 제목, 요약, 태그, 태그별 카운트, 페이지네이션
- `/blog/[slug]` 상세: 관련 글, 태그, 코드블록, source 링크, OG 메타
- `sitemap.xml`, `feed.xml`, `llms.txt`
- status=published인 최신 version만 공개
- 최소 관리자 화면: 글 상태, 발행 실패 사유, 임베딩 상태, 검색/SEO 반영 상태 확인

2단계: 발행 후 자동화.

- 발행 이벤트 발생
- 임베딩 생성
- 관련 글 추천
- 하이브리드 검색: 키워드 매칭 + 벡터 유사도
- `/api/search` 캐시, rate limit, 비정상 검색 패턴 차단
- IndexNow 제출
- Discord 알림
- 실패 job 재시도
- 공개 URL 확인
- `.md` URL 확인
- 검색 인덱스 반영 확인
- content_hash 일치 확인

3단계: 완전 자동 작성.

- daily cron
- topic collector
- source fetcher/summarizer
- research pack 생성
- personal context ledger 조회
- apply-to-me 분석
- 가능한 경우 작은 검증 실행
- 사건형 앵글 생성
- `persona.md` 기반 draft 생성
- 자동 품질 게이트
- 통과 시 publish

4단계: 아키텍처 글 자동 다이어그램.

- 글 주제가 아키텍처/흐름/인프라로 분류될 때만 실행
- handdrawn diagram SVG 생성
- `post_assets`에 등록
- 본문 적절한 위치에 삽입

5단계: 성과 피드백.

- 조회/검색 유입/공유/체류 시간 기준으로 성과 좋은 글을 표시
- 성공 글의 제목/구조/앵글을 `persona_examples`로 축적
- 실패한 생성 결과는 금지 패턴으로 축적

6단계: 운영 안정화.

- job lock과 idempotency key로 중복 발행 방지
- source fetch/LLM/embedding 비용 집계
- 검색 API 임베딩 호출 비용과 봇성 요청 별도 집계
- 실패 사유별 알림 분리
- 정정/비공개/retract 명령 제공
- public content와 DB version hash 정기 비교

## 비즈니스 로직 체크리스트

구현 전 반드시 코드 레벨에서 확정할 규칙:

```text
1. 어떤 status부터 public route에 노출되는가?
2. published 글의 최신 version을 어떻게 고르는가?
3. optional job 실패가 글 공개를 막는가?
4. 같은 topic/source가 다시 수집되면 중복 후보로 볼 기준은 무엇인가?
5. "직접 해봤다" 표현을 어떤 evidence로 허용할 것인가?
6. personal_context_items의 forbidden 항목이 본문에 나오면 어떻게 차단할 것인가?
7. source_role=discovery만 있는 claim은 어떻게 처리할 것인가?
8. 글 정정 시 기존 URL을 유지한다. retract 페이지는 별도 tombstone route decision 전까지 만들지 않는다.
9. llms.txt, feed, IndexNow 같은 retryable job이 실패했을 때 글을 유지할 것인가?
10. 하루 발행 한도와 비용 한도 초과 시 어떤 status로 남길 것인가?
11. /api/search는 어떤 조건에서 임베딩 호출을 생략할 것인가?
12. 검색 API의 rate limit, 캐시 TTL, 중복 요청 기준은 무엇인가?
13. /blog 목록의 태그 카운트와 페이지네이션은 published 글만 기준으로 계산하는가?
14. 최소 관리자 화면에서 허용할 조작은 retry, unpublish, retract, correct 중 어디까지인가?
15. 챗봇 없이 임베딩을 검색/관련 글 전용으로만 사용할 경계를 어떻게 테스트할 것인가?
```

## h-log에 적용할 때의 결정 변경

기존 계획:

```text
Content: MDX
DB: MVP 없음
Chatbot: MVP 제외, 2차 기능
```

새 방향:

```text
Content: DB + generated Markdown/HTML
DB: PostgreSQL + pgvector 필수
Chatbot: 제외
Automation: 핵심 기능
Search: keyword + vector hybrid
Deploy: OCI Compute + Docker Compose + Nginx 기준
Runtime: web, worker, PostgreSQL + pgvector, Redis를 OCI에서 운영
```

주의:

- 이 방향은 기존 MVP보다 구현량이 크다.
- 대신 홍백님의 백엔드/인프라/AI 자동화 브랜딩과는 더 직접적으로 맞는다.
- 챗봇을 빼면 RAG UI/세션/방문자 메모리 부담은 없어지고, 검색/관련 글/발행 자동화만 남는다.
