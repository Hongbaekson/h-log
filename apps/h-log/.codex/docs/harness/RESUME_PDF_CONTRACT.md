# 이력서 PDF 저장·검토·공개 계약

확정일: 2026-10-26. A4 `admin-resume-pdf / Step 0`의 설계 결과다. **Steps 1–3에서 비공개 보관·검토 후 공개/교체/해제·다운로드와 최대 용량/복구 종합 검수를 완료했다.** 운영 적용은 A3 Step 4가 담당한다. [관리자 접근 계약](ADMIN_ACCESS_CONTRACT.md)과 [공개 정보 기준](../../rules/content-seo-privacy.md)을 함께 적용한다. 아래 목표 계약과 실제 완료 범위는 [Step 1 기록](../../../phases/admin-resume-pdf/step1.md)으로 구분한다.

## 1. Step 0 당시 코드와 구현 경계

| 확인한 파일 | 현재 사실 | 이 계약의 적용 지점 |
| --- | --- | --- |
| `app/resume/page.tsx`, `public/`, `app/api/` | 온라인 Resume와 프로필 사진만 있고 PDF asset·CTA·다운로드 API는 없음 | 과거 파일을 복원하지 않고 새로 검토한 PDF만 연결 |
| `lib/admin-owner.ts`, `proxy.ts`, `lib/admin-server.ts` | 소유자 Basic·Host·Origin, page/handler 재검사 | `/admin/resume`과 모든 파일/미리보기 handler에 재사용 |
| `migrations/003_publish_rollback_audit.sql`, `006_brain_admin_commands.sql` | `admin_actions`에 owner+command UUID 고유 키·fingerprint·receipt가 있고 PDF target은 없음 | 기존 명령 필드를 재사용하고 PDF target만 추가 |
| `lib/brain-postgres-repository.ts` | 고유 키 예약→row lock→revision 검사→변경/감사 commit | 같은 트랜잭션 원칙을 따르되 Brain 버전 테이블을 PDF에 재사용하지 않음 |
| `Dockerfile`, `compose.yaml` | Linux Node web, 기존 PostgreSQL·migration runner; PDF 실행 도구 없음 | 같은 web image에 제한된 CLI만 추가; 새 서비스·object storage·Docker socket 없음 |
| `deploy/nginx/conf.d/hlog.conf` | 공개 `/admin` 차단, body 2m, proxy timeout 60s | 공개 차단/2m 유지; 별도 관리자 업로드 location만 조정 |
| [백업 runbook](../backup-restore-runbook.md) | PostgreSQL custom dump, 격리 복구 후 확인 | PDF 바이트·검사 결과·포인터·감사를 같은 dump로 검증 |

새 파일 등록은 비공개 보관이다. 파일 바이트 수정은 새 버전 등록, 메모 수정은 관리자용 텍스트 변경, 공개본 교체는 포인터 변경이다. 웹에서 임의 PDF의 본문·폰트·배치를 편집하거나 온라인 Resume를 자동 동기화하지 않는다. 과거 버전 재선택에도 현재 공개 기준의 재검토가 필요하다.

## 2. 초기 상한과 보관 예산

아래 값은 제품의 초기 제한과 구현 인수 기준이다. 측정된 운영 성능으로 표시하지 않는다. MiB는 1,048,576바이트다.

