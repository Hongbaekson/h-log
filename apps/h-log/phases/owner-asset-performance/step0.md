# Step 0 paged-owner-history

## 상태와 선행 조건

pending — 2026-11-06 등록한 F6의 관리자 목록과 수정 이력의 제한 조회 단계다. 구현 완료 판정은 이 파일의 인수 기준과 검증 결과로 한다.

F1 Step 0와 R1 완료.

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
- `apps/h-log/.codex/rules/frontend.md`
- `apps/h-log/.codex/docs/harness/UI_GUIDE.md`
- `apps/h-log/lib/brain-postgres-repository.ts`
- `apps/h-log/lib/brain-capture-http.ts`
- `apps/h-log/lib/brain-capture.ts`
- `apps/h-log/components/brain/BrainCapture.tsx`
- `apps/h-log/app/admin/brain/page.tsx`
- `apps/h-log/scripts/brain-editor.browser-check.mjs`
- `apps/h-log/lib/brain-capture-http.test.ts`

## 범위와 산출물

관리자 목록과 수정 이력의 제한 조회을 한 작업 단위로 수행한다. 전체 설계·측정 조건·인계는 [성능 및 재생성 계획](../../.codex/docs/harness/PERFORMANCE_REBUILD_PLAN.md)을 따른다.

## 작업

1. 현재 draft와 이력 요약/원문 조회를 나누고 목록·이력에 안정적인 cursor/상한을 둔다. 과거 원문은 선택 시 조회한다.
2. 저장 후 상세·전체 목록 재조회 범위를 줄이면서 저장 순서, 수정 충돌, command receipt, 응답 유실 재확인을 처리한다.
3. 버전 생성일·기록 생성일·현재/공개 revision의 의미를 보존한다. 이전 저장 형식, 수백 버전, 긴 원문, 임의 cursor/다른 기록 ID를 검수한다.

## 인수 기준

- 원문 버전과 감사는 원본에 보존되며 전체 history 본문을 기본 응답에 담지 않는다. 승인된 범위의 과거 원문을 계속 읽을 수 있다.
- 닫힌 이력의 DOM/전송량이 제한되고 편집·검색/정렬·재시도·공개/철회가 통과한다. F1의 긴 기록/이력 조건으로 비교한다.

## 검증

Production 동작을 수정할 때는 focused RED의 예상 실패를 확인한 뒤 GREEN으로 진행한다. 실행 디렉터리는 `apps/h-log`이며 DB/HTTP 명령은 각 test의 opt-in·fixture 계약을 읽고 격리 loopback 환경에서 실행한다. 새 회귀의 파일/명령과 F1 benchmark 결과를 완료 기록에 남긴다.

가까운 검증 명령은 다음과 같다.

```bash
npm run test:brain
npm run test:brain:http
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

개발 서버와 production에서 1440/390/320px, 키보드, JS ON/OFF, history/URL, 로딩/오류/복구를 검수한다. 승인된 Brain 외관·다섯 배치·검색/reader와 Home 레이더를 화면 및 동작 회귀 기준으로 사용한다.

## 경계

- 원본·과거 버전·공개 선택·검수·감사는 기준 데이터로 보존한다. 재생성 권한은 파생 데이터에 한정한다.
- 현재 published/current-version, Brain published revision, privacy 정책, owner 인증·Origin·command revision/idempotency를 모든 새 읽기/쓰기 경로에서 검증한다.
- 성능 결과에는 fixture·환경·표본 수·cold/warm 조건을 함께 기록한다. 준비 실행·최댓값·소수 표본의 중앙값을 운영 p95로 표시하지 않는다.
- 실험 DB·파일·프로세스는 본 작업이 생성한 대상을 확인한 뒤 정리한다. 운영 적용·실제 콘텐츠 발행·OCI/DNS/TLS·provider·timer·외부 알림은 기존의 명시 승인 절차를 따른다.
- 공개 UI는 승인된 화면/상호작용을 인수 기준으로 사용한다. 질문 데이터는 작성자가 기록한 항목의 계약을 따른다.

## 다음 단계

F6 Step 1 `responsive-owner-preview`.
