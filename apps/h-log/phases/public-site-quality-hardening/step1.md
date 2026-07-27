# Step 1: shared-shell-accessibility-baseline

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
- `apps/h-log/.codex/docs/harness/UI_GUIDE.md`
- `apps/h-log/phases/public-site-quality-hardening/step0.md`
- `apps/h-log/app/layout.tsx`
- `apps/h-log/app/globals.css`
- `apps/h-log/components/layout/Header.tsx`
- `apps/h-log/components/layout/ThemeToggle.tsx`
- `apps/h-log/components/ui/Container.tsx`
- `apps/h-log/lib/site.test.ts`

## 작업

모든 공개 페이지가 공유하는 shell의 키보드 접근성과 작은 화면 경계를 고정한다.

- 첫 focus 대상에 본문으로 이동하는 skip link를 추가하고 `<main id="main-content">`와 연결한다.
- Header, navigation, theme control의 focus-visible을 명확하게 하고 모바일 메뉴가 Escape로 닫히며 focus 흐름을 방해하지 않게 한다.
- `Container`와 Header 폭을 320/390/768/1440px에서 검증해 공통 shell의 가로 overflow를 제거한다.
- Step 0에서 dark-only가 승인되면 `ThemeToggle`과 classname substring 기반 light override를 제거한다.
- Light theme 유지가 결정되면 이 step에서 selector를 덧대지 말고 별도 token refactor 범위를 먼저 작성한다.
- 사용하지 않게 된 공통 CSS와 import만 제거한다.

## 인수 기준

```bash
npm run test
npm run lint
npm run typecheck
npm run build
```

## 검증

1. Skip link와 main target이 없는 상태를 증명하는 focused RED 또는 기존 shell characterization test를 먼저 확인한다.
2. 최소 구현 후 focused GREEN과 전체 gate를 실행한다.
3. 키보드만으로 Header와 본문 진입을 확인하고 focus 표시가 사라지지 않는지 검사한다.
4. 320/390/768/1440px에서 공통 shell의 가로 overflow를 확인한다.
5. `prefers-reduced-motion`에서 필수 정보가 사라지지 않는지 확인한다.
6. 성공 시 phase index의 Step 1을 `completed`로 갱신한다.

## 하지 말 것

- 새 theme 또는 accessibility dependency를 추가하지 말 것. 이유: 플랫폼과 기존 CSS로 해결 가능한 공통 shell 범위다.
- 여러 페이지의 개별 레이아웃을 함께 손보지 말 것. 이유: 이 step은 공유 shell만 소유한다.
- Light theme을 classname 부분 selector로 계속 보정하지 말 것. 이유: 새 class 조합마다 회귀하는 취약한 경계다.
