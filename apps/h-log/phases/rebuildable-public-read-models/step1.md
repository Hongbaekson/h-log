# Step 1 projection-storage-and-rebuild

## 상태와 선행 조건

completed — 2026-11-16 [저장소·재생성 검수](../../.codex/docs/harness/PUBLIC_READ_STORAGE_REVIEW.md). 원본 보존·격리 rebuild를 구현했고 public reader/writer 연결은 후속 단계다.

F3 Step 0 완료.

## 읽을 파일

경로는 저장소 루트 기준이다. 선행 step에서 추가한 실제 파일·migration·계약도 수정 전에 확인한다.

- `AGENTS.md`
- `apps/h-log/AGENTS.md`
- `.codex/skills/harness/SKILL.md`
- `.codex/skills/sync-repos/SKILL.md`
- `apps/h-log/.codex/docs/harness/PRD.md`
- `apps/h-log/.codex/docs/harness/ADR.md`
- `apps/h-log/.codex/docs/harness/ARCHITECTURE.md`
- `apps/h-log/.codex/docs/harness/WORKFLOW.md`
- `apps/h-log/.codex/docs/harness/AGENT_LOOP.md`
- `apps/h-log/.codex/docs/harness/IMPLEMENTATION_PLAN.md`
- `apps/h-log/.codex/docs/harness/PERFORMANCE_REBUILD_PLAN.md`
- `apps/h-log/.codex/docs/harness/PUBLIC_READ_MODEL_CONTRACT.md`
- `apps/h-log/.codex/rules/content-seo-privacy.md`
- `.codex/skills/tdd/SKILL.md`
- `apps/h-log/lib/blog-postgres-repository.ts`
- `apps/h-log/lib/blog-content-model.ts`
- `apps/h-log/lib/blog-public.ts`
- `apps/h-log/lib/brain-capture.ts`
- `apps/h-log/lib/brain-curation.ts`
- `apps/h-log/scripts/blog-migrations.mjs`
- `apps/h-log/migrations/001_blog_core.sql`
- `apps/h-log/migrations/004_brain_capture.sql`
- `apps/h-log/lib/blog-postgres-repository.integration.test.ts`

## 범위와 산출물

조회용 저장소와 재생성 도구을 한 작업 단위로 수행한다. 전체 설계·측정 조건·인계는 [성능 및 재생성 계획](../../.codex/docs/harness/PERFORMANCE_REBUILD_PLAN.md)을 따른다.

## 작업

1. 계약의 최소 조회용 schema와 index, 원본을 받는 결정적 projector를 구현한다. 목록/검색 텍스트/본문 블록의 버전과 입력 fingerprint를 검증한다.
2. 명시 대상·batch 크기·cursor·동시성 상한을 받는 로컬 rebuild 명령을 만든다. 새 generation에서 생성·검증한 뒤 활성화하며 동일 입력은 같은 결과로 수렴시킨다.
3. 소유가 확인된 격리 DB에서 보조 행/테이블 유실, 중간 중단/재개, 중복 실행, 손상 row와 schema/정책 버전 변경을 재현한다. 생성 전후 원본 hash·공개 선택·감사를 비교한다.

[확정 계약](../../.codex/docs/harness/PUBLIC_READ_MODEL_CONTRACT.md)의 이 단계에 해당하는 범위·상한·실패 표·후속 검증을 인수 기준에 함께 적용한다. 아직 구현하지 않은 설정/표/CLI를 이미 존재하는 것으로 가정하지 않는다.

## 인수 기준

- 보조 저장소가 비어 있거나 지원하는 유실 상태여도 문서화된 명령으로 복구된다. 부분 생성본의 활성화가 차단된다.
- 모든 대상의 입력 fingerprint와 결과를 비교하며 원본/비공개 판정이 기준선과 일치한다. 실제 메모리·처리량·진행 cursor를 기록한다.

## 검증

Production 동작을 수정할 때는 focused RED의 예상 실패를 확인한 뒤 GREEN으로 진행한다. 실행 디렉터리는 `apps/h-log`이며 DB/HTTP 명령은 각 test의 opt-in·fixture 계약을 읽고 격리 loopback 환경에서 실행한다. 새 회귀의 파일/명령과 F1 benchmark 결과를 완료 기록에 남긴다.

가까운 검증 명령은 다음과 같다.

```bash
npm run test:projection
HLOG_PROJECTION_TEST=1 npm run test:projection:db
npm run test:migrations
npm run test:repository
npm run test:brain
```

기본 gate를 실행하고 결과를 기록한다.

```bash
npm run test
npm run lint
npm run typecheck
npm run build
git diff --check
```

전체 lint에 기존 Git 제외 private helper 오류가 있으면 실패 내역과 source lint를 따로 기록한다. 실패를 숨기거나 무관한 파일을 수정해 통과시키지 않는다.

## 경계

- 원본·과거 버전·공개 선택·검수·감사는 기준 데이터로 보존한다. 재생성 권한은 파생 데이터에 한정한다.
- 현재 published/current-version, Brain published revision, privacy 정책, owner 인증·Origin·command revision/idempotency를 모든 새 읽기/쓰기 경로에서 검증한다.
- 성능 결과에는 fixture·환경·표본 수·cold/warm 조건을 함께 기록한다. 준비 실행·최댓값·소수 표본의 중앙값을 운영 p95로 표시하지 않는다.
- 실험 DB·파일·프로세스는 본 작업이 생성한 대상을 확인한 뒤 정리한다. 운영 적용·실제 콘텐츠 발행·OCI/DNS/TLS·provider·timer·외부 알림은 기존의 명시 승인 절차를 따른다.
- 공개 UI는 승인된 화면/상호작용을 인수 기준으로 사용한다. 질문 데이터는 작성자가 기록한 항목의 계약을 따른다.

## 다음 단계

F3 Step 2 `transactional-projection-freshness`.

## 완료 기록 — 2026-11-16

- migration 014 네 표와 기존 변환을 재사용한 projector, 입력/정책/manifest/payload hash, batch/checkpoint·실행 잠금/token·검증/활성화·repair/reset을 구현했다. 소유 확인 로컬 DB와 writer_protocol=0으로 제한하며 실제 공개 reader/writer는 그대로다.
- TDD RED→GREEN, projector/CLI 6개와 DB 8개, migration 2개·Blog repository 5개·Brain 3개가 통과했다. 전체 테스트 305 pass/29 skip, 소스 lint/typecheck/build 통과. 전체 lint의 기존 private helper 오류 10건은 남겨 기록했다. 세부 측정/제약은 검수 문서를 따른다.
- 원본/공개 선택·검수·PDF 승인/epoch·감사 보존과 실제 CLI 강제 종료 후 재개를 검증했다. 운영 migration·배포·공개 발행은 수행하지 않았다. F 5 completed/17 pending, 다음은 F3 Step 2다.
