# 조회용 저장소와 로컬 재생성 검수

2026-11-17 현재 구현은 [F3 Step 2 현재성 검수](PUBLIC_READ_FRESHNESS_REVIEW.md)를 따른다. Migration 015/protocol 1, writer 표식과 Blog snapshot, catch-up·짧은 CAS/repair 비교가 구현됐다. 아래 protocol 0·원본 SHARE lock 설명은 Step 1 당시 이력이며 현재 실행 방식이 아니다. 공개 projection/설정 전환은 후속 단계다.

2026-11-16 F3 Step 1 `projection-storage-and-rebuild`. 기준 commit은 `271ffb0f7fa6bc0050ac70992acd8daca3e447a3`다. [원본·조회용 데이터 계약](PUBLIC_READ_MODEL_CONTRACT.md)의 저장소와 격리 재생성 부분을 구현했다. 공개 reader와 기존 writer는 연결하지 않았고 운영 DB migration·배포·콘텐츠 발행은 수행하지 않았다.

## 구현과 범위

| 파일 | 역할 |
| --- | --- |
| [migration 014](../../../migrations/014_public_read_models.sql) | state/sources/generations/entries 네 표, FK·hash/크기/result 제약, source revision index. 원본 표 변경 없음 |
| [결정적 변환](../../../lib/public-read-model.ts) | canonical 입력/정책/manifest/payload hash, Blog 목록·안전한 본문 블록·목차·검색 문자열, Brain 검수 사본·링크·검색 문자열 |
| [원본 조회](../../../lib/public-read-source.ts) | kind/ID keyset, 본문 전송 전 크기 확인, 현재 선택과 정렬된 관계만 읽기. 기존 repository mapping과 썸네일 파일 검증 재사용 |
| [재생성](../../../lib/public-read-rebuild.ts) | 배치 checkpoint, 실행 잠금/token, 검증·활성 포인터 교체, 명시 repair/reset, 원본 변경 시 후보 재검수 |
| [CLI](../../../scripts/public-read-rebuild.mjs) | 명령/수치/loopback URL·DB 이름/소유 marker 검증, 중단 신호, 원문 없는 진행률·오류 출력 |

추가 의존성이나 서비스는 없다. 목록/본문·태그/검색·Brain 함수와 개인정보 검사를 재사용한다. 기존 `blog-postgres-repository.ts`에 row mapping 조합 함수만 공개했으며 기존 reader/writer 호출은 바꾸지 않았다. 날짜는 PostgreSQL JSONB의 세션 timezone 표현을 UTC ISO로 정규화해 기존 `pg` Date 기반 DTO와 일치시킨다. 저장 Markdown/HTML/hash와 비공개 이력은 수정하지 않는다.

payload는 원문 Markdown/HTML의 별도 사본을 저장하지 않는다. Blog의 원문은 hash로 식별하고 공개 블록과 정규화 검색 텍스트만 파생시킨다. 비공개/정책 차단은 payload 없는 excluded로 기록한다. Brain은 published_revision/public_node만 사용하고 private draft를 읽어 공개 사본을 만들지 않는다. 링크의 최종 공개 대상 join과 파일 재검증은 후속 reader에서도 필요하다.

## 현재성의 단계 경계

현재 `writer_protocol=0`이다. sources의 초기 metadata_revision은 0이며 기존 writer가 source_revision을 올리거나 tombstone을 기록하지 않는다. `active`는 **격리 DB의 검증 완료 후보**를 뜻하며 운영 공개 읽기에 쓸 수 있다는 뜻이 아니다. `HLOG_PUBLIC_READ_MODEL` 설정도 아직 구현하지 않았다.

Step 1은 변경 표식이 없는 기존 writer를 안전하게 다루기 위해 최종 검증과 활성화를 한 repeatable-read transaction에서 수행한다. 이때 원본 여섯 표에 SHARE 잠금을 얻어 변경을 막고 state/generation을 잠근 뒤 현재 원본 전체의 ID·선택·입력/출력 hash를 다시 비교한다. 값·집합이 다르면 후보를 활성화하지 않고 재개할 전체 scan을 준비한다. 검증 중 원본 쓰기가 대기할 수 있어 이 방식은 소유 확인 로컬 DB로 제한했다.

