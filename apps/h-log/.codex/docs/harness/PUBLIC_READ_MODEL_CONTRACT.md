# 원본·공개 선택·조회용 데이터 계약

2026-11-16 F3 Step 0 결정. 조사 기준은 `bf37dffaf3b1f61d7b96ea7e446f082e35e206be`다. 이 문서는 후속 구현의 계약이며, 아래 신규 표·설정·명령은 아직 구현하지 않았다. [성능 계획](PERFORMANCE_REBUILD_PLAN.md), [Markdown 검수](BLOG_MARKDOWN_READ_REVIEW.md), ADR-042를 잇는다.

## 1. 원본과 복구 권한

원본과 공개 승인은 기존 저장소가 소유한다. projector/rebuild는 입력을 읽고 허용된 파생 표만 생성·교체한다. 발행, 검수 승인, LLM 호출, embedding API, 알림이나 원본 정규화는 실행하지 않는다.

| 기준 데이터와 근거 | 반드시 보존할 필드/파일 | 재생성 가능한 결과 |
| --- | --- | --- |
| [Blog 원본](../../../migrations/001_blog_core.sql) | `posts`: id/slug, title/description, article_mode, status/current_version_id, 모든 날짜. `post_versions`: id/post_id/version_no, title/description, content_markdown/content_html/content_hash, 작성·출처 식별자/날짜 | `PublicBlogListItem`, 안전한 contentBlocks/목차, 공개 출처/검수 표시, 검색용 문자열 |
| [공개 검수](../../../migrations/005_blog_public_editorial.sql), [편집 명령](../../../migrations/008_blog_editorial_commands.sql) | `public_editorial`은 작성자가 고른 공개 검수 원본. `editorial_review`의 claims/evidencePaths와 `posts.command_revision`은 비공개 원본 | 검증된 공개 검수 DTO만 포함. 비공개 검수/경로는 payload·로그에 넣지 않음 |
| Blog 관계 | `post_tags`의 원래 tag, `post_sources`의 전체 출처 기록, `post_assets`의 post/version 연결·path/alt/status/hash/검증 날짜/생성자와 실제 bytes | 태그 별칭 정규화, 링크 투영, 자산 선택. 태그·출처는 글 단위이지 버전별 snapshot이 아님 |
| [Brain 저장](../../../migrations/004_brain_capture.sql), [명령](../../../migrations/006_brain_admin_commands.sql), [재검토](../../../migrations/013_brain_note_reviews.sql) | 불변 `brain_note_versions.draft`, current_revision, **published_revision와 검수된 public_node**, command_revision, 생성/수정 날짜, 불변 reviews·memo | 검수된 사본에서 만든 요약/reader DTO·검색 문자열·관계/좌표. 비공개 draft에서 공개 사본을 다시 만들지 않음 |
| [Brain 카탈로그](../../../lib/brain-catalog.ts), [시리즈](../../../lib/blog-series.ts), [프로젝트 연결](../../../lib/portfolio-posts.ts) | 버전 관리되는 명시 연결·순서·표시 데이터 | 현재 공개 대상만 연결한 결과. 실제 없던 연결/글을 채우지 않음 |
| [PDF](../../../migrations/007_resume_pdf_storage.sql) | bytes/sha256/byte_size/page_count, inspection/validation_policy/tool_versions/note, state의 revision·공개 version/hash·publication_epoch·reviewed_at/by/checklist | 검수 도구·입력 hash에 묶인 비공개 미리보기/표시 요약만 재생성. 원본 PDF와 공개 승인은 재생성 대상 아님 |
| 작업·감사 | publish_jobs/lease/idempotency, admin_actions/command receipt, 발행 검증·사용량·자동화 정책/초안 요청 기록 | 조회 집계는 가능하나 기록 자체를 삭제·재발행·성공 처리하지 않음 |

