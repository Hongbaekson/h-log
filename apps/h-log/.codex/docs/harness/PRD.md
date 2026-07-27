# PRD: H-Log Personal Site and Automated Blog Platform

기준 문서:

- `apps/h-log/AGENTS.md`
- `apps/h-log/.codex/docs/implementation-roadmap.md`
- `plans/automated-blog-publishing-plan.md`

## 목표

H-Log는 손홍백의 개인 브랜딩 사이트이자 기술 블로그다. 블로그 방향은 기존 file-based MVP 계획을 종료하고 DB 기반 수동 발행 계약을 먼저 만든 뒤, 검증된 계약을 실제 PostgreSQL/API/worker runtime에 연결해 완전 자동 주제 수집, 조사, 작성, 검증, 발행이 가능한 플랫폼으로 확장하는 것으로 정리한다.

핵심 메시지는 아래와 같다.

```text
백엔드 개발자 손홍백입니다
Java/Spring 기반 백엔드를 개발합니다. 반복되는 작업은 줄이고, 운영하기 쉬운 구조를 고민합니다.
```

## 사용자

- 방문자: 손홍백의 경력, 포트폴리오, 기술 글을 확인하는 채용 담당자, 동료 개발자, 잠재 협업자.
- 운영자: 글감 수집, 기술 맥락 매핑, 발행 검증, 배포 상태를 관리하는 손홍백 본인.
- 자동화 worker: 주제 수집, 출처 요약, 글 생성, 품질 게이트, 검색/SEO 후처리를 수행하는 내부 시스템.

## 제품 범위

### H-01: 개인 사이트 기본 표면

반드시 포함한다.

- `/`
- `/resume`
- `/portfolio`
- `/portfolio/[slug]`
- `/blog`
- `/blog/[slug]`
- 한국어 UI copy
- 공개 가능한 경력/프로젝트/기술 스택 정리
- 민감정보 노출 방지
- SEO 기본값: metadata, sitemap, robots, canonical, JSON-LD
- OCI Docker Compose + Nginx 배포 준비

H-01에서 제외한다.

- 로그인
- 댓글
- 조회수
- 방문자 RAG 챗봇
- 자동 글 작성/자동 발행

### I-01: OCI self-hosted infrastructure

인프라와 클라우드는 OCI를 기본 운영 환경으로 둔다.

- 초기 production target은 OCI Compute 1대다.
- Docker Compose로 Next.js web, blog worker, PostgreSQL + pgvector, Redis, Nginx를 관리한다.
- Nginx는 80/443 TLS 종료와 reverse proxy를 담당한다.
- PostgreSQL과 Redis는 public internet에 노출하지 않는다.
- DB password, API key, SSH key, 서버 IP는 저장소에 커밋하지 않는다.
- 자동 발행 전에는 backup/restore, deploy smoke, rollback runbook이 있어야 한다.
- managed DB나 managed runtime으로 바꾸려면 별도 ADR을 추가한다.

### H-02: 파일 기반 블로그 호환 레이어

파일 기반 블로그는 본선이 아니라 전환/호환 레이어로 둔다.

- Markdown 또는 MDX 기반 글 loader는 기존 글 import 또는 임시 fixture 용도로만 사용한다.
- `/blog`와 `/blog/[slug]` public route의 장기 source of truth는 DB 기반 `post_versions`다.
- file-based list/detail 구현 계획은 active phase registry에서 제거한다.

### A-01: DB 기반 수동 발행 블로그 계약

계약과 public route behavior는 완료됐다. 자동 글 작성보다 먼저 DB 기반 저장, 렌더링, 공개 경계를 코드 contract와 테스트로 고정했다.

- PostgreSQL 기반 `posts`, `post_versions`, `post_sources` 모델
- public route는 `status=published` 최신 버전만 노출
- Markdown/HTML 렌더링 저장
- sitemap/feed/llms.txt 생성 준비
- 관리자 UI는 최소 preview/save/publish만 포함

local runtime에서 완료된 항목:

- 실제 PostgreSQL schema와 migration runner
- DB repository와 production public route 연결
- manual `--once` persistent publish job worker
- fake provider 기반 local end-to-end dry-run

아직 완료로 보지 않는 runtime 항목:

- 실제 provider와 scheduler 활성화

### A-02: 발행 후 자동화 계약

- 청킹
- 임베딩
- 검색 인덱스
- 관련 글 추천
- sitemap/feed/llms.txt 갱신
- IndexNow 제출
- Discord 알림
- 실패 job 재시도

위 항목의 순수 contract, public crawler/search surface, persistent job 상태 저장은 완료됐지만, 실제 provider runtime 연결은 A-04 이후 승인 경계에서 수행한다.

### A-03: 완전 자동 글 생성 계약

- GeekNews, 공식 release note, 기술 블로그, 보안/운영 소스 수집
- 원문 출처 확인
- `personal_context_ledger` 기반 홍백님의 기술 맥락 매핑
- `persona.md` 기반 문체 고정
- claim 단위 검증
- 자동 발행 품질 게이트
- 검증 실패 시 비공개 실패 상태 유지

