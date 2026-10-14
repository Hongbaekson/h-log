# Step 1: compact-topic-filters

## 개선 사항

목록 정보 위계와 필터. 같은 phase의 Step 0 완료 후 실행한다.

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
- `apps/h-log/app/blog/(index)/page.tsx`
- `apps/h-log/components/blog/BlogSearchPanel.tsx`
- `apps/h-log/lib/blog-public.ts`
- `apps/h-log/lib/blog-public.test.ts`

## 작업

주요 태그와 펼치기를 배치하고 큰 목록 소개·개발 상태 문구를 독자 중심 문구로 정리한다. 대표 글은 명시적 편집 선택이 있을 때만 강조하고 검색 중에는 숨긴다. 모바일에서 검색과 첫 결과가 빠르게 보이도록 배치한다.

## 인수 기준

태그 수가 많음/없음·긴 제목·검색/태그 조합·320px에서 화면 넘침 없이 동작한다. 공개 tag count와 선택 상태가 일치한다.

앱 디렉터리에서 가까운 검증 후 기본 gate를 실행한다.

```bash
node --no-warnings --test --experimental-strip-types lib/blog-public.test.ts lib/blog-search-ui.test.ts
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

## 완료 기록 — 2026-10-14

- `page.tsx`의 큰 소개/발행 정책 패널을 짧은 소개로 바꾸고 최대 896px 한 열에 검색·필터·글을 배치했다. 모바일 검색 버튼도 입력과 같은 줄에 둔다.
- `BlogTopicFilters.tsx`는 공개 글 수 순의 앞 4개와 선택 태그를 표시하고 나머지는 `details/summary`로 접는다. 선택 태그는 접힌 영역에 중복되지 않는다. 전체 공개 글 기준의 개수·aria-current·초점을 제공하고 긴 태그/제목/설명이 화면을 넘지 않게 했다. 대표 글 선정 근거가 없어 강조 영역과 새 설정은 추가하지 않았다.
- RED: 기존 320px 화면의 검색창 y=707.75, 첫 제목 y=924.75. 검색창 y<300 인수 기준이 예상대로 실패했다. GREEN: 같은 4태그 데이터의 검색창 y=234.5, 첫 제목 y=536.5. 16태그/긴 제목 fixture에서는 첫 제목 y=576.5로 기준 y<640을 통과했다.
- 검증: `node --no-warnings --test --experimental-strip-types lib/blog-public.test.ts lib/blog-search-ui.test.ts lib/blog-discovery-ui.test.ts` 44/44, `npm run test` 207 pass/13 DB skip, `npm run lint`, `npm run typecheck`, `npm run build`, phase JSON/path 검사와 `git diff --check` 통과. DB/repository/worker/migration은 변경하지 않아 integration suite를 추가 실행하지 않았다.
- 브라우저: 격리 PostgreSQL fixture와 개발 서버의 1440/390/320px에서 위치·태그 개수·선택 유지·Enter/Space/Tab·긴/없는 태그·태그/글 없음·가로 넘침을 확인했다. 기존 URL 직접 열기/새로고침/history·검색/필터 조합·초기화·페이지·빈/429/503·늦은 응답 취소·재시도 회귀도 통과했다. 빈 상태 검증은 이번에 만든 synthetic fixture만 임시 변경하고 finally에서 복원했다.
- 로컬 재현 자료: `.codex/tmp/topic-filters/compact.mjs`, `browser.mjs`, `url-regression.mjs`와 `browser-result.json`, `view-{1440,390,320}.png`(ignored). `node --no-warnings --experimental-strip-types .codex/tmp/topic-filters/browser.mjs`로 화면 검증을 재실행했다. 기본 펼치기는 렌더링 후 JS 실행을 중지해 확인했으며, 기존 Next 비동기 route는 JS를 처음부터 끄면 loading에 머무르므로 이를 JS 없는 초기 탐색 지원으로 기록하지 않는다.
- 다음: `blog-discovery-and-home / Step 2: home-recent-posts`. Home/레이더 전체, Second Brain, 저장 원문/hash, 공개 경계와 OCI 보류를 유지했다.