기존 `content_hash`는 `h-log/post-version-content/v1`, 구분자, 저장 Markdown과 HTML bytes를 SHA-256에 넣는 [현재 함수](../../../lib/blog-content-model.ts)의 값이다. 제목·요약·태그·출처·검수·공개 상태는 포함하지 않는다. HTML을 현재 renderer로 다시 생성해 원본 hash를 맞추려 하지 않는다. 새 renderer 결과는 새 projection 버전으로 만들고 저장 HTML/hash를 보존한다. Markdown endpoint는 계속 원본 bytes를 반환한다.

Brain `public_node`를 지운 뒤 최신 draft로 복원하는 작업은 금지한다. 공개 사본이 유실되면 원본 백업 복구 또는 기존 명시 검수/공개 절차가 필요하다. PDF도 [기존 복구 계약](../../../lib/resume-pdf-repository.ts)의 `resetAfterRecovery`와 새 epoch·재승인을 유지한다. 파일이 없으면 AI로 대체 생성하거나 과거 공개 선택을 자동 복원하지 않는다.

## 2. 입력 식별과 무효화

`source_version`은 Blog의 선택한 version ID, Brain의 published revision이다. `metadata_revision`은 **새 파생 변경 표식**이며 기존 command_revision을 대체하거나 그 값에 의존하지 않는다. worker와 관계 변경은 command_revision을 항상 올리지 않기 때문이다. source version이 같더라도 표시 입력이 바뀌면 새 metadata revision을 쓴다.

| 식별자 | 포함할 입력 |
| --- | --- |
| `input_fingerprint` | 도메인/ID, 현재 공개 선택, source_version, 원본 content_hash 또는 public_node hash, 표시·privacy 검사에 사용하는 post/version 메타데이터, public_editorial, 원래 태그/출처/현재 자산의 필드와 순서, 해당 정적 정의 hash |
| `policy_fingerprint` | scanner 규칙 버전, parser/공개 허용 목록 버전, 실제 적용한 restrictedTerms의 category/value. 잘못된 환경 설정은 키 생성 전에 오류 |
| `version_manifest` | projection schema, renderer, heading ID, 태그 별칭/정렬, 검색 정규화/순위, source URL 검증, privacy 규칙, Brain parser/카탈로그 버전. 변경된 의존성의 버전을 반드시 갱신 |
| `payload_hash` | 허용된 출력 DTO의 canonical bytes. DB JSONB 표현 문자열을 그대로 hash하지 않음 |
| 집계/출력 key | source epoch + 읽기 snapshot의 global revision + version/policy fingerprint + 필요한 canonical origin + 출력 종류. 검색은 query/tag/page/pageSize와 검색 버전도 포함 |

canonical v1은 object key를 코드 포인트 순서로 정렬하고 배열 순서를 보존한다. DB 관계는 기존 reader와 같은 `id` 순서로 정렬한 뒤 배열로 넣는다. 누락 가능한 필드는 schema에서 명시한 null로 채우고 날짜는 UTC ISO, bytes는 저장 hash로 식별한다. 원문 문자열을 trim/NFC/재렌더하지 않는다. locale 정렬과 검색 정규화는 현재 결과를 보존하며 별도 버전으로 관리한다. UTF-8 JSON 앞에 `h-log/public-read-input/v1\0` 영역 구분자를 붙여 SHA-256을 계산한다. hash만 출력하고 비공개 정책 목록과 원문은 로그에 남기지 않는다.

Blog 검색용 자료는 [기존 scoreKeywordMatch](../../../lib/blog-search.ts)의 post/version 제목·요약, Markdown, 원래 태그, 정규화 태그를 포함한다. 기본 keyword/vector 혼합 비율·동률 slug 순서·태그 필터/개수는 유지한다. 현재 queryCache는 vectorScores만 재사용하고 매번 공개 store를 다시 읽는다. F4에서 전체 검색 결과를 캐시한다면 새 공개 revision key와 현재성 검증을 반드시 적용한다.

공개 결정은 hash나 TTL에서 추론하지 않는다. hit라도 같은 DB snapshot의 원본 status/현재 버전 또는 published revision과 일치해야 한다. 자산은 metadata hash만으로 파일 존재·bytes를 보장할 수 없으므로 F6 검증 캐시 계약 전에는 현재 파일 검증을 유지한다. 파일 손상 때 현재처럼 해당 썸네일을 제외하고 원본을 수정하지 않는다.

