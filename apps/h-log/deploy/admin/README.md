# 관리자 릴리스 검수와 운영 인계

A3 Step 3의 로컬 검수 패키지다. `admin.nginx.conf.example`과 `compose.example.yaml`은 기본 Compose에 포함되지 않는다. 실제 OCI·DNS/TLS·운영 환경값과 migration 변경은 모니터링 Step 7 및 A3 Step 4의 별도 승인 범위다.

## 연결 예시

- 공개 Nginx는 기존 `/admin`·`/api/internal`·metrics 차단을 유지한다. 관리자 ingress는 `/` → `/admin`, `/admin` 하위, `/_next/static/`, `/favicon.ico`만 허용한다. 별도 공개 앱이나 관리 API 프록시를 만들지 않는다.
- 예시는 `https://admin.hlog.example.org:8443`을 사용한다. 실제 이름을 선택하면 `server_name`의 hostname, `$http_host` 검사/전달의 **port 포함 authority**, `HLOG_ADMIN_ORIGIN`을 함께 맞춘다. 받은 Host를 고정 Host로 바꾸기 전에 정확한 authority인지 검사한다. Forwarded 계열 입력은 제거하거나 덮어쓴다.
- Compose overlay는 관리자 TLS 포트를 **127.0.0.1:8443**에만 바인딩한다. 소유자 PC는 기존 SSH 공개키 터널과 정확한 이름 해석·인증서를 사용한다. 예를 들어 같은 localhost 포트로 터널을 열고 선택한 관리자 이름을 사용자 PC의 loopback으로 해석한다. 인증서 hostname 검증을 끄거나 인터넷에 Basic 로그인만 직접 열지 않는다.
- `HLOG_ADMIN_NGINX_CONFIG`는 검수한 config의 절대 경로, `HLOG_ADMIN_TLS_DIR`는 `admin.crt/admin.key`가 있는 비공개 디렉터리다. 인증서/키·env는 커밋하지 않는다. `HLOG_ADMIN_ENABLED=1`, 소유자 random hex 64자 키와 정확한 HTTPS origin은 기존 비공개 runtime env에 둔다.
- 공개 canonical/worker 검증 URL은 공개 origin이다. web upstream에는 공개 host port를 추가하지 않는다. 같은 app network의 정확한 Host/키를 가진 내부 요청은 proxy 경유 여부를 인증으로 구분할 수 없으므로 네트워크 접근도 제한한다.
- PDF 업로드 경로만 raw body 최대 5 MiB·30초, processor 응답 90초를 허용한다. 다른 관리 명령은 256 KiB/15초다. 앱의 더 작은 요청 제한은 그대로 적용한다. web의 UID 1001·32 MiB PDF tmpfs와 native 도구를 유지한다.
- 관리자 응답은 no-store/noindex/no-referrer다. Nginx에서 같은 upstream 보안 헤더를 숨기고 한 번만 설정한다. 공개 PDF의 cache/epoch 정책을 관리자 설정으로 덮어쓰지 않는다.

설정 확인만 할 때 앱 디렉터리에서 실행한다. 필요한 env 파일은 값이 출력되지 않도록 비공개로 준비한다.

```sh
docker compose -f compose.yaml -f deploy/admin/compose.example.yaml config --quiet
```

이 명령은 배포하지 않는다. 승인 뒤에도 정확한 image digest·schema·backup/restore 근거와 공개/관리 host 행렬을 먼저 대조한다. 모니터링의 별도 비공개 네트워크 연결은 [모니터링 안내](../observability/admin-monitoring.md)를 따른다.

## 격리 재현

Linux Docker와 이 저장소의 Node 의존성, 새 테스트용 `127.0.0.1` 인증서를 준비한다. 특정 인증서만 `NODE_EXTRA_CA_CERTS`로 신뢰한다. PostgreSQL/웹/공개/관리 port 55447/3046/3044/3045를 사용하며 기존 자원이 점유한 경우 먼저 종료하지 말고 별도 테스트 설정을 선택한다.

```sh
docker build --target runner -t hlog-web:admin-release .
# cert-dir에는 테스트용 admin.crt/admin.key만 둔다.
HLOG_ADMIN_RELEASE_TEST=1 HLOG_ADMIN_RELEASE_CERT_DIR=/absolute/cert-dir \
  NODE_EXTRA_CA_CERTS=/absolute/cert-dir/admin.crt npm run test:admin:release
```

