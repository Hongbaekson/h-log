# Step 0: deterministic-queue-replay

## 개선 사항

Queue와 DLQ 재생 실험. 이전 phase `editorial-trust-and-series` 완료 후 실행한다.

## 읽을 파일

모든 경로는 저장소 루트 기준이다. 아래 파일과 수정 대상의 실제 caller를 확인한다.

- `AGENTS.md`
- `apps/h-log/AGENTS.md`
- `.codex/skills/harness/SKILL.md`
- `.codex/skills/tdd/SKILL.md`
- `apps/h-log/.codex/docs/harness/PRD.md`
- `apps/h-log/.codex/docs/harness/ADR.md`
- `apps/h-log/.codex/docs/harness/ARCHITECTURE.md`
- `apps/h-log/.codex/docs/harness/WORKFLOW.md`
- `apps/h-log/.codex/docs/harness/AGENT_LOOP.md`
- `apps/h-log/.codex/docs/harness/IMPLEMENTATION_PLAN.md`
- `apps/h-log/.codex/docs/harness/UI_GUIDE.md`
- `apps/h-log/.codex/rules/frontend.md`
- `apps/h-log/.codex/rules/content-seo-privacy.md`
- `apps/h-log/.codex/docs/harness/PUBLIC_EXPERIENCE_PLAN.md`
- `apps/h-log/phases/backend-operations-lab/index.json`
- `apps/h-log/lib/projects.ts`
- `apps/h-log/app/portfolio/[slug]/page.tsx`
- `apps/h-log/components/layout/Header.tsx`
- `apps/h-log/lib/site.ts`

## 작업

준비된 가상 작업 데이터로 enqueue→처리→실패→DLQ→재처리 흐름을 재생하는 실험 하나를 만든다. 재생/일시정지/초기화와 작은 제한 범위의 worker/실패 조건만 제공한다. 순수 계산과 최소 client UI를 사용하며 실제 queue/LLM/사용자 코드 실행은 연결하지 않는다.

## 인수 기준

같은 입력에서 같은 결과가 나오고 작업 손실/중복 집계가 없다. 초기화·키보드 조작·reduced motion·mobile를 확인한다. 실험 데이터임을 명확하게 표시한다.

앱 디렉터리에서 가까운 검증 후 기본 gate를 실행한다.

```bash
npm run test
npm run lint
npm run typecheck
npm run build
git diff --check
```

## 검증

1. 바꾸는 public behavior의 RED를 확인한 뒤 최소 구현으로 같은 테스트의 GREEN을 확인한다. 순수 콘텐츠/문서 변경은 파서·링크·형식 검증으로 대체한다.
2. UI는 개발 서버와 격리 local DB의 synthetic fixture로 1440/390/320px, focus, 긴 글, 빈/오류 상태를 확인한다. DB/repository/worker/migration 변경 시 `npm run test:integration`을 추가한다.
3. phase index와 이 step에 실제 결과·검증 command·다음 단계를 기록한다. 완료된 기능만 completed로 표시한다.

## 하지 말 것

- 레이더의 데이터·축·형태·배치·주변 영역을 변경하지 말 것. 사용자가 명시적으로 보존을 요청했다.
- 저장 Markdown/HTML/hash나 기존 URL을 무단 재작성하지 말 것. 발행 무결성과 기존 링크를 유지해야 한다.
- raw HTML 주입, private 글/내부 evidence/근거 없는 실적 노출을 허용하지 말 것. 공개 콘텐츠 경계를 유지해야 한다.
- OCI·DNS/TLS·운영 timer·실제 provider 호출·공개 발행을 실행하지 말 것. 로컬 개선 계획이며 기존 OCI 보류는 유지된다.

## 구현 완료 — 2026-10-22

**Step 0 completed.** 공개 경험 개선은 **18/19개 step 완료, 0개 blocked, 1개 pending**이며 다음은 [Step 1: lab-case-study-connection](step1.md)이다. Phase 6 전체 상태는 Step 1이 남아 `pending`을 유지한다.

