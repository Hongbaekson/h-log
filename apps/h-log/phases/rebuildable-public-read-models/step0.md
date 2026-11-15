# Step 0 source-and-projection-contract

## 상태와 선행 조건

completed — 2026-11-16 [원본·조회용 데이터 계약](../../.codex/docs/harness/PUBLIC_READ_MODEL_CONTRACT.md)을 확정하고 문서·schema 참조·레지스트리를 검증했다. runtime 구현은 후속 단계다.

F1 Step 0 완료. 기본 실행 순서는 F2 이후.

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
- `apps/h-log/.codex/docs/harness/BLOG_MARKDOWN_READ_REVIEW.md`
- `apps/h-log/.codex/rules/content-seo-privacy.md`
- `apps/h-log/lib/blog-content-model.ts`
- `apps/h-log/lib/blog-editorial-actions.ts`
- `apps/h-log/lib/blog-postgres-repository.ts`
- `apps/h-log/lib/blog-persistent-worker.ts`
- `apps/h-log/lib/blog-privacy-scanner.ts`
- `apps/h-log/lib/brain-capture.ts`
- `apps/h-log/lib/brain-curation.ts`
- `apps/h-log/migrations/001_blog_core.sql`
- `apps/h-log/migrations/004_brain_capture.sql`
- `apps/h-log/migrations/007_resume_pdf_storage.sql`

## 범위와 산출물

원본·공개 선택·파생 데이터 계약을 한 작업 단위로 수행한다. 전체 설계·측정 조건·인계는 [성능 및 재생성 계획](../../.codex/docs/harness/PERFORMANCE_REBUILD_PLAN.md)을 따른다.

## 작업

1. 원본 표와 공개 결정, 파생 표의 소유 범위를 필드 단위로 정한다. Markdown/기존 HTML·메타데이터·태그/출처·파일 바이트·공개 revision·검수 결정과 감사의 복구 기준을 명시한다.
2. 본문 hash와 전체 입력 fingerprint를 구분한다. source version, metadata revision, renderer/projection/search schema version, privacy policy fingerprint를 포함하는 키·무효화·크기 상한 계약을 정한다.
3. 동일 PostgreSQL의 조회용 테이블을 기본안으로 한다. 현재 공개 상태와 버전의 join, 한 읽기 snapshot, 원자적 갱신, 요청 합치기와 제한된 재생성, 원본 fallback/오류 정책을 정한다.
4. 원본 HTML 보존 또는 고정 renderer 복구, Brain의 공개 사본 재현성, PDF의 검토/epoch와 실제 자산 바이트를 다룬다. 원본→생성→검증→활성 generation 교체와 중단/재개 인터페이스를 정의한다.

F2 Step 1에서 Markdown 성공·404는 `private, no-store`로 정정했다. 현재 slug loader의 여러 query는 단일 transaction snapshot이 아니므로 진행 중인 변경·철회와 다른 표면의 HTTP 캐시를 포함한 최신성 계약을 정한다. 이전 부하 검수의 종료 139는 후속 두 실행에서 재현되지 않았으나 원인은 미확정으로 보존한다.

## 인수 기준

- 원본의 공개 선택으로 동일 공개 결과를 재구성할 수 있는 매핑과 실패 표가 있다. 늦은 worker·철회·정책 변경·손상·이전 앱 rollback 시 행동이 명확하다.
- 캐시 누락과 오류, projection table 손실과 migration 부재, 원본 DB 장애를 구분해 지원하는 복구 경로를 정한다.
- 검색 개수/태그 집계, permalink/HTML/RSC/Markdown/feed/sitemap, HTTP 캐시의 공개 최신성 조건을 함께 정한다. ADR과 다음 storage step에 인계한다.

## 검증

Markdown/JSON 파싱, 상대 링크·읽을 파일·phase 의존성 검사와 `git diff --check`를 실행한다. 이 step의 산출물은 계약 문서이며 runtime 구현 gate는 후속 step에서 실행한다.

## 경계

- 원본·과거 버전·공개 선택·검수·감사는 기준 데이터로 보존한다. 재생성 권한은 파생 데이터에 한정한다.
- 현재 published/current-version, Brain published revision, privacy 정책, owner 인증·Origin·command revision/idempotency를 모든 새 읽기/쓰기 경로에서 검증한다.
- 성능 결과에는 fixture·환경·표본 수·cold/warm 조건을 함께 기록한다. 준비 실행·최댓값·소수 표본의 중앙값을 운영 p95로 표시하지 않는다.
- 실험 DB·파일·프로세스는 본 작업이 생성한 대상을 확인한 뒤 정리한다. 운영 적용·실제 콘텐츠 발행·OCI/DNS/TLS·provider·timer·외부 알림은 기존의 명시 승인 절차를 따른다.
- 공개 UI는 승인된 화면/상호작용을 인수 기준으로 사용한다. 질문 데이터는 작성자가 기록한 항목의 계약을 따른다.

## 다음 단계

F3 Step 1 `projection-storage-and-rebuild`.

## 완료 기록 — 2026-11-16

- 실제 migration/model과 관리자·자동 생성·worker·retry·Brain·PDF 경로를 확인해 원본 필드/승인과 파생 결과를 구분했다. 별도 revision·입력/정책 fingerprint, 같은 snapshot의 공개 집계, 새 표의 역할과 재생성/활성화·중단/재개·복구/이전 앱 전환을 계약에 명시했다.
- 누락·손상·schema 미적용·정책 변경·원본 장애·늦은 worker의 실패 표와 fallback 상한, 표면별 HTTP 캐시/현재성, 후속 검증 matrix를 작성했다. 공개 사본/원본 HTML/PDF 승인·감사를 보존한다.
- `node private/f3-contract-2026-11-16/verify-docs.mjs`로 Markdown 15개/JSON 2개, 추가 상대 링크 61개·읽을 파일 경로 138개·기존 schema 필드 80개/참조 심볼 12개, 60개 phase/209개 step 상태와 F3 선행 조건을 확인했다. 다른 phase 상태는 변경하지 않았다. `git diff --check`도 통과했다. 검증 자료는 git/Docker에서 제외된 private 경로에 보관하며 문서 전용 변경으로 runtime 테스트·빌드·DB migration은 실행하지 않았다.
- F 4 completed/18 pending, 다음은 F3 Step 1이다. 기존 성능 종료 139의 원인 미확정 기록과 운영 보류는 유지한다.
