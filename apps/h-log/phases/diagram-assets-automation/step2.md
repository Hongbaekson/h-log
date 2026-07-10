# Step 2: article-diagram-insertion-gate

## 읽을 파일

- `AGENTS.md`
- `apps/h-log/AGENTS.md`
- `apps/h-log/.codex/docs/harness/PRD.md`
- `apps/h-log/.codex/docs/harness/ADR.md`
- `apps/h-log/.codex/docs/harness/ARCHITECTURE.md`
- `apps/h-log/.codex/docs/harness/WORKFLOW.md`
- `apps/h-log/.codex/docs/harness/AGENT_LOOP.md`
- `.codex/skills/harness/SKILL.md`
- `.codex/skills/tdd/SKILL.md`
- `plans/automated-blog-publishing-plan.md`
- `apps/h-log/lib/blog-content-model.ts`
- `apps/h-log/lib/blog-content-model.test.ts`
- `apps/h-log/lib/blog-diagram-assets.ts`
- `apps/h-log/lib/blog-diagram-assets.test.ts`
- `apps/h-log/lib/blog-public.ts`
- `apps/h-log/lib/blog-public.test.ts`
- `apps/h-log/app/blog/[slug]/page.tsx`
- `apps/h-log/lib/blog-crawler-output.ts`
- `apps/h-log/lib/blog-crawler-output.test.ts`

## 작업

검증된 diagram asset만 공개 글의 결정적인 위치에 보조 figure로 삽입한다.

- `post_assets`에 `status`, `asset_hash`, `verified_at` 검증 경계를 추가하고, `ready`인 asset만 렌더링 후보로 사용한다.
- asset은 `post_id`와 현재 `post_version_id`가 모두 일치해야 하며, 교체된 이전 version asset은 제외한다.
- renderer는 첫 H2 뒤에 최대 1개의 `<figure>`/`<img>`/`<figcaption>`을 출력한다. H2가 없으면 첫 paragraph 뒤에 배치한다.
- canonical `content_markdown`, `content_html`, `content_hash`는 수정하지 않는다. Diagram은 version-bound derived asset이며 자체 `asset_hash`로 무결성을 확인한다.
- missing, failed, hash 불일치 asset은 빈 이미지나 깨진 UI 대신 figure 전체를 생략하고 본문은 그대로 렌더링한다.
- `llms.txt`, `llms-full.txt`, feed, Markdown endpoint에는 diagram 설명을 별도로 반복하지 않는다. Canonical 글 내용과 `content_hash` 경계를 유지한다.

## 인수 기준

```bash
npm run test
npm run lint
npm run typecheck
npm run build
```

## 검증

1. 다른 version 또는 `ready`가 아닌 asset이 본문에 삽입되는 실패 테스트를 먼저 작성한다.
2. GREEN에서 현재 version의 검증된 diagram 하나만 결정적인 위치에 렌더링한다.
3. missing/hash mismatch asset에서 figure가 생략되고 canonical content hash가 바뀌지 않는지 확인한다.
4. crawler/Markdown output이 diagram alt를 중복하지 않는지 확인한다.
5. `npm run test`, `npm run lint`, `npm run typecheck`, `npm run build`를 실행한다.
6. 성공 시 phase index의 step status를 갱신한다.

## 하지 말 것

- public renderer에서 raw SVG string을 무검증 삽입하지 말 것.
- diagram 삽입을 위해 canonical Markdown을 사후 수정하지 말 것.
- 다이어그램 설명으로 본문 claim을 대체하지 말 것.
- asset 오류를 사용자에게 빈 깨진 이미지로 노출하지 말 것.
