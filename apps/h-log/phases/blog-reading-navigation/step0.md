# Step 0: heading-anchors-and-toc

## 개선 사항

제목 링크와 목차. 이전 phase `blog-reading-foundation` 완료 후 실행한다.

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
- `apps/h-log/phases/blog-reading-navigation/index.json`
- `apps/h-log/lib/blog-public.ts`
- `apps/h-log/lib/blog-public.test.ts`
- `apps/h-log/app/blog/[slug]/page.tsx`

## 작업

실제 본문 heading에 안정적인 ID를 부여하고 desktop sticky 목차와 mobile 접이식 목차를 연결한다. 출처는 본문 하단으로 이동한다. 중복/한글 제목과 고정 헤더 offset을 다루며 code 내부 heading은 제외한다.

## 인수 기준

목차 클릭·직접 hash 접근·새로고침·키보드 이동이 맞는 본문 제목을 가리킨다. 짧은 글은 불필요한 빈 목차를 만들지 않는다.

앱 디렉터리에서 가까운 검증 후 기본 gate를 실행한다.

```bash
node --no-warnings --test --experimental-strip-types lib/blog-public.test.ts
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
