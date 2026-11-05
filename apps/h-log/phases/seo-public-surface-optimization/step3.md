# Step 3: measured-page-performance

## 상태와 선행 조건

completed — 2026-11-05 local production 성능 기준선을 완료했다. 이번 표본에서 단독 수정할 병목을 특정하지 못해 앱 코드는 `clean-no-op`로 유지했다. 측정값·편차·한계는 아래 완료 기록을 따른다.

S1 Step 1의 [감사 기준선](../../.codex/docs/harness/SEO_AUDIT_BASELINE.md)과 별도 성능 측정이다. 실제 콘텐츠·운영망·CrUX/INP는 아직 미측정이며 S1의 overflow/pageerror 없음으로 성능 통과를 대신하지 않는다.

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
- `apps/h-log/.codex/docs/harness/SEO_AUDIT_BASELINE.md`
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

## 완료 기록 — 2026-11-05

### 측정 환경과 재현

- 앱 SHA `42eb45856fd4c2a88f16644c63b02c7cc89d287e`, production 이미지 `hlog-web:seo-metadata`, image ID `sha256:8dff41b05f9347cd2c8a43a26beb16cd9dbf9248fcdecbc44dc53daf0734453f`. Step 2에서 검증한 동일 앱 빌드를 재사용했다.
- Windows, Node `24.22.1`, Lighthouse `13.6.0`, Edge `156.0.4314.58` headless. 고정 Lighthouse 도구는 Git 제외 `private/seo-performance/tools`에만 설치했다. 앱 의존성·lockfile은 변경하지 않았다.
- 별도 합성 PostgreSQL과 Nginx ingress `http://127.0.0.1:3048`, canonical용 합성 HTTPS origin `https://hlog.example.org`. production 환경에 접속하지 않았다. 브라우저는 인증 없는 새 context, 공개 경로·정적 자산 allowlist만 사용했고 차단 요청·Lighthouse runtime error·run warning은 모두 0건이었다.
- `/`, `/blog`, `/blog/seo-public-1`, `/brain`을 **같은 이미지에서 모바일/데스크톱 각 3회**, 총 24회 측정했다. 실행 순서는 회차 → 모바일/데스크톱 → 위 4경로다. 성공한 24회를 모두 집계했고 느린 값을 제외하지 않았다.
- 모바일 390×844/DPR 1.75, 데스크톱 1440×900/DPR 1. Lighthouse `simulate`로 모바일 RTT 150ms·throughput 1638.4Kbps·CPU 4배, 데스크톱 RTT 40ms·throughput 10240Kbps·CPU 1배를 적용했다. 실제 기기·망을 제한한 field 측정이 아니라 Lantern의 lab 추정치다.
- 매 탐색마다 새 browser context와 기본 storage reset을 사용했다. 브라우저 프로세스는 공유하며 서버는 HTTP 검수로 예열된 상태다. 서버/OS 캐시는 회차마다 비우지 않았고, 다른 호스트 프로세스의 자원 사용은 통제하지 않았다.
- Blog는 합성 공개 글 8개, 긴 글은 9,134자·24개 H2·6개 SQL block이다. 본문 hash는 `3704fb96542a72b7f6a10f7074789df40d2d9e79fff469ae6c36f2215549d5b5`. 썸네일은 0개이며 Brain은 승인된 공개 카탈로그를 사용했다. 합성 경험을 실제 글로 발행하지 않았다.
- 원자료: Git 제외 `private/seo-performance/baseline/`의 `result.json`, `fixture.json`, `measurements.json`, 24개 Lighthouse JSON, 첫 회차 trace/화면. 완료 시각은 `2026-11-05T00:12:02.667Z`이며 전용 컨테이너 3개·network·임시 credential을 정리했다.

로컬 재현 명령(앱 디렉터리, 위 버전의 Node와 비공개 검수 도구 필요):

```powershell
$env:HLOG_SEO_LOCAL_AUDIT='1'
$env:HLOG_SEO_BROWSER='1'
$env:HLOG_SEO_RUN_LABEL='baseline'
node --no-warnings --experimental-strip-types private/seo-performance/run.mjs
```

### 결과

셀은 **중앙값 (최솟값–최댓값)**이다. LCP/TBT는 Lighthouse lab 지표, 주 스레드는 `mainthread-work-breakdown` audit 보고값이며 단위는 ms다. 전송량은 `resource-summary` 기준 KiB(1,024B)다. 전체 24회에서 **CLS 0**, 이미지·웹폰트·third-party 전송은 모두 **0B**였다.