F3 Step 2는 모든 writer의 원자적 변경 표식, 삭제 tombstone, 변경 revision catch-up, 짧은 state 잠금/CAS와 읽기 snapshot을 연결한다. 현재의 전체 비교·원본 표 잠금이 운영용 변경 추적을 구현한 것으로 표시하지 않는다. Steps 3–5의 reader/HTTP 캐시 전환도 미완료다.

`--kind blog`/`brain`은 호환 활성본의 다른 kind 결과를 복사한 뒤 두 kind 전체를 검증한다. 호환 활성본이 없으면 all rebuild를 요구한다. 만료·정책/manifest·epoch 불일치, 불완전 scan, 누락/손상 행, 늦은 run_token은 과거 결과의 활성화 근거가 될 수 없다.

## 제한과 복구

- 항목별 입력 1 MiB, payload 2 MiB, batch 기본 25/최대 100개·입력 합계 8 MiB. 초과 본문을 전송하거나 자르지 않고 오류로 종료한다.
- CLI 실행 시간 기본 60초/최대 3,600초, SQL statement 5초·lock 대기 250ms. deadline/중단은 항목 사이에 검사하고 checkpoint를 남긴다. 동기 parser 한 항목의 CPU를 강제 중단하는 기능은 아니다.
- `--concurrency`는 1–2의 상한만 받는다. 현재 runner는 단일 connection에서 한 항목씩 처리한다. 별도 worker pool은 만들지 않았다.
- advisory lock으로 실행을 하나로 제한한다. connection 종료 시 잠금을 놓고, 정상 종료도 전용 connection을 폐기한다. 재개는 새 run_token을 발급하며 늦은 실행은 결과를 덮지 못한다.
- payload 누락/손상은 `repair` 또는 rebuild. state/sources/entries 표 유실은 명시 `reset-derived`로 네 파생 표만 재생성하고 새 epoch에서 all rebuild한다. migration 미적용은 별도 오류이며 자동 적용하지 않는다.
- reset은 고정된 네 표만 대상으로 하고 CASCADE를 사용하지 않는다. 원본·PDF 승인·Brain 검수 사본·감사는 그대로 보존한다. 모든 generation을 지우므로 소유 확인 격리 DB에서만 실행한다.
- 오류는 원문/SQL/DB URL을 출력하지 않는다. 생성된 generation UUID는 재개를 위해 출력한다. 원본 글·메모 ID와 정책 목록은 출력하지 않는다.
- 활성본과 과거 후보는 자동 삭제하지 않는다. 이번 격리 실험의 entries 표+index+TOAST 저장량은 약 2.5 MiB였다. 운영 retention은 후속 전환에서 정하며 현재 CLI를 운영 정리 도구로 사용하지 않는다.

## 로컬 실행

새로 만든 폐기 가능한 DB만 사용한다. URL은 `127.0.0.1`, DB 이름은 `hlog_projection_*`여야 하며 query/hash로 접속 대상을 바꿀 수 없다. 소유 확인 marker는 해당 DB의 comment `hlog-public-read-local-v1`이다. 기존 운영 DB에 marker를 붙여 제한을 우회하지 않는다. 테스트는 매번 고유 DB를 생성·표시하고 자신이 만든 DB만 삭제한다.

작업 디렉터리는 `apps/h-log`이며, `DATABASE_URL`과 기존 개인정보 정책 환경값은 실행 환경에 설정한다. 아래 SQL은 **직접 생성한 격리 DB에만** 적용한다.

```sql
comment on database hlog_projection_local is 'hlog-public-read-local-v1';
```

```bash
npm run db:migrate
npm run projection:local -- rebuild --kind all --confirm-owned-local --progress
npm run projection:local -- resume --generation "$GENERATION" --confirm-owned-local
npm run projection:local -- verify --generation "$GENERATION" --confirm-owned-local
npm run projection:local -- activate --generation "$GENERATION" --confirm-owned-local
npm run projection:local -- repair --kind blog --id "$POST_ID" --confirm-owned-local
npm run projection:local -- reset-derived --confirm-owned-local
```

