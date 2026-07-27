# Step 9: public-launch-quality-gate-and-doc-sync

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
- `.codex/skills/sync-repos/SKILL.md`
- `apps/h-log/.codex/docs/implementation-roadmap.md`
- `plans/personal-portfolio-site-development-plan.md`
- `plans/personal-portfolio-design-direction.md`
- `apps/h-log/phases/public-site-quality-hardening/index.json`
- `apps/h-log/phases/public-site-quality-hardening/step0.md`
- Steps 1-8에서 변경된 production/test 파일
- `apps/h-log/package.json`

## 작업

새 기능을 추가하지 않고 Steps 0-8 결과를 도메인 적용 전 공개 품질 게이트로 검증하고 실제 구현 상태에 맞춰 문서를 동기화한다.

- 실제 `DATABASE_URL`을 사용하는 production-like 환경에서 Blog 목록, 상세, Markdown, 검색, sitemap을 smoke한다.
- Home, Resume, Portfolio 목록/상세, Blog 목록/상세를 320/390/768/1440px에서 확인한다.
- Keyboard navigation, focus-visible, skip link, reduced motion, horizontal overflow를 확인한다.
- 브라우저 내장 Lighthouse 또는 이미 사용 가능한 동일 측정 도구로 production build를 측정한다. 측정 도구를 repo dependency로 추가하지 않는다.
- 목표는 Performance 90 이상, Accessibility/Best Practices/SEO 95 이상으로 둔다.
- Step 0의 PDF/콘텐츠 개인정보 검수를 다시 확인한다.
- 실제 canonical route와 DB-first Blog 구현에 맞춰 `AGENTS.md`, implementation roadmap, design/development plans의 오래된 `/projects`, file-based MDX, Contact 설명을 필요한 부분만 수정한다.
- 모든 gate가 통과한 뒤 phase index Steps 0-9와 top-level registry를 `completed`로 갱신한다.
- 다음 실행 대상은 사용자 승인과 실제 domain/privacy 설정이 필요한 `auto-publish-ops-hardening / Step 4`로 기록한다.

## 인수 기준

```bash
npm run test
npm run lint
npm run typecheck
npm run build
git diff --check
```

## 검증

1. 전체 gate와 DB-backed Blog production-like smoke 결과를 기록한다.
2. Lighthouse 목표 미달, 개인정보 미확정, 가로 overflow, keyboard blocker가 있으면 phase를 완료하지 않는다.
3. 실패가 발견되면 이 step에서 임시 수정하지 않고 원인을 소유하는 Step 1-8을 다시 연다.
4. 문서의 구현 완료 주장과 실제 route/code를 대조한다.
5. Phase JSON을 parse하고 top-level/phase status가 일치하는지 확인한다.
6. Domain, DNS/TLS, OCI, timer가 변경되지 않았는지 확인한다.

## 하지 말 것

- 품질 gate에서 발견한 production bug를 테스트 없이 즉석 수정하지 말 것. 이유: 원래 behavior step의 TDD 경계를 우회한다.
- Lighthouse 점수를 위해 접근성 정보나 실제 콘텐츠를 제거하지 말 것. 이유: 숫자보다 사용자 가치가 우선이다.
- 실제 구현 전에 계획 문서를 완료 상태로 바꾸지 말 것. 이유: plan과 runtime을 혼동하게 된다.
- 도메인 구매, DNS/TLS, OCI deployment, signal collection, persona activation, production timer를 실행하지 말 것. 이유: 별도 승인 경계다.
