# Step 3: measured-page-performance

## 상태와 선행 조건

pending — 계획 등록이며 미구현/미실행.

S1 성능 표본·안정된 local production build가 있어야 한다. 기존 보안 패치가 빌드를 바꾸면 기준선을 다시 잡는다.

## 읽을 파일

경로는 저장소 루트 기준이다. S1 이후 생성된 adapter·감사 보고서와 앞 단계의 완료 기록도 먼저 읽는다. 아래 목록은 계획 등록 시 존재하는 파일이다.

- `AGENTS.md`
- `apps/h-log/AGENTS.md`
- `.codex/skills/harness/SKILL.md`
- `.codex/skills/sync-repos/SKILL.md`
- `apps/h-log/.codex/docs/harness/PRD.md`
- `apps/h-log/.codex/docs/harness/ADR.md`
- `apps/h-log/.codex/docs/harness/ARCHITECTURE.md`
- `apps/h-log/.codex/docs/harness/WORKFLOW.md`
- `apps/h-log/.codex/docs/harness/AGENT_LOOP.md`
- `apps/h-log/.codex/docs/harness/IMPLEMENTATION_PLAN.md`
- `apps/h-log/.codex/docs/harness/SEO_OPTIMIZATION_PLAN.md`
- `apps/h-log/.codex/rules/content-seo-privacy.md`
- `.codex/skills/tdd/SKILL.md`
- `apps/h-log/phases/seo-public-surface-optimization/index.json`
- `apps/h-log/package.json`
- `apps/h-log/next.config.ts`
- `apps/h-log/app/layout.tsx`
- `apps/h-log/app/globals.css`
- `apps/h-log/components/blog/BlogPostRow.tsx`
- `apps/h-log/components/brain/BrainExplorer.tsx`
- `apps/h-log/.codex/docs/harness/UI_GUIDE.md`
- `apps/h-log/phases/admin-resume-pdf/step1.md`

## 작업

1. 대표 Home·Blog 목록/긴 글·Brain route를 같은 조건의 production build에서 모바일/데스크톱 3회 측정한다. LCP/CLS/TBT, JS·이미지·폰트 크기와 주 실행 시간을 기록하고 중앙값/편차로 비교한다.
2. 측정으로 확인된 가장 큰 병목부터 한 단위씩 고친다. 이미지 크기/우선순위, 폰트 로딩, 불필요한 공개 client JS를 우선 검토하고 전면적인 UI/렌더 엔진 재작성은 하지 않는다.
3. Home 레이더의 데이터·형태·동작·배치와 Brain의 사용자가 승인한 Memory UI를 보존한다. 기능을 숨기거나 낮은 품질 asset으로 바꿔 점수만 올리지 않는다.
4. 로컬 Lighthouse/TBT와 실제 CrUX/INP를 구분한다. 공식 CWV p75 목표와 실제 측정치/미측정 항목을 함께 남기고 임의의 100점·순위 상승을 인수 기준으로 삼지 않는다.

## 인수 기준

수정한 병목의 동일 조건 전후 수치와 화면/기능 보존 근거가 있고, 노이즈 범위의 차이를 개선으로 과장하지 않는다. 실질적 병목이 없으면 no-op로 기록한다.

## 검증

1. 동일 빌드/브라우저/네트워크·CPU 조건 3회 전후 측정, 캐시 조건 기록.
2. 행동 변경은 focused RED→GREEN, 기본 gate, 1440/390/320px·키보드·레이더/Brain 회귀.
3. raw 성능 산출물은 private 경로에 저장하고 커밋에는 최소 수치/환경만 남긴다.

Production code를 바꾸면 focused RED→GREEN 뒤 다음 기본 gate를 실행한다. 문서/콘텐츠만 바꾼 경우 관련 파서·형식 검사로 범위를 좁힌다.

```bash
npm run test
npm run lint
npm run typecheck
npm run build
git diff --check
```

## 하지 말 것

- SEO 점수 때문에 비공개 데이터·관리 경로를 공개하지 말 것. 인증/공개 사본 정책이 SEO보다 우선한다.
- 근거 없는 경험·성과·검색량·구조화 데이터를 만들지 말 것. 기존 공개 근거와 한국어 작성 기준을 보존한다.
- 원격 installer·extension·새 provider·전체 upstream agent 실행을 자동 적용하지 말 것. 이 단계에서 필요한 자료와 도구만 사용한다.
- 운영 보류를 해제하거나 DNS/TLS·GSC 제출·실제 글/PDF 발행을 계획 승인만으로 수행하지 말 것. 로컬 변경과 외부 상태 변경은 별도 범위다.
- Home 레이더·승인된 Brain UI·DB published-current/hash를 SEO 작업에 섞어 전면 변경하지 말 것.

## 다음 단계

S2 Step 4 `evidence-based-content-and-links`.
