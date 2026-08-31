# Step 1: share-blog-presentation-formatters

## 선행 조건

- `apps/h-log/phases/search-runtime-alignment/step2.md`를 먼저 완료한다.
- 선행 step이 수정하는 `blog-search-ui.ts`와 관련 UI test가 현재 branch에 반영되고 검증된 뒤에만 이 step을 시작한다.
- 선행 step이 미완료이면 같은 파일을 병렬 수정하거나 임시 호환 계층을 만들지 않고 이 step을 보류한다.

## 읽을 파일

- `apps/h-log/AGENTS.md`
- `apps/h-log/.codex/docs/harness/PRD.md`
- `apps/h-log/.codex/docs/harness/ADR.md`
- `apps/h-log/.codex/docs/harness/ARCHITECTURE.md`
- `apps/h-log/.codex/docs/harness/WORKFLOW.md`
- `apps/h-log/.codex/docs/harness/AGENT_LOOP.md`
- `apps/h-log/.codex/docs/harness/IMPLEMENTATION_PLAN.md`
- `.codex/skills/harness/SKILL.md`
- `.codex/skills/tdd/SKILL.md`
- `apps/h-log/phases/search-runtime-alignment/index.json`
- `apps/h-log/phases/search-runtime-alignment/step2.md`
- `apps/h-log/package.json`
- `apps/h-log/app/blog/page.tsx`
- `apps/h-log/app/blog/[slug]/page.tsx`
- `apps/h-log/lib/blog-search-ui.ts`
- `apps/h-log/lib/blog-search-ui.test.ts`
- `apps/h-log/lib/blog-discovery-ui.test.ts`
- `apps/h-log/lib/blog-detail-ui.test.ts`

## 작업

public blog list, detail, search UI에 흩어진 날짜와 article mode 표시 규칙을 하나의 작은 domain-specific presentation module로 합친다.

- 세 caller의 현재 날짜 출력과 search UI의 invalid-date fallback을 characterization test로 먼저 고정한다.
- module scope에서 native `Intl.DateTimeFormat` 인스턴스를 한 번 만들고 public blog 날짜 formatter가 이를 재사용한다.
- detail 화면의 기존 한국어 article mode label을 canonical mapping으로 삼아 list와 detail이 같은 표시 규칙을 사용하게 한다.
- typed article mode union의 모든 값을 exhaustive mapping으로 다루고 내부 계약상 불가능한 unknown fallback은 추가하지 않는다.
- 각 caller의 중복 local formatter와 mode mapping만 제거한다.
- 파일과 export 이름은 public blog presentation domain을 드러내며 generic `utils` 모듈로 만들지 않는다.

## 인수 기준

- list, detail, search UI의 유효한 날짜가 동일한 `ko-KR` 표시 규칙을 사용한다.
- search UI의 invalid-date fallback과 `<time dateTime>` 원본 값은 유지된다.
- list와 detail의 article mode가 하나의 exhaustive 한국어 label mapping을 공유한다.
- 세 caller에 중복된 local 날짜 formatter와 article mode mapping이 남아 있지 않다.
- 새 date/time dependency를 추가하지 않고 native `Date`와 `Intl.DateTimeFormat`만 재사용한다.
- generic `utils`, hook, provider, strategy 또는 추측성 formatter option을 추가하지 않는다.
- search query 제출, loading, error, focus 상태 계약은 바뀌지 않는다.

```bash
node --no-warnings --test --experimental-strip-types lib/blog-public-presentation.test.ts lib/blog-search-ui.test.ts lib/blog-discovery-ui.test.ts lib/blog-detail-ui.test.ts
npm run test
npm run typecheck
npm run lint
npm run build
git diff --check
```

## 검증

1. `search-runtime-alignment` Step 2의 완료 상태와 변경 파일이 현재 branch에 반영됐는지 확인한다.
2. 기존 세 caller의 valid date, invalid fallback, exhaustive article-mode label 동작을 focused test로 고정한다.
3. domain-specific formatter module을 최소 API로 추가하고 세 caller가 이를 직접 사용하게 한다.
4. package manifest와 lockfile에 date/time dependency가 추가되지 않았는지 확인한다.
5. 320px, 390px, 768px, 1440px viewport에서 list, detail, search 결과의 날짜와 mode text를 확인한다.
6. 기본 앱 gate와 phase 상태 문서를 동기화한다.

## 하지 말 것

- `date-fns`, Day.js, Moment 또는 다른 date/time dependency를 추가하지 말 것. Reason: native `Date`와 `Intl`로 현재 계약을 충분히 표현할 수 있다.
- generic `utils.ts`, formatter registry, strategy, provider를 만들지 말 것. Reason: 세 public blog caller의 실제 중복만 제거한다.
- `search-runtime-alignment` Step 2보다 먼저 `blog-search-ui.ts`를 수정하지 말 것. Reason: 동일 파일의 병렬 변경과 계약 충돌을 피해야 한다.
- locale, timezone, public data shape 또는 검색 상태를 함께 재설계하지 말 것. Reason: 이 step은 presentation 중복 제거에 한정한다.
