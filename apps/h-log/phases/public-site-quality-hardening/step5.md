# Step 5: resume-scanability-and-download-contract

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
- `.codex/skills/tdd/SKILL.md`
- `apps/h-log/.codex/rules/frontend.md`
- `apps/h-log/.codex/rules/content-seo-privacy.md`
- `apps/h-log/.codex/docs/harness/UI_GUIDE.md`
- `apps/h-log/phases/public-site-quality-hardening/step0.md`
- `apps/h-log/app/resume/page.tsx`
- `apps/h-log/components/resume/PdfDownloadButton.tsx`
- `apps/h-log/components/resume/ResumeProfilePhoto.tsx`
- `apps/h-log/app/api/resume/pdf/route.ts`
- `apps/h-log/lib/resume-profile.ts`
- `apps/h-log/lib/resume-profile.test.ts`
- `apps/h-log/lib/resume-pdf.test.ts`
- `apps/h-log/lib/download-file.test.ts`
- `apps/h-log/lib/download-rate-limit.test.ts`

## 작업

채용 담당자가 모바일에서도 핵심 경력과 성과를 먼저 확인하도록 Resume 정보 순서와 다운로드 계약을 정리한다.

- 짧은 프로필 요약 다음에 Experience와 핵심 성과를 배치하고, 전체 Skills와 Education은 뒤로 이동한다.
- 소개 문단을 2개 이내로 줄이고 긴 본문 폭을 약 70자 수준으로 제한한다.
- Skills는 빠르게 훑을 수 있는 compact group으로 유지한다.
- Step 0 결정에 따라 프로필 사진을 유지하거나 제거한다.
- Step 0의 PDF 공개 보류 조건을 해소한다. 조직 식별자가 일반화된 안전한 이력서 PDF만 공개하고, 안전한 교체본이 없으면 download CTA와 API를 공개 상태로 유지하지 않는다.
- PDF UI label, API `Content-Disposition`, fallback file name을 `이력서` 기준으로 일치시킨다.
- 다운로드는 일반 링크와 기존 server rate limiter로 처리하고 250ms timer, 가짜 준비 상태, client cooldown은 제거한다.
- Server의 실제 5회/분 rate limit과 trusted client ID 경계는 유지한다.

## 인수 기준

```bash
npm run test
npm run lint
npm run typecheck
npm run build
```

## 검증

1. 잘못된 자기소개서 filename 또는 Resume 정보 순서를 증명하는 focused RED를 먼저 확인한다.
2. 기존 resume/download 테스트를 GREEN으로 만들고 server rate-limit 회귀가 없는지 확인한다.
3. 320/390px에서 경력이 과도한 스크롤 뒤로 밀리지 않고 본문이 너무 넓거나 잘리지 않는지 확인한다.
4. 다운로드 응답의 한글/ASCII filename과 public asset이 일치하는지 확인한다.
5. 공개 PDF 전 페이지를 다시 확인해 Step 0의 조직 식별자 일반화와 개인정보 경계가 유지되는지 검증한다.
6. Client state 제거 후 사용하지 않는 interval, cooldown, import가 남지 않았는지 확인한다.
7. 성공 시 phase index의 Step 5를 `completed`로 갱신한다.

## 하지 말 것

- Client cooldown으로 server rate limit을 대체하지 말 것. 이유: 사용자가 우회할 수 있고 실제 보호 경계가 아니다.
- PDF 내부 정보를 코드 테스트 fixture에 복사하지 말 것. 이유: 개인정보가 저장소에 중복될 수 있다.
- 이 step에서 Contact page나 form을 만들지 말 것. 이유: 승인된 연락 링크만으로 충분하다.
