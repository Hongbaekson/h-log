# Step 0: visible-verification-and-revisions

## 개선 사항

검증 범위와 수정 이력. 이전 phase `portfolio-evidence-experience` 완료 후 실행한다.

## 읽을 파일

모든 경로는 저장소 루트 기준이다. 아래 파일과 수정 대상의 실제 caller를 확인한다.

- `AGENTS.md`
- `apps/h-log/AGENTS.md`
- `.codex/skills/harness/SKILL.md`
- `.codex/skills/tdd/SKILL.md`
- `apps/h-log/.codex/docs/harness/PRD.md`
- `apps/h-log/.codex/docs/harness/ADR.md`
- `apps/h-log/.codex/docs/harness/ARCHITECTURE.md`
- `apps/h-log/.codex/docs/harness/WORKFLOW.md`
- `apps/h-log/.codex/docs/harness/AGENT_LOOP.md`
- `apps/h-log/.codex/docs/harness/IMPLEMENTATION_PLAN.md`
- `apps/h-log/.codex/docs/harness/UI_GUIDE.md`
- `apps/h-log/.codex/rules/frontend.md`
- `apps/h-log/.codex/rules/content-seo-privacy.md`
- `apps/h-log/.codex/docs/harness/PUBLIC_EXPERIENCE_PLAN.md`
- `apps/h-log/phases/editorial-trust-and-series/index.json`
- `apps/h-log/lib/blog-content-model.ts`
- `apps/h-log/lib/blog-postgres-repository.ts`
- `apps/h-log/lib/blog-public.ts`
- `apps/h-log/app/blog/[slug]/page.tsx`

## 작업

현재 저장되는 날짜·버전·출처의 의미를 먼저 확인하고 공개 가능한 수정 이유와 검증 범위만 노출한다. 단순 post.updatedAt을 실험 검증일로 부르지 않는다. 과거 private version 본문과 내부 evidence path를 공개하지 않는다. 실제 저장 계약이 없으면 최소 persistence 변경과 migration을 별도 검증한다.

## 인수 기준

수집 시각/원문 발행일/글 수정일/직접 검증일을 혼동하지 않는다. 근거 없는 검증 badge가 생성되지 않으며 private revision이 public 응답에 섞이지 않는다.

앱 디렉터리에서 가까운 검증 후 기본 gate를 실행한다.

```bash
node --no-warnings --test --experimental-strip-types lib/blog-public.test.ts lib/blog-content-model.test.ts
npm run test
npm run lint
npm run typecheck
npm run build
git diff --check
```

## 검증

1. 바꾸는 public behavior의 RED를 확인한 뒤 최소 구현으로 같은 테스트의 GREEN을 확인한다. 순수 콘텐츠/문서 변경은 파서·링크·형식 검증으로 대체한다.
2. UI는 개발 서버와 격리 local DB의 synthetic fixture로 1440/390/320px, focus, 긴 글, 빈/오류 상태를 확인한다. DB/repository/worker/migration 변경 시 `npm run test:integration`을 추가한다.
3. phase index와 이 step에 실제 결과·검증 command·다음 단계를 기록한다. 완료된 기능만 completed로 표시한다.

## 하지 말 것

- 레이더의 데이터·축·형태·배치·주변 영역을 변경하지 말 것. 사용자가 명시적으로 보존을 요청했다.
- 저장 Markdown/HTML/hash나 기존 URL을 무단 재작성하지 말 것. 발행 무결성과 기존 링크를 유지해야 한다.
- raw HTML 주입, private 글/내부 evidence/근거 없는 실적 노출을 허용하지 말 것. 공개 콘텐츠 경계를 유지해야 한다.
- OCI·DNS/TLS·운영 timer·실제 provider 호출·공개 발행을 실행하지 말 것. 로컬 개선 계획이며 기존 OCI 보류는 유지된다.

## 완료 기록 — 2026-10-20

