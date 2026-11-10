# Step 0: tag-alias-contract-and-projection

## 상태와 선행 조건

completed — 2026-11-11. 명시 별칭 사전을 공개 읽기·검색·URL과 새 관리자 초안 저장에 적용했다. [검수 결과](../../.codex/docs/harness/BLOG_TAG_ALIAS_REVIEW.md).

S3 Step 0 및 R3 Step 1 완료. [읽기 경로 검수](../../.codex/docs/harness/CURATED_READING_PATH_REVIEW.md) 이후의 다음 로컬 단계다. R2/R3 후보의 실제 발행과 독립적으로 실행 가능하다.

## 읽을 파일

경로는 저장소 루트 기준이다. 선행 step의 완료 기록과 현재 호출 경로를 먼저 확인한다.

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
- `apps/h-log/.codex/docs/harness/KNOWLEDGE_CONTENT_IMPROVEMENT_PLAN.md`
- `apps/h-log/.codex/rules/content-seo-privacy.md`
- `apps/h-log/lib/blog-public.ts`
- `apps/h-log/lib/blog-public.test.ts`
- `apps/h-log/lib/blog-search.ts`
- `apps/h-log/lib/blog-search.test.ts`
- `apps/h-log/lib/blog-search-ui.ts`
- `apps/h-log/lib/blog-search-ui.test.ts`
- `apps/h-log/lib/blog-admin-review.ts`
- `apps/h-log/lib/blog-admin-review.integration.test.ts`
- `apps/h-log/components/blog/BlogTopicFilters.tsx`
- `.codex/skills/tdd/SKILL.md`

## 범위와 산출물

이 step의 단위는 **태그 대표 표기와 별칭**이다. 아래 관련 파일과 선행 계약에서 필요한 최소 변경만 한다. main 계획의 기존 구현/후속 범위를 구분하고 완료된 phase를 다시 열지 않는다.

## 작업

1. 현재 태그를 조사하고 의미가 같은 표기만 소규모 명시 사전으로 정한다. Next.js/nextjs 등은 후보이며 실제 H-Log 자료를 확인한 뒤 채택한다. 서로 다른 개념을 대소문자/구두점 규칙으로 무조건 합치지 않는다.
2. 동의어가 일반 목록·검색 결과·태그 수에서 서로 다르게 취급되는 focused RED를 만들고 기존 호출 경로에 같은 정규화 규칙을 연결한다. 사전 밖 값의 동작도 고정한다.
3. 새 관리자 저장과 공개 읽기 투영을 일관되게 처리하되 과거 post_versions/원문/hash를 일괄 수정하지 않는다. 태그 집계는 같은 글을 한 번만 센다.
4. 기존 q/tag/page URL 복원·필터 후 페이지 계산과 태그 noindex 정책을 유지한다. alias를 새 색인 페이지나 redirect 체계로 확대하지 않는다.

## 인수 기준

대표 표기와 별칭이 같은 공개 결과 집합/개수를 만들고 기존 URL이 동작한다. 비공개·철회 글 제외, 알 수 없는 태그, 원문/hash 보존을 확인한다.

## 검증

production 동작을 바꾸기 전에 focused RED의 예상 실패를 확인하고 GREEN→최소 정리를 진행한다. 기존 미구현 기능의 문자열 유무만 테스트하지 말고 실제 상태/응답을 검증한다. 코드 변경이 없었던 리허설은 재현 검사 결과만 기록한다.

```bash
node --no-warnings --experimental-strip-types --test lib/blog-public.test.ts lib/blog-search.test.ts lib/blog-search-ui.test.ts
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

## 완료 기록 — 2026-11-11

- 기존 원고의 태그를 조사해 Next.js/nextjs와 PostgreSQL/postgres만 사전에 등록했다. 사전 밖 값의 대소문자·구두점을 합치지 않고 양끝 공백만 제거한다.
- `blog-tags.ts`를 `blog-public`, `blog-search`, `blog-search-ui`, `blog-article-generation`이 공유한다. 글당 중복 개수·별칭 URL·검색/관련 태그·새 초안 저장이 같은 대표 표기를 사용한다.
- 관리자 본문 편집에는 태그 필드가 없어 해당 API를 확장하지 않았다. 관리자 초안 생성/저장은 기존 공통 출력 검증 경로로 정규화하고, 기존 저장 태그·post_versions·원문/hash는 일괄 변경하지 않는다.
- focused RED 5개→GREEN 76/76, 전체 293 pass/28 DB skip, 격리 public-read/초안/편집 DB 4/4, production/dev의 동일 결과·noindex·cache 뒤 철회 확인. 1440/390/320px JS ON/OFF 6조합에서 선택 태그·집계·페이지·키보드·뒤로가기·초기화를 검수했다.
- typecheck/build·source lint 통과. 기본 lint의 기존 private 오류 10개/경고 6개, 기존 build tracing 경고 2개는 별도 기록했다. 초기 DB 연결 종료는 순차 재실행 후 통과했고 제품 원인으로 확정하지 않았다.
- 변경 파일·호출 경로·한계는 검수 문서와 ADR-043에 정리했다. DB schema·UI 배치·Brain·레이더·원고·운영 상태는 바꾸지 않았다. 문서/JSON·링크·상태·diff를 최종 검사한다.

## 다음 단계

R4 Step 1 `navigable-tag-badges`.
