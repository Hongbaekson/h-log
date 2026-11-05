# Step 2: local-knowledge-release-rehearsal

## 상태와 선행 조건

pending — 2026-11-05 계획 등록. R5 / 관리자 재검토와 통합 검수: 연결·공개 경계 로컬 통합 검수. 아직 구현/실행하지 않았다.

R1–R4와 R5 Step 1 완료. 원고 준비와 실제 발행 상태를 각각 인계한다.

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
- `apps/h-log/scripts/brain-discovery.browser-check.mjs`
- `apps/h-log/scripts/blog-index-seo.http.test.mjs`
- `apps/h-log/scripts/brain-capture.http.test.mjs`
- `apps/h-log/.codex/docs/harness/SEO_AUDIT_BASELINE.md`
- `apps/h-log/.codex/docs/harness/ADMIN_CONSOLE_PLAN.md`
- `apps/h-log/phases/seo-release-and-measurement/step0.md`
- `.codex/skills/tdd/SKILL.md`
- `apps/h-log/.codex/rules/frontend.md`
- `apps/h-log/.codex/docs/harness/UI_GUIDE.md`

## 범위와 산출물

이 step의 단위는 **연결·공개 경계 로컬 통합 검수**이다. 아래 관련 파일과 선행 계약에서 필요한 최소 변경만 한다. main 계획의 기존 구현/후속 범위를 구분하고 완료된 phase를 다시 열지 않는다.

## 작업

1. 현재 빌드와 전용 합성 DB에서 출처/질문 저장→공개→미선택 수정→철회, 공개 Blog↔Brain 연결, alias/태그/공유/재검토 흐름을 실제 HTTP/브라우저로 검수한다.
2. 파일 카탈로그와 DB 모드, 이전 레코드, 누락/철회/오류 상태를 확인한다. HTML/RSC/목록/sitemap에 원문·admin 상태·비공개 대상이 노출되지 않는지 검사한다.
3. 1440/390/320px·키보드·JS ON/OFF를 확인하고 S2 Step 5의 기본 읽기·독립 상세·canonical 및 승인된 Brain UI와 레이더를 대조한다. 새로운 성능 우려가 없는 한 기존 전체 성능 측정을 반복하지 않는다.
4. 현재성 대장·원고/노드 후보·실제 적용 상태·알려진 한계를 묶어 인계한다. 발견한 코드 결함은 focused RED 후 최소 수정하고 해당 회귀를 재실행한다.

## 인수 기준

로컬 결과·버전/빌드·표본·정리한 자원·잔여 과제가 기록된다. 새 트랙 완료는 실제 콘텐츠 발행·운영 배포·검색 성과 완료를 뜻하지 않는다. 다음은 기존 SEO 운영 측정과 운영 승인 조건을 따른다.

## 검증

production 동작을 바꾸기 전에 focused RED의 예상 실패를 확인하고 GREEN→최소 정리를 진행한다. 기존 미구현 기능의 문자열 유무만 테스트하지 말고 실제 상태/응답을 검증한다. 코드 변경이 없었던 리허설은 재현 검사 결과만 기록한다.

```bash
npm run test:seo:http
npm run test:brain:http
npm run test:brain
npm run test:public-read-path
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

현재 운영 보류와 SEO S3 Step 1/2 조건을 확인한다. 승인 없이 운영 작업을 재개하지 않는다.
