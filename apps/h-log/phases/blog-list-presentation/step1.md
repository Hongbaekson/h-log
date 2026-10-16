# Step 1: optional-verified-thumbnails

## 개선 사항

검증된 이미지의 선택적 목록 표시. 같은 phase Step 0을 완료한다. 기존 asset·공개 조회 계약과 실제 사용 가능한 이미지를 먼저 확인한다.

## 읽을 파일

경로는 저장소 루트 기준이다. 수정 전 아래 파일과 실제 caller를 확인한다. T1 Step 0 이후에는 그 단계에서 만든 작성 가이드와 비공개 검수 초안도 읽는다.

- `AGENTS.md`
- `apps/h-log/AGENTS.md`
- `.codex/skills/harness/SKILL.md`
- `apps/h-log/.codex/docs/harness/PRD.md`
- `apps/h-log/.codex/docs/harness/ADR.md`
- `apps/h-log/.codex/docs/harness/ARCHITECTURE.md`
- `apps/h-log/.codex/docs/harness/WORKFLOW.md`
- `apps/h-log/.codex/docs/harness/AGENT_LOOP.md`
- `apps/h-log/.codex/docs/harness/IMPLEMENTATION_PLAN.md`
- `apps/h-log/.codex/docs/harness/BLOG_EDITORIAL_READING_PLAN.md`
- `apps/h-log/.codex/rules/content-seo-privacy.md`
- `.codex/skills/tdd/SKILL.md`
- `apps/h-log/.codex/docs/harness/UI_GUIDE.md`
- `apps/h-log/.codex/rules/frontend.md`
- `apps/h-log/phases/blog-list-presentation/index.json`
- `apps/h-log/lib/blog-diagram-assets.ts`
- `apps/h-log/lib/blog-content-model.ts`
- `apps/h-log/lib/blog-public.ts`
- `apps/h-log/lib/blog-public-source.ts`
- `apps/h-log/lib/blog-postgres-repository.ts`
- `apps/h-log/components/blog/BlogSearchPanel.tsx`
- `apps/h-log/app/blog/(index)/page.tsx`
- `apps/h-log/lib/blog-public.test.ts`
- `apps/h-log/lib/blog-search.test.ts`

## 작업

1. 현재 post version/hash에 연결되고 공개 가능한 자산 중 목록에 쓸 이미지를 명시적으로 선택하는 최소 계약을 정한다. 기존 verified asset 경계를 우선 사용하며 본문 첫 이미지나 임의 원격 URL을 자동으로 대표 이미지로 고르지 않는다.
2. 일반 목록과 검색 결과에 같은 선택/제외 규칙을 적용한다. 이미지가 없으면 빈 박스 없이 텍스트 행으로 표시하고, 있으면 데스크톱 오른쪽·모바일 단일 열에서 제목 읽기를 방해하지 않게 배치한다.
3. 이미지 크기를 예약하고 적절한 대체 텍스트, 깨진 이미지 fallback, 긴 제목과의 배치를 확인한다. 실제 공개 자산이 없으면 UI 검증용 fixture만 격리 사용하고 실물 이미지 적용 여부를 별도 기록한다.
4. DTO/repository/DB 변경이 필요하면 이 선택적 필드에 한정한 최소 변경과 migration 검증을 수행한다. 새 업로드 관리 화면, 이미지 생성 파이프라인, 외부 이미지 수집은 추가하지 않는다.

## 인수 기준

이미지 있는/없는 글이 섞인 목록·검색 결과가 같은 규칙을 사용한다. private/retracted/current-version 불일치·hash 불일치·허용되지 않은 자산은 표시되지 않으며 이미지 실패가 글 링크를 막지 않는다. 실제 자산 적용과 synthetic UI 검증을 구분한다.

## 검증

앱 명령은 `apps/h-log`에서 실행한다. production behavior 변경은 가까운 실패를 먼저 확인한 뒤 같은 검증의 GREEN을 남긴다.

```bash
node --no-warnings --test --experimental-strip-types lib/blog-public.test.ts lib/blog-search.test.ts lib/blog-discovery-ui.test.ts
npm run test
npm run lint
npm run typecheck
npm run build
git diff --check
```

DB/repository/migration을 변경하면 격리 DB에서 npm run test:integration을 실행하고 현재 version 교체·철회 후 이미지도 사라지는지 확인한다.