`HLOG_ADMIN_PREVIOUS_IMAGE`는 로컬에 보관한 이전 앱 artifact다. 기본 검수 기준은 `hlog-web:observe-step6`이며 없는 이미지를 자동 pull하지 않는다. SHA와 이미지 ID를 결과에 기록한다. 검수용 임시 env·소유자 키는 새 임시 디렉터리에 생성하고, DB·web/ingress·네트워크는 실행별 이름으로 만든 뒤 finally에서 정리한다. DB는 재시작 검수에 필요한 일회용 익명 volume을 사용하며 컨테이너와 함께 삭제한다. 프로세스를 강제 종료했다면 해당 실행의 이름과 임시 env의 DB host를 대조해 소유 자원만 정리한다. 실제 provider 호출 없이 기존 fake writer 테스트를 사용한다.

검수는 전체 DB integration, 기존 auth/Brain/PDF/draft/editorial HTTP 테스트, 모든 명령의 Origin 및 ingress allowlist, 재시도·정책 OFF·새 worker 프로세스, 감사 실패 rollback, 실제 DB 재시작, 키 회전·관리자 OFF, 전체 DB dump/restore와 이전 artifact의 기능 OFF 복귀를 순서대로 실행한다. Git 제외 `private/admin-release`에 단계별 로그와 내용 대신 테이블 hash/행 수의 결과를 남긴다. `HLOG_ADMIN_RELEASE_BROWSER_SCRIPT`가 있으면 같은 격리 서버에서 브라우저 검사도 실행한다. CLI만 통과한 실행을 브라우저 검수까지 완료했다고 기록하지 않는다.

최대 PDF 용량·native sandbox·새 epoch·조건부 다운로드는 기존 `npm run test:resume:rehearsal`로 같은 이미지에서 별도로 검수한다. 이 명령은 3044–3046을 사용하므로 위 검사와 동시에 실행하지 않는다. 설정과 자원 예산은 [PDF 완료 기록](../../phases/admin-resume-pdf/step3.md)을 따른다.

## 키 교체와 차단 복구

1. 관리자 ingress를 닫고 모든 web 인스턴스의 `HLOG_ADMIN_ENABLED=0` 또는 새 키 설정을 준비한다. 같은 브라우저의 Basic 인증 캐시를 로그아웃 API로 지울 수 있다고 가정하지 않는다.
2. 기존 SSH 관리 경로에서 random 키를 교체하고 모든 web을 같은 설정으로 재생성한다. 키를 URL·CLI 인수·공개 로그에 넣지 않는다. 분실한 키는 기존 키를 복구하는 대신 폐기한다.
3. 새 키 200/옛 키 401, 잘못된 authority 404/직접 upstream Host 403, 익명 HTML/RSC/API 401, 공개 host의 관리자 404를 확인한다. 키 교체와 관리자 OFF만으로 공개 글/Brain/PDF를 철회하지 않는다.
4. 앱 문제가 있으면 관리자 ingress를 닫고 이전에 검증한 전체 image/env 세트로 돌아간다. 정책은 OFF, provider/발행/timer도 승인 전 OFF다. 새 schema를 drop/down migration하지 않는다. 이전 artifact와 현재 schema가 호환되지 않으면 임의 rollback하지 않고 차단 상태를 유지한다.

## 백업 복구

원본 DB/volume을 보존하고 별도 빈 DB에 `pg_restore --exit-on-error`한다. migration 목록과 글 버전/hash·Brain 원문/버전/공개 사본·PDF 바이트/검사 보고서·명령 receipt/정책/usage를 대조한다. 내용 원문을 검수 로그에 출력하지 않는다.

모든 PDF reader/writer를 닫고 기존 [PDF 공개 초기화 절차](../../.codex/docs/backup-restore-runbook.md)를 실행한다. 복구 뒤 새 publication epoch를 사용하고 과거 공개 명령으로 PDF가 다시 노출되지 않는지 확인한다. 실제 파일은 전 페이지 재검토 후 별도로 공개한다. 단순 DB/앱 재시작에는 기존 epoch를 유지한다. 자동화 정책과 진행 중 요청/lease도 대조하고, 결과가 불명확한 provider 호출을 자동 재실행하지 않는다.

로컬 통과 후에도 실제 운영 도메인·TLS·네트워크·자원량·외부 모니터링과 알림 전달은 미검증이다. 다음 운영 경계는 [모니터링 Step 7](../../phases/operations-observability/step7.md) → [A3 Step 4](../../phases/admin-operations-control/step4.md)이며 OCI 보류 해제와 범위별 승인을 기다린다.
