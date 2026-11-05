# Step 2: owner-provenance-editor

## 상태와 선행 조건

pending — 2026-11-05 계획 등록. R1 / Brain 출처·질문 작성: 관리자 출처·질문 입력과 미리보기. 아직 구현/실행하지 않았다.

R1 Step 1 완료.

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
- `apps/h-log/components/brain/BrainCapture.tsx`
- `apps/h-log/app/admin/brain/page.tsx`
- `apps/h-log/app/admin/brain/capture.css`
- `apps/h-log/lib/brain-capture.ts`
- `apps/h-log/components/brain/BrainNote.tsx`
- `apps/h-log/components/brain/BrainExplorer.tsx`
- `apps/h-log/scripts/brain-capture.http.test.mjs`
- `.codex/skills/tdd/SKILL.md`
- `apps/h-log/.codex/rules/frontend.md`
- `apps/h-log/.codex/docs/harness/UI_GUIDE.md`

## 범위와 산출물

이 step의 단위는 **관리자 출처·질문 입력과 미리보기**이다. 아래 관련 파일과 선행 계약에서 필요한 최소 변경만 한다. main 계획의 기존 구현/후속 범위를 구분하고 완료된 phase를 다시 열지 않는다.

## 작업

1. 기존 /admin/brain 편집 흐름 안에서 출처·질문 추가/수정/삭제, 유효성 오류, 공개 미리보기를 제공한다. 저장 API와 별도 공개 확인을 재사용한다.
2. 목록 순서·줄바꿈·한글·빈 목록·긴 값·실패 후 입력 보존·이전 레코드 편집을 확인한다. 새 필드는 관리 화면에만 추가하고 공개 reader는 기존 영역에 데이터만 표시한다.
3. 마우스/키보드로 작성→저장→재열기→공개 사본 확인→수정→철회를 로컬 합성 자료로 검수한다. 공개하지 않은 원문/출처/질문이 client 공개 props에 포함되지 않는지 확인한다.

## 인수 기준

admin에서 작성한 공개용 출처·질문이 선택 사본과 동일하게 표시된다. 그래프/상세의 기존 출처·질문 영역을 재사용하고 공개 UI 배치·검색·필터·뒤로가기가 유지된다.

## 검증

production 동작을 바꾸기 전에 focused RED의 예상 실패를 확인하고 GREEN→최소 정리를 진행한다. 기존 미구현 기능의 문자열 유무만 테스트하지 말고 실제 상태/응답을 검증한다. 코드 변경이 없었던 리허설은 재현 검사 결과만 기록한다.

```bash
node --no-warnings --experimental-strip-types --test lib/brain-capture.test.ts lib/brain.test.ts
npm run test:brain:http
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

R2 Step 0 `current-claims-inventory`. 독립 단계의 실행 조건은 전체 계획을 따른다.
