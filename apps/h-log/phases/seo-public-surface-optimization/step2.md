# Step 2: metadata-and-structured-data

## 상태와 선행 조건

pending — 계획 등록이며 미구현/미실행.

S1 baseline과 S2의 URL/기본 HTML 계약이 확정돼야 한다.

## 읽을 파일

경로는 저장소 루트 기준이다. S1 이후 생성된 adapter·감사 보고서와 앞 단계의 완료 기록도 먼저 읽는다. 아래 목록은 계획 등록 시 존재하는 파일이다.

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
- `apps/h-log/.codex/docs/harness/SEO_OPTIMIZATION_PLAN.md`
- `apps/h-log/.codex/rules/content-seo-privacy.md`
- `.codex/skills/tdd/SKILL.md`
- `apps/h-log/phases/seo-public-surface-optimization/index.json`
- `apps/h-log/app/layout.tsx`
- `apps/h-log/app/page.tsx`
- `apps/h-log/app/resume/page.tsx`
- `apps/h-log/app/portfolio/[slug]/page.tsx`
- `apps/h-log/app/blog/[slug]/page.tsx`
- `apps/h-log/app/brain/[slug]/page.tsx`
- `apps/h-log/app/opengraph-image.tsx`
- `apps/h-log/components/seo/JsonLd.tsx`
- `apps/h-log/lib/json-ld.ts`
- `apps/h-log/lib/site-seo.test.ts`

## 작업

1. 실제 렌더된 title/description/canonical/OG URL·이미지/한국어 lang을 읽고 S1에서 확인된 상속/누락/중복만 수정한다. 모든 페이지의 metadata를 무조건 새 helper로 추상화하지 않는다.
2. Person/WebSite/BlogPosting의 JSON을 실제 HTML에서 파싱해 작성자·url·날짜·이미지·본문과 대조한다. React escaping/직렬화가 올바른지 특수문자 합성 사례로 검사한다.
3. BreadcrumbList는 실제 보이는 탐색과 유효 링크가 필요할 때만 추가한다. 검색용 리뷰·FAQ·HowTo·성과·author/조직 정보를 만들어 내지 않는다. 미지원/제한된 rich result는 현재 공식 문서를 확인한다.
4. SEO 테스트는 실제 출력 검증을 추가하고 소스 정규식 통과만으로 schema 유효성을 선언하지 않는다. 내용 변경 없이 dateModified를 현재 시각으로 갱신하지 않는다.

## 인수 기준

표본 페이지의 metadata와 JSON-LD가 실제 공개 내용·canonical과 일치하고 특수문자에서도 파싱된다. 외부 rich-result 지원과 구문 유효성을 구분한다.

## 검증

1. 확인된 metadata/JSON-LD 결함의 focused RED→GREEN과 rendered HTML assertion.
2. 서로 다른 slug·없는/철회된 글·특수문자·공개/관리 origin 사례를 점검한다.
3. 기본 gate와 영향받은 화면 검증. 외부 validator는 공개 자료 또는 합성 자료만 사용하고 결과 한계를 기록한다.

Production code를 바꾸면 focused RED→GREEN 뒤 다음 기본 gate를 실행한다. 문서/콘텐츠만 바꾼 경우 관련 파서·형식 검사로 범위를 좁힌다.

```bash
npm run test
npm run lint
npm run typecheck
npm run build
git diff --check
```

## 하지 말 것

- SEO 점수 때문에 비공개 데이터·관리 경로를 공개하지 말 것. 인증/공개 사본 정책이 SEO보다 우선한다.
- 근거 없는 경험·성과·검색량·구조화 데이터를 만들지 말 것. 기존 공개 근거와 한국어 작성 기준을 보존한다.
- 원격 installer·extension·새 provider·전체 upstream agent 실행을 자동 적용하지 말 것. 이 단계에서 필요한 자료와 도구만 사용한다.
- 운영 보류를 해제하거나 DNS/TLS·GSC 제출·실제 글/PDF 발행을 계획 승인만으로 수행하지 말 것. 로컬 변경과 외부 상태 변경은 별도 범위다.
- Home 레이더·승인된 Brain UI·DB published-current/hash를 SEO 작업에 섞어 전면 변경하지 말 것.

## 다음 단계

S2 Step 3 `measured-page-performance`.
