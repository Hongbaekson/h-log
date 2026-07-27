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

| 항목 | 권장 기본안 | 상태 |
| --- | --- | --- |
| 고객사·회사명 | 명시 승인되지 않은 이름은 일반화 | 미확정 |
| 정량 성과 | 근거가 확인된 수치만 공개하고 프로젝트 수는 실제 data source에서 계산 | 미확정 |
| 프로필 사진 | 공개 승인 후에만 유지 | 미확정 |
| 이력서 PDF | 전 페이지 개인정보 검수와 이력서 명칭 일치 후 공개 | 미확정 |
| 연락 경로 | Contact form 없음, GitHub 공개, 이메일은 별도 승인 | 미확정 |
| Theme | 도메인 공개 시 dark-only, light theme은 별도 token refactor | 미확정 |
| Canonical route | `/portfolio`, `/projects`는 308 영구 redirect | 미확정 |

- PDF 모든 페이지를 직접 열어 전화번호, 생년월일, 주소, 내부 URL/IP, API key/token, 비공개 저장소명, 승인되지 않은 고객사 내부 흐름이 없는지 확인한다.
- Home, Portfolio, Resume, 프로젝트 상세의 고객사·회사명과 정량 수치를 근거 자료와 대조한다.
- Home의 `8+`, Portfolio의 실제 개수, 미사용 `portfolioStats`처럼 서로 다른 수치의 canonical source를 정한다.
- PDF의 public label과 다운로드 파일명은 `이력서`로 통일할지 사용자에게 확인한다.
- 확인 결과에는 민감 원문을 복사하지 않고 승인/일반화/삭제 상태와 검수 날짜만 기록한다.
- Step 완료 시 이 문서의 `미확정`을 모두 실제 결정으로 바꾸고 phase index에 짧은 summary를 남긴다.

## 인수 기준

```bash
node -e "JSON.parse(require('fs').readFileSync('phases/public-site-quality-hardening/index.json', 'utf8'))"
git diff --check
```

## 검증

1. 결정 기록에 `미확정` 항목이 남지 않았는지 확인한다.
2. PDF 전 페이지를 수동 확인하고 검수 날짜를 기록한다.
3. 공개 금지 정보가 UI data, PDF, profile asset에 없음을 확인한다.
4. Production code를 변경하지 않았는지 확인한다.
5. 성공 시 phase index의 Step 0을 `completed`로 갱신하고 결정 요약을 남긴다.

## 하지 말 것

- 사용자 승인 없이 회사명, 고객사명, 수치, 사진, PDF, 이메일을 임의로 공개 또는 삭제하지 말 것. 이유: 공개 범위는 코드 정리 문제가 아니라 사용자 결정이다.
- PDF의 민감 내용을 issue, log, phase summary에 복사하지 말 것. 이유: 검수 기록 자체가 새로운 노출 경로가 될 수 있다.
- 도메인, DNS/TLS, OCI, production timer를 변경하지 말 것. 이유: 이 phase는 cutover 전 품질 게이트다.
