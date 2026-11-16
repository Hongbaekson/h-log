# 원본 변경과 조회용 데이터의 현재성 검수

2026-11-17 F3 Step 2 `transactional-projection-freshness`. 기준 commit은 `a792447efc0d447925a92e1c49031794a25a2b52`다. [확정 계약](PUBLIC_READ_MODEL_CONTRACT.md)의 writer 원자성, 요청 snapshot, 변경분 재계산과 짧은 활성화 비교를 구현했다. 공개 화면은 기존 원본 조회를 사용한다. 운영 migration·배포·콘텐츠 발행·provider 호출은 실행하지 않았다.

## 구현과 쓰기 경계

[Migration 015](../../../migrations/015_public_read_freshness.sql)는 writer_protocol을 1로 올리고 새 epoch와 원본 ID별 초기 표식을 만든다. 원본 필드·과거 버전·공개 선택·감사·PDF bytes/승인은 변경하지 않는다. posts, post_versions, post_tags, post_sources, post_assets, brain_notes의 statement/row trigger가 원본 DML과 같은 transaction에 표식을 기록한다. relation-only 수정, 부모 이동, cascade 삭제와 tombstone, TRUNCATE도 포함한다. rollback은 counter·표식·원본·감사를 함께 취소한다.

| 쓰기 경로 | 연결과 확인 |
| --- | --- |
| Blog save/retract, 관리자 편집, Brain 명령, 관리자 retry | transaction 시작 직후 `public_read_lock()`을 얻고 audit/policy/post/job 잠금으로 진행. UUID receipt와 기존 conflict 조건 유지 |
| 초안 결과 저장 | staged 결과를 aggregate·완료 감사와 저장하기 전에 state 잠금. 저장 실패 시 provider를 재호출하지 않는 기존 복구 유지 |
| 자동 생성 저장·worker claim | `withAutomationPolicy` 진입에서 state→policy 순서. provider/adapter 호출은 transaction 밖 |
| worker 성공·실패 | state를 job/policy 잠금보다 먼저 획득. 현재 version/status와 lease_owner 조건을 유지해 늦은 응답이 철회를 덮지 못함 |
| Brain private save/review | public_node/published_revision이 같으면 공개 metadata revision을 올리지 않음. 새 draft를 공개 사본으로 추정하지 않음 |
| 직접 DML·격리 dry-run 삭제 | statement trigger가 state 잠금, row trigger가 표식을 보장. 동일 행의 no-op은 revision 유지 |

counter는 sequence가 아닌 잠긴 singleton 행이다. 같은 원본의 여러 변경은 마지막 표식으로 합치며 revision의 빈 번호는 허용한다. 기존 selected version의 필드 변경은 무효화하고, 선택되지 않은 post_version 삽입/수정은 공개 입력으로 쓰지 않는다. Blog private 편집이 posts.updated_at/command_revision을 바꾸면 현재 fingerprint 입력이 달라지므로 표식도 갱신한다.

직접 SQL이 먼저 다른 행 잠금을 얻거나 DDL/TRUNCATE의 relation 잠금을 얻으면 trigger만으로 이전 잠금 순서를 되돌릴 수 없다. 동시 운영용 관리 transaction은 **state 잠금을 먼저 명시적으로 얻거나 writer를 정지**해야 한다. 이번 migration과 파생 reset은 writer가 정지된 전환 작업이다. 구 앱과 신규 writer의 혼합 운용을 지원한다고 해석하지 않는다.

## 읽기·재생성·복구

- [공개 snapshot](../../../lib/public-read-transaction.ts)은 같은 PoolClient의 repeatable-read/read-only transaction이다. 기존 Blog 목록/slug의 posts·selected version·tags/sources/assets 조회를 이 경계로 묶었다. 조회 도중 철회·태그 수정이 커밋되면 진행 중 snapshot은 이전의 일관된 결과를, 새 조회는 철회 결과를 본다.
- `findCurrentProjection`은 같은 snapshot에서 active epoch/manifest/policy, 원본 공개 선택, entry와 표식 revision, payload hash를 확인한다. 불일치는 miss다. 아직 공개 route에 연결하지 않았으며 타입별 payload 파싱·fallback 예산과 Blog/Brain 복합 집합 공유는 Steps 3–5에서 연결한다. 기존 Brain 공개 사본 조회는 단일 SQL이다.
- [재생성](../../../lib/public-read-rebuild.ts)은 batch snapshot으로 계산하고 변경 표식의 고정 revision까지 catch-up한다. 커서 앞의 새 ID와 삭제도 처리하며, 부분 kind 실행은 나머지 kind의 현재 표식과 일치하는 항목만 복사한다.
- 최종 전체 비교는 원본 SHARE lock 없이 read-only snapshot에서 수행한다. 이후 짧은 새 transaction에서 state를 잠그고 epoch/revision/run_token을 재확인한다. revision이 변하면 다시 catch-up/비교한다. 지속 변경은 기존 deadline에서 checkpoint를 남기고 멈춘다.
- 단건 repair도 계산 snapshot을 종료한 뒤 예상 epoch/metadata revision을 다시 비교한다. 늦은 결과는 `stale_source`로 거절하며 전체 검증 없이 checked_revision을 올리지 않는다. advisory lock과 run_token fencing은 유지한다.
- state/sources 유실로 필요한 표식을 기록할 수 없으면 해당 원본 변경도 rollback한다. 명시적 로컬 reset은 파생 네 표와 014/015만 다시 적용하고 epoch를 바꾼다. 기존 원본·승인은 복구 과정에서 수정하지 않는다.

