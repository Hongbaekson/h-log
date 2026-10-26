# Step 4: evidence-based-content-and-links

## 상태와 선행 조건

pending — 계획 등록이며 미구현/미실행.

S1의 고립된 글/검색 의도 목록과 현재 공개 콘텐츠가 필요하다.

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
- `apps/h-log/.codex/docs/harness/BLOG_WRITING_GUIDE.md`
- `apps/h-log/.codex/docs/harness/BLOG_READING_REVIEW.md`
- `apps/h-log/lib/blog-editorial.ts`
- `apps/h-log/lib/blog-series.ts`
- `apps/h-log/lib/portfolio-posts.ts`
- `apps/h-log/lib/blog-crawler-output.ts`
- `apps/h-log/lib/blog-public.ts`
- `apps/h-log/app/llms.txt/route.ts`
- `apps/h-log/app/llms-full.txt/route.ts`

## 작업

1. 공개 근거가 있는 실제 문제·선택 이유·해결·검증 한계와 독자의 질문을 연결한다. 이름/포트폴리오와 기술 문제 키워드를 분리하고 근거 없는 검색량·성과를 만들지 않는다.
2. 한 번에 대표 글 1편과 연결된 project/series를 대상으로 제목·요약·첫 문단·출처·다음 읽기 후보를 정리한다. 자연스러운 한국어 작성 가이드를 적용하고 keyword density/최소 단어 수를 목표로 늘리지 않는다.
3. 현재 공개 버전을 직접 덮어쓰지 않는다. 원고 교정은 별도 비공개 후보와 변경 비교를 만들고 기존 발행/검토 절차를 따른다. SQL로 published 본문/hash를 수정하거나 새 글을 자동 발행하지 않는다.
4. 기존 프로젝트↔글/시리즈 연결을 재사용해 고립된 공개 글만 연결한다. 글 원문·숫자·코드·직접 경험 표현을 바꾸는 경우 출처를 확인한다.
5. HTML/Markdown/feed/llms가 동일 공개 버전을 설명하는지 확인한다. GEO 권고는 읽기·근거·출처 개선에 사용하고 AI 전용 파일/markup이나 llms의 사이트 전체 확장을 점수 목적으로 추가하지 않는다.

## 인수 기준

확인한 검색 의도와 근거에 맞는 원고/링크 개선 후보, 사실 보존 비교와 공개 승인 상태가 남는다. 실제 발행 없이 준비가 완료된 경우 이를 구분한다.

## 검증

1. 글/프로젝트/시리즈의 link 목적지·현재 공개 제목·withdrawal·고립 여부를 확인한다.
2. 동일 버전의 HTML/Markdown/crawler 결과와 privacy 검증. 콘텐츠만 변경하면 관련 파서/형식 검사, 코드 변경 시 focused RED→GREEN 및 기본 gate.
3. 사실/수치/코드/날짜·인용 출처의 변경을 문체 수정과 분리해 수동 대조한다.

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

S3 Step 0 `local-seo-release-rehearsal`.
