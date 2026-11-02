# 관리자 모니터링 요약

`/admin/monitoring`은 기존 Prometheus 지표를 읽는 소유자 전용 화면이다. 수집기·원장·작업 정책을 새로 만들거나 변경하지 않는다. Proxy, page와 서버 loader가 기존 관리자 인증을 확인하며 HTML/RSC는 `private, no-store`다. 별도 JSON API나 공개 metrics proxy는 제공하지 않는다.

## 서버 연결

서버 환경에 `HLOG_ADMIN_PROMETHEUS_ORIGIN`을 설정한다. 미설정이면 미설정 안내를 표시하고, 연결·응답 오류는 정상이나 빈 원장으로 바꾸지 않는다.

- 같은 비공개 Compose 네트워크에서는 `http://prometheus:9090`을 사용한다. 앱을 해당 네트워크에 연결하는 운영 변경은 모니터링 Step 7/관리자 rollout 범위다. 이번 기능은 Compose나 운영 네트워크를 변경하지 않는다.
- 로컬 검수에서는 별도로 준비한 loopback 터널의 origin을 사용할 수 있다. `localhost`, `127.0.0.1`, `[::1]`만 지원한다. 운영 Prometheus에 공개 포트를 추가하지 않는다.
- HTTP origin만 허용하며 사용자 정보·경로·query·fragment가 포함된 주소는 거부한다. 이 변수는 `NEXT_PUBLIC_*`로 만들지 않는다. 임의 URL·PromQL·인증 정보를 브라우저에서 받지 않는다.
- 조회는 코드의 고정 지표 목록, 2초 query timeout, 전체 3초 요청 제한, 최대 128 KiB/512개 표본으로 제한한다. 리디렉션과 부분 경고 응답은 실패로 처리하고 원문 오류·주소·label을 화면에 전달하지 않는다.

Grafana 링크는 `http://127.0.0.1:3030/d/hlog-operations`다. **사용자 PC**에서 기존 로컬 스택 또는 해당 포트의 SSH 터널이 준비돼 있어야 하며 Grafana 소유자 계정으로 별도 로그인한다. 서버 내부 주소나 관리자 키를 링크에 넣지 않고 iframe·공유 dashboard·service token 전달도 사용하지 않는다. 링크가 있다는 사실은 Grafana 실행 상태를 입증하지 않는다.

## 표시 의미

- 서비스 응답과 원본 수집 상태를 구분한다. 최근 180초 이내의 표본만 사용하고 명시적인 stale series를 되살리지 않는다. 수집기 중단·source 오류·누락·오래된 수집 시각에는 과거 비용/성공 값을 현재 정상값으로 표시하지 않는다.
- 예정 스케줄 활성·비활성·정비는 기존 expectations다. 실제 timer/worker 생존 상태나 관리자 작성·발행 허용 정책과 동일하지 않다.
- 유효한 summary의 `last_success=0`만 **성공 이력 없음**이다. summary 자체가 없거나 손상됐으면 확인 불가다. 자동 발행 성공은 기존 required 6종/current version/hash proof이며 최근 시도 결과와 이전 성공 시각을 따로 보여준다.
- 비용은 UTC 일·월의 근거 있는 금액, 미확인 기록, 구독 포함 기록과 한도를 표시한다. 미확인 비용을 0으로 바꾸지 않는다. USD 추정 합계는 실제 청구액이 아니다.
- 새로고침은 사용자가 `다시 조회`로 실행한다. 기존 `AdminObservation`은 조회 3분 경과를 알릴 뿐 수집하거나 자동 새로고침하지 않는다. 시각은 KST, 조회 기준 시각은 기존 컴포넌트의 UTC 표기다.

## 로컬 검증

앱 디렉터리에서 실행한다. 실제 provider·운영 DB·발행 timer는 사용하지 않는다.

```powershell
node --no-warnings --experimental-strip-types --test lib/admin-monitoring.test.ts
$env:HLOG_OBSERVABILITY_RULES_TEST = '1'
npm run test:admin:monitoring:promql
```

별도 loopback 개발 서버를 기존 관리자 설정으로 실행한다. 임시 소유자 키는 저장소 밖에 두고 프로세스 환경으로 전달한다. 조회 연결은 격리 시험 bridge인 `http://127.0.0.1:19427`로 설정한다. 아래 명령은 기존 probe rehearsal에 실제 화면 대조를 추가하며 시험이 끝나면 bridge와 자신이 생성한 Docker 자원을 정리한다.

```powershell
# HLOG_ADMIN_ORIGIN / HLOG_ADMIN_OWNER_KEY는 개발 서버와 동일한 임시 값
$env:HLOG_ADMIN_MONITORING_HTTP_TEST = '1'
$env:HLOG_OBSERVABILITY_PROBES_SMOKE = '1'
$env:HLOG_OBSERVABILITY_PUBLISHING_SMOKE = '1'
npm run test:observability:probes
```

실제 collector/Prometheus에서 정상·첫 성공 없음·summary 손상·DB 오류·collector 중단을 확인하고 관리자 HTML/RSC와 대조한다. stale 시각은 bridge의 명시적인 timestamp fixture이며 실제 시계 변경이나 시간 경과 검증으로 기록하지 않는다. 실제 PromQL 회귀 테스트는 같은 labelset의 서로 다른 지표 이름, 180초 경계와 stale marker를 검사한다.

`HLOG_ADMIN_HTTP_TEST=1`로 `npm run test:admin:monitoring:http`를 실행하면 인증·잘못된 Host·HTML/RSC·캐시·공개 경로 비노출을 검사한다. 기본 기대 화면은 미설정이며 다른 상태에서는 `HLOG_MONITORING_EXPECT_TEXT`에 해당 화면 문구를 지정한다. 브라우저는 1440/390/320px, 키보드 새로고침/접기, JavaScript 없는 조회를 확인한다. 격리 원본/화면 검수 자료는 Git 제외 `private/admin-monitoring`에 둔다.

이 화면과 로컬 검수는 OCI·DNS/TLS·외부 알림·운영 네트워크·실제 provider·공개 발행·timer 활성화 승인이 아니다. 전체 관리자 릴리스 검수는 [A3 Step 3](../../phases/admin-operations-control/step3.md), 운영 적용은 [모니터링 Step 7](../../phases/operations-observability/step7.md)과 [A3 Step 4](../../phases/admin-operations-control/step4.md)를 따른다.