## 3. 최소 저장 구조와 단계 경계

동일 PostgreSQL에 다음 네 표를 둔다. `kind`는 `blog | brain` 두 값으로 제한한다. PDF/이미지 bytes 저장소나 범용 작업 큐를 추가하지 않는다. 아래 이름·의미·unique key는 계약이며 실제 SQL 타입/check/index는 Step 1 migration과 검수에서 확정한다.

| 예정 표 | 필수 필드·제약 | 역할 |
| --- | --- | --- |
| `public_read_state` | 단일 id=1, `source_epoch` UUID, `source_revision` bigint, `active_generation` nullable, `writer_protocol` | 변경 순서와 활성 generation. epoch를 바꾸면 이전 모든 표식/결과를 무효화 |
| `public_read_sources` | PK(kind, source_id), `metadata_revision`, `deleted` | 같은 transaction의 durable 변경 표식. 같은 대상은 최신 revision으로 합침. 삭제 tombstone도 유지하며 원본 FK cascade로 제거하지 않음 |
| `public_read_generations` | id, source_epoch, status, version_manifest/policy_fingerprint, base_revision, checked_revision, scan_cursor, catchup_revision, run_token, counts, manifest_hash, 마지막 오류 코드/날짜 | 생성·검증·재개·활성화 상태. 활성본과 후보본을 분리 |
| `public_read_entries` | PK(generation_id, kind, source_id), source_version, metadata_revision, input_fingerprint, content_hash(nullable), result=`ready` 또는 `excluded`, payload/payload_hash | 한 원본의 계산 결과. excluded는 비공개/정책 차단의 명시적 결과이며 출력 DTO가 아님. 제외된 원문은 저장하지 않음 |

Blog payload는 목록 필드, 안전한 본문 블록/목차, 공개 출처·검수 DTO, 검색 정규화 문자열이다. 본문 Markdown/HTML을 별도 원본처럼 복제하지 않는다. Brain payload는 기존 public_node에서 검증한 공개 DTO이며 비공개 draft/history/memo를 읽어 채우지 않는다. 내부 Blog 출처의 현재 제목/href와 역방향 연결은 같은 읽기 snapshot의 공개 Blog 집합으로 최종 투영한다. 오래된 label을 저장된 공개 사실로 재사용하지 않는다.

Step 1은 저장소·결정적 projector·격리 rebuild만 구현하고 기존 public reader를 연결하지 않는다. Step 2는 모든 쓰기 경로의 표식과 snapshot 경계를 연결하고 검증한다. Step 3/4/5가 각각 목록·상세·crawler를 전환한다. F4 검색, F5 배치/전송량, F6 자산 검증/변형은 해당 단계에 남긴다.

설정 계약은 `HLOG_PUBLIC_READ_MODEL=source | shadow | projected`, 기본값 source다. source는 기존 읽기를 유지한다. shadow는 동일 snapshot에서 비교만 하고 응답에는 원본 경로를 사용한다. projected는 지원 schema/writer_protocol과 검증된 generation이 있을 때만 선택한다. Step 1만 완료한 상태에서 shadow/projected로 운영 전환하지 않는다. 설정 자체도 아직 구현하지 않았다.

## 4. 변경 표식과 실제 쓰기 경로

공개 입력에 영향을 주는 쓰기 transaction은 `public_read_state` 행을 먼저 잠그고 revision을 올린 뒤 원본·표식·기존 감사/명령 receipt를 함께 commit한다. revision은 sequence가 아니라 잠긴 행의 counter이므로 rollback과 함께 취소되며 commit 순서를 따른다. 같은 원본이 여러 번 바뀌면 sources에 마지막 revision을 남긴다. 비싼 parser/파일 IO/provider 호출은 이 잠금 밖에서 실행한다.

