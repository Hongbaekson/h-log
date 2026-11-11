# Step 1: owner-review-queue

## 상태와 선행 조건

pending — 2026-11-05 계획 등록. R5 / 관리자 재검토와 통합 검수: 소유자 재검토 목록. 아직 구현/실행하지 않았다.

2026-11-12 R5 Step 0 완료. [수동 재검토 계약](../../.codex/docs/harness/KNOWLEDGE_CONTENT_IMPROVEMENT_PLAN.md#r5-manual-review-contract)과 [ADR-044](../../.codex/docs/harness/ADR.md#adr-044)를 구현 기준으로 사용한다.

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
- `apps/h-log/app/admin/brain/page.tsx`
- `apps/h-log/components/brain/BrainCapture.tsx`
- `apps/h-log/lib/brain-capture.ts`
- `apps/h-log/lib/brain-capture-http.ts`
- `apps/h-log/lib/brain-postgres-repository.ts`
- `apps/h-log/lib/admin-owner.ts`
- `apps/h-log/scripts/brain-capture.http.test.mjs`
- `.codex/skills/tdd/SKILL.md`
- `apps/h-log/.codex/rules/frontend.md`
- `apps/h-log/.codex/docs/harness/UI_GUIDE.md`
- `apps/h-log/migrations/004_brain_capture.sql`
- `apps/h-log/migrations/006_brain_admin_commands.sql`
- `apps/h-log/migrations/010_blog_automation_policy.sql`
- `apps/h-log/scripts/blog-migrations.mjs`
- `apps/h-log/scripts/blog-migrations.integration.test.mjs`
- `apps/h-log/lib/brain-postgres-repository.integration.test.ts`
- `apps/h-log/lib/blog-admin-operations.ts`
- `apps/h-log/lib/brain-server.ts`
- `apps/h-log/lib/blog-editorial.ts`
- `apps/h-log/.codex/docs/harness/CURRENT_CLAIMS_INVENTORY.md`

## 범위와 산출물

이 step의 단위는 **소유자 재검토 목록**이다. 아래 관련 파일과 선행 계약에서 필요한 최소 변경만 한다. main 계획의 기존 구현/후속 범위를 구분하고 완료된 phase를 다시 열지 않는다.

## 작업

1. 기존 /admin/brain에서 이유별 제한된 목록과 해당 기록 열기·수동 확인을 제공한다. 이전 회고 작성과 질문 편집을 재사용한다.
2. 검토 확인은 해당 버전에만 적용하고 내용 수정 시 재확인 대상으로 돌아오게 한다. 명령 revision·감사 transaction·같은 명령 재확인과 충돌 안내를 기존 패턴에 맞춘다.
3. 조회 실패·정상 빈 목록·미검토를 구분하고 페이지 크기/조회량을 제한한다. 공개 화면·검색·사이트맵에는 admin 상태·메모가 나오지 않게 한다.
4. R2 대장의 현재성 불일치 후보를 수동 검수해 원고/Portfolio/Resume의 변경 필요 목록을 갱신한다. 확인 버튼은 원문 수정이나 공개/철회 명령을 수행하지 않는다.

## Step 0에서 확정한 구현 경계

- 새 테이블 `brain_note_reviews`와 `review` 명령은 이 단계에서 처음 구현한다. 현재 immutable `(note_id, revision)`만 확인하며 원문/공개 사본·updated_at은 바꾸지 않는다. 기존 UUID fingerprint/receipt는 보존한다.
- 기존 records GET의 `view=review` 분기를 서버 필터·id cursor·20개/다음 cursor·3초 timeout으로 구현한다. 기존 전체 목록/원문 history의 제한 조회는 F6를 다시 완료 처리하지 않는다.
- 새 action CHECK는 기존 enum을 보존하며 확장한다. Brain action 타입/이력·공통 감사 한국어 label과 migration inventory/upgrade/복구 검증을 함께 수정한다. 원문·메모는 공통 감사/공개 응답에 넣지 않는다.
- 미저장/결과 미확인 잠금, 같은 명령 재확인, 과거 revision·확인 날짜 구분과 공개 불변을 구현한다. 추가 페이지·서비스·AI·자동 만료/알림은 만들지 않는다.
- R2-C01–C05 변경 필요 목록은 근거를 읽은 범위에서만 갱신한다. 관리자의 확인 버튼을 공개 검증일이나 실제 사건/운영 확인의 증거로 쓰지 않는다.

## 인수 기준

목록→기록→버전별 확인→수정 후 재확인 흐름이 합성 DB에서 동작한다. 인증/Origin/no-store, 충돌·감사 실패 rollback·미검토 호환과 공개 상태 불변을 검증한다.

## 검증

production 동작을 바꾸기 전에 focused RED의 예상 실패를 확인하고 GREEN→최소 정리를 진행한다. 기존 미구현 기능의 문자열 유무만 테스트하지 말고 실제 상태/응답을 검증한다. 코드 변경이 없었던 리허설은 재현 검사 결과만 기록한다.

```bash
node --no-warnings --experimental-strip-types --test lib/brain-capture.test.ts lib/brain-capture-http.test.ts lib/admin-owner.test.ts
npm run test:brain
npm run test:brain:http
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

R5 Step 2 `local-knowledge-release-rehearsal`.
