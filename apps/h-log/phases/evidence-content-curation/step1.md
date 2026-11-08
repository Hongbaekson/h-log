# Step 1: evidence-case-manuscript

## 상태와 선행 조건

completed — 2026-11-09. 기존 Home/Suspense 원고를 재사용해 재현 명령·근거·현재성을 보완하고 검수했다. [원고 검수 결과](../../.codex/docs/harness/EVIDENCE_CASE_MANUSCRIPT_REVIEW.md)에 범위와 인계를 남겼다.

R2 Step 0은 2026-11-09 완료했다. [근거 대장](../../.codex/docs/harness/CURRENT_CLAIMS_INVENTORY.md)의 R2-C01을 사용하고 S2 Step 4에서 검수한 Home/Suspense 원고를 재사용한다. 이 step의 원고 재검수를 완료했고 실제 발행은 별도다.

## 읽을 파일

경로는 저장소 루트 기준이다. 선행 step의 완료 기록과 현재 호출 경로를 먼저 확인한다.

- `AGENTS.md`
- `apps/h-log/AGENTS.md`
- `.codex/skills/harness/SKILL.md`
- `.codex/skills/sync-repos/SKILL.md`
- `.codex/skills/tdd/SKILL.md`
- `apps/h-log/.codex/docs/harness/PRD.md`
- `apps/h-log/.codex/docs/harness/ADR.md`
- `apps/h-log/.codex/docs/harness/ARCHITECTURE.md`
- `apps/h-log/.codex/docs/harness/WORKFLOW.md`
- `apps/h-log/.codex/docs/harness/AGENT_LOOP.md`
- `apps/h-log/.codex/docs/harness/IMPLEMENTATION_PLAN.md`
- `apps/h-log/.codex/docs/harness/KNOWLEDGE_CONTENT_IMPROVEMENT_PLAN.md`
- `apps/h-log/.codex/rules/content-seo-privacy.md`
- `apps/h-log/.codex/docs/harness/BLOG_WRITING_GUIDE.md`
- `apps/h-log/.codex/docs/harness/SEO_CONTENT_LINK_REVIEW.md`
- `apps/h-log/.codex/docs/harness/CURRENT_CLAIMS_INVENTORY.md`
- `apps/h-log/.codex/docs/harness/PERFORMANCE_REBUILD_PLAN.md`
- `apps/h-log/lib/blog-editorial.ts`
- `apps/h-log/lib/blog-public.ts`
- `apps/h-log/lib/blog-privacy-scanner.ts`
- `apps/h-log/lib/blog-article-generation.ts`
- `apps/h-log/lib/portfolio-posts.ts`

## 범위와 산출물

이 step의 단위는 **재현 근거가 있는 기술 글 한 편**이다. 아래 관련 파일과 선행 계약에서 필요한 최소 변경만 한다. main 계획의 기존 구현/후속 범위를 구분하고 완료된 phase를 다시 열지 않는다.

## 작업

1. 한 사례만 골라 상황→비교한 대안→선택→재현/확인→한계로 정리한다. 이미 준비한 원고가 기준을 충족하면 새 글을 억지로 만들지 않는다.
2. 실제 관찰/로컬 재현/문서 검토를 구분하고 버전·조건·실행 순서·결과 범위와 실패한 대안을 기록한다. 코드를 보고 당시의 경험이나 감정을 만들어 쓰지 않는다.
3. 공개 가능한 재현 명령·정제된 자료와 참고 링크를 선별한다. 외부 재현 저장소 생성·게시 없이 로컬 검토본으로 준비한다. 자연스러운 한국어로 다듬되 명령·숫자·출처와 한계를 보존한다.
4. 본문/claim 대장/기존 editorial 정보가 일치하는지 파서·privacy·출처 검사로 검수한다. DB 공개 검증은 별도 합성 또는 승인된 복사본으로 수행한다.

## 인수 기준

검수 가능한 원고 한 편과 claim별 근거·미확인 범위·현재성 기록이 준비된다. 준비 완료와 실제 발행을 분리하며 부족한 경험은 회고 초안으로 유지한다.

## 검증

