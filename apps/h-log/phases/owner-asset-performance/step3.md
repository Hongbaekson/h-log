# Step 3 rebuildable-thumbnail-variants

## 상태와 선행 조건

pending — 2026-11-06 등록한 F6의 원본에서 만드는 표시 크기별 썸네일 단계다. 구현 완료 판정은 이 파일의 인수 기준과 검증 결과로 한다.

F6 Step 2 완료.

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
- `apps/h-log/components/blog/BlogPostThumbnail.tsx`
- `apps/h-log/components/blog/BlogPostRow.tsx`
- `apps/h-log/lib/blog-thumbnails.ts`
- `apps/h-log/lib/blog-diagram-assets.ts`
- `apps/h-log/lib/blog-public.test.ts`
- `apps/h-log/package.json`
- `apps/h-log/package-lock.json`
- `apps/h-log/Dockerfile`

## 범위와 산출물

원본에서 만드는 표시 크기별 썸네일을 한 작업 단위로 수행한다. 전체 설계·측정 조건·인계는 [성능 및 재생성 계획](../../.codex/docs/harness/PERFORMANCE_REBUILD_PLAN.md)을 따른다.

## 작업

1. 보관된 공개 가능한 원본 바이트와 크기·형식·도구 버전에 묶인 로컬 파생 이미지 생성 계약을 만든다. 설치된 이미지 도구와 기존 asset 모델을 우선 사용한다.
2. 사용 화면에 맞는 제한된 variant를 생성하고 명시된 경로·hash·dimensions·원본 관계를 기록한다. responsive 전달과 실패 시 텍스트 표시를 검수한다.
3. 원본은 별도 보관하고 파생 파일만 삭제한 뒤 재생성한다. 실제 원본이 없는 경우 명시한 합성 이미지로 결과와 제한을 남긴다.

## 인수 기준

- 원본 hash가 보존되고 같은 설정에서 파생 결과를 재현한다. 저장 공간/동시 생성/입력 크기 상한이 있다.
- 실제 전송 bytes와 CLS·모바일 선명도를 비교하며 누락/손상/버전 변경·출처/alt 회귀가 통과한다.

## 검증

Production 동작을 수정할 때는 focused RED의 예상 실패를 확인한 뒤 GREEN으로 진행한다. 실행 디렉터리는 `apps/h-log`이며 DB/HTTP 명령은 각 test의 opt-in·fixture 계약을 읽고 격리 loopback 환경에서 실행한다. 새 회귀의 파일/명령과 F1 benchmark 결과를 완료 기록에 남긴다.

가까운 검증 명령은 다음과 같다.

```bash
node --no-warnings --experimental-strip-types --test lib/blog-public.test.ts
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

F7 Step 0 `bounded-public-db-waits`. 독립 실행 조건은 전체 계획을 따른다.