| 항목 | 확정값 / 초과 동작 |
| --- | --- |
| 원본 PDF | 1–5,242,880바이트(5 MiB), 1–10페이지; 초과 413/422 |
| 보관 버전 | 최대 20개, 원본 합계 최대 104,857,600바이트(100 MiB); 초과 409, 자동 삭제 없음 |
| 버전 메모 | 2,000자, JSON 명령 body 16 KiB; 목록에는 원문/검사 보고서/바이트 제외 |
| 검사 보고서 | 버전당 UTF-8 JSON 512 KiB; 텍스트·메타데이터·링크가 넘치면 잘라 승인하지 않고 422 |
| parser JSON | 프로세스 stdout 최대 8 MiB, 객체 20,000개·중첩 64단계; 초과 422 |
| 렌더 이미지 | 한 페이지씩 PNG, 긴 변 최대 2,000px, 최대 4백만 픽셀·8 MiB; 페이지 크기/회전 검사 후 렌더 |
| 실행 자원 | native 자식 프로세스 가상 주소 공간 256 MiB, CPU 5초/호출, wall 10초/호출, 전체 검사 45초 |
| 임시 파일 | 전체 처리 한 건만, 전용 공간 예산 32 MiB, 한 출력 파일 8 MiB; 입력은 최대 5 MiB, 페이지 출력은 읽고 바로 삭제. Step 3에서 UID/GID 1001·0700 전용 tmpfs를 Compose에 강제하고 종류/총량을 검사; 미설정은 503, 공간 소진 뒤 작업 정리/복구 검증 완료 |
| 동시 처리 | PDF 검사/미리보기 전역 1건, 대기열 없이 429와 `Retry-After: 2`; PDF 다운로드는 web instance당 최대 4건 |
| 수신/응답 | 수신 30초, 다운로드 전송 30초; 연결 종료 시 reader·자식·임시 파일 정리 |
| 저장/백업 준비 예산 | PDF 원본 100 MiB+보고서 최대 10 MiB. DB/TOAST/index 증분 256 MiB, custom dump 증분 200 MiB를 리허설 예산으로 잡음 |
| 백업 보관 | 기존 7 daily+4 weekly 유지. PDF 증분 약 2.2 GiB와 복구/작업 여유를 위해 추가 3 GiB 확보; WAL·기존 블로그·감사 증가분은 별도 측정 |

검사 한 건의 web 추가 메모리 목표는 64 MiB 이하다(수신/JSON/응답 포함). native 제한과 web 전체 RSS는 다르므로 Step 3에서 최대 파일·압축 폭탄·동시 다운로드의 실제 RSS/시간/dump 크기를 기록한다. 예산을 넘으면 완료 처리하거나 제한을 조용히 올리지 않고 상한/렌더 크기를 조정해 재검증한다. 20개를 모두 채웠을 때도 이 phase에는 삭제 UI가 없으며 별도 보관 정리 요청을 받는다.

## 3. 검증과 미리보기 도구

**qpdf의 구조 검사/JSON v2 + Poppler의 `pdfinfo`·`pdftotext`·`pdftoppm`를 선택한다.** 미리보기는 서버가 생성한 PNG를 일반 이미지로 보여 준다. 브라우저에 PDF 실행 viewer/주석 링크/폼을 넣지 않는다. 원본 PDF는 재작성하지 않으며 PNG는 다운로드 파일이 아니다.

