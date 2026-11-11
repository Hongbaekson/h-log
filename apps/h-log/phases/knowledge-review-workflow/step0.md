# Step 0: manual-review-contract

## 상태와 선행 조건

completed — 2026-11-12 [수동 재검토 계약](../../.codex/docs/harness/KNOWLEDGE_CONTENT_IMPROVEMENT_PLAN.md#r5-manual-review-contract)과 [ADR-044](../../.codex/docs/harness/ADR.md#adr-044)를 확정했다. 문서/JSON 전용이며 runtime 구현은 Step 1이다.

2026-11-11 R1–R4 완료. R2의 근거 대장과 R3 연결 계약, [R4 링크 복사 검수](../../.codex/docs/harness/BLOG_LINK_COPY_REVIEW.md)를 참고한다. Step 0은 이 계약을 확정했고 다음은 Step 1의 구현이다.

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
- `apps/h-log/lib/brain-capture.ts`
- `apps/h-log/lib/brain-curation.ts`
- `apps/h-log/lib/brain-postgres-repository.ts`
- `apps/h-log/lib/blog-editorial.ts`
- `apps/h-log/lib/blog-admin-review.ts`
- `apps/h-log/lib/admin-owner.ts`
- `apps/h-log/.codex/docs/harness/ADMIN_CONSOLE_PLAN.md`

## 범위와 산출물

이 step의 단위는 **재검토 대상과 확인 기록 계약**이다. 아래 관련 파일과 선행 계약에서 필요한 최소 변경만 한다. main 계획의 기존 구현/후속 범위를 구분하고 완료된 phase를 다시 열지 않는다.

## 작업

1. 열린 질문·연결 없는 기록·작성자가 재확인을 지정한 근거를 admin에서 다시 찾는 최소 조건을 정한다. 오래됐다는 이유만으로 기록을 틀렸다고 판단하지 않는다.
2. 정리일/사건일/자료 날짜/실제 확인일을 구분한다. 검토 대상 id와 revision/hash, 확인 결과·시각·짧은 메모만으로 필요한 저장 계약을 정한다. 필드가 없는 기존 기록은 미검토로 취급한다.
3. 검토 후 내용이 바뀌면 이전 확인을 새 버전에 승계하지 않는 규칙, 동시 명령/감사·중복 재확인과 제한된 목록 조회를 설계한다. Blog editorial의 공개 검증 날짜를 admin 검토 클릭으로 덮어쓰지 않는다.
4. 이 계획의 R5 계약 절과 ADR에 구현 전 결정을 남긴다. 기존 DB·owner 인증을 재사용하고 별도 서비스·일정·알림·AI를 도입하지 않는다.

## 인수 기준

대상 선정·미검토/확인 필요/확인 완료와 버전 경계·보존 정책이 명시된다. 임의 만료일/점수 없이 수동 작업으로 실행 가능하다.

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

## 완료 기록 — 2026-11-12

- 기준 commit `b9db296307665cdabf6aa24ccbab361b8f74184a`의 Brain draft/curation/repository/HTTP/편집기, owner 인증, Blog editorial/검토, migrations 003/004/006/010/012와 migration runner·공통 감사 조회를 대조했다.
- 대상은 DB 현재 원문 revision이며 정적 카탈로그/Blog/Portfolio/Resume는 기존 R2 대장을 사용한다. 질문·양방향 관계 없음·직접 지정·버전 변경을 이유로 구분하고 날짜만으로 만료시키지 않는다.
- 비공개 append-only 확인 이력, 새 버전 확인 미승계, 날짜 의미, review 명령의 원자적 감사/중복 receipt·기존 fingerprint 호환, 20개 서버 제한 조회·3초 timeout·공개 경계를 확정했다.
- 문서 11개와 phase JSON 61개를 파싱하고 변경 링크·읽을 파일 존재·다른 phase 상태·문서 전용 범위·`git diff --check`를 검사했다. 결과와 명령은 Git/Docker 제외 `private/r5-contract-2026-11-12/`에 남겼다.
- 앱 코드·schema·DB·UI·원문·실제 발행은 변경하지 않았다. 문서 전용이므로 TDD/runtime test·build·브라우저·migration 실행은 이번 단계의 검증에 포함하지 않았다. R completed 12/pending 2, F 22개 pending과 운영 보류를 유지한다.

## 다음 단계

R5 Step 1 `owner-review-queue`.
