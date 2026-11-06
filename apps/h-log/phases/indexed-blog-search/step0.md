# Step 0 search-document-and-index

## 상태와 선행 조건

pending — 2026-11-06 등록한 F4의 검색 문서와 인덱스 단계다. 구현 완료 판정은 이 파일의 인수 기준과 검증 결과로 한다.

F3 Step 3 완료. R4 태그 별칭이 구현됐다면 그 계약을 함께 적용한다.

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
- `apps/h-log/lib/blog-search.ts`
- `apps/h-log/lib/blog-search-ui.ts`
- `apps/h-log/lib/blog-public.ts`
- `apps/h-log/lib/blog-content-model.ts`
- `apps/h-log/lib/blog-search.test.ts`
- `apps/h-log/lib/blog-search-ui.test.ts`
- `apps/h-log/phases/blog-tag-and-link-polish/step0.md`

## 범위와 산출물

검색 문서와 인덱스을 한 작업 단위로 수행한다. 전체 설계·측정 조건·인계는 [성능 및 재생성 계획](../../.codex/docs/harness/PERFORMANCE_REBUILD_PLAN.md)을 따른다.

## 작업

1. 현재 NFKC·대소문자·공백/토큰·부분 일치·태그·점수/동점 정렬 규칙을 characterization으로 고정한다. 원본 변경 때 정규화 search_text를 재생성한다.
2. PostgreSQL 후보 검색과 pg_trgm 등 index를 한국어/영문/2자 fixture로 비교한다. wildcard 문자·다중 토큰·공백과 zero-result도 포함한다.
3. 검색기/정규화/태그 사전 버전을 fingerprint에 넣고 rebuild 명령을 연결한다. 비용 대비 이득이 확인된 최소 index를 채택한다.

## 인수 기준

- 기존 함수와 후보 ID·점수·정렬·태그 결과를 비교해 동등성을 입증한다. 짧은 패턴의 full scan도 실행 계획과 시간으로 기록한다.
- search projection 삭제·버전 변경 후 같은 원본에서 복구된다. 현재 공개 version join과 쿼리 입력 경계가 검증된다.

## 검증

Production 동작을 수정할 때는 focused RED의 예상 실패를 확인한 뒤 GREEN으로 진행한다. 실행 디렉터리는 `apps/h-log`이며 DB/HTTP 명령은 각 test의 opt-in·fixture 계약을 읽고 격리 loopback 환경에서 실행한다. 새 회귀의 파일/명령과 F1 benchmark 결과를 완료 기록에 남긴다.

가까운 검증 명령은 다음과 같다.

```bash
node --no-warnings --experimental-strip-types --test lib/blog-search.test.ts lib/blog-search-ui.test.ts
npm run test:migrations
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

F4 Step 1 `single-read-search-flow`.