문서/비공개 원고만 변경하면 파싱·claim/출처/개인정보·원문/hash 보존과 `git diff --check`를 검수한다. 카탈로그·mapping 등 앱 코드/공개 데이터를 바꾸면 TDD 스킬을 읽고 focused RED→GREEN 및 아래 기본 gate를 추가한다. UI를 바꾸면 개발 서버 1440/390/320px도 확인한다.

```bash
node --no-warnings --experimental-strip-types --test lib/blog-public.test.ts lib/blog-privacy-scanner.test.ts
```

가까운 명령은 `apps/h-log`에서 실행한다. DB/HTTP opt-in과 fixture 설정은 해당 script를 먼저 읽고 loopback 격리 환경에만 주입한다. 새 동작의 focused test는 기존 가까운 test에 추가하고 이름/명령을 완료 기록에 남긴다.

코드 변경 시 기본 gate:

```bash
npm run test
npm run lint
npm run typecheck
npm run build
git diff --check
```

기존 Git 제외 private helper의 lint 오류와 이번 변경의 회귀를 분리하고, 기본 명령의 실패를 숨기지 않는다. 문서 전용 단계는 위 기본 gate 대신 해당 형식 검증만 실행한다. 관련 명령·결과·실제 변경 파일·남은 한계를 step과 index에 기록한다.

## 하지 말 것

- Second Brain의 sidebar·canvas·배치·검색/필터·reader 모양과 Home 레이더를 바꾸지 말 것. 사용자가 현재 UI 유지를 명시했다.
- 원문/과거 버전을 수정하거나 미선택 변경을 자동 공개하지 말 것. 기존 불변 이력과 공개 사본 계약이 기준이다.
- 회사 Wiki·내부 식별자·확인되지 않은 감정/성과를 자료 수집이나 공개 노드로 채우지 말 것. 출처와 본인 확인이 있는 범위만 다룬다.
- 계획 등록을 운영 배포·실제 발행·DNS/TLS·provider·timer·외부 알림 승인으로 해석하지 말 것. 기존 운영 보류가 유지된다.
- 방문자 AI·댓글·공개 통계·새 도메인·별도 그래프/서비스를 추가하지 말 것. 이번 개선 단위와 관계없다.

## 완료 기록 — 2026-11-09

같은 원고 한 편의 후속 검토본을 준비했다. 과거 44개 테스트·대안 분석 날짜를 명확히 하고, 요청 단위 React cache와 공유 요약 캐시를 구분했다. commit·Node/Next/React 버전과 재현 명령, 이번 47개 단위 결과, 합성 성능 관찰과 미구현 계획의 경계를 추가했다. Korean 스킬로 산문 2곳을 교정하고 protected span을 비교했다.

주장 16개·출처 25개를 검수했고 외부 공식 문서 2개를 재확인했다. 원본·이전 manifest와 기존 자료 시각은 보존했다. 사실 보완본·교정본·claim·editorial 제안·diff·검증은 Git/Docker 제외 `private/r2-manuscript-2026-11-09/`에 있다. 원고 전체는 공개 데이터나 앱 코드에 추가하지 않았다.

공개 읽기/개인정보 **47/47**, 원고·editorial 파싱/기본 privacy/출처/문체 보존/현재 제목·메모리 공개 경계와 문서/JSON/링크/경로/diff 검수를 통과했다. 메모리 drafted 후보는 공개 0건이며 DB/HTTP/브라우저와 전체 앱 gate는 이번 실행에 포함하지 않는다. 로컬 helper의 URL 정규식·CRLF 가정을 수정한 뒤 검수를 통과했다. 자세한 명령·hash·한계는 위 검수 결과를 따른다.

R2는 2/3 완료, R은 completed 5·pending 9다. 변경 파일은 원고 검수 요약, 이전 근거 대장의 후속 링크, 이 step과 Step 2 읽을 파일, R2/전체 index, 기록 개선/성능/구현 계획과 루트 자동 블로그 계획이다. 다음은 R2 Step 2의 기록 후보 준비다.

## 다음 단계

R2 Step 2 `principle-and-revisit-drafts`.
