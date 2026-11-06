# Step 2: owner-provenance-editor

## 상태와 선행 조건

completed — 2026-11-06 관리자 출처·질문 입력과 미리보기 구현·검증 완료. R1의 전체 3개 step을 마쳤다.

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

2026-11-06 확정한 [R1 계약](../../.codex/docs/harness/KNOWLEDGE_CONTENT_IMPROVEMENT_PLAN.md)의 입력/공개 정규화·생략/빈 배열·기존 명령 fingerprint 기준을 따른다. AI 질문·답변 기능은 관리자 시험 운영도 추가하지 않으며 작성자가 남긴 질문만 다룬다.

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

## 완료 기록 — 2026-11-06

- 코드: `components/brain/BrainCapture.tsx`, `app/admin/brain/capture.css`. 공개용 출처·질문 입력/삭제, 개수·길이 상한과 중복/URL 안내, 공유 parser/public projection 기반 미리보기, JS 비활성 안내와 공개 확인 문구를 연결했다. 새 API·schema·공개 UI 변경은 없다.
- 테스트: `scripts/brain-editor.browser-check.mjs`의 `verifyBrainEditor(browser, { adminOrigin, publicOrigin, ownerKey, output, mode })`. 독립 loopback DB/서버·빈 프로필 브라우저에서 호출한다. 기존 production 이미지의 출처 작성 실패 RED 뒤 구현한 화면에서 GREEN을 확인했다.
- production/dev **1440/390/320px × JS ON/OFF = 12표본**. JS ON 6흐름에서 작성·오류·키보드·순서/줄바꿈·응답 유실 후 중복 없는 재확인·재열기·공개/수정/빈 목록 재공개/철회·legacy 생략 보존을 확인했다. 1440px에서는 개수·길이 상한도 확인했다. JS OFF 안내는 noscript DOM으로 검사했다. Next route announcer와 noscript의 텍스트 선택 차이는 테스트 선택자를 보완했다.
- 공개 독립 상세·Memory reader의 데이터 일치, 뒤로가기와 가로 넘침 없음, pageerror 0. 데스크톱/모바일 스크린샷을 확인했다. 기존 승인된 그래프·검색/필터·reader 코드와 Home 레이더는 변경하지 않았다.
- `npm run test` **283 pass/27 DB skip**. 기존 Brain/public-read-path integration **3/3**, `test:brain:http` 대상 **1/1**(공개 상태별 HTML/RSC/sitemap 30응답) 재검수 통과. `npm run typecheck`, Docker runner의 `npm run build`, `npx eslint app components lib scripts proxy.ts next.config.ts` 통과.
- **전체 `npm run lint`는 기존 Git 제외 private helper 오류 10개/경고 6개로 실패**. 이번 source 검증과 구분하고 무관한 파일을 수정하지 않았다.
- R 계획·PRD/ADR/ARCHITECTURE·UI_GUIDE·관련 계획·루트 계획·phase를 동기화하고 Markdown/JSON·경로·상태 검사와 `git diff --check`를 통과했다. 검사 자료는 Git/Docker 제외 `private/r1-editor-2026-11-06/`에 둔다.
- 마지막 production 컨테이너 3개·network, dev DB 컨테이너 1개·network·직접 띄운 dev 프로세스·임시 인증 파일 정리 완료. 운영 환경·provider·실제 콘텐츠 공개·timer는 변경하지 않았다. AI 질문·답변 제외 결정 유지.

## 다음 단계

R2 Step 0 `current-claims-inventory`. 독립 단계의 실행 조건은 전체 계획을 따른다.
