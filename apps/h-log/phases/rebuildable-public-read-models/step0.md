# Step 0 source-and-projection-contract

## 상태와 선행 조건

pending — 2026-11-06 등록한 F3의 원본·공개 선택·파생 데이터 계약 단계다. 구현 완료 판정은 이 파일의 인수 기준과 검증 결과로 한다.

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
