# Step 3: portfolio-list-scanability

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
- `plans/personal-portfolio-design-direction.md`
- `apps/h-log/phases/public-site-quality-hardening/step0.md`
- `apps/h-log/app/portfolio/page.tsx`
- `apps/h-log/components/ui/ScrollRevealItem.tsx`
- `apps/h-log/lib/projects.ts`
- `apps/h-log/lib/projects.test.ts`
- `apps/h-log/lib/portfolio-card.ts`
- `apps/h-log/app/globals.css`

## 작업

중앙 교차 타임라인을 빠르게 비교할 수 있는 Portfolio 목록으로 바꾼다.

- Step 0에서 승인된 공개 프로젝트 중 대표 2개를 Featured 영역에 배치한다.
- 나머지 프로젝트는 compact grid로 배치하고 각 card에서 기간, 역할, 핵심 판단, 검증된 결과를 같은 순서로 보여준다.
- 중앙 rail, 좌우 교차 배치, 큰 수직 공백을 제거한다.
- 모바일에서는 rail용 빈 폭 없이 단일 컬럼 전체 폭을 사용한다.
- 프로젝트 6개가 정해진 정렬 순서로 정확히 한 번씩 나타나게 한다.
- Step 0 결정에 따라 card의 조직 식별자와 근거 자료가 확인되지 않은 상세 성과 수치를 일반화한다.
- 사용처가 사라지면 `ScrollRevealItem`과 전용 reveal CSS를 삭제한다.
- Card 구조는 기존 UI를 재사용하고 미래 필터를 위한 추상화는 만들지 않는다.

## 인수 기준

```bash
npm run test
npm run lint
npm run typecheck
npm run build
```

## 검증

1. 프로젝트 개수, 순서, 중복 없는 렌더링을 증명하는 focused RED 또는 characterization test를 먼저 확인한다.
2. Featured 2개와 나머지 grid가 같은 data source를 사용하도록 최소 구현한다.
3. 320/390/768/1440px에서 card 폭, 수직 공백, 텍스트 overflow를 확인한다.
4. 모든 card 링크가 해당 `/portfolio/[slug]`로 이동하는지 확인한다.
5. `ScrollRevealItem` 제거 후 import와 CSS selector가 남지 않았는지 확인한다.
6. 성공 시 phase index의 Step 3을 `completed`로 갱신한다.

## 하지 말 것

- 중앙 타임라인을 다른 이름의 rail/alternating layout으로 다시 만들지 말 것. 이유: 모바일 폭과 비교 가능성 문제가 그대로 남는다.
- 공개 승인되지 않은 고객사명이나 수치를 Featured copy에 새로 넣지 말 것. 이유: Step 0 경계를 우회한다.
- 필터, carousel, animation library를 추가하지 말 것. 이유: 현재 공개 프로젝트 수에는 필요하지 않다.