개발 서버의 1440/390/320px에서 화면과 키보드를 확인한다. 로컬 fixture·DB만 사용하고 Home/레이더 및 Second Brain 변경이 없는지 diff를 확인한다.

완료 시 이 파일과 phase index에 변경 파일·명령·실제 결과·다음 step을 기록하고 전체 registry와 관련 계획을 동기화한다. 아직 실행하지 않은 항목은 pending으로 둔다.

## 하지 말 것

- 확인되지 않은 경험·성과·감정을 추가하지 말 것. 이유: 개인 기록의 사실 범위를 보존해야 한다.
- 회사 원문·내부 식별자·private 버전·토스 원문/이미지를 공개 콘텐츠로 복사하지 말 것. 이유: 승인된 근거와 자산만 사용한다.
- Home/레이더·Second Brain·무관한 schema나 기능을 변경하지 말 것. 이유: 이번 단위는 Blog의 문체와 읽기 개선이다.
- 저장 글을 일괄 수정/삭제하거나 OCI·실제 provider·자동 공개 발행·timer를 실행하지 말 것. 이유: 이 로컬 개선 계획은 기존 운영 보류와 발행 경계를 변경하지 않는다.

## 완료 기록 — 2026-10-16

- `lib/blog-thumbnails.ts`에서 기존 `type=image`와 `/blog-assets/thumbnails/<SHA-256>.png|webp`를 명시적 선택으로 정했다(ADR-033). `blog-diagram-assets.ts`의 verified predicate를 공유하고 현재 공개 버전·본문 hash·ready/verifiedAt/alt·자산 hash/경로를 확인한다. 공통 `blog-public-source.ts`는 선택 파일의 실제 SHA-256을 검사하며 누락·불일치는 글을 유지한 채 제외한다. DB/repository/migration 변경은 없다.
- `blog-public.ts`, `blog-search.ts`, `blog-search-ui.ts`가 같은 썸네일 DTO를 전달한다. 공통 `BlogPostRow`와 새 `BlogPostThumbnail`, 일반 목록 page와 `BlogSearchPanel`에서 데스크톱 오른쪽·모바일 텍스트 아래에 표시한다. 크기를 예약하고 원본 비율과 alt를 보존한다. 이미지 실패 시 빈 박스 없이 텍스트와 상세 링크를 유지한다.
- 기존 초안의 선택·파일 검증 테스트는 characterization으로 확인했다. 추가 RED는 본문 hash가 잘못된 경우 썸네일이 남는 실패와 검색 view item의 thumbnail 누락, 브라우저의 `two verified thumbnails must render: 0 !== 2`였다. 최소 수정 뒤 같은 검증이 GREEN이다.
- 집중 명령: `node --no-warnings --test --experimental-strip-types lib/blog-public.test.ts lib/blog-search.test.ts lib/blog-discovery-ui.test.ts lib/blog-search-ui.test.ts` **64/64**. 전체 `npm run test` **213 pass/13 DB skip**, `npm run lint`, `npm run typecheck`, `npm run build` 통과. 격리 로컬 DB의 `npm run test:public-read-path` **1/1** 통과.
- 개발 서버 1440/390/320px에서 목록/검색 각각 이미지 유무 혼합, 크기 예약·alt, 긴 제목·가로 넘침, 키보드 초점, 실패 후 이미지 생략과 상세 링크 접근을 확인했다. HTTP로 private/retracted 제외, cache hit의 실제 파일 hash 변조, 다른 버전 자산·현재 버전 교체·철회 후 제외를 확인했다. 스크립트·캡처·결과는 Git/Docker 제외된 `private/blog-thumbnail-check/`에 둔다.
- 실제 공개 적용 대상으로 확인된 이미지는 없어 합성 PNG 1개와 별도 로컬 DB의 가상 글만 사용했다. 실물 이미지 선정·배포는 별도다. `public/` 정적 파일의 직접 URL을 철회하는 기능은 포함하지 않으므로 자산은 독립적으로 공개 가능해야 한다.
- Home/레이더·Second Brain 파일과 저장 Markdown/HTML/hash, 운영 OCI·provider·발행·timer는 변경하지 않았다. 문서/JSON·상대 링크·phase 상태와 `git diff --check`를 확인한 뒤 커밋한다.
- 다음: **T3 `blog-reading-polish / Step 0: article-reading-rhythm`**. 기존 `blog-discovery-and-home / Step 3`는 별도 pending이다.