- 날짜의 의미를 확인했다. `posts.updated_at`은 철회 등 상태 변경에도 갱신되며 `post_sources.fetched_at`은 수집 시각이다. `post_versions.created_at`·`version_no`는 공개 수정일이나 실험 검증일이 아니다. 원문 발행일과 직접 검증일을 이 값으로 추정하지 않는다.
- Migration `005_blog_public_editorial`은 `post_versions`에 nullable JSONB `public_editorial` 하나를 추가한다. 기존 aggregate `savePost`에서 공개용 검증 방법·확인 날짜·범위·한계와 수정 날짜·요약을 선택적으로 저장한다. 작성자가 공개하기로 선별한 스냅샷이며 과거 버전을 자동으로 요약하거나 복사하지 않는다. writer·worker에서 자동 생성하지 않으며 별도 관리 화면은 추가하지 않았다(ADR-035).
- `lib/blog-editorial.ts`에서 허용된 필드·방법, 유효한 날짜, 필수 범위/한계, 텍스트 길이·개수, privacy 정책과 내부 경로를 검사한다. 저장할 때 부적합한 기록은 거절하고 기존 public 조회에서는 해당 기록만 생략한다. 현재 published 버전의 기록만 반환하므로 과거 private 본문·제목·수정 이유를 노출하지 않는다. 내부 claim/verification/audit 테이블은 읽지 않는다.
- 상세 본문 뒤에 확인 방법·날짜·범위·한계와 native details의 공개 수정 기록을 표시한다. 문서 검토/로컬 재현/운영 관찰을 구분하며 기록이 없는 글에는 영역이나 검증 배지를 만들지 않는다. 수정 기록은 명시한 날짜 내림차순으로 표시한다. 발행일이 누락된 상세는 `발행일 미기록`으로 표시하며 JSON-LD `datePublished`를 생략한다. `dateModified`는 공개 수정 기록에 있을 때만 제공한다. 기존 목록·탐색의 정렬용 날짜 fallback은 이번 범위에서 변경하지 않았다.
- 공개 selector와 입력 검증 RED 2개 → focused `node --no-warnings --test --experimental-strip-types lib/blog-public.test.ts lib/blog-content-model.test.ts` 61/61 GREEN. Migration/repository RED 2개 → 6/6 GREEN. UI 영역 누락과 발행일 누락 fallback도 브라우저 RED→GREEN으로 확인했다. 최종 검토에서 배열 형태의 method와 괄호 안 내부 경로를 거부하는 실패 테스트를 추가해 보완했다.
- `npm run test`: 222 pass / 14 DB integration skip. 로컬 PostgreSQL에 한정해 `npm run test:integration` 전체 15/15 통과: migration 1, repository 5, public read 1, worker 6, dry-run 1, Brain 1. 새 기록의 저장/재조회, 현재 버전만 공개, 잘못된 입력의 원자적 거절, 부적합한 저장 기록 생략과 철회를 확인했다. `npm run lint`, `npm run typecheck`, `npm run build`, Markdown/JSON·상대 링크·phase 검사와 `git diff --check`도 통과했다.
- 격리 DB 합성 자료로 1440/390/320px, 세 방법의 날짜 구분, 빈 기록·수정만 있는 기록, 접기/펼치기와 키보드 초점, 긴 텍스트, 잘못된 기록 생략, 미발행/철회/current-version 누락 404, JavaScript 없는 읽기를 검수했다. 별도 로컬 production 서버에서 DB 실패 안내·같은 경로 재시도·기록 미노출을 확인했다. Home/레이더 geometry·SVG와 저장 Markdown/HTML/hash, Markdown endpoint는 동일하다.
- 스크립트·합성 fixture·화면·결과는 Git/Docker 제외 경로 `private/editorial-trust-check/`에 있다. 실제 글·운영 DB·외부 provider·OCI·timer는 변경하지 않았다. 향후 승인된 운영 적용 시 migration 005를 새 web/worker 쓰기보다 먼저 적용해야 한다.

다음은 [Step 1: ordered-series](step1.md)다. Steps 1–2와 phase 전체는 pending이다.
