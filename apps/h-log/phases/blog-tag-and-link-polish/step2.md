# Step 2: article-and-section-link-copy

## 상태와 선행 조건

pending — 2026-11-05 계획 등록. R4 / 태그와 공유 편의: 글·소제목 주소 복사. 아직 구현/실행하지 않았다.

R4 Step 1 완료. 기존 heading anchor/목차 구현을 먼저 확인한다.

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
- `apps/h-log/components/blog/BlogContent.tsx`
- `apps/h-log/components/blog/CodeBlock.tsx`
- `apps/h-log/app/blog/[slug]/page.tsx`
- `apps/h-log/lib/blog-public.ts`
- `apps/h-log/lib/blog-detail-ui.test.ts`
- `apps/h-log/lib/public-site-origin.ts`
- `.codex/skills/tdd/SKILL.md`
- `apps/h-log/.codex/rules/frontend.md`
- `apps/h-log/.codex/docs/harness/UI_GUIDE.md`

## 범위와 산출물

이 step의 단위는 **글·소제목 주소 복사**이다. 아래 관련 파일과 선행 계약에서 필요한 최소 변경만 한다. main 계획의 기존 구현/후속 범위를 구분하고 완료된 phase를 다시 열지 않는다.

## 작업

1. 기존 heading의 # anchor와 고유 ID를 그대로 사용한다. 글 주소와 소제목 주소 복사가 필요한 곳에만 작은 동작을 추가한다.
2. 공개 canonical 경로와 선택한 hash만 공유하고 검색 query나 관리자 주소가 섞이지 않게 한다. Clipboard API 실패/미지원 시 기존 일반 링크를 직접 복사할 수 있게 한다.
3. 성공/실패를 한국어로 알리고 키보드 초점을 유지한다. 한글·중복 제목·직접 hash 접근·새로고침·no-JS anchor 동작을 검증한다.

## 인수 기준

공유 URL이 같은 글·제목으로 열리고 기존 목차/ID/원문이 보존된다. 권한 거부를 성공으로 표시하지 않으며 외부 공유 SDK/추적기를 추가하지 않는다.

## 검증

production 동작을 바꾸기 전에 focused RED의 예상 실패를 확인하고 GREEN→최소 정리를 진행한다. 기존 미구현 기능의 문자열 유무만 테스트하지 말고 실제 상태/응답을 검증한다. 코드 변경이 없었던 리허설은 재현 검사 결과만 기록한다.

```bash
node --no-warnings --experimental-strip-types --test lib/blog-detail-ui.test.ts lib/blog-public.test.ts
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

## 다음 단계

R5 Step 0 `manual-review-contract`. 독립 단계의 실행 조건은 전체 계획을 따른다.
