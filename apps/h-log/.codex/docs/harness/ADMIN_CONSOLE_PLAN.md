# H-Log 통합 관리자 계획

등록일: 2026-10-22. 2026-10-28 **A1/A4/A2 전체와 A3 Steps 0–1 완료. 4개 phase / 17개 step 중 completed 14개·pending 2개·blocked 1개**다. 모니터링 Steps 0–1도 완료했다. 다음은 [모니터링 Step 2](../../../phases/operations-observability/step2.md)의 host/DB/HTTP 수집이다. 운영 활성화는 보류한다.

## 방향과 현재 근거

공개 사이트는 소개·포트폴리오·기술 글·공개 Second Brain을 보여 주고, 운영자는 별도 관리자 진입점에서 글·자동화·작업·기록을 관리한다. 사용자 요청에 따라 가상 Queue 실험도 관리자 실험실로 이동한다. 실제 작업 관리와 가상 재생은 화면·데이터·조작을 구분한다.

| 현재 코드 | 확인한 상태 | 계획에서 보완할 부분 |
| --- | --- | --- |
| `app/admin`, `lib/admin-owner.ts`, `lib/brain-owner.ts` | 공통 Basic/Host/Origin 인증·전용 탐색, Brain DB flag 분리 | A1 Step 3 완료: 기록/공개 사본 보존·명령 revision·중복 재확인·원자적 감사 |
| `proxy.ts` | 전체 `/admin/:path*` 보호; page·records handler도 데이터 접근 전 검사 | 운영 ingress는 승인된 rollout에서 적용 |
| `deploy/nginx/conf.d/hlog.conf` | 공개 ingress에서 `/admin`·`/api/internal` 404; upstream Host는 `hlog-web` | 공개 차단 유지, 별도 관리자 host의 정확한 Host 전달·허용 경로를 로컬 검증 |
| `app/admin/posts`, `lib/blog-editorial-actions.ts` | 인증된 검토·불변 수정본 저장·선택 버전 발행/철회·원자적 감사 구현 | A2 전체 완료; 후속 작업/감사 조회는 A3 |
| `lib/blog-daily-auto-article.ts`, `scripts/blog-auto-publish.mjs` | 일일 발행 경로와 별도의 draft mode/one-shot 요청 소비 구현 | Step 3 완료: 기본 OFF 지속 정책과 공통 admission/공개 검사 |
| `lib/blog-persistent-worker.ts`, `deploy/systemd/` | lease 기반 한 건 실행, 유한 cycle, 09:00 KST timer 패키지 | 작업 조회·명시적 재시도·새 작업 claim 일시정지; 프로세스 생존은 별도 신호 |
| `usage_events`, `admin_actions`, `publish_verifications` | 비용·일부 감사·검증 자료가 존재 | 실제 저장 항목만 조회, 기록되지 않은 실행 이력을 성공/0건으로 추정하지 않음 |
| `/admin/lab/queue`, 관리자 실험실 메뉴 | 인증된 소유자만 접근; 기존 `/lab/queue`는 404, 공개 링크/sitemap 제거 | 가상 모델 유지; 실제 작업 제어는 A3의 별도 기능 |
| `/admin/resume`, `/resume` | 비공개 PDF 등록·PNG 미리보기·불변 버전/메모·검토 후 공개/해제·현재 공개본 다운로드 구현 | A4 로컬 검증 완료; 실제 파일 공개와 운영 rollout은 별도 |

## 화면과 주소

아래 주소는 목표 구조다. 실제 도메인은 정해지지 않았으며 DNS/TLS를 변경하지 않는다.

| 메뉴 | 목표 경로 | 다루는 내용 |
| --- | --- | --- |
| 개요 | `/admin` | 설정/실제 적용 상태, 처리할 글·실패 작업, 데이터 관측 시각 |
| 블로그 | `/admin/posts` | 비공개 목록·미리보기·버전·저장·발행·철회 |
| 자동 작성 | `/admin/automation` | 초안 생성 요청, 자동 초안/자동 발행 허용, 중지·비용 한도 |
| 작업 | `/admin/jobs` | 실제 publish job 상태·lease·재시도·일시정지 |
| Second Brain | `/admin/brain` | 기존 기록 작성·검색·회고·연결·공개 사본 관리 |
| 이력서 PDF | `/admin/resume` | 파일 등록·비공개 미리보기·버전 교체·공개/비공개·이전 버전 선택 |
| 모니터링 | `/admin/monitoring` | 상태 요약·누락·오래된 값과 인증된 Grafana 진입 안내 |
| 변경 이력 | `/admin/audit` | 관리자 명령과 결과·실패·사유; 본문/비밀값 제외 |
| 실험실 | `/admin/lab/queue` | 고정 가상 작업 재생; 운영 Queue 제어와 분리 |

기존 Discord dark 스타일로 관리자 전용 탐색을 구성한다. 공개 메뉴에는 관리자 링크를 추가하지 않는다. 기존 `/brain`의 Memory UI와 Home/레이더는 유지한다. 목록과 개요에 값이 없으면 미설정·미수집·오류·실제 0건을 구분한다.