| 표본 | LCP ms | TBT ms | 주 스레드 ms | 전체 KiB | JS KiB |
| --- | --- | --- | --- | --- | --- |
| 모바일 Home | 908.6 (907.6–917.2) | 49.7 (12.5–62.2) | 799.7 (735.5–862.1) | 175.6 (175.4–175.8) | 141.5 (141.5–141.5) |
| 모바일 Blog 목록 | 729.5 (604.3–733.2) | 43.5 (14.5–136.5) | 650.6 (611.7–664.7) | 183.5 (183.4–183.6) | 153.0 (152.9–153.0) |
| 모바일 긴 글 | 869.3 (755.6–870.8) | 13.0 (12.5–102.5) | 559.5 (500.9–724.6) | 181.8 (181.6–181.8) | 149.9 (149.9–149.9) |
| 모바일 Brain | 799.2 (798.5–2409.3) | 29.0 (25.0–41.0) | 1398.1 (1350.5–1760.3) | 203.6 (203.6–203.6) | 166.4 (166.4–166.4) |
| 데스크톱 Home | 247.6 (247.4–249.8) | 0.0 (0.0–0.0) | 188.5 (185.7–200.2) | 179.6 (179.5–179.7) | 141.5 (141.5–141.5) |
| 데스크톱 Blog 목록 | 196.3 (196.1–199.2) | 0.0 (0.0–0.0) | 143.4 (142.4–143.5) | 189.9 (188.9–190.0) | 153.0 (153.0–153.0) |
| 데스크톱 긴 글 | 239.3 (239.2–240.0) | 0.0 (0.0–0.0) | 152.6 (148.6–164.0) | 186.9 (186.8–187.4) | 149.9 (149.9–149.9) |
| 데스크톱 Brain | 230.3 (226.4–527.8) | 0.0 (0.0–0.0) | 418.2 (399.4–445.9) | 205.9 (204.7–206.0) | 166.4 (166.4–166.4) |

### 판단과 남은 확인

1. **앱 코드 변경 없음.** 이 조건에서 초기 렌더링을 반복적으로 막는 단독 수정 대상을 확인하지 못했다. 이미지/웹폰트 로딩 병목도 이 표본에는 없었다. 성능 개선 전후 수치나 속도 향상을 주장하지 않으며 기준선만 남긴다.
2. **Brain의 비용과 편차는 남긴다.** 모바일 주 스레드 중앙값은 약 1.40초로 다른 페이지보다 길고, LCP는 798/799/2,409ms였다. 세 번째 탐색에서 검색창 placeholder의 관측 paint가 약 375ms로 늦어진 뒤 시뮬레이션 LCP가 증가했다(앞 두 번 관측값 139/84ms). 같은 세 번째 데스크톱도 LCP 528ms였다. 원인을 확정할 근거는 부족하므로 단순 측정 잡음으로 지우지 않는다.
3. Brain의 LCP node는 canvas가 아니라 **검색창 문구**였다. 낮은 LCP/TBT를 그래프 완성 시점·검색/필터/드래그 반응·장시간 프레임 유지의 통과로 해석하지 않는다. 실제 기기의 상호작용 trace와 INP는 미측정이다.
4. 첫 모바일 trace의 unused-JS 후보는 공통 chunk 약 30KiB, Brain 전체 약 47KiB였지만 초기 탐색에서 실행하지 않은 기능도 포함한다. `BrainExplorer`의 기존 dynamic scene 분리와 `BrainScene`/`brain-layout` 호출을 확인했다. 삭제 가능한 독립 비용으로 재현되지 않아 d3 tick 수·애니메이션·렌더 엔진을 바꾸지 않았다.
5. 실제 썸네일·본문 이미지·Resume 사진은 이번 4경로 fixture의 전송 표본에 없다. 해당 asset이 있는 승인된 실제 콘텐츠, 운영 origin/압축/캐시 조건에서는 다시 측정해야 한다. **0B를 이미지 최적화 완료로 해석하지 않는다.** Home 레이더와 Brain 화면은 그대로이며 첫 회차 스크린샷에서 레이더·그래프와 긴 글의 모바일 렌더링을 확인했다. 새 상호작용 회귀 검수는 하지 않았다.
6. [공식 CWV 기준](https://web.dev/articles/vitals)은 모바일/데스크톱별 실사용 p75 LCP ≤2.5초, INP ≤200ms, CLS ≤0.1이다. 여기의 3회 lab 중앙값·TBT는 field p75·INP를 대체하지 않는다. [Lighthouse 점수의 변동성](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring)을 고려해 점수 100이나 순위 상승을 목표/성과로 쓰지 않는다. CrUX/GSC·실제 검색 효과는 미측정이다.

### 검증과 인계

- 긴 본문 fixture 변경 전, 기존 production 공개 HTTP 회귀 **21/21 통과**. 그 뒤 동일 합성 DB에 긴 본문을 넣고 Lighthouse **24/24**를 완료했다.
- 앱 코드·UI·런타임 설정을 변경하지 않아 production RED→GREEN과 전체 test/lint/typecheck/build·개발 서버 UI 재검수는 추가 실행하지 않았다. 기존 Step 2 결과를 이번 성능 개선의 새 gate로 표현하지 않는다.
- JSON/Markdown 파싱, 상대 링크·읽을 파일 경로, phase 집계와 변경 범위, 원자료 제외, `git diff --check`를 확인했다. SEO는 completed 6·pending 4·blocked 1이며 다른 트랙 상태는 유지한다.
- 실제 이미지가 있는 콘텐츠, Brain LCP 편차와 상호작용 표본은 [S3 Step 0](../seo-release-and-measurement/step0.md)에서 다시 판단한다. 운영 field 지표는 S3 Step 1/2의 별도 조건을 따른다. 다음 로컬 작업은 **S2 Step 4 `evidence-based-content-and-links`**다.
