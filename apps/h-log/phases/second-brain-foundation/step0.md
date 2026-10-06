# Step 0: content-and-provenance

## 읽을 파일

- `AGENTS.md`
- `.codex/docs/harness/PRD.md`
- `.codex/docs/harness/ADR.md`
- `.codex/docs/harness/ARCHITECTURE.md`
- `.codex/docs/harness/WORKFLOW.md`
- `.codex/docs/harness/AGENT_LOOP.md`
- `.codex/docs/harness/SECOND_BRAIN_PLAN.md`
- `../../.codex/skills/harness/SKILL.md`
- `app/resume/page.tsx`
- `lib/projects.ts`

## 작업

기존 소개·경력과 사용자가 지정한 저장소를 읽기 전용으로 조사한다. 회사 원문을 복제하지 않고 일반화할 주제와 확인 범위를 정리한다. 근거 파일 위치는 Git에서 제외된 private/ 대장에만 기록한다.

## 인수 기준

기록의 출처와 추론 수준이 구분되고, 지정 폴더별 후보와 보류 이유를 확인할 수 있다.

## 검증

1. 문서/콘텐츠 조사 단계로 production TDD 예외를 적용한다.
2. 문서/JSON 형식 검사와 git diff --check
3. 코드 변경 시 앱의 전체 필수 gate를 통과한다. UI 변경은 데스크톱/모바일에서 직접 확인한다.
4. 완료한 실제 범위와 미구현 범위를 phase index에 기록한다.

## 하지 말 것

- 회사 원문·내부 식별자·비공개 근거 경로를 공개 카탈로그나 fixture에 넣지 않는다. 이유: 개인 기술 기록으로 일반화하는 범위만 승인됐다.
- 추측한 당시 감정·개인 기여·성과·도입 이력을 경험으로 확정하지 않는다. 이유: 코드 조사로는 증명할 수 없다.
- Home 레이더 전체, Blog DB source, OCI·timer·배포 상태를 변경하지 않는다. 이유: 이번 기능의 범위 밖이다.
- 방문자 챗봇이나 자동 기억 공개를 추가하지 않는다. 이유: 개인 기록과 읽기 기능이 우선이다.
