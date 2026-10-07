# Step 5: assisted-linking

## 읽을 파일

- `AGENTS.md`
- `.codex/docs/harness/PRD.md`
- `.codex/docs/harness/ADR.md`
- `.codex/docs/harness/ARCHITECTURE.md`
- `.codex/docs/harness/WORKFLOW.md`
- `.codex/docs/harness/AGENT_LOOP.md`
- `.codex/docs/harness/SECOND_BRAIN_PLAN.md`
- `../../.codex/skills/harness/SKILL.md`
- `../../.codex/skills/tdd/SKILL.md`
- `lib/brain.ts`
- `lib/brain-capture.ts`
- `lib/brain-suggestions.ts`
- `components/brain/BrainCapture.tsx`

## 작업

2026-10-07 전체 Second Brain 마무리 요청에 따라 ADR-023의 로컬 후보 제안을 구현한다. 제목·태그·주제를 비교해 태그·관련 기억·중복 후보와 이유를 보여 준다. 실제 사용 부담이 확인됐다고 주장하지 않는다. 외부 provider는 이번 범위에 넣지 않으며, 추후 도입하면 입력 범위와 비용·사용 승인을 따로 확인한다.

## 인수 기준

자동 제안과 원문이 구분되고 소유자 확인 전 관계 확정·원문 수정·공개가 일어나지 않는다. 규칙 기반 후보를 AI 분석 결과로 표시하지 않는다.

## 검증

1. 변경의 focused RED를 확인한 뒤 최소 구현으로 같은 GREEN을 확인한다.
2. 관련 focused test, privacy 검증, npm run test/lint/typecheck/build
3. 코드 변경 시 앱의 전체 필수 gate를 통과한다. UI 변경은 데스크톱/모바일에서 직접 확인한다.
4. 완료한 실제 범위와 미구현 범위를 phase index에 기록한다.

## 완료 결과 — 2026-10-07

- `brain-suggestions.ts`가 승인된 카탈로그와 인증된 소유자 요약의 제목·태그·주제만 비교한다. 관련/중복 후보는 최대 5개, 기존 태그 후보는 최대 8개이며 자기 자신과 이미 고른 연결은 제외한다. 원문·감정·성과를 분석하거나 새 사실을 생성하지 않는다.
- 후보에는 공통 태그/단어/주제와 중복 가능성을 표시한다. 후보를 건너뛰거나 골라 초안에 넣을 수 있다. 연결 이유는 직접 작성해야 하며, 후보 조회·선택만으로 DB 저장이나 공개가 일어나지 않는다. 초안을 수정하면 이전 후보를 지워 오래된 결과의 적용을 막는다.
- RED: 빈 제안 결과와 화면의 후보 버튼 부재를 확인했다. GREEN: 순수 함수 2건으로 실제 28개 카탈로그, 중복 후보 우선순위, 이유·태그, 입력 비변경, 원문 미사용과 결과 수 제한을 검증했다.
- Unit 192 pass/13 DB skip, typecheck/lint/build, 기존 HTTP 1/1 통과. Step 4에서 검증한 PostgreSQL integration 14/14 이후 DB 코드는 변경하지 않았다.
- 1440/390/320px 브라우저에서 중복 표시, 건너뛰기, 태그·연결 선택, 입력 변경에 따른 후보 초기화, 원문 보존과 기존 연결 재제안 방지를 확인했다. 후보 조회/선택 중 POST 0회, 직접 저장 후 1회, 새 상세 404를 확인했다. 가로 넘침/pageerror 0건이며 스크린샷을 검수했다.
- Foundation Steps 0–5와 Memory Interface Steps 0–1 모두 완료했다. 외부 LLM, 운영 배포·영구 DB/백업 구성, 자동 공개는 이번 완료 범위가 아니다. 현재 임시 preview에 실제 보관용 기록을 넣지 않는다.

## 하지 말 것

- 회사 원문·내부 식별자·비공개 근거 경로를 공개 카탈로그나 fixture에 넣지 않는다. 이유: 개인 기술 기록으로 일반화하는 범위만 승인됐다.
- 추측한 당시 감정·개인 기여·성과·도입 이력을 경험으로 확정하지 않는다. 이유: 코드 조사로는 증명할 수 없다.
- Home 레이더 전체, Blog DB source, OCI·timer·배포 상태를 변경하지 않는다. 이유: 이번 기능의 범위 밖이다.
- 방문자 챗봇이나 자동 기억 공개를 추가하지 않는다. 이유: 개인 기록과 읽기 기능이 우선이다.
