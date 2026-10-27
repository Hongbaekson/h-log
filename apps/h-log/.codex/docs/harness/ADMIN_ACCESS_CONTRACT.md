# 관리자 접근과 명령 계약

확정일: 2026-10-23. A1 Step 0 설계와 후속 구현 계약이다. **2026-10-27 기준 A1/A4 전체와 A2 Steps 0–2의 검토·수정본 저장·발행 요청·철회·초안 요청을 로컬 구현·검증했다.** 지속 정책/중지·운영 ingress는 후속 단계다. 다음은 A2 Step 3이며 [통합 관리자 계획](ADMIN_CONSOLE_PLAN.md)을 따른다.

## 1. 현재 caller와 부족한 계약

| 현재 경로 | 확인한 동작 | 후속 작업 |
| --- | --- | --- |
| `proxy.ts` → `authorizeAdminOwner` | `/admin/:path*` 공통 검사, 별도 관리자 활성 설정 | A1 Step 1 완료; 운영 ingress는 계속 차단 |
| `app/admin/brain/page.tsx` → `getBrainRepository().listOwnerNotes()` | `requireAdminOwner` 뒤 DB 조회; 기능 OFF는 미설정 안내, 실패는 해당 영역 오류 | A1 Step 1 완료; 원문/공개 사본 기능은 유지 |
| `app/admin/brain/records/route.ts` → `handleBrainCaptureRequest` | 공통 인증 → 요청 형식/256 KiB 제한 → repository; 안전한 오류 코드 | A1 Step 3 완료; POST에 commandId/commandRevision 필수, 누락 시 400·새로고침 안내 |
| `brain-postgres-repository.ts` | row lock·내용/명령 revision·append-only 버전·공개 사본·원자적 감사 receipt | A1 Step 3 완료; 중복 재전송·공개/해제 경합·감사 실패 rollback 검증 |
| `blog-editorial-actions.ts` → 기존 content model/worker | 불변 수정본, 버전/hash 검토, 예상 revision/state/current와 원자적 감사 receipt | A2 Step 1 구현; Step 2의 초안 요청과 분리 |
| `blog-daily-auto-article.ts` → `savePost` | `publishing` aggregate와 required job 저장 | A2 Step 2에서 draft-only 요청/저장; 기존 함수를 그대로 초안 API에 연결하지 않음 |
| `blog-persistent-worker.ts` | `FOR UPDATE SKIP LOCKED` claim·5분 lease·소유자 조건부 완료·유한 재시도 | A2 Step 3/A3 Step 1에서 정책 확인과 claim 중지의 transaction 경계 추가 |
| Nginx → Compose web | 공개 `/admin`·`/api/internal` 404, upstream `Host hlog-web`, web은 expose만 사용 | 공개 차단 유지; 별도 관리자 ingress의 Host 전달을 로컬 검증 후 승인된 운영 단계에서 적용 |

Brain의 `publish`/`unpublish`는 내용 revision을 증가시키지 않으며 별도 `command_revision`으로 공개/해제 경합을 검사한다. `006_brain_admin_commands`는 `admin_actions`에 Brain 대상과 nullable 명령/receipt 필드를 추가한다. A4 Step 1의 `007_resume_pdf_storage.sql`은 PDF version/state와 PDF 감사 target을 추가했다. 업로드·메모는 전역 revision과 같은 명령 receipt를 사용하며 공개/해제·정책 감사는 아직 미구현이다. Worker의 `idle`이나 cycle의 `completed`는 해당 글의 공개 검증 성공을 뜻하지 않는다.

## 2. 단일 소유자 인증과 설정 이전

초기 공통 인증은 기존 **Basic `owner:<256-bit random key>`와 `timingSafeEqual` 비교를 재사용**한다. 계정·세션 DB·자체 토큰 암호화·새 인증 라이브러리는 추가하지 않는다. 서버 전용 설정은 다음 세 값으로 확정한다.

