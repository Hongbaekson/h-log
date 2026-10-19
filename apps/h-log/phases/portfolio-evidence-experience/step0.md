# Step 0: featured-hierarchy-and-discord

## 개선 사항

대표 사례 위계와 Discord 일관성. 이전 phase `blog-discovery-and-home` 완료 후 실행한다.

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
- `apps/h-log/phases/portfolio-evidence-experience/index.json`
- `apps/h-log/app/portfolio/page.tsx`
- `apps/h-log/lib/projects.ts`
- `apps/h-log/lib/portfolio-card.ts`
- `apps/h-log/app/globals.css`

## 작업

대표 1개+보조 2개의 위계와 간결한 경력 목록을 만든다. 기존 Discord indigo/Blurple 토큰을 사용하고 제목·역할·핵심 결과만 목록에 남긴다. 원래 프로젝트/성과 내용은 보존한다.

## 인수 기준

공개 프로젝트 수·canonical 경로·링크가 유지되며 1440/390/320px에서 긴 제목과 카드 내용이 잘리지 않는다. 한국어 주요 문구와 focus를 확인한다.

앱 디렉터리에서 가까운 검증 후 기본 gate를 실행한다.

```bash
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

## 완료 기록 — 2026-10-19

- `app/portfolio/page.tsx`: AI 개발 워크플로우를 대표 사례로 크게 배치하고 비동기 처리·관측성 사례 2개를 오른쪽에 쌓았다. 모바일에서는 기존 순서대로 표시한다. 경력 5개는 구분선으로 나눈 목록, 개인 프로젝트 1개는 별도 섹션으로 정리했다. 한국어 제목·공개 프로젝트 수·키보드 초점과 기존 Discord surface/Blurple 토큰을 사용한다.
- `lib/portfolio-card.ts`: 목록에는 기존 제목·첫 역할·첫 성과만 선택한다. 기간·상태·기술 스택·결정의 중복 표시는 줄이고 전체 내용은 기존 상세에 유지했다. `lib/projects.ts`에서는 사용처가 사라진 색상 class map만 제거했다. 9개 프로젝트 데이터는 변경 전 JSON과 일치한다.
- `lib/projects.test.ts`: 첫 성과 선택과 전체 원본 보존을 확인한다. RED는 기존 요약 반환으로 인한 assertion 실패, 브라우저 RED는 동일한 크기의 대표 카드였다. 최소 구현 후 동일 검증을 통과했다.

검증 결과:

- `node --no-warnings --test --experimental-strip-types lib/projects.test.ts lib/site-seo.test.ts`: 14/14 통과.
- `npm run test`: 213 pass / 13 DB integration skip. DB·repository·worker·migration 변경은 없다.
- `npm run lint`, `npm run typecheck`, `npm run build`: 통과.
- 개발 서버의 1440/390/320px: 대표/보조 위계, 9개 링크와 상세 HTTP 200, `/portfolio` canonical, `/projects` 308, 제목·역할·결과 전체 표시, 긴 연속 문자열, 가로 넘침 없음, 키보드 초점·Enter 이동을 확인했다. Home 소개/레이더의 geometry·SVG도 변경 전과 일치한다.
- 이 화면은 고정된 공개 프로젝트 목록을 렌더링한다. 새 비동기 조회가 없어 빈/DB 오류 상태는 해당하지 않는다. 긴 텍스트는 브라우저 내 합성 값으로 확인했으며 저장된 콘텐츠나 DB는 수정하지 않았다.
- 스크린샷·비교 기준·브라우저 스크립트와 결과는 Git/Docker 제외 경로 `private/portfolio-hierarchy-check/`에 보관한다. 문서/JSON·상대 링크 검사와 `git diff --check`를 통과했다.

다음은 [Step 1: decision-and-evidence-detail](step1.md)이다. Step 1–2와 phase 전체는 pending으로 유지한다.
