# Step 0: current-claims-inventory

## 상태와 선행 조건

completed — 2026-11-09. 대표 주장 5건의 근거·현재성과 화면별 연결을 정리했다. [연결 대장](../../.codex/docs/harness/CURRENT_CLAIMS_INVENTORY.md)에 공개 가능한 요약과 다음 원고를 남겼다.

S3 Step 0 완료. 기본 순서는 R1 이후이나 자료 정리는 R1 구현과 독립적이다.

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
- `apps/h-log/.codex/rules/content-seo-privacy.md`
- `apps/h-log/lib/projects.ts`
- `apps/h-log/lib/resume-profile.ts`
- `apps/h-log/app/resume/page.tsx`
- `apps/h-log/lib/blog-series.ts`
- `apps/h-log/lib/portfolio-posts.ts`
- `apps/h-log/lib/brain-catalog.ts`
- `apps/h-log/.codex/docs/harness/BLOG_CASE_STUDY_REVIEW.md`
- `apps/h-log/.codex/docs/harness/SEO_CONTENT_LINK_REVIEW.md`
- `apps/h-log/.codex/docs/harness/BLOG_WRITING_GUIDE.md`

## 범위와 산출물

이 step의 단위는 **현재 주장과 근거의 연결 대장**이다. 아래 관련 파일과 선행 계약에서 필요한 최소 변경만 한다. main 계획의 기존 구현/후속 범위를 구분하고 완료된 phase를 다시 열지 않는다.

## 작업

1. 기존 승인 콘텐츠/검수 원고에서 대표 3~5개 주장을 선택하고 Portfolio·Resume·Blog 후보·Brain의 연결을 조사한다. 현재 적용/과거 실험/대체된 판단/미확인을 구분한다.
2. 주장별 근거, 실제 확인일, 출처 종류, 수정 후보와 필요한 본인 확인을 대장으로 남긴다. 운영 DB를 조회할 권한이나 새 사내 문서 열람 권한으로 이 단계를 해석하지 않는다.
3. 공개 가능한 요약은 Harness에, 원자료·미확인 회고·내부 경로는 Git/Docker 제외 private에 둔다. 기존 S2 Step 4 원고 검수를 재사용하고 같은 글을 새 성과로 중복 계산하지 않는다.

## 인수 기준

대표 주장마다 확인/추론/질문과 현재성이 구분된다. 자료가 부족한 항목은 근거와 필요한 질문이 남으며, 임의 성과·감정·날짜가 추가되지 않는다. 다음 단계에서 사용할 검증 가능한 사례 후보를 정한다.

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

## 완료 기록 — 2026-11-09

대표 5건은 H-Log 최근 글 조회, Redisson Queue/DLQ, Redis 예열, 명세 기반 AI 워크플로우, OpenTelemetry 원인 식별이다. 현재 코드·과거 경력/실행 기록·추론·질문을 분리하고 실제 교체가 확인되지 않은 판단은 대체됨으로 표시하지 않았다. Resume 주장은 사진 정보 파일이 아닌 page의 timelineItems에서 확인했다.

R2 Step 1은 기존 S2 Step 4 Home/Suspense 원고를 재사용한다. 후보·과거 원본 hash와 S2 근거 11개 파일이 모두 같다. 새 원고/성과 수는 0이며 대표 주장별 추가 확인 질문과 근거 22개 파일의 hash는 Git/Docker 제외 `private/r2-claims-2026-11-09/`에 보관했다. 외부 기술 자료나 회사 원본은 새로 열지 않았다.

변경 파일은 연결 대장, 이 step·R2 index·전체 registry, 후속 Step 1의 읽을 파일, 기록 개선/성능/구현 계획과 루트 자동 블로그 계획이다. R은 **completed 4·pending 10**, R2는 **1/3 완료**다. F 22개 pending과 SEO/A/모니터링 상태는 유지한다.

앱 디렉터리에서 실행한 문서 전용 명령은 다음과 같다. 검사기는 로컬 검수 묶음에 있으며 앱 runtime 의존성이 아니다.

```powershell
python private/r2-claims-2026-11-09/prepare.py
node private/r2-claims-2026-11-09/validate.mjs
git diff --check
```

Markdown/JSON 파싱, 상대 링크·step 읽을 경로, 60개 phase/209개 step과 대상 하나의 상태 변경, 기존 원고/근거 hash 보존, private 제외·문서 전용 변경 범위를 통과했다. 원고의 과거 DB/HTTP/브라우저 실행은 재실행하지 않았으며 이번 결과로 계산하지 않는다. 공개 데이터·UI·배포 상태 변경은 없다.

## 다음 단계

R2 Step 1 `evidence-case-manuscript`.
