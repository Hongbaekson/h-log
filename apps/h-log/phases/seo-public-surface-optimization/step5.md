# Step 5: server-rendered-brain-discovery

## 상태와 선행 조건

pending — 2026-11-03 S1 감사의 SEO-04를 독립 작업으로 등록했다. 기존 Blog 발견 step의 구현 범위를 Brain까지 넓히지 않는다. S2 Step 4 이후 진행한다.

## 읽을 파일

경로는 저장소 루트 기준이다.

- `AGENTS.md`
- `apps/h-log/AGENTS.md`
- `.codex/skills/harness/SKILL.md`
- `.codex/skills/sync-repos/SKILL.md`
- `.codex/skills/tdd/SKILL.md`
- `.agents/skills/hlog-seo/SKILL.md`
- `apps/h-log/.codex/docs/harness/PRD.md`
- `apps/h-log/.codex/docs/harness/ADR.md`
- `apps/h-log/.codex/docs/harness/ARCHITECTURE.md`
- `apps/h-log/.codex/docs/harness/WORKFLOW.md`
- `apps/h-log/.codex/docs/harness/AGENT_LOOP.md`
- `apps/h-log/.codex/docs/harness/SEO_OPTIMIZATION_PLAN.md`
- `apps/h-log/.codex/docs/harness/SEO_AUDIT_BASELINE.md`
- `apps/h-log/phases/seo-public-surface-optimization/index.json`
- `apps/h-log/app/brain/page.tsx`
- `apps/h-log/app/brain/[slug]/page.tsx`
- `apps/h-log/components/brain/BrainExplorer.tsx`
- `apps/h-log/components/brain/BrainNote.tsx`
- `apps/h-log/lib/brain-server.ts`
- `apps/h-log/lib/brain.ts`
- `apps/h-log/lib/brain-postgres-repository.ts`
- `apps/h-log/app/sitemap.xml/route.ts`

## 작업

1. 합성 공개 사본으로 production build의 `/brain` JS OFF 로딩 고착과 독립 상세 anchor 부재를 focused RED로 확인한다. 상세 route의 기본 읽기는 이미 통과한 기준선으로 보존한다.
2. 기존 Explorer·공개 graph selector·상세 route를 재사용해 인증 없는 방문자에게 공개 기록의 기본 제목/링크를 제공한다. 기존 목록 보기의 anchor 또는 no-JS 기본 목록 중 작은 해결책을 선택한다. 숨겨진 SEO 전용 본문이나 봇 UA별 다른 콘텐츠를 추가하지 않는다.
3. 승인된 그래프의 모양·레이아웃·검색·필터·선택 동작을 보존한다. 링크를 누르는 기본 동작과 JS 그래프 선택/뒤로가기를 함께 확인한다. Home 레이더를 변경하지 않는다.
4. `/brain?note=`는 그래프 상태, `/brain/[slug]`는 독립 기록이라는 계약을 확인하고 불필요한 query URL 색인을 늘리지 않는다. 공개 상세 canonical과 사이트맵을 유지한다.
5. 공개 사본만 읽고 미공개 수정/철회/원문을 기본 목록으로 옮기지 않는다. 파일 카탈로그 모드와 DB-enabled 모드 모두 검증한다.

## 인수 기준

JS OFF 방문자가 Brain 홈에서 공개 기록의 제목과 기본 상세 링크를 읽고 이동할 수 있다. 상세 내용은 공개 사본과 일치하며 JS ON의 승인된 그래프 UI와 탐색 동작은 유지된다.

## 검증

1. 1440/390/320px JS ON/OFF의 제목·visible anchor·상세 본문 focused RED→GREEN. raw HTML의 숨겨진 문자열만으로 통과시키지 않는다.
2. 비공개/철회/미선택 수정본의 HTML/RSC/목록/sitemap 노출 0건, 없는 상세 404와 캐시 경계 확인. DB selector 변경 시 관련 integration 실행.
3. UI 변경은 개발 서버에서 desktop/mobile·키보드·뒤로가기 확인 후 production build에서도 비교한다.
4. `npm run test`, `npm run lint`, `npm run typecheck`, `npm run build`, `git diff --check`. 기존 private lint 오류와 새 회귀를 구분해 기록한다.
5. phase 상태·감사 발견 해결 여부·다음 단계를 함께 갱신한다. 성능·검색 순위 향상은 측정 없이 주장하지 않는다.

## 하지 말 것

- 공개 사본 정책을 약화하지 말 것. SEO 발견 가능성보다 원문/비공개 경계가 우선한다.
- 그래프 전면 재설계·새 서비스/SEO 라이브러리를 추가하지 말 것. 이번 범위는 기본 읽기와 링크다.
- 운영 DB·실제 발행·DNS/TLS·GSC 제출을 실행하지 말 것. 운영 보류는 별도 승인 대상이다.

## 다음 단계

S3 Step 0 `local-seo-release-rehearsal`.