기존 policy/audit/job/post 잠금보다 state 잠금을 먼저 얻도록 진입점을 통일해야 한다. worker completion과 관리자 retry의 기존 잠금 순서/nowait 보호는 유지해 회귀를 검수한다. 여러 transaction에 걸친 함수에 사후 표식만 넣는 방식은 허용하지 않는다. 표식 쓰기 실패 시 원본도 rollback하고 실패를 반환한다. 보조 표 유실을 복구하는 동안 원본 변경 성공을 가장하지 않는다.

| 현재 쓰기 경로 | 연결할 지점과 검증 |
| --- | --- |
| [savePost/saveBlogAggregate/retractPost](../../../lib/blog-postgres-repository.ts) | aggregate, 현재 버전, tags/sources/assets, status 변경을 같은 caller transaction에서 표식. 관계만 바뀌어도 무효화 |
| [관리자 편집](../../../lib/blog-editorial-actions.ts) | save의 새 비공개 버전은 기존 공개 선택을 유지. publish의 새 current_version과 숨김, retract, command receipt와 표식을 원자적으로 기록 |
| [초안 요청](../../../lib/blog-draft-requests.ts), [자동 생성 저장](../../../lib/blog-automation-runner.ts) | saveBlogAggregate의 caller가 state 잠금을 policy/원본 잠금 전에 획득. 중지 뒤 생성 결과는 계속 비공개이며 projection 작업이 발행을 재개하지 않음 |
| [worker 완료/실패](../../../lib/blog-persistent-worker.ts) | render/privacy 성공 뒤 published 전이와 required 실패 뒤 숨김을 양쪽 모두 연결. 현재 version/status 조건과 lease_owner 비교를 유지. 오래된 worker 결과는 원본과 projection 모두 적용하지 않음 |
| [관리자 retry](../../../lib/blog-job-retry.ts) | 실제 post 상태가 달라질 때 표식. command 재전송·retry limit·policy·lease 제한을 우회하지 않음 |
| [Brain 저장/공개/철회](../../../lib/brain-postgres-repository.ts) | 선택된 public_node/published_revision 변화와 표식 원자화. private save/review는 공개 승인으로 해석하지 않음. review memo는 projection 밖에 둠 |
| 파일/정적 정의/정책 변경 | 파일 bytes는 F6 전까지 요청 때 확인. 정적 정의·정책은 version/policy fingerprint를 바꿔 새 candidate 생성. 다른 정책의 오래된 결과로 fallback하지 않음 |
| 관리 복구·스크립트·이전 앱 | raw SQL/복원도 정상 쓰기와 같은 표식을 쓰거나 모든 projected reader/writer를 중지한 뒤 epoch를 회전하고 full rebuild. 로컬 dry-run의 삭제도 격리 자료에 한정 |

현재 확인한 자동 실패 숨김은 worker 상태 전이이며, 별도 원본 버전 rollback API가 있다고 가정하지 않는다. 향후 rollback이 이전 version을 다시 선택해도 **새 metadata revision**으로 기록해야 한다. 같은 version ID의 과거 projection을 검증 없이 활성화하지 않는다.

## 5. 한 읽기 snapshot과 공개 최신성