qpdf `--check`의 성공은 문법 검사이지 악성 내용/개인정보 검수 완료가 아니다. 경고도 거부하며 `--warning-exit-0`·복구 후 저장을 사용하지 않는다. [qpdf 실행 문서](https://qpdf.readthedocs.io/en/stable/cli.html)에 따라 암호화 검사 전용 종료 코드는 일반 검사 종료 코드와 구분한다. JSON v2는 비참조 객체도 포함하고 기본값으로 stream 바이트를 생략하므로 전체 객체 dictionary 검사와 필요한 메타데이터 stream의 제한된 추출을 함께 한다. [qpdf JSON 문서](https://qpdf.readthedocs.io/en/stable/json.html)

[Poppler](https://poppler.freedesktop.org/)의 유지보수 현황과 배포 manpage의 [페이지 이미지 변환](https://manpages.debian.org/bookworm/poppler-utils/pdftoppm.1.en.html), [메타데이터 조회](https://manpages.debian.org/bookworm/poppler-utils/pdfinfo.1.en.html)를 확인했다. 확인 시점의 upstream은 qpdf 문서 12.4.2와 Poppler 26.10.0이다. 이것을 현재 image에 설치된 버전으로 간주하지 않는다. Step 1에서 보안 지원 중인 실제 배포 패키지·이미지 digest·도구 버전·폰트/라이선스를 고정하고 Linux image에서 회귀를 실행한다. 미리보기와 본문 편집의 차이는 [PDF.js API](https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib.html)도 확인했으나 이번에는 PDF.js 의존성을 추가하지 않는다.

### 수신부터 저장까지

1. 공통 인증·정확한 관리자 Origin·PDF feature flag를 body 읽기 전에 확인한다. `application/pdf` raw body만 받으며 `Content-Encoding`은 없거나 identity여야 한다. UI의 `.pdf` 선택은 편의 검사다. 파일명은 전송/저장하지 않는다. 실제 chunk 합계가 5 MiB를 넘으면 수신을 중단한다. 선언한 Content-Length도 맞는지 검사한다.
2. 서버 생성 임시 디렉터리(0700)와 고정 `input.pdf`(0600)에 기록하면서 SHA-256을 계산한다. `%PDF-` 식별자만으로 승인하지 않는다. 빈 파일·잘린 파일·손상/복구 경고·암호화(빈 비밀번호 포함)는 거부한다.
3. qpdf JSON의 전체 객체·참조를 한도 내에서 해석한다. 압축 object stream·이름 escape·간접 참조도 파서 결과로 검사하고 raw 문자열 검색을 보안 검사로 쓰지 않는다. 참조 순환은 visited 집합으로 종료하며 해석 불가능한 입력은 422다.
4. 첨부/외부 stream, JavaScript, OpenAction/AA, Launch, SubmitForm/ImportData/GoToR, RichMedia/Movie/Sound/3D, AcroForm/XFA/서명 필드, 선택적 숨김 레이어는 거부한다. 주석은 일반 Link만 지원하며 action dictionary는 Link의 URI/문서 내부 GoTo만 허용하고 그 밖의 action 종류는 거부한다. URI는 공개 `https:` 주소만 허용한다. 임의 scheme·상대/내부 주소·추가 action chain은 거부한다. literal IP·localhost·자격증명 포함 URL은 거부하고 서버 공개 정책의 내부 주소 차단도 적용한다. 호스트의 실제 공개 소유/목적지는 수동 검토에 남기며 URI를 검사하기 위해 방문하거나 DNS 조회하지 않는다. 링크 label/대상을 검사 보고서에 문자로 표시한다.
5. 증분 저장의 이전 내용이 남지 않도록 trailer `/Prev` 등 이력 구조가 있는 입력은 받지 않는다. 이를 검사할 수 없는 형태도 거부하며 작성 도구에서 새 PDF로 내보내도록 안내한다. 서버에서 기존 파일을 몰래 정제하지 않는다. qpdf의 경고 없는 파싱만으로 이전 바이트/숨겨진 정보가 전부 검토됐다고 주장하지 않는다.
6. 전체 페이지의 크기/회전·텍스트, Info/XMP·사용자 메타데이터·주석/링크를 제한된 보고서로 수집한다. XML을 실행/외부 entity 해석하거나 HTML로 삽입하지 않고 escape한 텍스트로 보여 준다. 기존 공개 정보 scanner를 이 자료에 적용하고, 금지값·판독 불가/한도 초과는 공개 후보 등록을 거부한다. 이미지 안 글자·시각적 가림·누락된 추출 텍스트는 수동 전 페이지 검토 대상으로 명시한다.
7. 같은 입력 바이트에서 1~10페이지를 순서대로 렌더해 전부 성공해야 등록한다. `pdftoppm -f N -l N -singlefile -scale-to 2000 -png`에 서버가 만든 절대 경로만 전달한다. 렌더 페이지 수와 qpdf/pdfinfo 페이지 수가 다르거나 검사 실패·timeout·출력 초과면 등록하지 않는다. 완료 이미지들은 영구 저장하지 않는다.
8. 검증 후 짧은 DB transaction에서 예상 revision·중복·보관량을 다시 확인하고 원본/보고서/감사를 함께 저장한다. 검사 중 다른 창에서 상태가 바뀌면 409다. 모든 실패/성공/연결 종료에서 임시 자료를 삭제한다. 재시작 시 현재 소유한 임시 루트의 잔여물만 정리하며 원본 DB 버전은 건드리지 않는다.

### 자식 프로세스 경계

Node `spawn`의 고정 executable/인자 배열과 `shell:false`를 사용한다. 사용자 경로·옵션·명령을 받지 않는다. 자식 env는 PATH/locale/font 경로 등 허용 목록만 넘기며 DB/Basic/provider 환경값과 socket FD는 상속하지 않는다.

Linux [prlimit](https://man7.org/linux/man-pages/man1/prlimit.1.html)으로 AS/CPU/FSIZE/NOFILE(64)/CORE(0)를 제한하고 [enosys](https://man7.org/linux/man-pages/man1/enosys.1.html)의 seccomp를 적용해 socket/connect 및 우회 가능한 socketcall·io_uring 경로를 차단한다. 배포 아키텍처에서 지원되는 syscall 집합을 확인하며 전체 자식/손자에 제한이 유지돼야 한다. 새 namespace 권한·root·privileged container는 요구하지 않는다. 이는 네트워크/자원 제한이며 완전한 파일시스템 격리나 악성 PDF 무해화 보장을 뜻하지 않는다.

PDF 처리 전체에서 PostgreSQL session advisory lock을 non-blocking으로 잡고 finally에 해제한다. parser 실행 중 DB transaction/공개 포인터 row lock을 유지하지 않는다. 번호는 Step 1에서 기존 advisory lock과 충돌하지 않게 정한다. 프로세스 그룹 종료로 timeout 후 남은 자식까지 정리한다. stdout/stderr는 상한 내에서만 읽고 원문/metadata/경로를 운영 로그에 출력하지 않는다.

Step 1은 Linux image에서 네트워크 요청 probe·자원 초과·종료/청소를 실제로 증명해야 한다. 필수 도구/필터/limit이 없으면 `503 pdf_processor_unavailable`로 닫으며 무제한 실행이나 브라우저 native viewer로 대체하지 않는다. Windows 개발에서도 동일 Linux 검증 경로를 사용한다. 웹이 Docker/shell 관리 명령을 호출하는 방식은 추가하지 않는다. 이 결정은 [OWASP 업로드 지침](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)의 형식·실제 내용·크기·비공개 저장·권한 경계를 적용한 것이다.

## 4. 데이터와 트랜잭션

Step 1에서 **`007_resume_pdf_storage.sql`**을 추가했다. 격리 DB의 fresh/006→007 upgrade에서 기존 Brain/블로그/감사 보존을 확인했다. 운영 migration은 적용하지 않았다.

| 대상 | 최소 필드 / 불변 조건 |
| --- | --- |
| `resume_pdf_versions` | 서버 생성 UUID `id`, `bytes bytea`, `sha256`(소문자 64 hex, UNIQUE), `byte_size`, `page_count`, `inspection jsonb`, `validation_policy`, `tool_versions`, `note`, `created_at` |
| 파일 제약 | `octet_length(bytes)=byte_size`, 1~5 MiB, 1~10페이지, 보고서 크기/형태, 메모 길이 검사. 바이트/hash/크기/페이지/검사 결과/시각은 변경 금지; note만 수정 가능. DELETE API/자동 삭제 없음 |
| `resume_pdf_state` | `id=1` singleton, `revision`(0부터), nullable `public_version_id` FK, `public_sha256`, `publication_epoch`, `reviewed_at`, `reviewed_by`, `review_checklist`, `updated_at` |
| 공개 제약 | 공개 관련 필드는 모두 null이거나 모두 유효. 파일 ID/hash는 버전의 UNIQUE(id, sha256) 동일 쌍으로 참조. 모든 성공 변경에서 singleton revision을 1 증가 |
| `admin_actions` | 기존 action/actor/command 필드 재사용. target에 `resume_pdf_version`, `resume_pdf`만 추가. upload/note는 `save`, 공개는 `publish`, 해제는 `unpublish` |

목록은 최대 20개 메타데이터와 현재 revision/공개 ID만 조회한다. 파일 바이트와 상세 검사 보고서를 목록에 한꺼번에 넣지 않는다. 파일 바이트는 저장/다운로드/미리보기 때 SHA-256을 다시 대조한다. 원본 업로드 이름은 DB·감사·URL에 남기지 않는다. PDF **내부**의 제목·작성자 등 메타데이터는 원본 다운로드에 포함되므로 비공개로 숨길 수 없다. 부적합하면 원본 문서에서 수정 후 다시 내보내야 한다.

모든 변경은 UUID `commandId`와 singleton의 `expectedRevision`을 요구한다. 업로드는 헤더로, JSON 명령은 body로 받는다. 파일 크기·hash 또는 메모의 hash, action/target/예상 revision·검토 입력을 정규화해 fingerprint로 만들고 `admin/owner`와 기존 command 고유 키를 재사용한다. target 종류도 fingerprint에 넣어 Brain과의 키 재사용을 409로 구분한다. 신규 업로드의 fingerprint는 고정 업로드 대상과 파일 hash/크기를 사용하며, 재시도마다 달라질 수 있는 서버 생성 version UUID를 넣지 않는다. 생성된 UUID는 최초 receipt의 targetId로 돌려준다. 공개 명령에는 서버가 읽은 현재 publication epoch도 포함한다.

순서는 입력/파일 검증→transaction→고유 명령 키 예약→state row 잠금→revision/파일/상한 검사→변경+감사→commit이다. 이미 완료된 같은 키/입력이면 현재 revision이 달라도 최초 receipt를 반환하며 효과를 반복하지 않는다. 같은 키의 다른 입력은 409, 다른 키로 같은 SHA-256 업로드는 `409 duplicate_file`과 owner용 기존 ID를 반환한다. 실패한 검증/감사는 버전·포인터·receipt를 남기지 않는다. 동시 중복 업로드가 처리 lock에 걸리면 429 후 **같은 키**로 재시도한다.

receipt는 `{ commandId, action, targetId, revision, publicVersionId }`에 필요한 파일 hash/크기만 담는다. 감사 사유는 `resume_uploaded`, `resume_note_changed`, `resume_reviewed_publication`, `resume_withdrawn`, `resume_recovery_reset`의 고정 코드다. 메모·추출 본문·파일명·metadata 전체·키는 감사에 복사하지 않는다. 과거 감사 row는 그대로 유지한다. 성공 응답 유실 시 같은 command/body/File 객체를 현재 화면에 보관하고 재확인한다. 새 파일 선택으로 이전 키를 재사용하지 않는다. receipt 재확인 뒤에는 최신 state를 다시 조회하며 과거 receipt를 현재 공개 상태로 표시하지 않는다.

## 5. 공개 설정과 검토

- `HLOG_RESUME_PDF_ENABLED=1`에서만 관리자 PDF 기능을 연다. 없거나 다른 값이면 파일/미리보기 API는 404, 관리자 메뉴는 미설정이다. Brain flag와 독립적이다.
- 공개에는 별도 **`HLOG_RESUME_PDF_PUBLICATION_EPOCH`의 유효한 UUID**가 필요하다. 미설정/잘못된 값이면 공개 조회는 DB 접근 전 404, 공개 명령은 `409 publication_disabled`다. 업로드·비공개 검토·해제는 가능하다. 웹에서 이 값을 생성/변경할 수 없다.
- 공개 row의 epoch가 현재 서버 값과 정확히 같아야 한다. 일반 재시작은 같은 값을 유지하지만 **복구·공개 게이트 재개 시에는 새 UUID**를 발급한다. 오래된 백업의 공개 포인터가 새 epoch와 일치하지 않아 자동 노출되지 않는다. 이 값은 인증 키가 아니라 현재 검토의 범위를 구분하는 서버 설정이다.
- 공개 요청은 ID/hash/expectedRevision, 모든 페이지를 열어본 UI 상태와 `allPages`, `metadataAndLinks`, `privacyAndOrganizations`, `hiddenContentAndSource`의 true 확인을 보낸다. 서버는 검증 결과·페이지 수·hash·현재 공개 정책을 재검사하고 확인값/actor/시각/epoch를 저장한다. UI는 모든 페이지와 보고서를 보여 주기 전 버튼을 열지 않는다. 서버의 확인 기록은 사람의 실제 독해를 증명하지 않는다.
- 서버는 자동으로 파일을 고치거나 검토를 대신하지 않는다. 회사/고객사·연락처·내부 식별자, 화면 밖 텍스트·가림·이미지 내용까지 작성자가 확인한다. 이전 버전을 다시 선택할 때도 확인을 새로 받는다. 공개 전 검사 도구/파일 접근이 실패하면 기존 공개 포인터는 보존한다.

## 6. API와 공개 다운로드

| 경로/메서드 | 입력 / 결과 |
| --- | --- |
| `GET /admin/resume` | 공통 인증 뒤 목록·보관량·공개 상태·미설정/오류 표시 |
| `GET /admin/resume/records[?id=UUID]` | 목록 또는 해당 버전 검사 보고서/메모; private/no-store, 바이트 제외 |
| `POST /admin/resume/files` | raw PDF, `X-Hlog-Command-Id` UUID·`X-Hlog-Expected-Revision` 정수; 최초/재전송 모두 receipt 200 |
| `POST /admin/resume/records` | JSON `save_note`/`publish`/`unpublish`, commandId/expectedRevision와 action별 ID/hash/메모/확인값 |
| `GET /admin/resume/preview/[id]/[page]` | 1부터 page_count까지의 서버 PNG; ID/hash 재확인, 회전/확대는 이미지 표시만. 임의 경로/해상도 입력 금지 |
| `GET`·`HEAD /api/resume/pdf` | 공개 current 하나. ID/버전 query가 붙으면 선택 기능 없이 404. 다른 메서드는 405 |

관리자 endpoint는 Proxy 외에도 handler에서 인증한다. 같은 site의 다른 Origin, 위조 Host/forwarded header, 직접 RSC/API, 기능 OFF를 기존 행렬에 추가한다. 미리보기는 인증된 이미지 응답만 허용하고 HTML/inline 원본 PDF·공유 링크는 제공하지 않는다. 이미지/보고서도 private/no-store/noindex이며 공개 검색/sitemap/feed/llms에 넣지 않는다. 이미지용 plain `<img>`를 사용해 Next 이미지 최적화 public cache를 거치지 않는다.

관리자 ingress의 정확한 `location = /admin/resume/files`만 `client_max_body_size 5m`, 수신 30초, upstream 90초로 둔다. raw body이므로 multipart 여유 1 MiB는 필요 없다. 요청 buffering은 끄고 앱이 실제 수신량을 검사한다. 다른 관리자 JSON 경로는 앱에서 16 KiB, 공개 host의 기존 2m 및 `/admin` 차단은 유지한다. 로컬 검증을 먼저 하며 실제 Nginx 변경은 승인된 rollout 범위다.

### 공개 판정과 HTTP 의미

한 SQL snapshot에서 state→공개 version을 읽어 epoch·검토·hash·크기를 확인한다. GET/HEAD 모두 같은 기준을 적용하며 HEAD도 무결성을 확인한다. `no-store`, Next `force-dynamic`, 캐시하지 않는 DB 조회를 사용하고 CDN/프록시 cache를 끈다. 공개 판정 뒤 과거 버전 조회나 static 파일로 fallback하지 않는다.

| 상황 | 응답 |
| --- | --- |
| 공개 가능 | GET 200 원본 바이트, HEAD 200 동일 헤더·body 없음 |
| feature/epoch 닫힘, 미등록/해제, epoch 불일치 | 404. 조건부·Range 헤더가 있어도 동일 |
| DB/무결성/지원하지 않는 저장 검사 결과 | 503 `resume_unavailable`, 원시 오류 없음. 이전 파일로 fallback 없음 |
| 현재 ETag와 `If-None-Match` 일치 또는 `*` | **현재 공개·무결성 판정 후에만** 304, no-store. GET/HEAD만 해당 |
| `If-Match` 불일치 | 공개 판정 후 412; `*`는 현재 공개본이 있을 때만 충족 |
| Range/If-Range | 최대 5 MiB 파일이므로 range 미지원. Range를 무시하고 현재 전체 200, `Accept-Ranges: none`; 206/부분 응답 없음 |
| 날짜 조건 | Last-Modified를 제공하지 않고 If-Modified-Since/If-Unmodified-Since를 사용하지 않음. 조건부 처리는 ETag 기준 |
| 다운로드 동시성 상한 | 공개 판정 후 429, no-store·짧은 Retry-After. 종료/시간 초과에도 슬롯 반환 |

ETag는 현재 파일 SHA-256만 사용하고 관리자 revision·ID·메모를 넣지 않는다. 비공개 업로드/메모 수정만으로 ETag가 바뀌지 않는다. `If-Match`는 strong, `If-None-Match`는 weak 비교이며 둘 다 있으면 표준 순서를 따른다. 다른 바이트로 교체한 뒤 이전 ETag는 새 바이트 200, 해제 후에는 옛 ETag로 304를 받지 못한다. Range를 생략하는 선택과 조건부 평가 순서는 [RFC 9110](https://datatracker.ietf.org/doc/html/rfc9110)에 근거한다.

성공 응답 헤더는 `Content-Type: application/pdf`, `Content-Length`, `Content-Disposition: attachment; filename="resume.pdf"; filename*=UTF-8''%EC%9D%B4%EB%A0%A5%EC%84%9C.pdf`, `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`, `X-Robots-Tag: noindex, nofollow, noarchive`다. 공개 파일명은 **이력서.pdf**, ASCII fallback은 resume.pdf다. 에러/304/HEAD에도 캐시 정책을 유지한다. 교체·해제 commit 이후 시작한 새 요청은 새 상태를 읽지만 이전 snapshot으로 전송 중인 응답·이미 저장된 사본은 회수하지 못한다.

Resume은 바이트 없이 공개 가능 여부만 동적으로 읽는다. 공개본이 있으면 일반 링크 `이력서 다운로드`를 표시한다. 미등록/해제는 링크를 생략하고 DB 장애는 다운로드 영역의 안내로 제한한다. 본문·프로필·레이더와 no-JS 읽기는 유지한다. 링크가 보인 직후 해제돼 클릭이 404가 되는 경합은 정상적으로 안내한다. 과거의 PDF 전용 rate limiter는 현재 코드에 없으므로 복원됐다고 표현하지 않는다.

## 7. 백업·복구·배포

원본 bytea, 검사 보고서/도구 버전, state/검토 확인, 감사 receipt를 기존 `pg_dump --format=custom` 경계에 포함한다. PNG/임시 파일은 제외한다. dump는 개인 문서이며 저장소/공개 artifact에 넣지 않는다. Step 3에서 20버전 최대 원본 합계, DB/dump 크기·복구 시간·전후 SHA-256을 측정했다. [완료 기록](../../../phases/admin-resume-pdf/step3.md)을 다음 모니터링 자원 예산의 입력으로 사용한다.

복구 순서는 **공개 설정 제거·기존 web 중지 → 독립 DB로 restore → hash/FK/검사 결과/감사 비교 → 공개 설정이 닫힌 오프라인 명령으로 이전 포인터 해제·revision 증가 → 새 publication epoch 설정·재기동 후 404 확인 → 현재 파일 전 페이지 재검토/명시적 공개**다. 새 epoch는 dump에 들어 있는 값을 복사하지 않는다. 이전 command receipt 재전송은 상태를 되살리지 않으며 현재 epoch의 새 공개 명령은 새 키를 쓴다. 복구를 평범한 앱 재시작으로 처리하지 않는다.

새 migration을 적용하기 전에 관리자 쓰기를 닫고 백업한다. code/schema/tool/filter를 맞춰 배포한 뒤 합성 자료로 검사한다. schema 없는 새 앱은 PDF 기능을 열지 않는다. rollback은 PDF feature/public epoch를 닫고 이전 image로 돌아가며 새 bytea/감사는 보존한다. 새 필드/파일을 지우는 down migration을 자동 실행하지 않는다. 운영 포인터를 열거나 실제 개인 PDF를 공개하는 것은 기능 배포와 별도 행동이다.

## 8. 구현 파일과 검증 인계

아래 Steps 1–3 파일과 합성 로컬 리허설은 완료했다. 공개 검증은 합성 자료로 수행했고 실제 개인 PDF는 공개하지 않았다. 범용 명령 버스·PDF 편집기·새 서비스는 만들지 않는다.

| 단계 | 변경 대상 | 필수 검증 |
| --- | --- | --- |
| Step 1 | 새 `lib/resume-pdf.ts`, `resume-pdf-processor.ts`, `resume-pdf-repository.ts`, `resume-pdf-http.ts`, `resume-pdf-server.ts`; `/admin/resume` page/records/files/preview; 전용 component, migration 007; 기존 관리자 탐색·Dockerfile·test scripts | 파일 검사·자원 제한·비공개 등록/이미지·중복·메모·재시작/rollback |
| Step 2 | 기존 `app/resume/page.tsx`; 새 `app/api/resume/pdf/route.ts`; Step 1 명령/조회·관리자 공개 UI | 선택·교체·해제·재검토·HTTP 조건부·Range·캐시·모바일 |
| Step 3 | 동일 경계의 보완 테스트와 backup/deployment runbook | 실제 Linux image·최대 예산·복구 epoch·상태 재확인·두 ingress 종합 리허설 |

기본 gate는 각 코드 step의 RED→GREEN 뒤 `npm run test`, `npm run lint`, `npm run typecheck`, `npm run build`, `git diff --check`다. Step 1에서 `npm run test:integration`에 PDF suite를 연결하고 `npm run test:resume:processor`(동일 Linux 도구 image)와 `npm run test:resume:http`(격리 DB/두 loopback host)를 추가했다. 상세 실행 조건·결과와 남은 검증은 [Step 1 완료 기록](../../../phases/admin-resume-pdf/step1.md)을 따른다.

| 사례 | 예상 결과 / 담당 |
| --- | --- |
| 정상 1/10페이지, 5 MiB 경계·5 MiB+1, 11페이지·21버전 | 허용 경계만 등록, 원본 hash 일치·초과는 무저장 / Step 1 |
| 위장 MIME·압축 body·chunked 초과·파일명 path·손상/암호화·간접/압축 active content·첨부·incremental history | 400/413/415/422, 경로/명령 실행 없음 / Step 1 |
| object/stream 폭탄·큰 이미지·timeout·네트워크/localhost/metadata IP/UDP probe | 한도 내 종료·외부 통신 실패·임시 파일 정리; 필터 없으면 503 / Step 1 |
| 같은 키 재전송/입력 변경·같은 hash 새 키·서버 응답 유실·검사 중 revision 변경 | 최초 receipt 재사용 / 409 / 409 / 같은 키 재확인 / 409 / Step 1 |
| DB·감사 commit 실패, 20번째 동시 업로드, 프로세스 재시작 | 원본/포인터/receipt 모두 원자적, 한도 초과 없음 / Step 1 |
| 익명/잘못된 Host/Origin/RSC·public host의 admin·private PNG 직접 URL | 공통 인증 행렬, 비공개 파일/보고서 무노출 / Steps 1–2 |
| A 등록→공개→B 등록→B 공개→해제→A 재검토 | B 등록까지 A 유지, 해제 후 새 요청 404 / Step 2 |
| 검토 hash 불일치·두 창 공개/해제·검토 중 파일/정책 오류 | 409/422/503, 기존 포인터 유지 / Step 2 |
| GET/HEAD·If-Match/If-None-Match·Range·옛 ETag와 교체/해제·DB 오류 | 현재 표와 동일; 304/206로 과거 파일 노출 없음 / Step 2 |
| 1440/390/320px·키보드·이미지 확대/페이지 이동·메모/오류·Resume no-JS | 공개/비공개 의미와 원문 검토 가능, 본문 회귀 없음 / Steps 1–3 |
| 공개 A backup→해제→restore, 새 epoch, 구 receipt 재전송·최대 보관량 복구 | A 자동 재공개 없음·동일 바이트/hash·명시적 재검토 후만 공개 / Step 3 |

Step 0 당시 완료 근거는 live code/schema/ingress와 이 계약의 대조, 공식 도구/HTTP 문서 확인, 문서·phase 파싱/링크/상태 검사였다. 이후 Step 1에서 parser 실행·합성 PDF 렌더·비공개 파일 등록을 검증했다. Step 2에서 검토한 버전의 공개/교체/해제와 current-only 다운로드를 합성 자료로 검증했다. Step 3에서 tmpfs 강제·오프라인 복구 reset과 최대 보관량의 실제 dump/restore·장애/rollback을 검증했다. [완료 기록](../../../phases/admin-resume-pdf/step3.md)을 따르며 운영 성능 검증과 실제 개인 PDF 공개는 아직 수행하지 않았다.
