# Step 4: portfolio-detail-clarity

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
- `apps/h-log/app/portfolio/[slug]/page.tsx`
- `apps/h-log/components/portfolio/GithubWebhookArchitectureDiagram.tsx`
- `apps/h-log/lib/projects.ts`
- `apps/h-log/lib/projects.test.ts`

## 작업

각 프로젝트 상세를 `문제 -> 판단 -> 결과` 순서로 읽히게 하고 같은 설명의 반복을 줄인다.

- System Map과 본문의 architecture 배열이 같은 내용을 반복하면 한 표면만 남긴다.
- 문제, 선택한 접근, 결과의 대응 관계가 불명확하지 않도록 프로젝트 data contract를 검증한다.
- `approach`, `decisions`, `impact`의 길이와 fallback이 사용자에게 잘못된 대응 관계를 만들지 않게 테스트한다.
- 핵심 역할과 검증된 결과가 긴 서술 전에 보이도록 정보 순서를 조정한다.
- 다이어그램이 좁은 화면에서 잘리지 않도록 label과 horizontal scroll 경계를 접근 가능하게 유지한다.
- Step 0에서 승인되지 않은 수치나 회사 내부 구조는 일반화한다.

## 인수 기준

```bash
npm run test
npm run lint
npm run typecheck
npm run build
```

## 검증

1. Project detail data의 문제-판단-결과 대응을 증명하는 focused RED를 먼저 확인한다.
2. 가장 작은 data/page 변경으로 GREEN을 만든다.
3. 모든 공개 slug의 상세 페이지 build와 link를 확인한다.
4. 데스크톱과 모바일에서 중복 architecture 문장이 사라지고 다이어그램 label이 읽히는지 확인한다.
5. 성공 시 phase index의 Step 4를 `completed`로 갱신한다.

## 하지 말 것

- 실제 자료에 없는 의사결정이나 성과를 빈 배열을 채우기 위해 만들지 말 것. 이유: 포트폴리오의 사실성이 우선이다.
- 한 페이지를 위해 새 범용 content schema나 page builder를 만들지 말 것. 이유: 현재 프로젝트 data contract로 해결할 수 있다.
- System Map과 본문 architecture를 둘 다 남긴 채 copy만 바꾸지 말 것. 이유: 정보 중복을 해결하지 못한다.
