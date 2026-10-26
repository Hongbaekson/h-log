# Step 2: search-performance-review

## 상태와 선행 조건

pending — 계획 등록이며 미구현/미실행.

S3 Step 1의 실제 공개 기준선과 비교 가능한 데이터가 있어야 한다. 기간/표본 부족 시 pending 또는 미측정 사유를 유지한다.

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
- `apps/h-log/phases/seo-release-and-measurement/index.json`
- `apps/h-log/.codex/docs/harness/BLOG_WRITING_GUIDE.md`
- `apps/h-log/.codex/docs/harness/OBSERVABILITY_PLAN.md`
- `apps/h-log/.codex/docs/harness/ADMIN_CONSOLE_PLAN.md`
- `apps/h-log/phases/seo-release-and-measurement/step1.md`

## 작업

1. 초기 28일과 다음 비교 기간의 GSC query/page·기기별 노출/클릭/CTR/평균 위치·색인 상태를 수집한다. 날짜/국가/기기/속성·브랜드/비브랜드 조건을 일치시킨다.
2. CrUX p75와 데이터 가용성을 함께 확인한다. 표본 부족·새 콘텐츠·계절성·배포 변경을 기록하고 점수 변화만으로 SEO 인과 효과를 단정하지 않는다.
3. 실제 제목/내용·내부 링크·성능 후보 중 다음 작은 개선 1개를 증거로 선정하고 담당 step과 재측정 기준을 등록한다. 검색 수요를 지어내거나 대량 글/키워드 페이지를 자동 발행하지 않는다.
4. 공개해도 되는 집계/결론만 저장소에 남긴다. 정기 자동화·메일/메신저 알림·새 모니터링 UI는 이 단계의 기본 범위가 아니다.

## 인수 기준

비교 조건과 데이터 한계가 명시된 성과 검토 및 다음 개선 1개가 남는다. 데이터가 없으면 0으로 채워 완료 처리하지 않는다.

## 검증

1. export/JSON의 날짜·중복·필터·누락을 파싱하고 원본 집계와 대조한다.
2. 공식 CWV/GSC 해석과 현재 도구 데이터 범위를 확인하고 별도 유료 API를 임의 활성화하지 않는다.
3. 문서/JSON·링크·phase 상태·비공개 데이터 제외 및 git diff --check.

문서/JSON은 관련 파서·링크 검사와 `git diff --check`를 실행한다. 실행 도구를 새로 만들면 실제 smoke 결과와 실패 경계를 기록한다.

## 하지 말 것

- SEO 점수 때문에 비공개 데이터·관리 경로를 공개하지 말 것. 인증/공개 사본 정책이 SEO보다 우선한다.
- 근거 없는 경험·성과·검색량·구조화 데이터를 만들지 말 것. 기존 공개 근거와 한국어 작성 기준을 보존한다.
- 원격 installer·extension·새 provider·전체 upstream agent 실행을 자동 적용하지 말 것. 이 단계에서 필요한 자료와 도구만 사용한다.
- 운영 보류를 해제하거나 DNS/TLS·GSC 제출·실제 글/PDF 발행을 계획 승인만으로 수행하지 말 것. 로컬 변경과 외부 상태 변경은 별도 범위다.
- Home 레이더·승인된 Brain UI·DB published-current/hash를 SEO 작업에 섞어 전면 변경하지 말 것.

## 다음 단계

관측 근거에 따른 한 개 개선만 새 단계로 등록한다.
