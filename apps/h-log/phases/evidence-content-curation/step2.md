# Step 2: principle-and-revisit-drafts

## 상태와 선행 조건

pending — 2026-11-05 계획 등록. R2 / 실제 사례와 회고 정리: 기준 노드와 후속 회고 후보. 아직 구현/실행하지 않았다.

R2 Step 1은 2026-11-09 완료했다. [원고 검수 결과](../../.codex/docs/harness/EVIDENCE_CASE_MANUSCRIPT_REVIEW.md)의 H-Log 사례와 근거 대장을 사용한다. admin 저장 검수가 필요하면 R1 Step 2도 완료된 상태다.

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
- `apps/h-log/.codex/docs/harness/CURRENT_CLAIMS_INVENTORY.md`
- `apps/h-log/.codex/docs/harness/EVIDENCE_CASE_MANUSCRIPT_REVIEW.md`
- `apps/h-log/.codex/rules/content-seo-privacy.md`
- `apps/h-log/lib/brain-catalog.ts`
- `apps/h-log/lib/brain.ts`
- `apps/h-log/lib/brain-curation.ts`
- `apps/h-log/lib/brain-suggestions.ts`
- `apps/h-log/components/brain/BrainCapture.tsx`
- `apps/h-log/.codex/docs/harness/SECOND_BRAIN_PLAN.md`

## 범위와 산출물

이 step의 단위는 **기준 노드와 후속 회고 후보**이다. 아래 관련 파일과 선행 계약에서 필요한 최소 변경만 한다. main 계획의 기존 구현/후속 범위를 구분하고 완료된 phase를 다시 열지 않는다.

## 작업

1. 운영·반복 작업·관찰이라는 기존 기준 노드 세 개의 본문과 연결 이유를 점검한다. 사례와 관련된 2~3개 기록 후보를 준비하되 같은 문장을 Blog에서 복제하지 않는다.
2. 경험/해결/생각/배움/질문과 근거 수준을 기존 모델로 표현한다. 링크 이유는 해당 두 기록의 관계를 설명하고, 실제 생각 변화가 확인된 경우에만 revises를 사용한다.
3. 사건일과 정리일을 분리하고 확인되지 않은 날짜와 감정은 비워 둔다. 본인 확인이 필요한 문장을 명시해 초안으로 남긴다.
4. 기존 승인 노드/관계와 원문 이력의 보존, 새 공개 후보의 privacy, 연결 대상 존재/방향을 검사한다. 공개 적용이 허용되지 않은 후보는 private에 보관한다.

## 인수 기준

기준 노드의 읽기 순서와 사례/질문 연결 후보가 검수된다. 기존 회고 기능을 활용하고 UI나 분류를 늘리지 않는다. 확인되지 않은 사례를 공개 경험으로 승격하지 않는다.

## 검증

문서/비공개 원고만 변경하면 파싱·claim/출처/개인정보·원문/hash 보존과 `git diff --check`를 검수한다. 카탈로그·mapping 등 앱 코드/공개 데이터를 바꾸면 TDD 스킬을 읽고 focused RED→GREEN 및 아래 기본 gate를 추가한다. UI를 바꾸면 개발 서버 1440/390/320px도 확인한다.

```bash
node --no-warnings --experimental-strip-types --test lib/brain.test.ts lib/brain-curation.test.ts lib/brain-suggestions.test.ts
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

R3 Step 0 `published-source-connections`. 독립 단계의 실행 조건은 전체 계획을 따른다.