요청 SQL 2초, batch SQL 5초, 잠금 250ms, 입력 1MiB/결과 2MiB, batch 8MiB·기본 25/최대 100, CLI 기본 60초의 기존 상한을 유지한다. parser 한 항목의 CPU를 강제로 중단하는 기능은 없다. `HLOG_PUBLIC_READ_MODEL` 설정, 공개 projection 전환, 요청 fallback/중복 계산 제한, crawler 캐시 정책은 아직 미구현이다.

## 검증

| 검증 | 결과 |
| --- | --- |
| RED | protocol 0≠1. 공개 조회 도중 태그가 `second`에서 `snapshot-race`로 섞이는 실제 DB 실패 재현 |
| projector·CLI | 6/6 통과 |
| 새 현재성 DB 회귀 | 7/7 통과: rollback/표식 장애, commit 순서, Brain 재전송/private draft, 원본 snapshot, catch-up/CAS, 늦은 repair, 관계/삭제/TRUNCATE/부분 재생성 |
| 기존 재생성 DB 회귀 | 8/8 통과: 원본·검수·감사·PDF 보존, 손상/유실·정책/epoch·SIGKILL 재개·run token·상한·1,000건 |
| 전체 `test:integration` | 33/33 통과: migration·repository·공개 경로·worker·dry-run·Brain·PDF·편집·초안·자동화·운영·retry·관측 |
| Markdown 실제 DB | 10/1,000글 모두 데이터 SELECT 5회·6행·현재 본문 1행. transaction 제어문은 데이터 조회 수에 포함하지 않음. 원문 bytes 보존, 3/3 통과 |
| `npm run test` | 305 pass / DB opt-in 29 skip / 실패 0 |
| source lint·typecheck | 통과 |
| `npm run lint` | 기존 Git 제외 private helper의 오류 10개·경고 27개로 실패. 무관한 파일 미수정 |
| `npm run build` | 재실행 통과. 최초 실행은 기존 Next.js 버전 보안 권고로 종료 1; 의존성 변경 없이 권고를 기록하고 동일 명령 재실행 성공 |
| 문서·JSON·링크·phase·diff | 파서·추가 링크/읽을 파일·60 phases/209 steps·F 6/16·R 14·`git diff --check` 검증 |

편집 통합 테스트에서 `pool.end()` 직후 `DROP DATABASE ... WITH (FORCE)`가 아직 종료 중인 idle socket을 강제 종료하는 경쟁을 재현했다. pg-pool의 종료 코드를 확인하고 이 테스트가 생성한 DB를 일반 DROP으로 정리하도록 바꿨으며 단독·전체 통합 실행이 통과했다. 추가 관계 테스트의 중복 tag fixture도 고쳐 동일 회귀가 통과했다.

측정은 [성능 기록](public-read-freshness-performance-2026-11-17.json)을 따른다. 로컬 Windows/Node·격리 PostgreSQL 16/pgvector의 합성 글 1,000개, 비공개 2개, 버전 각 2개와 공개 Brain 1개에 대한 1회 측정이다. fixture 생성과 원본 보존 검증을 포함한 test process RSS이며 운영 p95나 요청 지연 개선 수치가 아니다. F1의 rebuild 60초 기준과 batch 8MiB 기준을 비교한다.

원본/SQL/비공개 정책 값 없는 공개 수치만 문서에 남기고 실행 로그는 Git/Docker 제외 `private/f3-freshness-2026-11-17/`에 보관한다. 실험 DB는 이번에 만든 컨테이너의 소유 label을 확인해 정리한다.

## 인계

F3 Step 2 완료 후 **F completed 6·pending 16**, R 14 completed다. 다음은 [F3 Step 3 projected-blog-list](../../../phases/rebuildable-public-read-models/step3.md). 새 snapshot client를 원본 공개 집합·표식·projection에 함께 전달하고, 목록/개수/태그의 동일 집합·fallback 상한·현재 파일 검증을 연결해야 한다. 운영 적용은 writer 정지→015 migration→신규 writer→full rebuild/shadow 검수 순서의 별도 승인 대상이며 이번 로컬 검수는 그 승인이 아니다.
