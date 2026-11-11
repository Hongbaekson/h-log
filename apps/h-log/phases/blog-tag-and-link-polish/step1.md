# Step 1: navigable-tag-badges

## 상태와 선행 조건

completed — 2026-11-11. 일반 목록·검색 결과·상세의 태그 배지에 기존 필터 URL과 키보드 초점을 연결했다. [검수 결과](../../.codex/docs/harness/BLOG_TAG_NAVIGATION_REVIEW.md).

2026-11-11 R4 Step 0 완료. [태그 별칭 검수](../../.codex/docs/harness/BLOG_TAG_ALIAS_REVIEW.md)의 공통 정규화와 URL 생성 함수를 재사용한다.

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
- `apps/h-log/components/blog/BlogPostRow.tsx`
- `apps/h-log/components/blog/BlogTopicFilters.tsx`
- `apps/h-log/app/blog/[slug]/page.tsx`
- `apps/h-log/lib/blog-search-ui.ts`
- `apps/h-log/lib/blog-discovery-ui.test.ts`
- `apps/h-log/lib/blog-detail-ui.test.ts`
- `.codex/skills/tdd/SKILL.md`
- `apps/h-log/.codex/rules/frontend.md`
- `apps/h-log/.codex/docs/harness/UI_GUIDE.md`

## 범위와 산출물

이 step의 단위는 **기존 태그 배지를 탐색 링크로**이다. 아래 관련 파일과 선행 계약에서 필요한 최소 변경만 한다. main 계획의 기존 구현/후속 범위를 구분하고 완료된 phase를 다시 열지 않는다.

## 작업

1. 목록/상세의 태그 배지가 기존 필터 URL로 이동하도록 native anchor를 연결한다. 같은 모양과 현재 행 구조를 유지한다.
2. 목록에서는 제출된 검색어를 유지하고 태그 선택 시 페이지를 1로 돌린다. 상세에서는 해당 태그의 일반 목록으로 이동한다. URL 생성은 기존 builder를 재사용한다.
3. 한글·특수문자·긴 태그·여러 태그, 키보드·새 탭·JS OFF·뒤로가기를 검수한다. 필터 상태와 실제 결과가 일치하는지 확인한다.

## 인수 기준

배지가 실제 href를 갖고 기존 공개 필터로 이동한다. nested anchor, 가로 넘침, 검색/페이지 상태 손실이 없고 기존 Discord 스타일은 유지된다.

## 검증

production 동작을 바꾸기 전에 focused RED의 예상 실패를 확인하고 GREEN→최소 정리를 진행한다. 기존 미구현 기능의 문자열 유무만 테스트하지 말고 실제 상태/응답을 검증한다. 코드 변경이 없었던 리허설은 재현 검사 결과만 기록한다.

```bash
node --no-warnings --experimental-strip-types --test lib/blog-search-ui.test.ts lib/blog-discovery-ui.test.ts lib/blog-detail-ui.test.ts
```

가까운 명령은 `apps/h-log`에서 실행한다. DB/HTTP opt-in과 fixture 설정은 해당 script를 먼저 읽고 loopback 격리 환경에만 주입한다. 새 동작의 focused test는 기존 가까운 test에 추가하고 이름/명령을 완료 기록에 남긴다.

- `npm run dev`와 production build에서 1440/390/320px·키보드·JS ON/OFF·뒤로가기를 확인한다. 공개 Brain UI와 Home 레이더의 기존 구조/동작을 비교한다.

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

- `BlogTagLink`가 기존 `Badge`와 URL builder를 재사용한다. `BlogPostRow`와 상세에서 같은 실제 anchor를 사용하고 검색은 `snapshot.query`를 전달한다. 입력 중인 미제출 검색어는 링크에 섞이지 않는다.
- 기존 production의 브라우저 RED 15표본에서 native anchor 누락을 확인한 뒤 구현했다. 최종 production/dev 30표본에서 4종 태그·선택 상태·검색/페이지·focus·키보드·새 탭·뒤로가기·가로 넘침을 검수했다. 일반 목록/상세는 JS ON/OFF, 검색은 JS ON에서 확인했다.
- 가까운 테스트 16/16, 전체 294 pass/28 DB skip, 격리 public-read DB 2/2와 source lint/typecheck/build 통과. 기본 lint의 기존 private 오류 10개/경고 6개와 build tracing 경고 2개는 남음.
- 공개/철회 결과·본문/hash 보존, Home 레이더와 Brain canvas의 세 폭 표시를 확인했다. DB·별칭 사전·배지 기본 스타일·Brain/Home 파일은 변경하지 않았다.
- 변경은 새 공통 링크, 행/검색/상세 호출부, URL 회귀 테스트와 브라우저 검사, 관련 계획/검수 문서다. 재현 API·명령과 JS OFF 검색의 기존 한계는 검수 문서에 기록했다. 비공개 evidence는 Git/Docker에서 제외한다.
- R completed 10·pending 4. 실제 발행·배포·운영 활성화와 F 22개 pending은 실행하지 않았다.

## 다음 단계

R4 Step 2 `article-and-section-link-copy`.
