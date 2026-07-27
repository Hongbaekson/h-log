# Step 0: public-content-approval-and-privacy-audit

## 읽을 파일

- `AGENTS.md`
- `apps/h-log/AGENTS.md`
- `apps/h-log/.codex/docs/harness/PRD.md`
- `apps/h-log/.codex/docs/harness/ADR.md`
- `apps/h-log/.codex/docs/harness/ARCHITECTURE.md`
- `apps/h-log/.codex/docs/harness/WORKFLOW.md`
- `apps/h-log/.codex/docs/harness/AGENT_LOOP.md`
- `apps/h-log/.codex/docs/harness/IMPLEMENTATION_PLAN.md`
- `.codex/skills/harness/SKILL.md`
- `apps/h-log/.codex/rules/content-seo-privacy.md`
- `apps/h-log/app/page.tsx`
- `apps/h-log/app/portfolio/page.tsx`
- `apps/h-log/app/resume/page.tsx`
- `apps/h-log/lib/projects.ts`
- `apps/h-log/lib/resume-profile.ts`
- `apps/h-log/public/son-hongbaek-resume.pdf`

## 작업

Production code를 바꾸기 전에 공개 범위와 출시 기본 결정을 사용자와 확정하고 이 문서의 결정 기록을 갱신한다.

| 항목 | 권장 기본안 | 결정 |
| --- | --- | --- |
| 고객사·회사명 | 명시 승인되지 않은 이름은 일반화 | 일반화 확정. 공개 UI·slug·PDF의 조직 식별자는 후속 콘텐츠 step에서 일반 표현으로 교체 |
| 정량 성과 | 근거가 확인된 수치만 공개하고 프로젝트 수는 실제 data source에서 계산 | 상세 성과 수치는 근거 자료 확인 전 공개 보류. 프로젝트 수는 공개 project data source에서 계산 |
| 현재 회사 내부 흐름 | 조직과 내부 업무를 특정하지 않는 수준으로 일반화 | 일반화 확정. 공개 가능한 기술 패턴만 유지 |
| 프로필 사진 | 공개 승인 후에만 유지 | 공개 유지 승인. 원본 asset 직접 확인 및 GPS metadata 없음 확인 |
| 이력서 PDF | 전 페이지 개인정보 검수와 이력서 명칭 일치 후 공개 | 2페이지 검수 완료. 금지 정보는 없으나 조직 식별자 일반화와 `이력서` 명칭 통일 전까지 공개 다운로드 보류 |
| 연락 경로 | Contact form 없음, GitHub 공개, 이메일은 별도 승인 | GitHub 공개 승인. Contact form과 이메일은 공개하지 않음 |
| Theme | 도메인 공개 시 dark-only, light theme은 별도 token refactor | dark-only 확정. light theme은 현재 출시 범위에서 제외 |
| Canonical route | `/portfolio`, `/projects`는 308 영구 redirect | `/portfolio` 확정. `/projects` 308 redirect는 Step 8에서 구현 |

- PDF 모든 페이지를 직접 열어 전화번호, 생년월일, 주소, 내부 URL/IP, API key/token, 비공개 저장소명, 승인되지 않은 고객사 내부 흐름이 없는지 확인한다.
- Home, Portfolio, Resume, 프로젝트 상세의 고객사·회사명과 정량 수치를 근거 자료와 대조한다.
- Home의 `8+`, Portfolio의 실제 개수, 미사용 `portfolioStats`처럼 서로 다른 수치의 canonical source를 정한다.
- PDF의 public label과 다운로드 파일명은 `이력서`로 통일할지 사용자에게 확인한다.
- 확인 결과에는 민감 원문을 복사하지 않고 승인/일반화/삭제 상태와 검수 날짜만 기록한다.
- Step 완료 시 모든 항목을 실제 결정으로 바꾸고 phase index에 짧은 summary를 남긴다.

## 2026-07-27 감사 기록

### PDF와 프로필 asset

- PDF 2페이지를 이미지로 변환해 각 페이지를 직접 확인했다.
- 전화번호, 생년월일, 주소, 내부 URL/IP, API key/token, 비공개 저장소명에 해당하는 공개 금지 정보는 발견되지 않았다.
- PDF link, embedded file, 민감 metadata는 없었다.
- PDF에는 일반화 결정과 충돌하는 조직 식별자가 있어 파일은 유지하되 Step 5에서 안전한 공개본과 `이력서` 다운로드 명칭을 일치시키기 전까지 공개 승인을 보류한다.
- 프로필 사진은 직접 확인했고 GPS metadata가 없음을 확인했다. 사용자는 권장 공개 기본안 진행을 승인했으므로 공개 유지로 기록한다.

### 공개 UI data

- Home, Portfolio 목록·상세, Resume, project/profile data source에서 전화번호, 이메일, private URL/IP, credential pattern이 없음을 확인했다.
- 현재 project data에는 일반화 대상 조직 식별자와 상세 성과 수치가 있다. 원문을 이 기록에 복사하지 않고 Steps 2-5에서 각각 일반화하거나 근거 없는 수치를 제거한다.
- 현재 회사 업무는 조직, endpoint, 내부 저장소를 특정하지 않는 공개 가능한 기술 패턴만 유지한다.

### Canonical 공개 수치와 명칭

- 공개 프로젝트 수의 source of truth는 `lib/projects.ts`의 실제 공개 project collection이다. 현재 공개 목록은 6개이며 Home의 hard-coded `8+`와 미사용 `portfolioStats`는 Step 2에서 제거한다.
- 경력 연차는 Home의 `careerStart`에서 현재 날짜 기준으로 계산하는 파생 수치만 허용한다.
- 응답 시간, 처리량, 장애 건수, 복구 시간, 비율 같은 상세 성과 수치는 별도 근거 자료가 확인되기 전에는 공개하지 않는다.
- PDF label, 한글 download filename, ASCII fallback은 모두 `이력서` 의미로 Step 5에서 통일한다.

### 실행 경계

- 이번 Step에서는 production code, public asset, domain, DNS/TLS, OCI, signal collection, persona, production timer를 변경하지 않았다.
- 다음 실행 대상은 `Step 1: shared-shell-accessibility-baseline`이다.

## 인수 기준

```bash
node -e "JSON.parse(require('fs').readFileSync('phases/public-site-quality-hardening/index.json', 'utf8'))"
git diff --check
```

## 검증

1. 결정 기록에 해결되지 않은 항목이 남지 않았는지 확인한다.
2. PDF 전 페이지를 수동 확인하고 검수 날짜를 기록한다.
3. 공개 금지 정보가 UI data, PDF, profile asset에 없음을 확인한다.
4. Production code를 변경하지 않았는지 확인한다.
5. 성공 시 phase index의 Step 0을 `completed`로 갱신하고 결정 요약을 남긴다.

## 하지 말 것

- 사용자 승인 없이 회사명, 고객사명, 수치, 사진, PDF, 이메일을 임의로 공개 또는 삭제하지 말 것. 이유: 공개 범위는 코드 정리 문제가 아니라 사용자 결정이다.
- PDF의 민감 내용을 issue, log, phase summary에 복사하지 말 것. 이유: 검수 기록 자체가 새로운 노출 경로가 될 수 있다.
- 도메인, DNS/TLS, OCI, production timer를 변경하지 말 것. 이유: 이 phase는 cutover 전 품질 게이트다.