현재 daily pipeline은 adapter 기반 contract다. 검증된 생성 결과는 선택적 persistence callback을 통해 `publishing` post와 queued required jobs로 넘기고 public worker 실행 전에 비공개 상태로 멈출 수 있다. PostgreSQL one-shot runner는 서울 날짜별 advisory lock과 기존 post 확인 후에만 Hermes `openai-codex`/`gpt-5.6-sol`을 호출하고 이 private aggregate를 저장한다. Required adapter는 `render`/`privacy_scan`을 공개 전에 처리하고 제한된 canary 전환 뒤 public URL/Markdown/sitemap/content hash를 검증하며 실패 canary를 `correction_pending`으로 숨긴다. Bounded cycle은 해당 daily post의 required job만 유한 횟수로 drain하고, 공식 Hermes image를 사용한 Compose service와 09:00 KST systemd timer를 packaging했다. OCI server-local credential/env/input, live migration, bounded Hermes canary와 audited rollback smoke까지 완료했다. 실제 HTTPS public origin과 privacy 목록이 없으므로 반복 timer와 실제 성과 신호 수집은 활성화하지 않는다.

Feedback local contract는 aggregate threshold를 통과한 글에서 title/section/closing/evidence 요약만 persona example로 만들고, 원문 전체를 저장하지 않는다. Persona version은 content hash를 가진 비활성 record로 먼저 생성하며 명시적 활성화와 직전 version rollback을 지원한다. 생성 실패 registry는 같은 일자·후보·유형의 첫 실패에서 우선순위를 낮추고 두 번째 실패에서 당일 발행을 중단하며, failed model output 대신 privacy-redacted summary만 prompt/quality gate guidance에 사용한다. 이 상태 전이는 synthetic fixture 검증이며 실제 production persona나 provider prompt를 변경하지 않는다.

### A-04: PostgreSQL/worker runtime 통합

다이어그램 삽입 계약을 완료한 뒤, contract-only 구현을 실제 local runtime의 한 vertical slice로 연결한다.

- PostgreSQL schema와 migration version
- blog repository와 DB-backed public read path
- manual `--once` persistent worker
- fake provider 기반 local end-to-end dry-run
- 운영 안정화 전에는 실제 외부 provider, cron, 공개 발행 비활성화
- OCI/provider/scheduler/public publish 활성화는 별도 사용자 승인 후 수행

## 성공 기준

- MVP 사이트는 `npm run lint`, `npm run test`, `npm run typecheck`, `npm run build`를 통과한다.
- 공개 페이지에는 전화번호, 생년월일, 내부 URL, 서버 IP, API key, 비공개 저장소명, 고객사 내부 업무 흐름이 노출되지 않는다.
- Blog public route는 `status=published`인 최신 `post_version`만 노출한다.
- file-based loader는 DB import/transition support로만 남기고, DB-first phase가 시작되면 public source of truth가 되지 않는다.
- 자동 블로그 전환 시 failed generation, failed publish, failed verification 상태의 글은 공개 URL에 노출되지 않는다.
- "직접 해봤다"는 표현은 실제 실험/코드/명령/로그/운영 기록이 있는 경우에만 사용한다.
- GeekNews 같은 큐레이션 소스는 주제 발견 신호로만 쓰고, 기술 claim은 원문/공식 문서로 검증한다.
- 방문자 챗봇은 만들지 않는다.
- phase의 `completed`가 contract 완료인지 runtime 완료인지 summary에 명시한다.
- production 자동 발행 완료는 실제 PostgreSQL persistence, persistent worker, 승인된 canary, rollback smoke가 모두 확인된 경우에만 선언한다.
- aggregate 성과 신호의 schema/privacy/학습 eligibility contract는 도메인 없이 로컬에서 완성할 수 있다.
- 반복 생성 실패 contract는 같은 일자·후보·실패 유형의 첫 실패에서 우선순위를 낮추고 두 번째 실패에서 당일 발행을 중단하며, 원문 출력 대신 privacy-redacted summary만 저장한다.
- 도메인 컷오버 전 공개 콘텐츠 승인, PDF 개인정보 검수, 주요 화면 접근성·모바일 탐색성, 페이지별 metadata/canonical/JSON-LD와 전체 sitemap을 `public-site-quality-hardening` phase에서 검증한다.
- 실제 성과 신호 수집, persona 변경, scheduled production activation은 실제 HTTPS public origin이 준비된 뒤에만 수행한다.

## 구현 정책

- 구현 계획과 단계 실행은 Harness 구조를 따른다.
- production code 구현 또는 수정은 TDD를 기본으로 한다.
- phase 파일은 `apps/h-log/phases/` 아래에 둔다.
- 실행 순서는 `diagram-assets-automation -> blog-runtime-integration -> public-site-quality-hardening -> auto-publish-ops-hardening -> feedback-and-persona-learning` contract다. Feedback Steps 0-2 contract baseline은 완료됐으며, 공개 사이트 품질 게이트를 통과한 뒤 production signal collection/persona activation/timer 단계부터 실제 HTTPS public origin을 요구한다.
- 설계 변경이 생기면 `PRD.md`, `ADR.md`, `ARCHITECTURE.md` 중 관련 문서를 함께 갱신한다.