Second Brain의 초기 통합 대상은 기존 DB 기록 작성·회고·연결·공개 사본 관리다. 기존 28개 노드/42개 연결의 정적 카탈로그는 코드로 관리되는 자료임을 표시한다. 그 카탈로그까지 웹에서 편집하려면 원문/공개 사본·식별자·관계의 별도 이관 검증이 필요하므로 A1 편입 중에 자동으로 DB 원본으로 바꾸지 않는다.

초기 구현은 같은 Next.js 앱의 `/admin`을 사용한다. 운영 목표는 `admin.<선택한 도메인>`이며 해당 host의 `/`는 `/admin`으로 연결한다. 공개 host의 `/admin`·관리 API는 계속 거부한다. 관리자 host에는 허용한 관리자 경로와 필요한 정적 자산만 통과시키며, 공개 글의 canonical/worker 검증 origin은 공개 host로 유지한다. 서브도메인은 진입점 분리이며 별도 프로세스/DB 격리를 의미하지 않는다. 새 프런트엔드·마이크로서비스·회원가입·다중 역할 체계는 이번 범위에 없다.

## 인증과 명령 경계

- A1 Step 0에서 [관리자 접근·명령 계약](ADMIN_ACCESS_CONTRACT.md)을 확정했다. 후속 인증/명령 구현은 이 계약을 함께 읽는다. 기존 256-bit Basic 키를 재사용하고 `HLOG_ADMIN_ENABLED/OWNER_KEY/ORIGIN`을 Brain DB flag와 분리한다. 구 Brain owner 설정은 자동 fallback하지 않으며 키 교체·분실 복구는 기존 SSH 관리 경로를 사용한다. 운영 초기 기본안은 SSH 터널 안의 관리자 HTTPS 진입점과 앱 인증이다. 운영 설정은 아직 적용하지 않았다.
- Proxy만으로 보호하지 않는다. 서버 page, Route Handler/Server Action과 데이터 접근 경계에서 권한을 확인하며 HTML/RSC/prefetch/직접 API 요청도 검증한다. 누락·잘못된 설정은 닫힌 상태로 처리한다. 관리자 응답은 private/no-store/noindex로 하고 공개 검색·사이트맵·feed·llms에서 제외한다. noindex는 접근 제어를 대신하지 않는다. [Next.js 인증 지침](https://nextjs.org/docs/app/guides/authentication)을 기준으로 적용한다.
- 변경 요청은 정확한 관리자 Origin만 허용하고 GET에는 부작용을 넣지 않는다. 형제 서브도메인도 자동으로 신뢰하지 않으며 null/누락 Origin·잘못된 Host·위조 forwarded header·교차 출처 요청을 거부한다. 초기 계약에는 세션 쿠키/로그아웃 API가 없으며 Basic 캐시의 한계와 키 폐기를 안내한다. [OWASP CSRF 지침](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)을 참고한다.
- 명령은 대상·예상 버전/상태·사유·중복 요청 키로 확인하고 원자적 상태 변경/감사를 보장한다. 중복 클릭·늦은 응답·동시 편집·실행 중 재시도를 테스트한다. 새 일반 목적 명령 버스는 만들지 않고 실제 필요한 저장 항목만 추가한다.
- 원문·키·provider credential·환경변수 전체·원본 stack trace를 개요/로그에 복사하지 않는다. API 오류는 원인을 구분할 안전한 코드와 안내를 제공한다. 인증 전 데이터가 HTML/RSC payload로 전달되지 않아야 한다.

## 자동 작성과 공개 허용

`자동 초안 작성 허용`, `자동 공개 발행 허용`, `새 작업 처리 허용`을 구분한다. 초기값은 닫힘이다. 읽기 화면에서 **요청한 설정·실제 적용 상태·차단 이유·관측 시각**을 함께 보여 준다. 초안/수동 검수 모드와 자동 공개 모드를 지원하되, 자동 공개 모드가 승인된 뒤에는 각 글의 수동 승인을 강제하지 않고 기존 claim/privacy/quality gate를 적용한다.

웹 요청은 장시간 LLM을 직접 실행하지 않는다. A2 Step 2에서 초안 요청의 최소 지속 기록·중복 방지·결과 저장과 기존 one-shot 실행자의 연결을 구현했다. 세부 실행/복구는 [초안 요청 계약](DRAFT_GENERATION_REQUESTS.md)을 따른다. source freshness·실제 경험 근거·한국어 작성 규칙·budget·사용량 기록을 재사용한다. 초안 저장 시 `publishing`과 required publish job을 만들지 않는다. 새로고침·worker 재시작 후에도 요청과 결과를 확인할 수 있어야 하며, 외부 호출의 결과가 불명확한 경우 자동 재호출해 비용을 중복 발생시키지 않는다.

설정은 웹/CLI/scheduler/worker 모두 읽는 지속 저장소에 둔다. 정책 확인 실패는 새 외부 호출·공개 전이를 차단한다. 서버의 운영 허용 설정은 관리자 토글보다 우선하는 상한으로 유지하며 UI에서 credential·systemd timer·배포 설정을 변경하지 않는다. A2 Step 3은 provider 호출 직전과 공개 전이 직전에 정책을 재확인하고, 이미 승인·진행 중인 호출은 중지 이후에도 완료될 수 있음을 표시한다. 중지와 새 작업 시작의 경계를 transaction/버전 검사로 정의해 “일시정지 완료”의 의미를 검증한다.

새 실행의 허용을 중단해도 이미 공개된 글의 검증·실패 시 숨김·철회 같은 보호 조치는 유지한다. 설정 변경을 이미 진행 중인 외부 요청 취소나 과거 공개 글 삭제로 표시하지 않는다. 실제 timer 활성화는 기존 운영 단계의 별도 승인 경계를 유지한다.

## Worker와 관측

실제 작업 원장은 `publish_jobs`다. 가상 실험의 DLQ 표시를 실제 DB의 DLQ 구현으로 부르지 않는다. 대기/실행/실패, required/retryable, 시도 횟수, lease 만료, 버전/hash, 안전한 실패 분류를 보여 준다. 작업이 없다는 사실만으로 Worker가 살아 있다고 표시하지 않는다. 성공 판정은 cycle의 `completed`/worker의 `idle`이 아닌 해당 글의 required 공개 검증 결과를 따른다.

재시도는 허용된 실패 작업 하나에만 적용하고 성공 작업·유효 lease·철회 글·오래된 버전·이미 처리 중인 요청은 거부한다. 일시정지는 새 claim을 막고 진행 중 작업을 표시한다. 무제한 재시도, 전체 실패 일괄 재실행, 웹에서 shell/systemctl/docker 실행, Docker socket mount는 포함하지 않는다. 프로세스 재시작/배포는 기존 운영 runbook을 사용한다.

Prometheus/Grafana는 [operations-observability](../../../phases/operations-observability/index.json)가 소유한다. 관리자 화면은 기존 원장 및 확정된 관측 신호를 읽고, 새 수집기·heartbeat·경보 이력을 중복 구현하지 않는다. Grafana는 비공개 인증 경계를 유지하며 공개 iframe·service token 전달·공개 metrics endpoint를 만들지 않는다. 연결 전에는 미설정으로 표시한다.

## 이력서 PDF의 등록·수정·공개

관리자에서 새 PDF를 등록하면 비공개 버전으로 보관하고 모든 페이지를 미리 본다. 파일 형식 검증과 공개 내용 검토를 마친 **특정 버전/hash**를 명시적으로 공개하면 Resume에 `이력서 다운로드` 링크를 제공한다. 새 파일 등록은 기존 공개본을 자동 교체하지 않는다. 교체는 공개 포인터를 새 버전으로 전환하는 작업이며 원본 바이트와 과거 버전은 덮어쓰지 않는다. 이전 버전도 다시 검토한 뒤 명시적으로 선택할 수 있다. 공개 해제는 다운로드를 막는 일이며 보관 파일 삭제와 구분한다.

### 관리자에서 수정할 수 있는 범위

- 이번 계획에는 **수정한 PDF 파일로 교체, 관리자용 버전 메모 변경, 공개본 지정, 비공개 전환, 이전 버전 재선택**을 포함한다. 파일 바이트가 달라지면 새 버전이며 이전 검토 승인을 재사용하지 않는다. 공개 파일명은 원본 업로드 이름과 관계없이 `이력서.pdf`로 통일한다.
- 기존 PDF의 글자·이미지·폰트·배치를 웹에서 직접 고치는 범용 PDF 편집기는 포함하지 않는다. 원본 문서 편집 도구에서 수정한 뒤 다시 업로드하는 흐름으로 시작한다. 미리보기 도구인 [PDF.js](https://mozilla.github.io/pdf.js/)의 파싱/렌더링 기능을 범용 본문 편집 구현으로 간주하지 않는다.
- 이후 브라우저에서 경력 내용을 직접 수정하고 싶다면 구조화된 이력서 입력 → 정해진 템플릿의 새 PDF 생성이 별도 후보가 된다. 이는 임의 PDF를 수정하는 기능과 다르며 현재 온라인 Resume 내용과 PDF를 자동 동기화하지 않는다. 이번 phase의 필수 범위나 구현 완료 항목으로 넣지 않는다.

### 저장과 공개 경계

소수의 개인 이력서 버전만 다루므로 **기존 PostgreSQL에 PDF 바이트(`bytea`)·메타데이터·공개 포인터를 저장하는 안**을 기본으로 한다. 새 object storage·공개 bucket·정적 `public/` 복사본은 만들지 않는다. A4 Step 0의 [확정 계약](RESUME_PDF_CONTRACT.md)은 파일당 5 MiB·10페이지·최대 20버전/원본 합계 100 MiB, qpdf 구조 검사+Poppler 페이지 이미지, 자원/네트워크 제한과 복구 epoch를 정의한다. 아직 구현/설치한 상태는 아니며 초과 시 기존 파일을 자동 삭제하지 않고 새 등록을 거부한다. 현재 Nginx `client_max_body_size 2m`과 업로드 크기의 차이는 관리자 업로드 경로에서만 검증·조정한다. 공개/다른 API의 제한을 일괄 완화하지 않는다.

업로드는 인증된 소유자만 수행한다. 확장자·요청 MIME만 믿지 않고 크기·PDF 식별자·실제 파싱·페이지 수·암호화/손상·첨부 파일과 실행 동작을 검사한다. 미리보기는 실행 동작/외부 네트워크를 허용하지 않는 제한된 렌더링 경계를 사용하고 parser timeout·출력/자원 상한·임시 파일 정리를 검증한다. 지원하지 않거나 검사할 수 없는 PDF는 공개 후보로 받지 않는다. parser/렌더러는 Step 0에서 qpdf+Poppler로 선택했으며 원격 변환 서비스로 개인 파일을 전송하지 않는다. 업로드/검증과 미리보기는 같은 검증된 바이트/hash를 기준으로 한다. 이 방어는 [OWASP 파일 업로드 지침](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)에 근거한다.

공개 전에 모든 페이지·메타데이터·주석/링크·숨겨진 내용과 회사/고객사 식별자 등을 검토하고 해당 파일/hash의 검토 확인을 기록한다. 자동 검사 통과가 개인정보 검수 완료를 대신하지 않는다. 공개 승인·교체·해제와 감사 기록은 예상 revision·중복 키를 확인한 transaction으로 처리한다. 기존 `admin_actions.target_type` 제약에는 이력서가 없으므로 기존 글 ID로 위장하지 않는다. A4 Step 0은 PDF version/state 대상과 기존 명령 receipt의 재사용을 확정했고 Step 1에서 구현한다.

공개 다운로드 경로는 과거 주소인 `/api/resume/pdf`를 재사용하는 목표다. 매 요청마다 공개 current 포인터와 승인된 파일/hash를 확인해 `application/pdf`, attachment, 한글 `이력서.pdf`와 안전한 ASCII fallback을 반환한다. 임의 version ID로 이전/비공개 파일을 다운로드하는 public endpoint는 만들지 않는다. 비공개/미등록/회수 상태는 404, 저장소 장애는 일반 오류로 구분하며 과거 파일로 fallback하지 않는다. Resume 링크는 실제 공개본이 있을 때만 표시하고 DB 장애는 이력서 본문을 막지 않도록 다운로드 영역에 한정한다.

PDF 바이트와 공개 여부 응답은 `no-store`로 제공하고 CDN·프록시·Next cache·조건부/Range 요청이 권한 판정을 우회하지 못하게 한다. 공개 해제 뒤의 새 요청은 404여야 하며, 이미 전송 중이거나 방문자가 내려받은 사본까지 회수할 수 있다고 설명하지 않는다. PDF를 별도 sitemap/feed/llms 항목으로 확장하지 않고 Resume 링크에서 제공한다. 원본 업로드 파일명·서버 검사 보고서·비공개 과거 버전은 공개하지 않는다. PDF 안에 포함된 메타데이터는 다운로드 원본에도 남으므로 공개 전에 검토하고, 부적합하면 원본 문서에서 수정해 다시 등록한다.

바이트·메타데이터·포인터가 같은 DB backup/restore 경계에 포함되는지 hash로 검증한다. 과거 DB 복구가 철회한 공개본을 다시 열지 않도록 복구/rollout 시 PDF 공개 게이트를 닫고 현재 의사를 재확인하는 절차를 둔다. 관리자 PDF 등록 기능 배포가 기존 Git PDF의 복원이나 실제 파일 공개를 뜻하지 않는다.

## Phase와 Step

| Phase | Step | 완료 결과 |
| --- | --- | --- |
| A1 [admin-console-foundation](../../../phases/admin-console-foundation/index.json) | [0: admin-access-and-command-contract](../../../phases/admin-console-foundation/step0.md) | 인증·host·작업 권한·설정 이전·테스트 행렬 확정 |
| A1 | [1: shared-owner-auth-and-shell](../../../phases/admin-console-foundation/step1.md) | 전체 관리자 보호와 전용 탐색, 공개 host 차단 로컬 검증 |
| A1 | [2: private-queue-lab](../../../phases/admin-console-foundation/step2.md) | Queue 실험 비공개 이동, 기존 공개 URL 404·링크/sitemap 제거 |
| A1 | [3: second-brain-admin-integration](../../../phases/admin-console-foundation/step3.md) | Brain 편입·중복 방지·공개 상태 충돌·변경 이력 완료 |
| A2 [admin-blog-publishing](../../../phases/admin-blog-publishing/index.json) | [0: private-post-review](../../../phases/admin-blog-publishing/step0.md) | **완료**: 비공개 글/버전·안전한 미리보기·저장된 검증 결과 조회 |
| A2 | [1: versioned-editorial-actions](../../../phases/admin-blog-publishing/step1.md) | **완료**: 저장·선택 버전 발행·철회와 동시 수정/감사 처리 |
| A2 | [2: draft-generation-requests](../../../phases/admin-blog-publishing/step2.md) | **완료**: 중복 없는 초안 요청·기존 실행자 처리·비공개 결과 저장 |
| A2 | [3: automation-policy-controls](../../../phases/admin-blog-publishing/step3.md) | **완료**: 기본 OFF 지속 정책·전 실행 경로 admission·공개 보호 |
| A3 [admin-operations-control](../../../phases/admin-operations-control/index.json) | [0: job-and-audit-inspection](../../../phases/admin-operations-control/step0.md) | 실제 작업/lease/실패·감사·비용 조회 |
| A3 | [1: bounded-retry-and-pause](../../../phases/admin-operations-control/step1.md) | 단건 재시도·새 claim 중지·동시성/재시작 검증 |
| A3 | [2: monitoring-overview](../../../phases/admin-operations-control/step2.md) | 기존 모니터링 신호·누락/오류·비공개 Grafana 연결 |
| A3 | [3: local-admin-release-rehearsal](../../../phases/admin-operations-control/step3.md) | 공개/관리 host·데이터 누출·실패/복구·모바일 종합 검수 |
| A3 | [4: approved-admin-origin-rollout](../../../phases/admin-operations-control/step4.md) | 승인된 admin 도메인·TLS·접근 제한 적용/롤백 — OCI 보류로 blocked |
| A4 [admin-resume-pdf](../../../phases/admin-resume-pdf/index.json) | [0: resume-file-and-visibility-contract](../../../phases/admin-resume-pdf/step0.md) | 저장·검사 도구/예산·공개/HTTP·복구 계약 확정 완료(기능 미구현) |
| A4 | [1: private-upload-preview-and-versions](../../../phases/admin-resume-pdf/step1.md) | 비공개 등록·검증·전 페이지 미리보기·수정 파일 교체/이력 |
| A4 | [2: published-resume-download](../../../phases/admin-resume-pdf/step2.md) | 공개본 지정/해제와 Resume 다운로드·교체/이전 버전 선택 |
| A4 | [3: resume-privacy-and-recovery-rehearsal](../../../phases/admin-resume-pdf/step3.md) | 공개 경계·cache·동시성·실패·backup/restore 종합 검수 |

## 실행 순서와 기존 계획

1. 기본 다음 작업은 **operations-observability Step 2: host-database-http-probes**다. A1/A4/A2와 A3 Steps 0–1의 조회·제어, 모니터링 Steps 0–1의 계약/로컬 기반을 검증했다. 업무 수집·dashboard/알림과 운영 rollout은 후속 단계다.
2. A1 완료 뒤 독립적인 **A4 이력서 PDF Steps 0–3**을 진행한다. A4 번호는 기존 A1–A3의 참조를 보존하기 위한 것이며 운영 rollout 뒤로 미루는 뜻이 아니다. 이어 `operations-observability / Step 0`의 신호·권한·예산 계약까지 완료했다. A2 Steps 0–3과 A3 Steps 0–1은 이를 참고해 실제 저장·제어를 구현하며, 수집 스택 설치를 선행 조건으로 요구하지 않는다.
3. observability Steps 1–6을 구현·로컬 검증한 뒤 A3 Steps 2–3을 완료한다. 관측 데이터의 생산자는 모니터링 phase, 관리자 화면은 소비자로 둔다.
4. 운영은 기존 OCI 보류 해제 및 범위별 승인 후 진행한다. observability Step 7은 비활성 scheduler 상태에서도 완료할 수 있다. 이어 A3 Step 4에서 관리자 도메인과 A4의 비공개 파일 저장/migration을 적용한다. 관리자 rollout은 자동 발행 timer를 켜거나 실제 글/Brain 사본/PDF를 공개하지 않는다. 특정 PDF 공개는 관리자에서 검수한 파일을 선택하는 별도 행동이다.
5. 반복 자동 발행은 기존 `auto-publish-ops-hardening / Step 4`에서 관리자 제어·운영 모니터링·실제 공개 origin/privacy 설정·별도 canary 승인을 확인한 뒤 활성화한다. 이 단계의 완료를 앞 단계의 선행 조건으로 삼지 않아 순환 의존을 피한다.

기존 Second Brain·공개 경험 phase를 다시 열거나 재번호하지 않는다. 새 관리자 작업은 위 4개 phase에서 추적하고, 기존 no-JS 블로그 목록 후속과 Terraform 운영 보류는 별도로 유지한다.

## 검증과 범위

- 문서: Markdown/JSON parse, 읽을 파일·상대 링크·phase/step 상태·선행 순서 검사, `git diff --check`.
- 코드: 한 동작의 focused RED → GREEN 뒤 `npm run test`, `npm run lint`, `npm run typecheck`, `npm run build`. DB/worker/migration 변경 시 격리 DB의 `npm run test:integration` 추가.
- UI: 개발 서버의 1440/390/320px·키보드·긴 제목/본문·0건·오류·미설정·stale 확인. 인증되지 않은 직접 URL/API/RSC와 같은 site의 다른 origin도 검증한다.
- 작업: test provider와 합성 자료만 사용해 중복 요청·버전 충돌·감사 실패 rollback·lease 경합·정책 변경·재시작·결과 불명확을 재현한다. 공개 URL/Markdown/sitemap/feed/llms/search/related에 private 데이터가 없어야 한다.
- 배포 구성: 로컬 Compose/Nginx 검증은 운영 변경과 분리한다. `admin` host에서도 public canonical을 바꾸지 않고 upstream 직접 접근·위조 host/header·cache 누출을 검사한다.

계획 등록과 A1 Step 0 계약 확정은 코드/설정/DB/운영 상태를 변경하지 않는다. 실제 도메인 선택, 확정한 인증 방식의 운영 설정과 OCI 적용은 해당 step에서 다룬다. 관리 화면에서 수행할 기능을 만드는 일과 실제 provider 호출·공개 발행·운영 활성화는 서로 다른 완료 기준이다.

A1 Step 1은 공통 인증과 관리자 화면의 앱 코드/테스트를 변경했다. `HLOG_ADMIN_ENABLED/OWNER_KEY/ORIGIN`만 사용하며 기존 Brain owner 설정은 더 이상 인증에 쓰지 않는다. 로컬 두 ingress 검증은 Git 제외 구성으로 수행했고 저장소의 운영 Compose/Nginx/env는 변경하지 않았다.

## 최초 계획 등록 검증 — 2026-10-22, PDF 추가 전

앱 디렉터리에서 `node private/admin-plan-check/verify-docs.mjs`를 실행했다. 변경 문서/JSON 29개, 전체 phase JSON 45개, 상대 링크 41개, 새 step의 읽을 파일 경로 296개를 확인했다. 새 상태는 pending 12개·blocked 1개이며 기존 phase/step 상태와 운영 보류를 보존했다. Markdown/JSON 파싱·단계/의존 순서 검토·`git diff --check`를 통과했다. 코드/설정 변경이 없어 앱 build나 브라우저 검수는 재실행하지 않았다. 이 결과는 계획 문서 검증이며 새 기능 완료 판정이 아니다.

## PDF 계획 추가 검증 — 2026-10-22

같은 문서 검증 명령으로 통합 변경 36개(Markdown 31개/JSON 5개), 전체 phase JSON 46개, 상대 링크 53개, 새 step의 읽을 파일 경로 400개를 확인했다. 관리자 계획은 4개 phase/17개 step, pending 16개·blocked 1개이며 기존 완료/운영 보류 상태는 보존했다. A1 → A4 → 모니터링/블로그/운영 순서와 PDF 등록·교체·해제·복구 계약을 대조했다. `git diff --check`를 통과했으며 앱 코드·설정·개인 파일·DB는 변경하지 않았다. 실제 Queue는 공개, PDF 다운로드는 제거 상태 그대로다. 구현 테스트나 실제 PDF 공개를 완료했다고 기록하지 않는다.

## A1 Step 0 계약 검증 — 2026-10-23

기존 `brain-owner.test.ts`·`brain-capture-http.test.ts` 기준선 6/6을 통과했다. `node private/admin-access-check/verify-docs.mjs`로 변경 문서 13개(Markdown 11개/JSON 2개), 전체 phase JSON 46개·162개 step, 상대 링크 13개·읽을 파일 84개와 다른 단계의 상태 보존을 확인했다. `git diff --check`도 통과했다. 목표 인증·명령·중지 행렬은 계약 검토 결과이며 새 runtime 테스트의 통과를 뜻하지 않는다. 다음 A1 Step 1에서 공통 인증과 관리자 shell을 실제 구현·검수한다.

## A1 Step 1 구현 검증 — 2026-10-23

공통 인증과 Brain 환경값 이전의 RED/GREEN, 관리자 개요의 404→200, 공개 Brain 링크의 잘못된 origin→공개 origin을 확인했다. Focused 11/11, unit 232 pass/14 DB skip, lint/typecheck/build, 격리 Brain integration 1/1·Brain HTTP 1/1·admin HTTP 1/1을 통과했다. 1440/390/320px의 미설정/연결/오류 화면·키보드·no-JS 이동을 검수했고 overflow/pageerror는 없었다. 키 누락·관리자 OFF·회전·DB 오류·운영 HTTP 거부의 재시작 5가지를 확인했다. 상세 기록은 A1 Step 1에 남겼다. Queue 이동, 새 명령/감사/정책, PDF와 운영 TLS는 다음 범위다.

## A1 Step 2 구현 검증 — 2026-10-23

기존 Queue 계산과 재생 컴포넌트를 그대로 재사용해 `/admin/lab/queue`로 이동했다. 공통 Proxy와 page 인증을 적용하고 공개 경로는 redirect 없이 404로 종료했다. Portfolio 진입 영역·sitemap 항목·공개 canonical을 제거했으며 실험에서 공개 프로젝트로 나가는 링크는 공개 origin을 사용한다. HTTP RED → GREEN 4/4, Queue/SEO 5/5, unit 232 pass/14 DB skip, lint/typecheck/build를 통과했다. 1440/390/320px·재생 설정 9조합·DLQ 재처리·키보드·no-JS·공개 링크의 credential/Referer 미전달을 검증했다. 운영 설정과 실제 작업 실행은 변경하지 않았다. 상세 기록은 A1 Step 2에 남겼다.

## A1 Step 3 구현 검증 — 2026-10-26

Brain 저장·공개·해제에 내용 revision과 별도 명령 revision/UUID를 적용했다. 기존 `admin_actions`를 확장해 중복 receipt와 안전한 감사·상태 변경을 원자적으로 처리한다. UI는 응답 유실 재확인과 최근 변경 이력·코드 관리 카탈로그 안내를 제공한다. RED/GREEN, unit 234 pass/14 DB skip, 전체 격리 integration 16/16, Brain HTTP 1/1·admin HTTP 4/4, lint/typecheck/build, 1440/390/320px 작성/검색/이력/응답 유실/충돌과 기능 OFF·DB 오류를 검증했다. 기존 원문·공개 snapshot·과거 감사 보존을 upgrade fixture로 확인했다. 상세 명령과 한계는 [Step 3](../../../phases/admin-console-foundation/step3.md)에 남겼다. A1은 완료이며 다음은 A4 Step 0이다. 운영 적용은 별도다.

## A4 Step 0 계약 검증 — 2026-10-26

[PDF 계약](RESUME_PDF_CONTRACT.md)에 실제 live 코드/schema/Nginx/backup 대조, 도구 선택·파일/메모리/보관 예산, 원자적 상태/receipt와 공개 다운로드/복구 epoch를 확정했다. 기존 공통 인증·Brain HTTP 기준선 10/10, Markdown/JSON·링크·phase 상태·변경 범위 검사와 `git diff --check`를 통과했다. PDF 도구·schema·API·화면 구현은 아직 없으며 Step 0만 완료다. 다음 A4 Step 1에서 비공개 등록/PNG 미리보기를 구현한다.

## A4 Step 1 구현 검증 — 2026-10-26

인증된 `/admin/resume`에서 5 MiB·10페이지 이하 PDF를 최대 20개 보관하고 페이지 이동·확대·검사 보고서·메모 변경을 제공한다. 업로드와 메모는 기존 감사 receipt와 전역 revision으로 중복/충돌을 검사하며 기존 바이트와 공개 포인터를 보존한다. Linux qpdf/Poppler 제한 실행, migration 007, 단위 237 pass/15 DB skip·격리 integration 17/17·native 4/4·두 ingress HTTP 5/5와 기본 gate를 통과했다. 상세 범위·화면 검수·운영 전 제약은 [Step 1 기록](../../../phases/admin-resume-pdf/step1.md)을 따른다. 실제 파일 공개와 운영 환경 적용은 수행하지 않았다. 다음은 A4 Step 2다.

## A4 Step 2 구현 검증 — 2026-10-26

버전/hash별 검토, 공개 시 재검사, revision·epoch·감사 transaction, 공개본 전용 다운로드와 Resume 링크를 구현했다. 합성 PDF로 단위 244 pass/16 DB skip·격리 integration 18/18·PDF HTTP 2/2·관리자 HTTP 4/4, lint/typecheck/build와 1440/390/320px를 확인했다. 공개 해제 뒤 조건부·프록시·브라우저 요청 차단, 늦은 receipt, 현재 개인정보 정책 거부와 DB 장애 시 본문 보존을 검증했다. [Step 2 기록](../../../phases/admin-resume-pdf/step2.md)에 실행 조건과 한계를 남겼다. 다음은 A4 Step 3이며 실제 PDF 공개·운영 적용은 수행하지 않았다.

## A4 Step 3 완료 — 2026-10-26

32 MiB tmpfs가 없는 환경의 검사 차단, 공간 소진 후 정리/복구, 감사와 함께 공개 포인터를 초기화하는 오프라인 명령을 구현했다. 최대 합성 자료의 실제 dump/restore와 과거 공개 명령 재전송·새 epoch·재검토·이전 image의 기능 OFF rollback을 검증했다. Next.js/sharp 등 production 감사는 0건이다. 자원 실측·검증 명령·한계는 [Step 3 완료 기록](../../../phases/admin-resume-pdf/step3.md)을 따른다.

## A2 Step 1 구현 검증 — 2026-10-27

2026-10-27 A2 Step 1 완료: 기존 글의 불변 수정본 저장, 선택 버전/hash 검토 후 발행 요청, 철회와 원자적 감사 receipt를 연결했다. 저장은 공개 current를 유지하고 발행은 기존 required 6종 워커를 거친다. 중복·동시 수정·감사 실패 rollback·철회 후 늦은 작업의 재노출 방지를 검증했다. Unit 248 pass/18 DB skip, 격리 integration 20/20, 로컬 editorial HTTP, lint/typecheck/build와 1440/390/320px 저장·발행·철회·오류 복구를 확인했다. 관리자 completed 10·pending 6·blocked 1이며 다음은 A2 Step 2 draft-generation-requests다. 운영 발행·배포·provider·timer는 실행하지 않았다. 자세한 계약과 제약은 [Step 1 기록](../../../phases/admin-blog-publishing/step1.md)을 따른다. 수동 발행 flag 기본 OFF이며 기존 자동 실행자의 전역 중지 정책으로 해석하지 않는다.

2026-10-27 A2 Step 2 완료: `/admin/automation`의 초안 요청·최근 이력·검토 링크와 migration 009의 지속 요청/입력 snapshot을 연결했다. 명령 UUID·입력 hash 중복 수렴과 감사 transaction, 기존 one-shot의 `--draft-once`, `drafted` 전용 저장을 구현했다. freshness/context/claim/privacy/한국어 규칙/usage를 재사용하며 발행 작업은 만들지 않는다. 불명확한 외부 결과는 새 생성도 보류하고, 보관된 결과의 저장 실패는 provider 재호출 없이 복구한다. Unit 250 pass/19 DB skip, 격리 integration 21/21, dev/prod draft HTTP 각 1/1, production admin HTTP 4/4, lint/typecheck/build와 1440/390/320px 검수를 통과했다. 관리자 completed 11·pending 5·blocked 1이며 다음은 **A2 Step 3: automation-policy-controls**다. 실제 provider·운영 migration·배포·공개 발행·timer는 실행하지 않았다.

## 자동화 정책 구현 — 2026-10-28

2026-10-28 A2 Step 3 완료: 초안 생성·자동 공개·새 작업 처리를 기본 OFF의 DB 정책으로 분리했다. 요청한 설정/서버 상한을 반영한 실제 허용·차단 이유·확인 시각과 실행 예약 당시 revision을 표시한다. 정책 변경과 요청/lease admission을 같은 row lock으로 직렬화하고 관리자·CLI·일일 실행·worker에 적용했다. 자동 공개 OFF 또는 생성 중 중지 시 drafted/작업 0개로 저장하며 공개 전이를 재확인한다. 공개 후 필수 검증·실패 시 숨김·철회는 중지/정책 조회 실패에도 보존한다. 단위 252 pass/23 DB skip, 격리 integration 25/25, dev/prod draft·policy HTTP 각 1/1, production admin HTTP 4/4, lint/typecheck/build와 1440/390/320px 검수를 통과했다. A2 전체 완료, 관리자 completed 12·pending 4·blocked 1이며 다음은 **A3 Step 0: job-and-audit-inspection**다. 운영 migration·provider·배포·공개 발행·timer는 실행하지 않았다.

[자동화 정책 계약](AUTOMATION_POLICY.md)에 환경 상한·admission·공개 보호·복구 제한을 기록했다.

## 작업·감사 조회 구현 — 2026-10-28

2026-10-28 A3 Step 0 완료: `/admin/jobs`와 `/admin/audit`에 실제 작업·명령·정책 변경·UTC 일/월 사용량 조회를 연결했다. 페이지당 20건, 허용된 필터, read-only snapshot과 안전한 표시 항목을 사용한다. 작업 대상/현재 공개 버전, 만료 lease, 미확인 비용, 워커 미관측, 3분 지난 조회값과 DB 오류를 구분한다. 단위 255 pass/24 DB skip, 격리 integration 26/26, dev 조회 HTTP 1/1, production 조회·admin HTTP 5/5, lint/typecheck/build와 1440/390/320px 검수를 통과했다. 관리자 completed 13·pending 3·blocked 1이며 다음은 **A3 Step 1: bounded-retry-and-pause**다. 운영 migration·provider·배포·공개 발행·timer는 실행하지 않았다.

재시도 명령은 아직 없고, 자동 작성 화면의 기존 정책 변경만 가능하다. 비용 근거와 워커 생존 신호는 기록된 범위만 표시한다. 구현/검증과 한계는 [A3 Step 0 완료 기록](../../../phases/admin-operations-control/step0.md)을 따른다.

## 제한된 재시도·일시정지 구현 — 2026-10-28

2026-10-28 A3 Step 1 완료: `/admin/jobs`에 실패 작업 한 건의 명시적 재시도와 기존 정책의 중지·재개를 연결했다. 명령 UUID·버전/hash·post revision·lease·3회 상한과 감사 transaction을 확인하고, 같은 작업/idempotency key를 보존한다. migration 011은 기존 내부 ID와 분리된 관리자 명령 UUID만 추가한다. 단위 257 pass/25 DB skip, 격리 integration 27/27, dev 재시도 HTTP 1/1, production HTTP 6/6, lint/typecheck/build 및 1440/390/320px 검수를 통과했다. 관리자 completed 14·pending 2·blocked 1이며 다음은 **operations-observability Step 1: private-metrics-stack**이다. 모니터링 Steps 1–6 후 A3 Step 2를 진행한다. 운영 migration·provider·공개 발행·timer·배포는 실행하지 않았다.

재시도 허용 범위·잠금·상한과 검증은 [A3 Step 1 완료 기록](../../../phases/admin-operations-control/step1.md)을 따른다. 공개 후 검증 실패와 결과 불명확한 외부 작업은 직접 재시도에서 제외한다.