복합 읽기는 한 PoolClient에서 `BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY`로 state·원본 공개 선택·표식·projection을 읽는다. 단일 SQL로 모두 조회할 수 있으면 그 statement snapshot을 사용한다. 서로 다른 pool.query 결과를 요청 cache로 묶는 것만으로 snapshot을 보장하지 않는다. PostgreSQL의 기본 Read Committed는 연속 SELECT 사이에 다른 commit을 볼 수 있다. [공식 격리 수준 설명](https://www.postgresql.org/docs/16/transaction-iso.html)

이 snapshot 이후 발생한 철회가 이미 시작한 응답을 소급 취소하지는 않는다. 철회 commit 이후 시작한 **새 서버 읽기**에는 철회가 반영되어야 한다. 한 응답 안의 목록·개수·태그·페이지 정규화·이웃/시리즈·Brain 출처 링크는 같은 공개 집합을 사용한다. metadata/page/RSC의 반복 사용도 같은 읽기 결과를 공유한다. 별도 HTTP 요청끼리 같은 revision일 것을 보장하지 않는다.

entry 재사용 조건은 epoch, generation의 지원 버전/정책, 원본의 현재 공개 선택, source_version, sources.metadata_revision, payload 형식/hash 일치다. 새 입력이 필요한 항목만 제한된 원본 재계산을 한다. 한 항목이 누락/손상됐다고 목록에서 조용히 빼거나 검색 개수를 줄이지 않는다. 제외 결과도 최신 source/정책에서 검증한 경우에만 사용한다. 공통 집계가 준비되지 않으면 제한된 전체 동등 결과 또는 오류 중 하나를 반환한다.

| 표면 | 현재 상태와 후속 계약 |
| --- | --- |
| Blog/Home/Portfolio HTML·RSC·metadata | 현재 request-time 읽기. 전환 시 같은 snapshot의 제목·canonical·목록·개수. 새 응답은 private/no-store로 유지·검수하고 공유 CDN에 저장하지 않음 |
| 상세 permalink·이전/다음·관련/시리즈 | 대상과 이웃 모두 현재 공개 집합. 대상 404는 기존 의미 유지. 이웃/집계가 실패하면 과거 링크를 대신 노출하지 않음 |
| Markdown rewrite/직접 URL | F2의 slug 전용 원본 bytes/hash와 성공·404 private/no-store 유지. projection 누락 때문에 원문을 다시 렌더하지 않음 |
| 검색 API·태그 개수 | 유효한 결과 집합 전체의 같은 revision에서 점수·정렬·필터·페이지·total을 계산. guard의 400/429 유지, 새 조회 실패는 기존 500. raw query/사용자 ID를 공개 측정 로그에 저장하지 않음 |
| feed/llms/llms-full/sitemap | 현재 feed/llms는 public max-age=300, sitemap은 Brain DB 활성 시에만 no-store. F3 Step 5에서 공개 revision·origin·출력 종류 key와 **private/no-store**로 전환해 새 요청이 오래된 shared HTTP cache를 우회하게 함. 지금 수정된 것으로 표시하지 않음 |
| Brain 목록/reader·Blog 출처 | public_node 선택과 카탈로그 + 현재 Blog 공개 집합. [기존 연결 실패 처리](../../../lib/brain-blog-sources.ts)의 일반 label/`sourcesUnavailable`은 유지하고 과거 제목/URL로 대체하지 않음 |
| PDF/이미지 | PDF의 기존 epoch/review/hash/no-store·비공개 미리보기 인증 유지. 이미지 immutable URL/검증/variant 정책은 F6. 원본 파일 경로나 bytes를 이 generic HTTP 캐시로 대신 승인하지 않음 |

열린 브라우저 탭의 Router Cache나 이미 받은 사본은 강제 회수하지 않는다. HTTP no-store가 이를 지우는 기능은 아니다. 후속 UI 검수는 직접 새 요청/새로고침과 client history를 분리해 기록한다. 사전 캐시 300초와 CDN purge가 필요한 운영 전환은 실제 배포 검수에서 다루며 이 문서는 운영 변경을 승인하지 않는다.

## 6. 제한된 fallback과 장애 표

projected 모드의 초기 계산 상한은 대상별 원본 입력 1MiB/결과 2MiB, 요청당 누락 계산 10항목·입력 합계 8MiB, 프로세스별 동시 계산 2개다. batch는 기본 25/최대 100항목·입력 합계 8MiB이며 CLI 계산 동시성은 기본 1/최대 2다. 크기는 UTF-8 bytes로 계산하고 자르지 않는다. 이는 새 공개 글 등록 제한이 아니라 **파생 계산의 초기 예산**이다. 기존 자료가 초과하면 전환 검수를 실패시키고 source 모드를 유지하며 근거 없이 상한을 올리지 않는다.

행 수와 `octet_length`를 같은 snapshot에서 먼저 확인해 초과 본문을 클라이언트로 모두 전송한 뒤 거절하지 않는다. 입력 batch는 합계 bytes 한도에서 끊고 결과 크기도 저장 전에 검증한다. 읽기 transaction은 read-only이며 repair 저장은 이를 끝낸 뒤 별도 쓰기 transaction에서 예상 epoch/revision/token을 다시 비교한다. 저장 충돌이 발생해도 이미 계산한 응답에 다른 snapshot의 일부 필드를 섞지 않는다.

SQL statement는 요청 경로 2초, rebuild batch 5초, lock 대기 250ms로 시작한다. 요청 계산은 2초, CLI 실행은 기본 60초 후 다음 항목을 시작하지 않고 checkpoint를 남긴다. 동기 parser 한 항목의 CPU를 이 숫자에 맞춰 강제 중단했다고 주장하지 않는다. input 상한·항목 사이 deadline·실제 peak memory/시간을 함께 검수하고 필요 시 F7에서 격리를 보완한다.

동일 입력의 요청은 `(epoch, kind, id, metadata_revision, manifest, policy_fingerprint)` 키로 합친다. 프로세스 내 대기표는 최대 64개, 항목별 재확인은 1회다. 여러 인스턴스의 실제 재생성은 PG advisory lock을 얻은 하나만 수행하며 나머지는 250ms 안에서 결과를 한 번 다시 읽거나 오류로 종료한다. 잠금은 현재 공개 여부의 근거가 아니며 획득에 사용한 connection을 명시적으로 해제한다. [PG 잠금 설명](https://www.postgresql.org/docs/16/explicit-locking.html)

| 상태 | 읽기/쓰기 동작 | 복구 |
| --- | --- | --- |
| 원본이 비공개/없음/철회 | 상세·Markdown 404, 집계에서는 제외. 과거 payload 사용 금지 | 공개 승인 없이 rebuild로 되살리지 않음 |
| entry 누락·payload 손상·입력 revision 불일치 | 같은 현재 snapshot에서 상한 내 원본 계산. 늦은 저장은 CAS로 거절. 상한 초과면 기존 표면의 500/지역 오류 UI | 단건 repair 또는 명시 rebuild |
| privacy 차단 | 최신 정책으로 excluded, 원문/제목을 반환하지 않음 | 정책에 맞는 새 검수/수정. 캐시 실패로 취급해 과거 결과를 쓰지 않음 |
| 원본 content hash 오류·원본 DB 장애·잘못된 정책 설정 | 기존 오류 계약(일반 Blog/Markdown 500, PDF 저장소 503 등). 빈 200/404·과거 cache로 위장하지 않음 | 원본/설정 복구. rebuild는 원본을 고치지 않음 |
| generation 없음·entries 유실 | 원본 fallback 예산 안에서만 응답. 큰 집계는 오류 | 지원 schema의 파생 표만 재생성, 새 generation 검증 후 활성화 |
| sources/state 유실·manifest/schema 불일치 | 기존 entry의 현재성 확인 불가. projected hit 금지. 표식 필요한 쓰기는 실패/rollback | writes와 projected reader를 중지, schema 복구·epoch 회전·full rebuild. 새 epoch 전에 구 결과 사용 금지 |
| migration 미적용 | source 모드는 새 표를 요구하지 않음. shadow/projected 시작 검사는 실패하고 자동 DDL을 실행하지 않음 | Step 1 migration, Step 2 writer와 해당 reader 단계 검수 후 설정 전환 |
| 잠금/시간/용량/DB 권한 오류 | cache miss로 덮지 않고 구분된 내부 오류. 사용자 응답에는 원문 SQL/식별자 미노출 | operator가 원인 해결 후 checkpoint에서 명시 재개 |
| 파일 손상·유실 | 원본 bytes/hash와 기존 fail-closed 규칙. PDF는 공개 불가, 썸네일은 기존처럼 제외 | 파일/백업 복구; 공개 승인을 새로 추정하지 않음 |

파생 표의 모든 오류를 catch해서 전체 DB를 무제한 읽는 fallback은 금지한다. 필수 공개 집합을 완성할 수 없으면 실패한다. optional Home 최근 글/Brain 출처 등의 기존 지역 오류 경계는 유지한다.

## 7. rebuild·중단·재개·활성화

```mermaid
flowchart LR
  S[원본과 공개 선택] --> B[후보 generation 생성]
  B --> V[현재 입력과 출력 검증]
  V -->|revision 변경| C[변경 표식 재계산]
  C --> V
  V -->|revision 일치| A[활성 포인터 교체]
  A --> R[현재 공개 선택과 함께 읽기]
```

상태는 `building → validating → active → retired`, 중단은 `paused`, 복구 불가 입력 오류는 `failed`다. 부분 후보를 읽기 경로에 노출하지 않는다. 재개는 같은 epoch·manifest·정책의 paused/building candidate만 지원한다.

활성 포인터는 Blog와 Brain이 공유하므로 `--kind blog` 또는 `brain`은 재계산 범위만 좁힌다. 나머지 kind는 같은 epoch·manifest·정책의 활성본에서 복사한 뒤 변경 표식을 따라 갱신하고 **두 kind 전체를 검증**해야 활성화할 수 있다. 호환 활성본이 없으면 `--kind all`로 다시 시작하도록 종료한다. 한 kind만 든 generation으로 다른 kind의 결과를 없애지 않는다.

1. **start**: 로컬 소유 확인 DB와 kind를 명시하고 별도 실행 잠금을 얻는다. generation ID/run_token을 새로 발급하고 source epoch, revision R0, manifest를 고정한다. SQL snapshot을 배치 전체 시간 동안 붙잡지 않는다.
2. **scan**: `(kind, source_id)` keyset cursor로 각 batch snapshot의 원본을 읽는다. ready/excluded 결과와 cursor를 같은 transaction으로 기록한다. commit 이후 cursor를 전진시키므로 중단 시 마지막 batch를 안전하게 반복한다. 원문·발행 상태·감사는 쓰지 않는다.
3. **catch-up**: sources에서 R0 이후 변경된 대상을 읽어 후보에 재반영한다. cursor보다 앞에 추가된 ID와 tombstone도 포함한다. coalesced 표식은 최종 상태를 재계산하는 용도이며 감사 이력을 대체하지 않는다. watermark는 본 batch의 고정 revision까지만 전진한다.
4. **validate**: 하나의 repeatable-read snapshot에서 모든 원본 ID/공개 선택/metadata revision과 후보 집합을 비교한다. excluded를 포함한 건수·ID/fingerprint manifest, payload hash/schema와 공개 금지 sentinel, 기존 DTO·검색·정렬·원문 bytes 동등성을 검사한다. 표식 누락·원본 변조도 검출한다. 검증된 revision Rv와 manifest hash를 저장한다.
5. **activate**: 짧은 새 transaction에서 state를 잠그고 epoch/현재 revision=Rv, 현재 코드·정책 manifest, generation 상태/run_token을 재확인한다. 일치할 때만 active_generation을 바꾸고 이전 것을 retired로 둔다. 다르면 catch-up/validate로 되돌아간다. 검증 밖에서 원본이 바뀐 후보를 성공 처리하지 않는다.
6. **resume/repair**: 중복 실행은 busy로 끝낸다. 재개 시 새 run_token을 기록하고 모든 batch/단건 결과 저장과 활성화가 token·epoch·입력 revision을 비교하게 한다. 연결을 잃은 이전 실행이나 늦은 worker는 새 candidate/현재 선택을 덮지 못한다. 활성 entry의 단건 repair도 같은 조건을 사용하고 전체 검증 revision을 임의로 올리지 않는다.

최초 명령 인터페이스는 `rebuild --kind blog|brain|all [--batch-size N] [--concurrency N] [--max-seconds N]`, `resume --generation ID`, `verify --generation ID`, `activate --generation ID`, `repair --kind K --id ID`, `reset-derived --confirm-owned-local`로 정한다. 파일명과 CLI parser는 Step 1 산출물이며 **지금 실행할 명령이 아니다**. 임의 SQL·shell·외부 URL을 받지 않는다. cursor는 서버 checkpoint에서 읽고 임의 offset으로 검증을 건너뛰지 않는다. 출력은 재개용 generation ID, 건수/진행률/hash/오류 코드로 제한하고 원본 글·메모 ID나 내용을 노출하지 않는다. 증거 파일은 비공개 경로에 둔다.

같은 입력·manifest의 재실행은 같은 payload/hash로 수렴한다. 생성 run ID/시간은 출력 hash에 넣지 않는다. 활성·building generation은 삭제하지 않으며, 명시 cleanup은 참조 없는 retired/failed 데이터만 대상으로 한다. 처음에는 활성본과 직전 검증본을 보존하며 저장량은 Step 1에서 측정한다.

## 8. 이전 앱·정책·복원과 단계 전환

신규 schema는 additive다. 이전 앱이 모르는 표를 지우는 down migration이나 원본 변환을 rollback 수단으로 사용하지 않는다. 이전 앱으로 돌아가기 전에 **모든 projected reader와 신규 writer를 정지/배출**하고 source 모드의 이전 앱을 기동한다. 구 writer와 projected reader의 혼합 운용은 지원하지 않는다. 그동안의 변경을 추정해서 기존 generation을 다시 쓰지 말고 재업그레이드 때 writer 연결 확인·epoch 회전·full rebuild·shadow 비교를 거친다.

정책/renderer 변경은 새 manifest의 candidate를 만든다. 다른 정책의 active 결과는 재사용하지 않는다. 새 정책으로 원본 fallback이 한도를 넘으면 projected 모드 전환을 보류한다. 이미 운영 중인 정책 변경에서도 오래된 정책의 결과를 잠시 공개하는 grace period를 두지 않는다.

DB 백업 복구 후 파생 표가 같이 돌아와도 그 generation을 자동 신뢰하지 않는다. 원본 bytes/hash·공개 선택·감사 복원 검증 뒤 epoch를 회전한다. PDF는 기존 복구 절차대로 공개 해제/새 승인·epoch를 별도로 요구한다. Blog/Brain 공개 상태를 rebuild가 새로 승인하지 않는다.

## 9. 후속 인수 검증

| 구현 단계 | 반드시 실행할 검증 |
| --- | --- |
| Step 1 저장/rebuild | 10/1,000글과 Brain 공개 사본의 결정적 출력, metadata만 변경해 hash 무효화, empty/중간 batch/commit 직후 강제 종료·resume, duplicate/run_token, 원본 bytes/선택/감사 전후 비교, 파생 row/표 유실·schema 미적용 구분, caps/메모리/실제 시간 |
| Step 2 쓰기/현재성 | 위 쓰기 경로별 commit/rollback/retry, 새 draft와 기존 공개 선택, published→실패 숨김/철회, relation만 변경, 늦은 worker/구 version, catch-up cursor 앞 삽입, activation 직전 commit, 정책 변경, DB 연결 유실/잠금 순서 |
| Step 3 목록 | 같은 snapshot의 목록·태그 수·pagination·metadata·Home 3개, 누락 entry를 빼지 않는 fallback/오류, query/태그 noindex와 canonical 유지 |
| Step 4 상세 | permalink/HTML/RSC/Markdown·이웃·관련·시리즈·Brain 출처가 같은 공개 선택, bytes/hash·소제목 ID/복사/키보드와 JS OFF 유지 |
| Step 5 crawler | origin/출력별 key, feed/llms/sitemap 철회 후 동일 URL 새 요청·HTTP 캐시, 준비 중 candidate 비노출, 큰 llms-full의 상한/출력 보존 |
| F4/F5/F6/F7 | 검색 점수·개수·한글/영문/별칭, 그래프 layout 입력/알고리즘 버전, PDF/image 검증·파일 유실, pool/timeout와 cold 복구. 기존 승인된 UI를 비교 기준으로 유지 |

문서와 계획을 확정한 상태이며 위 runtime 검증을 통과했다는 뜻이 아니다. 이번 Step 0은 Markdown/JSON 파싱, 상대 링크·실제 입력 경로·phase 의존성, schema 필드 대조, `git diff --check`로 검수한다. 이전 부하의 종료 139는 두 후속 실행에서 재현되지 않았지만 원인은 미확정이며 F7 관측 검수에 남긴다. 운영 DB migration·배포·공개 발행·외부 API는 수행하지 않는다.
