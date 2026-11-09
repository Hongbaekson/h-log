# Step 1: curated-reading-paths

## 상태와 선행 조건

pending — 2026-11-05 계획 등록. R3 / 공개 글과 기록 연결: 한 사례를 잇는 편집된 읽기 경로. 아직 구현/실행하지 않았다.

R2 후보 검수 및 R3 Step 0은 완료했다. [현재 공개 출처 검수](../../.codex/docs/harness/PUBLISHED_BRAIN_SOURCE_REVIEW.md)의 응답 투영·철회 경계를 재사용한다.

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
- `apps/h-log/lib/blog-series.ts`
- `apps/h-log/lib/blog-series.test.ts`
- `apps/h-log/lib/portfolio-posts.ts`
- `apps/h-log/lib/blog-public.test.ts`
- `apps/h-log/lib/brain-catalog.ts`
- `apps/h-log/components/blog/BlogSeries.tsx`
- `apps/h-log/.codex/docs/harness/BLOG_SERIES_READINESS.md`

## 범위와 산출물

이 step의 단위는 **한 사례를 잇는 편집된 읽기 경로**이다. 아래 관련 파일과 선행 계약에서 필요한 최소 변경만 한다. main 계획의 기존 구현/후속 범위를 구분하고 완료된 phase를 다시 열지 않는다.

## 작업

1. Portfolio의 문제/역할→Blog의 선택·재현→Brain의 재사용 기준/질문을 한 사례로 연결한다. 기본은 기존 프로젝트 mapping·시리즈·출처·관계 영역을 사용한다.
2. 실제 글이 있는 소수 주제만 짧은 소개와 시작 글·후속 글로 묶는다. 독립 주제 landing route나 별도 CMS를 새로 만들지 않고 기존 시리즈/본문으로 먼저 편집한다.
3. 각 위치에서 현재 제목과 연결 이유를 확인하고 비공개·철회·누락·빈 시리즈는 기존 공개 정책대로 제외한다. Blog→Brain은 R3 Step 0의 현재 공개 역방향 연결을 사용한다. 본문의 과거 참조 URL과 이 관리되는 연결의 철회 범위를 혼동하지 않는다.
4. 실제 발행 전에는 합성 DB와 검토 원고로 왕복 경로를 확인한다. 공개 글이 없는 환경에서 가짜 빈 길잡이나 데모 글을 채우지 않는다. 시리즈 admin 편집 필요성은 사용 부담만 기록하고 별도 구현은 유보한다.

## 인수 기준

동일 내용을 복제하지 않은 한 묶음의 읽기 순서가 준비되고, 로컬에서 공개 상태별 왕복·철회 제외·빈 경로를 검증한다. 실제 발행 및 연결 적용 여부를 각각 기록한다.

## 검증

문서/비공개 원고만 변경하면 파싱·claim/출처/개인정보·원문/hash 보존과 `git diff --check`를 검수한다. 카탈로그·mapping 등 앱 코드/공개 데이터를 바꾸면 TDD 스킬을 읽고 focused RED→GREEN 및 아래 기본 gate를 추가한다. UI를 바꾸면 개발 서버 1440/390/320px도 확인한다.

```bash
node --no-warnings --experimental-strip-types --test lib/blog-series.test.ts lib/blog-public.test.ts lib/brain.test.ts
npm run test:public-read-path
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

## 다음 단계

R4 Step 0 `tag-alias-contract-and-projection`. 독립 단계의 실행 조건은 전체 계획을 따른다.
