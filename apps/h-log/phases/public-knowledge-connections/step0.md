# Step 0: published-source-connections

## 상태와 선행 조건

pending — 2026-11-05 계획 등록. R3 / 공개 글과 기록 연결: 현재 공개된 글을 Brain 출처로 연결. 아직 구현/실행하지 않았다.

R1 완료. R2 후보는 검수 자료이며 실제 공개 여부와 구분한다.

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
- `apps/h-log/lib/brain.ts`
- `apps/h-log/lib/brain-server.ts`
- `apps/h-log/lib/brain-capture.ts`
- `apps/h-log/lib/brain-postgres-repository.ts`
- `apps/h-log/lib/blog-public.ts`
- `apps/h-log/lib/blog-content-model.ts`
- `apps/h-log/lib/portfolio-posts.ts`
- `apps/h-log/components/brain/BrainNote.tsx`
- `apps/h-log/components/brain/BrainExplorer.tsx`
- `apps/h-log/app/brain/[slug]/page.tsx`
- `apps/h-log/app/blog/[slug]/page.tsx`
- `.codex/skills/tdd/SKILL.md`
- `apps/h-log/.codex/rules/frontend.md`
- `apps/h-log/.codex/docs/harness/UI_GUIDE.md`

## 범위와 산출물

이 step의 단위는 **현재 공개된 글을 Brain 출처로 연결**이다. 아래 관련 파일과 선행 계약에서 필요한 최소 변경만 한다. main 계획의 기존 구현/후속 범위를 구분하고 완료된 phase를 다시 열지 않는다.

## 작업

1. 현재 /blog 상세 경로가 내부 Brain 출처로 안전하게 연결되지 않는 RED를 만든다. R1의 출처 모델에 명시적으로 선택한 /blog/[slug]를 지원한다.
2. 기존 published-current/privacy selector로 대상 존재와 현재 공개 상태를 서버에서 확인한다. 상대 경로와 확정된 공개 origin의 절대 URL을 같은 내부 참조로 취급해 검사를 우회하지 않게 한다. public URL을 HTTP로 재요청하지 않고 같은 공개 데이터 경계를 재사용한다. 외부 HTTPS 출처에는 자동 fetch를 추가하지 않는다.
3. 철회/삭제/비공개/없는 대상은 공개 href를 제거하고 승인된 일반 출처 설명만 유지한다. 비공개 제목/slug/원문을 HTML/RSC에 전달하지 않는다. 저장 원문과 불변 공개 사본을 고쳐 쓰지 않고 공개 응답 투영에서 처리한다.
4. Blog 데이터 조회 실패는 성공한 빈 연결로 오인하지 않게 정한다. 작은 연결 영역에 오류를 한정하고 private 과거 상태로 fallback하지 않는다. DB flag OFF·파일 카탈로그·DB 사본과 캐시/철회 경계를 함께 검증한다.
5. Blog의 역방향 연결도 현재 공개 Brain 출처에서만 도출해 기존 상세 탐색 영역에 작게 제공한다. 두 공개 selector의 결과를 사용하고 서로 재귀 호출하거나 비공개 메모를 조회하지 않는다. Blog와 Brain 중 어느 쪽을 철회해도 관리되는 연결은 제외한다. 임의 Markdown 본문 속 과거 URL 전체를 자동으로 고치는 기능은 추가하지 않는다.

## 인수 기준

현재 공개 글만 기존 Brain 출처 영역에서 이동 가능하고 Blog의 역방향 연결도 공개 Brain만 가리킨다. 어느 쪽을 철회해도 새 HTML/RSC 응답의 관리되는 연결에는 비공개 대상이 없다. 직접 상세 404와 기존 canonical/noindex 정책을 유지한다. 공개 Brain 배치는 그대로다.

## 검증

production 동작을 바꾸기 전에 focused RED의 예상 실패를 확인하고 GREEN→최소 정리를 진행한다. 기존 미구현 기능의 문자열 유무만 테스트하지 말고 실제 상태/응답을 검증한다. 코드 변경이 없었던 리허설은 재현 검사 결과만 기록한다.

```bash
node --no-warnings --experimental-strip-types --test lib/brain.test.ts lib/blog-public.test.ts
npm run test:brain
npm run test:public-read-path
```

가까운 명령은 `apps/h-log`에서 실행한다. DB/HTTP opt-in과 fixture 설정은 해당 script를 먼저 읽고 loopback 격리 환경에만 주입한다. 새 동작의 focused test는 기존 가까운 test에 추가하고 이름/명령을 완료 기록에 남긴다.

- DB/repository 변경은 별도 합성 DB에서 관련 integration/HTTP를 실행한다. 운영 DB와 사용자 인증 프로필을 재사용하지 않는다.

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

R3 Step 1 `curated-reading-paths`.
