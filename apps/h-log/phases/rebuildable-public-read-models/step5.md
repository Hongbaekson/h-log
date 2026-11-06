# Step 5 versioned-crawler-outputs

## 상태와 선행 조건

pending — 2026-11-06 등록한 F3의 크롤러 출력의 선택 생성과 재사용 단계다. 구현 완료 판정은 이 파일의 인수 기준과 검증 결과로 한다.

F3 Step 4와 F2 Step 1 완료.

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
- `apps/h-log/lib/blog-crawler-output.ts`
- `apps/h-log/lib/blog-post-publish-verification.ts`
- `apps/h-log/app/feed.xml/route.ts`
- `apps/h-log/app/llms.txt/route.ts`
- `apps/h-log/app/llms-full.txt/route.ts`
- `apps/h-log/app/sitemap.xml/route.ts`
- `apps/h-log/app/blog-markdown/[slug]/route.ts`
- `apps/h-log/lib/blog-crawler-output.test.ts`
- `apps/h-log/lib/blog-required-publish-job-adapter.ts`

## 범위와 산출물

크롤러 출력의 선택 생성과 재사용을 한 작업 단위로 수행한다. 전체 설계·측정 조건·인계는 [성능 및 재생성 계획](../../.codex/docs/harness/PERFORMANCE_REBUILD_PLAN.md)을 따른다.

## 작업

1. 요청한 feed/llms/sitemap 출력만 생성한다. 전체본문을 요구하는 llms-full과 주소/요약 출력의 작업량을 구분한다.
2. 공개 generation·canonical origin·출력 schema에 묶인 산출물을 준비한다. 메모리 상한과 큰 출력의 생성/전송 방법을 정하고 현재 공개 generation을 확인한다.
3. 발행/철회·원본 변경·재생성 이후 HTML 읽기와 crawler 상태가 일치하는지 검수한다. 브라우저/CDN HTTP 캐시의 stale 응답도 검수한다.

## 인수 기준

- 한 출력 요청에 사용하지 않는 전체 문자열을 만들지 않는다. XML/Markdown·원문 hash·현재 공개 URL이 기존 계약과 일치한다.
- rebuild/rollback/철회 직후 동일 URL 재요청에서 오래된 공개 결과를 차단한다. F1의 비용과 peak memory를 비교한다.

## 검증

Production 동작을 수정할 때는 focused RED의 예상 실패를 확인한 뒤 GREEN으로 진행한다. 실행 디렉터리는 `apps/h-log`이며 DB/HTTP 명령은 각 test의 opt-in·fixture 계약을 읽고 격리 loopback 환경에서 실행한다. 새 회귀의 파일/명령과 F1 benchmark 결과를 완료 기록에 남긴다.

가까운 검증 명령은 다음과 같다.

```bash
node --no-warnings --experimental-strip-types --test lib/blog-crawler-output.test.ts lib/blog-required-publish-job-adapter.test.ts
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

F4 Step 0 `search-document-and-index`. 독립 실행 조건은 전체 계획을 따른다.
