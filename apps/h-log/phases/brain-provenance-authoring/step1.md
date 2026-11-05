# Step 1: private-provenance-snapshots

## 상태와 선행 조건

completed — 2026-11-06 출처·질문의 비공개 저장과 명시 공개 사본 구현·검증 완료. 관리자 입력 UI는 Step 2에 남아 있다.

R1 Step 0 완료.

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
- `apps/h-log/lib/brain-capture.test.ts`
- `apps/h-log/lib/brain-capture-http.ts`
- `apps/h-log/lib/brain-capture-http.test.ts`
- `apps/h-log/lib/brain-postgres-repository.ts`
- `apps/h-log/lib/brain-postgres-repository.integration.test.ts`
- `apps/h-log/lib/brain.ts`
- `apps/h-log/lib/brain-curation.ts`
- `apps/h-log/lib/brain-curation.test.ts`
- `apps/h-log/lib/public-source-url.ts`
- `apps/h-log/lib/brain.test.ts`
- `apps/h-log/scripts/brain-capture.http.test.mjs`
- `.codex/skills/tdd/SKILL.md`

## 범위와 산출물

이 step의 단위는 **비공개 저장과 공개 사본**이다. 아래 관련 파일과 선행 계약에서 필요한 최소 변경만 한다. main 계획의 기존 구현/후속 범위를 구분하고 완료된 phase를 다시 열지 않는다.

## 작업

2026-11-06 확정한 [R1 계약](../../.codex/docs/harness/KNOWLEDGE_CONTENT_IMPROVEMENT_PLAN.md)의 입력/공개 정규화·생략/빈 배열·기존 명령 fingerprint 기준을 따른다. AI 질문·답변 기능은 관리자 시험 운영도 추가하지 않으며 작성자가 남긴 질문만 다룬다.

1. 선택한 출처·질문이 저장/조회/공개 사본에 보존되지 않는 focused RED를 먼저 만든다.
2. 기존 parser·repository·records handler와 snapshot 계약에 선택 필드를 연결한다. 기존 필드가 없는 레코드를 읽고 수정할 수 있게 하며 과거 JSONB/본문/hash는 다시 쓰지 않는다.
3. 공개 필드만 privacy/URL 검증을 통과시켜 사본에 고정한다. 임시 수정은 현재 공개 사본에 반영하지 않는다. unknown field, 잘못된 URL·길이, 원문 경로, 인증/Origin 실패를 검증한다.
4. 동시 수정·같은 명령 재확인·감사 실패 rollback·공개 해제와 과거 사본 호환을 격리 DB/HTTP에서 검증한다. 필요한 migration이 있다면 로컬만 적용하고 rollback 조건을 남긴다.

## 인수 기준

필드가 있는 새 기록과 없는 이전 기록 모두 저장/재조회되고, 명시 공개 전 비공개 변경의 HTML/RSC/sitemap 노출은 0건이다. reader 레이아웃과 원문 이력은 유지된다.

## 검증

production 동작을 바꾸기 전에 focused RED의 예상 실패를 확인하고 GREEN→최소 정리를 진행한다. 기존 미구현 기능의 문자열 유무만 테스트하지 말고 실제 상태/응답을 검증한다. 코드 변경이 없었던 리허설은 재현 검사 결과만 기록한다.

```bash
node --no-warnings --experimental-strip-types --test lib/brain-capture.test.ts lib/brain-capture-http.test.ts lib/brain.test.ts
npm run test:brain
npm run test:brain:http
```

가까운 명령은 `apps/h-log`에서 실행한다. DB/HTTP opt-in과 fixture 설정은 해당 script를 먼저 읽고 loopback 격리 환경에만 주입한다. 새 동작의 focused test는 기존 가까운 test에 추가하고 이름/명령을 완료 기록에 남긴다.

- DB/repository 변경은 별도 합성 DB에서 관련 integration/HTTP를 실행한다. 운영 DB와 사용자 인증 프로필을 재사용하지 않는다.

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

## 완료 기록 — 2026-11-06

- 변경 코드: `lib/brain-capture.ts`(선택 필드/입력 검사/사본), `lib/brain.ts`(기존 URL 정책 공유), `lib/brain-curation.ts`(이전 사본의 키 생략 호환). 기존 repository·records handler·migration·UI는 재사용한다.
- 검증 파일: `lib/brain-capture.test.ts`, `lib/brain-capture-http.test.ts`, `lib/brain-curation.test.ts`, `lib/brain-postgres-repository.integration.test.ts`, `scripts/brain-capture.http.test.mjs`. R 계획·PRD/ADR/ARCHITECTURE·관련 계획·phase 상태도 동기화했다.
- RED: 출처·질문 입력이 `invalid_draft`로 실패, 경계값 거부 누락, legacy 질문 배열 누락 실패를 각각 확인한 뒤 최소 구현으로 GREEN. 원문과 저장용 공백/순서/생략은 유지한다.
- focused `node --no-warnings --experimental-strip-types --test lib/brain-capture.test.ts lib/brain-capture-http.test.ts lib/brain-curation.test.ts lib/brain.test.ts` **21/21**. `npm run test` **283 pass/27 DB skip**. 최초 sandbox의 기존 관측성 임시 경로 ENOENT는 일반 로컬 재실행으로 분리·통과했다.
- `test:brain` 및 `test:public-read-path` 대상의 합성 PostgreSQL integration **3/3**. 과거 payload의 감사 행을 직접 준비해 이전 fingerprint 재확인, 동시 중복/충돌·privacy 및 감사 rollback·원문/이력·이전 사본 JSONB 보존·재공개/철회를 확인했다. 테스트 fixture의 생성 시각 누락을 보완한 뒤 통과했다.
- `test:brain:http` 대상 production 검증 **1/1**, 6상태의 HTML/RSC/사이트맵 **30응답**에 비공개/미선택/철회 데이터 없음. Next 로컬 문서에 따라 RSC not-found의 200+`NEXT_HTTP_ERROR_FALLBACK;404`도 확인한다. 일반 상세 404와 no-store는 유지한다.
- `npm run typecheck`, Docker runner의 `npm run build`, `npx eslint app components lib scripts proxy.ts next.config.ts` 통과. **전체 `npm run lint`는 기존 private helper 오류 10개/경고 6개로 실패**. 이번 앱 source 회귀와 구분했으며 무관한 helper는 고치지 않았다.
- Markdown/JSON·상대 링크/읽을 경로·phase 상태 검사와 `git diff --check` 통과. 원자료: Git/Docker 제외 `private/r1-snapshots-2026-11-06/`. 마지막 격리 검수의 컨테이너 3개·network·임시 인증 파일 정리 완료.
- 공개 UI·Home 레이더·schema·운영 환경은 변경하지 않았다. UI를 추가하는 Step 2에서 데스크톱/모바일 검수를 진행한다. AI 질문·답변 제외와 운영 보류는 유지한다.

## 다음 단계

R1 Step 2 `owner-provenance-editor`.