| 목표 환경값 | 계약 |
| --- | --- |
| `HLOG_ADMIN_ENABLED` | 정확히 `1`일 때만 관리자 활성; 기본 OFF |
| `HLOG_ADMIN_OWNER_KEY` | 소문자 hex 64자; CSPRNG로 생성, URL·브라우저 저장소·클라이언트 props·로그에 넣지 않음 |
| `HLOG_ADMIN_ORIGIN` | 경로/쿼리/fragment/사용자 정보 없는 정규 origin 하나; 운영 HTTPS 필수. 비운영 HTTP는 localhost/127.0.0.1/[::1]만 허용 |

`HLOG_BRAIN_DATABASE_ENABLED`는 Brain 저장/공개 데이터 기능에만 남긴다. Brain DB가 꺼져도 관리자 shell은 사용할 수 있으며 가상 실험실도 A1 Step 2에서 연결했다. 관리자 인증을 꺼도 기존 공개 Brain의 정책과 승인된 사본을 임의로 바꾸지 않는다. A1 Step 1에서 새 설정으로 코드·테스트·안내를 함께 이전했다.

이전은 한 번의 명시적 전환으로 한다. 관리자 ingress를 닫고 기존 Brain owner key/origin을 새 이름으로 옮기며 `HLOG_ADMIN_ENABLED=1`을 설정한 뒤 웹을 재시작한다. A1 코드 전환 후에는 `HLOG_BRAIN_OWNER_KEY/ORIGIN`을 자동 fallback으로 받지 않는다. 새 값 누락/잘못된 값은 404로 닫히고, 구·신 설정이 함께 있으면 새 값만 사용한다. Brain DB flag는 별도로 유지한다. 서버 env와 코드 버전을 함께 검증한 뒤 이전 이름을 지운다. 실제 운영 전환은 A3 Step 4의 승인 범위다.

키 회전/분실 시에는 기존 SSH 관리 경로에서 관리자 ingress를 닫고 새 키를 설정한 뒤 모든 웹 인스턴스를 교체한다. 새 키 성공·옛 키 401·익명 401·공개 host 차단을 확인하고 다시 연다. 키를 복구하려고 인증을 잠시 해제하거나 예전 키를 병행 허용하지 않는다. 앱 rollback 때도 유출/폐기한 키는 재사용하지 않는다. Basic은 브라우저 인증 캐시를 서버에서 확실히 지우는 로그아웃 기능이 없으므로 가짜 로그아웃 버튼을 만들지 않고 전용 브라우저 프로필/비공개 창 종료와 키 폐기를 안내한다.

운영 초기 접근의 기본안은 **기존 SSH 공개키로 들어가는 터널 안의 관리자 HTTPS 진입점 + 앱 Basic 인증**이다. 관리자 서브도메인은 유지하지만 인터넷에 Basic 로그인만 직접 열지는 않는다. 신규 VPN/인증 서비스를 설치하지 않는다. 실제 도메인·인증서·터널 포트/이름 해석은 A3 Step 4에서 정하고, TLS 검증과 정확한 origin을 그대로 유지한다. 이 두 경계가 MFA를 구현했다는 뜻은 아니다. 터널 없이 공개 인터넷에서 로그인하려면 검증된 MFA 인증 제공자 도입을 별도 결정하고 이 계약을 갱신한다. 현재 OCI 보류와 운영 승인 조건은 그대로다.

Basic은 전송 암호화가 아니므로 TLS와 변경 요청의 CSRF 방어가 필요하다. 근거: [MDN HTTP 인증](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Authentication). 위 운영 접근 방식은 H-Log의 단일 소유자·기존 SSH 환경을 고려한 설계 선택이다.

## 3. Host·Origin·응답 행렬

