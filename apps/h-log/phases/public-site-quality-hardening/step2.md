# Step 2: home-evidence-first-simplification

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
- `apps/h-log/app/page.tsx`
- `apps/h-log/app/globals.css`
- `apps/h-log/lib/projects.ts`
- `apps/h-log/lib/projects.test.ts`
- `apps/h-log/lib/site.test.ts`

## 작업

Home을 임의 점수의 대시보드가 아니라 검증 가능한 경력 입구로 단순화한다.

- 프로젝트 개수와 공개 지표는 `lib/projects.ts`의 실제 공개 data source에서 계산한다.
- 근거 없는 기술 radar 점수와 회전 역할/수치 UI를 제거한다.
- 장식 영역은 Step 0에서 승인된 대표 성과 1개와 현재 관심사처럼 검증 가능한 정보로 교체한다.
- 사용하지 않게 된 `portfolioStats`, animation class, import만 함께 제거한다.
- 연락 CTA는 Step 0 결정에 따라 GitHub를 제공하고 이메일은 승인된 경우에만 추가한다.
- Home은 DB-backed 최신 글을 조회하지 않고 Blog route 링크만 제공한다.
- 가능한 한 Server Component를 유지하고 새 client component를 만들지 않는다.

## 인수 기준

```bash
npm run test
npm run lint
npm run typecheck
npm run build
```

## 검증

1. 공개 프로젝트 수와 Home 표시가 어긋나는 focused RED를 먼저 확인한다.
2. 실제 data source에서 계산한 값으로 GREEN을 만든다.
3. Radar/rotator 제거 후 관련 client JavaScript와 CSS가 남지 않았는지 확인한다.
4. 데스크톱과 모바일 첫 화면에서 H1, 설명, CTA, 검증된 근거가 과도한 스크롤 없이 보이는지 확인한다.
5. 변경 전후 diff에서 새 dependency가 없고 순 코드량이 감소했는지 확인한다.
6. 성공 시 phase index의 Step 2를 `completed`로 갱신한다.

## 하지 말 것

- 사실 확인이 안 된 프로젝트 수, 백분율, 기술 숙련도 점수를 만들지 말 것. 이유: 공개 신뢰도를 낮춘다.
- Home을 DB availability에 결합하지 말 것. 이유: 블로그 장애가 개인 사이트 첫 화면 장애로 확산된다.
- 삭제한 장식을 대체하는 새 carousel, chart, animation dependency를 추가하지 말 것. 이유: 정보 밀도 개선이 목적이다.
