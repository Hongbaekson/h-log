# Step 3: rss-and-work-evidence-links

## 개선 사항

구독과 일하는 방식의 사례 연결. 같은 phase의 Step 2 완료 후 실행한다.

## 읽을 파일

모든 경로는 저장소 루트 기준이다. 아래 파일과 수정 대상의 실제 caller를 확인한다.

- `AGENTS.md`
- `apps/h-log/AGENTS.md`
- `.codex/skills/harness/SKILL.md`
- `.codex/skills/tdd/SKILL.md`
- `apps/h-log/.codex/docs/harness/PRD.md`
- `apps/h-log/.codex/docs/harness/ADR.md`
- `apps/h-log/.codex/docs/harness/ARCHITECTURE.md`
- `apps/h-log/.codex/docs/harness/WORKFLOW.md`
- `apps/h-log/.codex/docs/harness/AGENT_LOOP.md`
- `apps/h-log/.codex/docs/harness/IMPLEMENTATION_PLAN.md`
- `apps/h-log/.codex/docs/harness/UI_GUIDE.md`
- `apps/h-log/.codex/rules/frontend.md`
- `apps/h-log/.codex/rules/content-seo-privacy.md`
- `apps/h-log/.codex/docs/harness/PUBLIC_EXPERIENCE_PLAN.md`
- `apps/h-log/phases/blog-discovery-and-home/index.json`
- `apps/h-log/components/layout/Footer.tsx`
- `apps/h-log/app/feed.xml/route.ts`
- `apps/h-log/app/page.tsx`
- `apps/h-log/lib/projects.ts`
- `apps/h-log/lib/blog-crawler-output.test.ts`

## 작업

기존 RSS 피드의 진입점을 푸터/블로그에 제공하고 홈의 일하는 방식 설명에 공개된 프로젝트나 글을 연결한다. 새 구독 DB나 이메일 수집은 만들지 않는다.

## 인수 기준

RSS 링크와 사례 링크가 실제 목적지로 연결되고 focus/새 창 안내가 정확하다. feed의 published-only 경계와 현재 홈 레이더를 유지한다.

앱 디렉터리에서 가까운 검증 후 기본 gate를 실행한다.

```bash
node --no-warnings --test --experimental-strip-types lib/blog-crawler-output.test.ts
npm run test
npm run lint
npm run typecheck
npm run build
git diff --check
```

## 검증

1. 바꾸는 public behavior의 RED를 확인한 뒤 최소 구현으로 같은 테스트의 GREEN을 확인한다. 순수 콘텐츠/문서 변경은 파서·링크·형식 검증으로 대체한다.
2. UI는 개발 서버와 격리 local DB의 synthetic fixture로 1440/390/320px, focus, 긴 글, 빈/오류 상태를 확인한다. DB/repository/worker/migration 변경 시 `npm run test:integration`을 추가한다.
3. phase index와 이 step에 실제 결과·검증 command·다음 단계를 기록한다. 완료된 기능만 completed로 표시한다.

## 하지 말 것

- 레이더의 데이터·축·형태·배치·주변 영역을 변경하지 말 것. 사용자가 명시적으로 보존을 요청했다.
- 저장 Markdown/HTML/hash나 기존 URL을 무단 재작성하지 말 것. 발행 무결성과 기존 링크를 유지해야 한다.
- raw HTML 주입, private 글/내부 evidence/근거 없는 실적 노출을 허용하지 말 것. 공개 콘텐츠 경계를 유지해야 한다.
- OCI·DNS/TLS·운영 timer·실제 provider 호출·공개 발행을 실행하지 말 것. 로컬 개선 계획이며 기존 OCI 보류는 유지된다.