rebuild/resume는 전체 검증 후 자동 활성화한다. activate는 complete scan 후보를 다시 검증할 때 사용한다. 마지막 committed cursor는 서버에 저장하므로 임의 offset을 받지 않는다. SIGINT/SIGTERM은 다음 항목 시작 전에 멈추며 강제 종료는 마지막 committed batch에서 재개한다.

## 검증 결과

| 검증 | 결과 |
| --- | --- |
| TDD RED | projector, rebuild, CLI 테스트를 각각 먼저 추가해 해당 미구현 module 실패 확인. 격리 DB 접근의 sandbox 제한은 허용 후 다시 실행해 기능 부재를 확인 |
| `npm run test:projection` | projector 4 + CLI 2 통과. 목록/블록/anchor/원본 불변, 메타데이터 hash, 비공개/정책/hash/용량, 명령·접속 제한·로그 비노출 |
| `HLOG_PROJECTION_TEST=1 npm run test:projection:db` | 8/8 통과. checkpoint/부분 활성화 금지/중복 실행, 다른 kind 보존, payload 손상·누락 repair, 메타데이터/정책/manifest/epoch 변경, stale token, 입력 상한, 파생 표/행 유실, 실제 CLI 강제 종료·재개, 1,000글 검증 |
| `npm run test:migrations` | 2/2 통과. 014 적용·재실행과 기존 이력/공개 사본·감사 보존 |
| `npm run test:repository` | 5/5 통과 |
| `npm run test:brain` | 3/3 통과 |
| `npm run test` | 305 pass, 29 DB opt-in skip, 실패 0. 별도 관련 DB suite는 위처럼 실행. 처음 sandbox 실행의 기존 HTTP 2건 실패는 loopback 허용 재실행에서 통과 |
| `npm run lint` | 기존 Git 제외 private helper의 10 errors/27 warnings로 실패. 해당 파일은 수정하지 않음 |
| `npx eslint . --ignore-pattern 'private/**'` | 소스 lint 통과 |
| `npm run typecheck`, `npm run build` | 통과 |
| 문서·JSON/YAML·경로/phase·`git diff --check` | 비공개 `verify-docs.mjs`로 검증 통과 |

통합 검수는 새 Docker PostgreSQL 16/pgvector, loopback, Node 22.14.0의 합성 fixture에서 실행했다. 10글과 1,000글, 비공개 글 2개, Brain 공개 사본 1개를 사용했고 글마다 선택하지 않은 비공개 버전도 저장했다. 비공개 검수 메모·감사, 합성 PDF bytes와 공개 승인/epoch도 채워 원본 표·모든 버전·관계와 함께 전후 hash로 비교했다. PDF fixture는 DB 보존 검수용이며 실제 PDF 처리/공개를 실행한 것은 아니다. 공개되지 않은 sentinel은 entries에 없고 기존 공개 목록 DTO와 일치했다. 새 CI 단계에도 CLI/격리 DB suite를 연결했다.

[최종 측정 기록](public-read-storage-performance-2026-11-16.json)의 1,000글+Brain 1개는 **8,787ms**, batch 입력 최대 **463,775 bytes**, test process RSS 관측 최대 **183,328,768 bytes**였다. [F1 예산](PERFORMANCE_BASELINE_REVIEW.md)의 rebuild 60초 목표를 충족한다. RSS에는 fixture와 원본 비교가 포함되며 순수 CLI 추가 사용량이 아니다. 소수 합성 실행의 측정으로 운영 p95/HTTP 개선을 주장하지 않는다. writer/reader 연결 후 부하·cold 복구는 F7에서 검증한다.

원본 로그/실험 자료는 Git/Docker 제외 `private/f3-storage-2026-11-16/`에 보관한다. 앱 route/UI, PDF 공개 승인, 운영 보류와 기존 종료 139의 원인 미확정 기록은 유지한다. 다음은 **F3 Step 2 `transactional-projection-freshness`**다.
