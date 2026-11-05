# Step 0: provenance-contract

## 상태와 선행 조건

pending — 2026-11-05 계획 등록. R1 / Brain 출처·질문 작성: 공개용 출처·질문 계약. 아직 구현/실행하지 않았다.

S3 Step 0 완료. 운영 S3 Step 1은 선행 조건이 아니다.

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
- `apps/h-log/lib/brain-capture.ts`
- `apps/h-log/lib/brain-capture-http.ts`
- `apps/h-log/lib/brain-postgres-repository.ts`
- `apps/h-log/components/brain/BrainCapture.tsx`
- `apps/h-log/components/brain/BrainNote.tsx`
- `apps/h-log/components/brain/BrainExplorer.tsx`
- `apps/h-log/lib/public-source-url.ts`

## 범위와 산출물

이 step의 단위는 **공개용 출처·질문 계약**이다. 아래 관련 파일과 선행 계약에서 필요한 최소 변경만 한다. main 계획의 기존 구현/후속 범위를 구분하고 완료된 phase를 다시 열지 않는다.

## 작업

1. 관리자 초안의 누락과 공개 reader 두 곳의 현재 표시를 확인한다. 이 계획의 R1 계약 절에 sources/questions의 최소 필드·개수/길이 상한·오류·호환 정책을 구체화한다.
2. 기존 초안/공개 사본에 필드가 없을 때의 읽기와 재저장 동작을 정한다. 공개 출처는 제목과 선택적 안전한 URL로 시작하고 질문은 작성자가 고른 문자열로 둔다. 원문에서 추출하거나 날짜를 추정하지 않는다.
3. 외부 HTTPS와 기존 허용 내부 경로를 구분한다. Blog 출처의 현재 공개 판정과 철회 처리는 R3 Step 0의 담당으로 남긴다. 외부 URL 확인을 위한 서버 fetch는 추가하지 않는다.
4. 허용/거부 URL, 이전 버전, 빈 값, 수정/재공개, 충돌/중복 명령의 예시와 테스트 위치를 정한다. 스키마 변경은 실제 필요를 확인한 경우만 후속 구현에서 선택한다.

## 인수 기준

입력→비공개 저장→선택 버전 공개→공개 DTO의 필드와 예외가 표로 정리되고, R1 Step 1이 추측 없이 구현할 수 있다. 구현 완료로 표시하지 않는다.

## 검증

문서/JSON만 변경하면 Markdown·JSON 파싱, 상대 링크·읽을 파일 존재 검사와 `git diff --check`를 실행한다. 앱 build/브라우저는 이 계약 작성 단계의 필수 검증이 아니다.

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

R1 Step 1 `private-provenance-snapshots`.
