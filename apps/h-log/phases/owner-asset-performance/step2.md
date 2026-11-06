# Step 2 versioned-asset-validation

## 상태와 선행 조건

pending — 2026-11-06 등록한 F6의 자산 무결성 검증 결과 재사용 단계다. 구현 완료 판정은 이 파일의 인수 기준과 검증 결과로 한다.

F3 Step 0와 F1 Step 0 완료.

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
- `.codex/skills/tdd/SKILL.md`
- `apps/h-log/lib/blog-thumbnails.ts`
- `apps/h-log/lib/blog-diagram-assets.ts`
- `apps/h-log/lib/blog-public-source.ts`
- `apps/h-log/lib/blog-postgres-repository.ts`
- `apps/h-log/lib/blog-public.test.ts`
- `apps/h-log/Dockerfile`

## 범위와 산출물

자산 무결성 검증 결과 재사용을 한 작업 단위로 수행한다. 전체 설계·측정 조건·인계는 [성능 및 재생성 계획](../../.codex/docs/harness/PERFORMANCE_REBUILD_PLAN.md)을 따른다.

## 작업

1. content-addressed 자산의 원본 위치·배포 artifact/manifest·검증 정책 버전을 정한다. 같은 경로의 파일 교체/누락/손상 감지와 cache lifetime을 계약으로 고정한다.
2. 최초 파일 검증을 제한된 동시성으로 수행하고 검증 결과를 실제 불변 저장 계약에 맞춰 재사용한다. 읽기 실패는 글의 안전한 텍스트 표시와 기존 검증 실패 처리로 연결한다.
3. 같은 파일 병렬 요청, cold cache, 재시작, manifest/정책 변경, 원본/파생 파일 유실과 손상을 합성 파일로 검수한다.

## 인수 기준

- warm 요청의 중복 파일 읽기/hash 횟수가 감소하고 수정된 파일의 과거 성공 결과가 재사용되지 않는다.
- 원본 hash·검증 정책·배포 식별자의 일치와 원본에서 재검증 가능한 경로를 증명한다. 동시 I/O·메모리 상한을 측정한다.

## 검증

Production 동작을 수정할 때는 focused RED의 예상 실패를 확인한 뒤 GREEN으로 진행한다. 실행 디렉터리는 `apps/h-log`이며 DB/HTTP 명령은 각 test의 opt-in·fixture 계약을 읽고 격리 loopback 환경에서 실행한다. 새 회귀의 파일/명령과 F1 benchmark 결과를 완료 기록에 남긴다.

가까운 검증 명령은 다음과 같다.

```bash
node --no-warnings --experimental-strip-types --test lib/blog-public.test.ts
npm run test:public-read-path
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

F6 Step 3 `rebuildable-thumbnail-variants`.