- `lib/queue-lab.ts`: J01~J06 가상 작업, Worker 1~3개, 실패 없음/첫 시도만 실패/원인 해결 전까지 실패의 세 조건을 제공한다. 작업 획득과 결과 확인을 분리한 순수 frame 목록으로 같은 입력은 같은 결과를 낸다. 실패 대상은 J02/J05이며 첫 실패는 FIFO Queue 뒤, 두 번째 실패는 DLQ로 이동한다.
- 명시적인 원인 해결 후 재처리는 DLQ 작업만 Queue로 되돌린다. 기존 완료 작업과 누적 시도 횟수, 이전 frame을 보존하며 자동으로 원인을 해결하거나 재처리하지 않는다.
- `components/lab/QueueReplay.tsx`와 `app/lab/queue/page.tsx`: 독립 `/lab/queue` 화면, native select/버튼/details, 재생·일시정지·한 단계·초기화·재처리·현재 및 지난 기록을 제공한다. 설정 변경은 초기화하고 자동 시작은 없다. 페이지 metadata/canonical은 자체 경로를 가리킨다.
- [ADR-037](../../.codex/docs/harness/ADR.md)에 가상 모델의 한계를 기록했다. 실제 Queue/Worker·DB·LLM·사용자 코드 실행·API·새 의존성은 연결하지 않는다. 프로젝트/공개 글 연결과 기존 화면의 진입점/검색 노출은 Step 1에서 진행한다.

### 검증

앱 디렉터리에서 실행했다.

```bash
node --no-warnings --test --experimental-strip-types lib/queue-lab.test.ts
npm run test
npm run lint
npm run typecheck
npm run build
node private/queue-lab-check/smoke.mjs
node private/queue-lab-check/check.mjs
node private/queue-lab-check/production.mjs
node private/queue-lab-check/verify-docs.mjs
git diff --check
```

- RED: 모델 파일 부재, 재처리 frame 부재, UI 경로 404를 확인했다. 같은 테스트의 GREEN에서 **focused 2/2**, unit **227 pass / 14 DB skip**, lint·typecheck·build를 통과했다. DB/repository/실제 worker/migration 변경이 없어 DB 통합 suite는 재실행하지 않았다.
- 모델의 9개 설정 조합에서 작업 ID 6개 보존·중복 없음·동시 처리 수 제한·FIFO 재시도·최대 2회 시도 후 종료를 확인했다. 재처리 후 완료 6개·DLQ 0개와 실패 작업 누적 시도 3회, 기존 재생 결과 보존을 검증했다.
- 격리 로컬 설정을 쓰는 개발 서버에서 1440/390/320px, 키보드 Space/Enter/Tab과 초점, 수동/자동 재생·일시정지·끝에서 정지·초기화·설정 변경 시 타이머 정리·페이지 왕복을 확인했다. 공개 데이터 조회 없이 합성 작업만 사용한다.
- 긴 텍스트·빈 단계·reduced motion·JavaScript 없는 초기 상태와 안내를 확인했다. 가로 overflow와 브라우저 page error는 없었고 외부/API 요청도 0건이다. 처음 select 라벨 선택자가 실패한 뒤 명시적인 label/id 연결로 보완했다. no-JS 안내는 실제 표시를 확인하고 검수 선택자를 `noscript`로 수정했다.
- DB 연결을 실패하도록 설정한 별도 로컬 운영 모드에서도 HTTP 200, 화면 3개 폭과 재처리 완료를 확인했다. `next start`의 standalone 안내가 있으므로 배포 이미지/OCI 검증으로 보지 않는다.
- 변경 범위 16개 파일, 문서/JSON 12개, 추가·변경 상대 링크 16개, phase JSON 42개와 완료 개수·다음 단계 정합성을 확인했다. 기존 비공개 원고 3편의 파일 hash와 `git diff --check`도 통과했다.
- 검수 코드·로그·화면은 Git/Docker 제외 경로 `private/queue-lab-check/`에 보관한다. Home/레이더·Second Brain, 저장 Markdown/HTML/hash, 실제 글 발행·운영 설정은 변경하지 않았다.