앱 검사 순서는 설정 → 실제 Host → 인증 → 변경 요청 Origin/Fetch Metadata → 요청 형식 → 데이터 접근이다. Proxy는 빠른 차단에 사용하고 page의 데이터 조회 직전과 HTTP handler에서도 같은 검사를 실행한다. Layout만으로 자식 page를 보호한다고 가정하지 않으며 RSC·prefetch도 동일하게 검사한다. 인증 전에 DB 연결, 비공개 props 직렬화 또는 HTML streaming을 시작하지 않는다. [Next.js 인증 지침](https://nextjs.org/docs/app/guides/authentication)에 따라 데이터 접근 가까이에서 권한을 확인한다.

| 요청/상태 | 목표 결과 |
| --- | --- |
| 비활성/키 누락·형식 오류/origin 오류/운영 HTTP 설정 | 앱 404; 인증 challenge 없음, DB 호출 없음 |
| 공개 ingress의 `/admin`, `/admin/*`, `/api/internal/*` | 키 유무와 무관하게 404 |
| 앱에 직접 전달된 잘못된 Host·누락 Host | guard는 403; 누락 Host는 HTTP parser에서 먼저 400일 수 있음. `X-Forwarded-Host`나 `Forwarded`로 보정하지 않음 |
| 올바른 관리자 Host + 익명/잘못된 키 | 401, `Basic realm="H-Log admin", charset="UTF-8"`; 응답에 원문 없음 |
| 올바른 Host/키 + GET/HEAD | 읽기만 허용; Origin 누락 가능; HEAD는 본문 없음 |
| POST 등 변경 요청 + 정확한 Origin | 허용된 메서드/형식과 명령 전제 검사 후 실행 |
| 변경 요청 + 누락 Origin/`null`/형제 subdomain/다른 port | 403; Referer fallback 없음 |
| 변경 요청 + `Sec-Fetch-Site: cross-site` 또는 `same-site` | 403; `same-origin` 또는 헤더 없는 CLI는 정확한 Origin 검사를 통과해야 함 |
| OPTIONS/CORS 요청 | 교차 출처 허용 헤더 없음; 인증/Origin 통과해도 미지원 메서드는 405 |
| 익명 HTML/RSC/prefetch/직접 records 요청 | 위와 같은 거부; 비공개 marker·데이터 조회 없음 |
| Brain DB OFF | 인증된 `/admin/brain`은 미설정 안내; records는 404, DB 호출 없음 |
| 인증된 DB 장애 | 데이터 endpoint는 안전한 `storage_unavailable`/503; page는 해당 영역 오류, 원문 stack 없음 |

인증 거부와 관리자 동적 응답에 `Cache-Control: private, no-store`, `X-Robots-Tag: noindex, nofollow, noarchive`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`를 유지한다. 기존 Brain 내부 page의 notFound 방어는 유지할 수 있지만 정상 ingress의 401은 Proxy/handler가 소유한다. 관리 경로는 sitemap/feed/llms/공개 탐색에 넣지 않는다. 인증 성공을 전역 cache에 저장하지 않는다.

관리 API는 `/admin/<기능>/...`의 same-origin Route Handler로 둔다. 기존 `/admin/brain/records` URL을 유지한다. 변경은 POST만 사용하고 GET/HEAD에 부작용을 넣지 않는다. 일반 명령은 `application/json`, 파일은 A4에서 정한 업로드 형식/크기만 허용한다. 파일 업로드도 같은 Origin 검사를 거친다. 쿠키의 SameSite나 서브도메인 이름으로 CSRF 검사를 대체하지 않는다. [OWASP CSRF 지침](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)을 참고했다.

### Ingress와 로컬 재현

- 공개 host의 기존 거부를 유지한다. 관리자 host의 허용 경로는 `/` → `/admin` 고정 redirect, `/admin` 및 하위 경로, 빌드 자산 `/_next/static/`와 필요한 고정 favicon뿐이다. 나머지는 404다. 개발 HMR 예외는 격리 개발 구성에서만 허용한다. 정적 빌드 자산에는 비공개 자료/secret을 넣지 않는다.
- 관리자 vhost는 설정된 canonical authority를 `Host`로 전달한다. 공개 vhost의 `Host hlog-web`을 그대로 재사용하지 않는다. 외부 `Forwarded`·`X-Forwarded-Host/Proto/For`는 제거/덮어쓰고 앱은 forwarded host로 권한을 결정하지 않는다. TLS 종료 뒤 내부 HTTP URL을 보고 운영 HTTPS 검사를 우회시키는 예외를 추가하지 않는다. TLS 보장은 신뢰한 ingress/네트워크, origin 허용은 앱 설정이 담당한다.
- 운영 web 포트를 host/public network에 publish하지 않는다. 외부에서 upstream으로 직접 연결하면 네트워크에서 거부해야 한다. 내부 직접 요청도 Host/키 검사를 받지만 **정확한 키와 Host를 가진 내부 요청의 proxy 경유 여부를 Host만으로 증명할 수는 없다**. 같은 app network의 신뢰 범위도 A3 rollout에서 점검한다.
- A1 Step 1의 격리 로컬 기준은 공개 `http://127.0.0.1:3030`, 관리자 `http://localhost:3031`이다. 두 loopback ingress가 동일 앱 upstream을 사용하며 실제 DNS를 변경하지 않는다. `HLOG_ADMIN_ORIGIN`은 뒤 origin과 정확히 일치시킨다. 개발 모드로 HTTP 행렬을 재현하고 운영 모드의 HTTP 거부는 별도 테스트한다. 포트가 점유됐으면 두 origin과 fixture 설정을 함께 바꾸고 결과에 기록한다.
- 공개 host + 올바른 키, 관리자 host + 위조 forwarded header, sibling/null Origin, 직접 upstream + 누락/위조 Host·키, RSC 요청을 각각 확인한다. 운영 TLS/외부 연결 거부는 A3 Step 4의 실제 검증 전까지 완료로 표시하지 않는다.

## 4. 읽기·명령·공개 데이터

모든 관리자 읽기/명령은 인증된 owner만 실행한다. actor는 서버에서 `admin/owner`로 정하고 요청의 actor나 role을 신뢰하지 않는다. 조회에는 필요한 private DTO만 반환한다. 키·환경값 전체·provider 인증·raw 오류·원본 PDF 파일명은 개요/감사 DTO에서 제외한다. 공개 사이트는 기존 published-current/privacy, Brain 공개 snapshot, A4의 승인된 PDF current만 읽는다.

| 기능/담당 단계 | 입력과 원본 | 허용 전이·부작용·공개 경계 |
| --- | --- | --- |
| 목록/미리보기/작업·감사 조회 — A1/A2/A3/A4 | 기능별 저장소, 제한된 페이지 크기·필터·ID | 읽기만 수행. 실제 미수집·오류·0건 구분; PDF 미리보기는 A4의 제한된 렌더링 경계 |
| Brain 저장 — A1 Step 3 | 내용 revision, 명령 revision, draft; 신규는 revision 0 | 새 private 내용 버전만 추가, 공개 사본 유지 |
| Brain 공개/해제 — A1 Step 3 | note ID, 두 revision, 공개 시 명시적 검토 확인 | 검수한 snapshot 지정 또는 제거. 내용 revision과 별개로 모든 변경에 명령 revision 증가; 동시 공개/해제의 오래된 요청은 409 |
| 글 저장 — A2 Step 1 | post ID, 현재 버전/상태 및 명령 revision, 수정 본문 | 새 private 버전. 공개 글을 편집해도 현재 공개 버전은 유지; `savePost`의 current 교체를 그대로 재사용하지 않음. 진행 중 publishing/verifying 또는 철회 상태는 409 |
| 선택 버전 발행 — A2 Step 1 | version ID/hash, 명령 revision/상태, 검토 사유 | gate 통과한 후보의 ready→publishing→verifying→published 절차와 required jobs 사용. API가 바로 published로 만들지 않음; 구버전/진행 중/철회 글은 거부 |
| 글 철회 — A2 Step 1 | post ID, 예상 current version/상태/revision, 사유 | 기존 상태 전이표에서 허용한 상태만 retracted로 변경+감사; public 조회에서 즉시 제외. terminal 상태 임의 복원 금지 |
| 초안 요청 — A2 Step 2 | 검증된 입력 참조/hash·요청 키 | durable queued 요청만 수락(202); runner가 검증/예산/정책 확인 뒤 draft-only 저장. 웹에서 LLM/프로세스 직접 실행 금지; publishing/job 생성 없음 |
| 자동 초안/자동 발행 정책 — A2 Step 3 | policy revision, 각각의 boolean, 허용 범위 안의 한도, 사유 | 지속 정책 변경+감사. 서버 상한·실제 timer를 켜지 않으며 정책 읽기 실패는 새 외부 호출/공개 차단 |
| 단건 재시도 — A3 Step 1 | job ID, 현재 version/hash, 예상 상태/attempt/revision, 사유 | 허용한 실패 한 건만 재대기. 성공·running·유효 lease·구버전·철회 글·중복 재시도는 409. 무제한 retry count 초기화 금지 |
| 새 claim 중지/재개 — A3 Step 1 | policy revision, desired 값, 사유 | 정책 저장으로 새 일반 claim 차단/허용. 이미 시작한 작업 취소·timer 중지·Worker 종료를 의미하지 않음 |
| PDF 등록/수정 파일 교체 — A4 Step 1 | 제한된 파일, SHA-256, 명령 키, 전역 expectedRevision | 검증 뒤 불변 private 버전 추가. 기존 공개본 자동 교체 없음; 같은 명령 재전송은 같은 결과 |
| PDF 메모 수정 — A4 Step 1 | version ID, 전역 expectedRevision, 안전한 메모 | private 메모만 변경; 파일 바이트/hash·공개 포인터 유지 |
| PDF 공개/공개본 교체/이전본 선택 — A4 Step 2 | 파일 ID/hash, 전역 expectedRevision, 전 페이지 검토 확인·서버 고정 사유 | 현재 기준으로 검토한 버전 하나로 pointer 전환+감사. 변경/미검토 파일은 422, 오래된 pointer는 409 |
| PDF 공개 해제 — A4 Step 2 | 전역 expectedRevision, 서버 고정 사유 | pointer 제거+감사. 이후 다운로드 404; 이미 전송/다운로드한 사본 회수는 보장하지 않음 |

A2 Step 1은 migration 008의 버전별 editorial_review와 posts.command_revision, 기존 admin_actions receipt를 사용해 private 후보와 공개 current를 분리했다. 수동 publish는 HLOG_BLOG_MANUAL_PUBLISH_ENABLED=1과 최신 admin 버전/hash·검토 확인·claim/privacy gate가 필요하다. JSON 256 KiB/본문 128 KiB/읽기 10초·statement 5초로 제한하고 오류는 안전한 코드만 반환한다. 기존 `posts.current_version_id`를 private 저장만으로 바꾸지 않는 것이 인수 조건이다. 발행 전환 중 기존 글이 비공개가 되는 현재 pipeline의 의미도 화면에 안내한다. 공개 글의 무중단 버전 전환을 이번 계약만으로 보장하지 않는다. PDF의 parser/파일·총량 예산/schema·전역 expectedRevision·공개 epoch·HTTP 조건부/Range는 A4 Step 0의 [확정 계약](RESUME_PDF_CONTRACT.md)을 따른다. `resume_pdf_versions`/`resume_pdf_state`와 PDF target 추가는 Step 1 구현 대상이며 현재 006 schema에는 없다.

### 충돌·중복·감사

- 새 변경 명령은 UUID `commandId`, action, target, 예상 revision/state와 안전한 사유를 받는다. body/파일의 내용 hash와 의미 있는 입력으로 fingerprint를 만들고 key/본문/파일 자체를 감사 내용에 복사하지 않는다. 같은 owner+commandId+같은 fingerprint의 재전송은 기존 receipt를 반환하고 부작용을 반복하지 않는다. 같은 키에 다른 입력이면 409다.
- 하나의 DB transaction 안에서 receipt 중복 확인/고유 키 예약 → 대상/정책 잠금 → 예상 상태 확인 → 상태/버전 변경 → 감사/receipt와 함께 commit한다. Brain은 고유 키를 먼저 INSERT해 동시 중복을 기다리게 하며 이 예약 row도 commit 전에는 노출되지 않는다. 고유 제약으로 동시 재전송도 수렴시킨다. 감사 저장 실패는 전체 rollback하며 성공이라고 응답하지 않는다. 서버가 commit했는지 모르는 통신 오류는 같은 키로 조회/재시도한다.
- 기존 `admin_actions`를 확장해 action/target 제약과 필요한 command key/fingerprint/안전한 결과·revision을 담는 최소 receipt로 재사용한다. 과거 row는 새 필드 nullable로 보존하며 과거 감사 결과를 만들어 채우지 않는다. A1 Step 3에서 Brain 명령에 필요한 부분을 추가했으며 A4/A2/A3는 실제 caller에 필요한 대상/필드만 확장한다. 별도 범용 command bus/event store는 만들지 않는다.
- 읽기와 인증 실패는 상태 변경 감사로 쌓지 않는다. 검증 실패/충돌은 안전한 오류 코드로 응답하며 필요하면 본문 없는 운영 로그에 남긴다. DB 장애 때문에 기록하지 못한 실패를 감사 화면에서 완전한 이력이라고 표시하지 않는다. 커밋된 변경에는 receipt가 반드시 있어야 한다.
- Brain API는 A1 Step 1에서 인증을 옮겼고 A1 Step 3에서 commandId/명령 revision을 UI·API·DB에 함께 적용했다. 내용 revision은 기존 append-only 버전 의미를 보존한다. 예전 client의 변경 요청을 추정해 실행하지 않고 400 후 새로고침을 안내한다.
- 새 명령의 공통 오류 의미는 잘못된 입력 400, 인증 401, Host/Origin 403, 없는/꺼진 기능 404, 미지원 메서드 405, revision/state/중복 키 충돌 409, 크기 413, 형식 415, 검토/품질/정책 차단 422, 저장소·정책 조회 장애 503이다. 소유자에게만 안전한 code를 반환하며 raw DB/provider 오류는 노출하지 않는다. 기존 Brain의 세부 오류 코드는 의미를 유지한다.

### Brain 명령 구현 — 2026-10-26

- POST는 기존 action/id/revision 외에 UUID `commandId`와 0 이상 정수 `commandRevision`을 요구한다. 새 기록은 두 revision 모두 0, 기존 기록은 GET에서 읽은 값을 보낸다. 내용 revision은 저장에만, command revision은 저장·공개·해제마다 증가한다. 기존 DB 기록의 command revision은 0에서 시작하며 과거 감사를 만들어 채우지 않는다.
- 성공 receipt는 `{ id, revision, commandRevision }`다. 서버 actor는 `admin/owner`로 고정하고 action·대상·두 예상 revision·검증된 초안의 정규 JSON을 SHA-256으로 비교한다. 같은 요청은 이후 수정이 있어도 최초 receipt를 반환한다. 다른 입력의 키 재사용과 오래된 상태는 409, 누락/잘못된 명령 필드는 400, 원시 오류 없는 저장소 오류는 503이다.
- 사유는 서버가 버튼 의미에 맞춰 `private_note_saved` / `reviewed_public_copy` / `public_copy_removed`로 저장한다. 자유 입력 사유나 원문을 감사에 복사하지 않는다. owner 조회에는 최근 20개의 action·내용/명령 revision·시각만 추가하며 command ID/fingerprint/credential은 보내지 않는다.
- UI는 통신 오류·5xx·성공 후 재조회 실패 시 같은 키와 내용을 메모리에 보관하고 다른 변경을 잠근다. “같은 요청 다시 확인”으로 재시도하며 페이지 이탈에는 경고한다. 서버가 거부한 4xx에서는 초안을 유지하고 편집을 다시 허용한다. 재시도 정보는 새로고침/창 종료 후에는 남지 않으므로 닫기 전에 처리 결과를 확인한다. 브라우저 영구 저장소에 원문을 추가 저장하지 않는다.

## 5. 중지와 실행 시작의 기준

정책은 `자동 초안 허용`, `자동 발행 허용`, `새 일반 작업 claim 허용`을 별도로 저장하며 기본 OFF다. 수동 요청도 서버 운영 상한·예산을 우회하지 않는다. 자동 발행 OFF여도 소유자가 승인한 특정 버전의 수동 발행은 해당 승인을 확인해 진행할 수 있다. 실제 provider/발행의 운영 허용이 없으면 둘 다 차단한다.

정책 변경과 각 새 실행의 admission은 같은 정책 row를 잠그는 짧은 transaction으로 순서를 정한다. 실행 측은 정책 revision과 요청/job을 원자적으로 예약하고 commit한 뒤 외부 호출한다. **중지 commit보다 뒤에 admission한 일반 작업은 시작하지 않는다.** 먼저 admission한 호출은 중지 뒤 실제 네트워크 요청이 시작되거나 완료될 수 있고, 이 예약을 진행 중 수에 포함한다. 외부 호출 동안 DB lock을 잡고 기다리지 않는다.

공개 전이 직전에도 같은 정책/대상 잠금 안에서 자동 허용 또는 해당 수동 승인과 버전/hash를 다시 확인한다. 중지 뒤 도착한 생성 결과는 private에 보관하고 자동 공개하지 않는다. 실행 결과가 불명확한 provider 요청은 자동 재호출하지 않고 확인 필요로 남긴다. claim lease가 만료됐다는 이유만으로 유료 생성 요청까지 다시 실행하지 않는다.

새 일반 claim 중지는 아직 공개되지 않은 발행과 선택 후처리를 막는다. 이미 공개한 글의 필수 검증·실패 시 숨김·철회와 공개 해제는 보호 경로로 계속 허용한다. 일반 pause를 전체 worker early-return으로 구현하지 않는다. 공개 중지는 새 공개를 막고 기존 글을 삭제하지 않는다.

화면은 desired 정책/revision·admission에 적용된 revision/시각·차단 이유·진행 중 예약/lease를 구분한다. 실제 systemd timer와 프로세스 생존은 관측 신호가 있을 때만 표시하고, 없거나 오래되면 알 수 없음으로 둔다. 정책 저장 성공을 Worker 정지/프로세스 종료로 표현하지 않는다. 이 원자성/경합 검증은 A2 Step 3과 A3 Step 1의 통합 테스트가 담당한다.

## 6. 구현 인계와 검증

| 단계 | 실제 읽을/바꿀 경계 | 가장 가까운 검증 |
| --- | --- | --- |
| A1 Step 1 | `brain-owner.ts`의 로직을 새 `lib/admin-owner.ts`로 추출, `proxy.ts`, Brain page/HTTP caller, 최소 admin layout/page, env 안내·기존 HTTP fixture | 새 `admin-owner.test.ts` RED/GREEN + 기존 owner/HTTP 6 tests; loopback 두 ingress의 HTML/API/RSC와 1440/390/320px |
| A1 Step 3 | `brain-capture-http.ts`, `brain-postgres-repository.ts`, `BrainCapture.tsx`, 필요한 추가 migration | 동시 save/공개/해제·중복/감사 rollback·기존 원문/snapshot·격리 `npm run test:brain` 및 `npm run test:brain:http` |
| A4 Steps 0–3 | `app/resume/page.tsx`, 향후 admin PDF handler/repository, migration | 등록/동일 키·pointer 충돌·해제 후 GET/HEAD/Range·cache·복구; 파일 선택은 A4 계약 이후 |
| A2 Steps 1–3 | `blog-admin.ts`, repository/content model, daily generation/auto-publish runner, worker와 새 명령 caller | 공개 current 유지·발행 gate·감사 rollback·중복·중지/예약 경합; 관련 단위+격리 integration |
| A3 Step 1/4 | persistent worker·정책 저장, Nginx/Compose/systemd 운영 문서 | claim 경합/lease/보호 검증; 실제 ingress/TLS/재시작은 승인된 rollout에서 별도 검증 |

A1 Step 1의 focused 명령(앱 디렉터리): `node --no-warnings --test --experimental-strip-types lib/admin-owner.test.ts lib/brain-owner.test.ts lib/brain-capture-http.test.ts`. 새 테스트 파일은 해당 step에서 작성한다. 인증 wrapper가 불필요해지면 기존 테스트를 공통 테스트로 옮기고 실제 명령을 완료 기록에 남긴다. 관련 env 참조는 `rg -l 'HLOG_BRAIN_OWNER_(KEY|ORIGIN)'`로 찾아 테스트/문서를 함께 이전하며 실제 secret 값은 출력하지 않는다.

Step 0 당시 검증은 문서/JSON·링크·읽을 파일·phase 상태 검사와 `git diff --check`, 기존 auth/HTTP 기준선 6개였다. A1 Step 1은 별도로 focused RED/GREEN 11/11, 전체 unit 232 pass/14 DB skip, lint/typecheck/build, 격리 Brain DB/HTTP와 관리자 HTTP 행렬, 1440/390/320px·키보드·no-JS·DB 오류·설정/키 재시작 검증을 수행했다. 새 명령/정책이나 운영 TLS 검증 완료를 뜻하지 않는다.

공통 경계 재검증은 앱 디렉터리에서 `npm run test:admin:http`를 사용한다. `HLOG_ADMIN_HTTP_TEST=1`, 테스트용 `HLOG_ADMIN_ORIGIN/OWNER_KEY`, `HLOG_ADMIN_HTTP_PUBLIC_ORIGIN`, `HLOG_ADMIN_HTTP_UPSTREAM`을 설정한 격리 HTTP loopback 두 ingress가 필요하다. 실제 secret/도메인을 넣지 않는다. A1의 검수 설정·결과·스크린샷은 Git 제외 `private/admin-shell-check/`에 보관했다.

A1 Step 2에서 같은 `test:admin:http`에 Queue 공개 종료·공개 탐색 제외·소유자 접근 검증 3개를 추가했다(부모 테스트 포함 4/4). 공개 sitemap/검색/글 조회도 검사하므로 앱에 migration이 적용된 격리 DB를 연결해야 하며 Brain 저장 flag는 OFF여도 된다. `/lab/queue`는 공개/관리자/직접 upstream에서 GET·HEAD·RSC 모두 404이며 관리자 redirect는 없다. `/admin/lab/queue`는 공개 ingress에서 정상 키로도 404, 관리자 익명/잘못된 키는 401, 잘못된 Host는 403이다. 인증된 HTML·RSC·prefetch·HEAD와 private/no-store/noindex를 확인했다. 공개 페이지·프로젝트 RSC·sitemap·검색·feed/llms에는 실험 주소/본문이 없다.

## A2 Step 2 요청 경계

POST `/admin/automation/requests`는 commandId/inputHash/reason만 받는다. JSON 4 KiB·본문 10초, unknown key 거부, 기존 Host/Origin/Basic + DAL owner 검사를 적용한다. 클라이언트가 파일 경로나 실행 명령을 지정할 수 없다. HLOG_AUTO_PUBLISH_INPUT_FILE의 검증 snapshot을 최대 256 KiB로 읽어 hash를 비교하며 admin_actions와 같은 transaction에 접수한다. 동일 키 replay는 flag/파일 변경 뒤에도 원래 receipt를 반환한다. 다른 키라도 같은 입력 hash는 동일 요청으로 합친다. 웹에서 provider나 shell을 호출하지 않는다. [상태·실행/복구 계약](DRAFT_GENERATION_REQUESTS.md)을 따른다.
