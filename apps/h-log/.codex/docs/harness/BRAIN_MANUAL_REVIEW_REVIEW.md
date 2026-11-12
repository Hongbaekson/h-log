# 관리자 버전별 재검토 구현·검수

2026-11-12(KST), R5 Step 1 `owner-review-queue` 완료 기록이다. 기준 commit은 `7af180bb43f046441938aef84de7da2b57aefe5e`다. [Step 0 계약](KNOWLEDGE_CONTENT_IMPROVEMENT_PLAN.md#r5-manual-review-contract)과 [ADR-044](ADR.md#adr-044)를 기존 관리자·PostgreSQL 경로에 구현했다. 운영 DB와 실제 콘텐츠 발행은 이 검수의 대상이 아니다.

## 구현한 흐름

기존 `/admin/brain`의 ‘다시 확인할 기록’에서 질문·연결 없음·직접 지정·버전 변경과 상태를 골라 최대 20개씩 읽는다. native GET 필터·기록 링크·다음 페이지를 제공하며 JavaScript 없이도 조회할 수 있다. 기록 아래에서 현재 저장 버전을 확인 완료하거나 이유를 적어 재확인 대상으로 지정한다. 메모는 최대 500 UTF-16 code units이고 비공개다.

확인은 해당 원문 버전에만 적용한다. 새 버전을 저장하면 이전 확인을 승계하지 않고 다시 확인할 기록으로 돌아온다. 같은 내용 버전의 공개/철회는 확인 결과를 유지한다. 기록이 오래됐다는 이유만으로 잘못됐다고 분류하지 않는다. 확인은 공개 승인·외부 사실 검증이나 질문 해결을 뜻하지 않는다.

`brain_note_reviews`의 확인 이력, 기존 원문 버전, 감사·command revision을 같은 transaction으로 처리한다. UUID 재전송은 같은 receipt를 반환한다. 과거 확인 이력은 수정/삭제할 수 없고 새로운 명령으로 결과를 남긴다. 확인 명령은 원문·current_revision·updated_at·published_revision·public_node를 바꾸지 않는다. 공통 감사에는 고정 reason을 남기며 메모를 복제하지 않는다.

화면은 미저장 변경과 결과 미확인 명령이 있으면 확인 버튼을 잠근다. 응답 유실 때 기존 pending command로 재확인하고 입력을 자동 공개하지 않는다. 확인 이력은 최근 20개와 이전 이력 존재 여부를 표시한다. 정리일·사건일·확인 시각은 별개다.

## 변경 파일과 조회 경계

| 파일 | 역할 |
| --- | --- |
| [brain-review.ts](../../../lib/brain-review.ts), [brain-capture.ts](../../../lib/brain-capture.ts) | 입력·필터·버전별 상태와 owner 응답 타입 |
| [migration 013](../../../migrations/013_brain_note_reviews.sql) | append-only 확인 이력·버전 FK·UUID·기존 감사 action CHECK 확장 |
| [repository](../../../lib/brain-postgres-repository.ts), [HTTP](../../../lib/brain-capture-http.ts) | 기존 명령의 fingerprint 보존, 새 확인 명령, 서버 필터·id cursor·LIMIT 21로 20개 반환 |
| [관리자 페이지](../../../app/admin/brain/page.tsx), [목록](../../../components/brain/BrainReviewQueue.tsx), [편집기](../../../components/brain/BrainCapture.tsx), [스타일](../../../app/admin/brain/capture.css) | 이유/상태 조회·선택 기록 서버 렌더링·확인/메모·이력·쓰기 잠금 |
| [감사 label](../../../lib/blog-admin-operations.ts), [migration inventory](../../../scripts/blog-migrations.mjs) | 공통 조회의 한국어 표기와 백업 대상 inventory |
| [검증 실행 정의](../../../package.json) | `test:brain`에 실제 DB 확인 흐름 포함 |

queue는 read-only repeatable-read snapshot과 3초 statement timeout을 사용한다. 관계는 현재 draft의 유효한 incoming/outgoing을 검사하고 출처 URL을 그래프 관계로 세지 않는다. status/reason/after를 SQL에서 필터링한 뒤 페이지를 나눈다. 전체 count와 원문/질문 전문을 새 목록으로 보내지 않는다.

**기존 전체 기록 목록·원문 history 조회는 그대로이며 F6 후속이다.** 20개 반환을 전체 DB scan 비용의 절대 상한으로 주장하지 않는다. 별도 캐시·Redis·AI·스케줄러·서비스는 추가하지 않았다. 상태와 후보는 원본 버전과 확인 이력에서 다시 계산한다.

## 검증 결과

| 검증 | 결과 |
| --- | --- |
| focused RED | 기존 HTTP가 review를 400으로 거부하고 잘못된 queue query에서 storage에 접근하는 예상 실패 2건. 기존 production 화면은 재검토 목록 부재로 6/6 예상 실패 |
| `npm run test` | 300 pass / 29 DB opt-in skip / 0 fail, 총 329개 |
| 관련 격리 DB integration | 8/8, skip 없음. migration/legacy upgrade·Brain 기존 저장·공개·review·공통 감사·public read path |
| 실제 Brain HTTP | production/dev 각각 1/1. owner/Origin/no-store, 원문·미선택 사본·검토 메모의 HTML/RSC/sitemap 누출 차단 |
| 관리자 브라우저 | production/dev × 1440/390/320px × JS ON/OFF = 12/12. 이유 목록→기록→키보드 확인→새 버전→재확인 지정→유실 응답 재시도, reload/back, 가로 넘침 없음 |
| 공개 화면 회귀 | production/dev 각 3개 폭에서 Home 레이더와 Brain canvas 로딩·가로 넘침 검사 및 화면 확인. 공개 UI 소스 변경 없음 |
| dump/restore | 합성 확인 이력 20건·원문 24버전을 별도 DB로 복구한 뒤 전체 행 동등성 확인 |
| source lint / typecheck / build | 통과. 기본 lint는 기존 Git 제외 private helper의 10 errors/6 warnings로 실패. build는 기존 thumbnail tracing 경고 2건 |
| 문서·JSON·diff | Markdown/JSON 파싱, 추가 상대 링크·step 읽을 파일, 전체 phase 60개/209 steps·61 index, R13/1·F22 pending·다른 상태 보존, private Git/Docker 제외와 `git diff --check` 확인 |

DB 테스트는 같은 UUID의 동시 중복, 다른 입력의 UUID 충돌, save/review 경합, 과거 revision 거부, 구형 save fingerprint, 감사와 확인 행 저장 실패 각각의 전체 rollback을 확인했다. 공개/철회 뒤 같은 버전의 확인 유지, 확인 이력 UPDATE/DELETE 차단, 관계 기반 선정, 20+3개 cursor, 최근 이력 20개와 원본 보존도 검사했다. 새 migration은 기존 감사 enum을 유지하며 테이블을 추가하고 기존 원문/공개 사본을 바꾸지 않는다.

UI 검증 코드는 [brain-review.browser-check.mjs](../../../scripts/brain-review.browser-check.mjs), 실제 경로 검사는 [brain-capture.http.test.mjs](../../../scripts/brain-capture.http.test.mjs)다. 입력 검사는 [brain-review.test.ts](../../../lib/brain-review.test.ts)·[brain-capture-http.test.ts](../../../lib/brain-capture-http.test.ts), DB 검사는 [brain-review.integration.test.ts](../../../lib/brain-review.integration.test.ts)와 [migration integration](../../../scripts/blog-migrations.integration.test.mjs)에 둔다.

앱 디렉터리에서 실행한 주요 명령:

```bash
node --no-warnings --experimental-strip-types --test lib/brain-capture-http.test.ts
node --no-warnings --experimental-strip-types private/r5-queue-2026-11-12/run.mjs
npm run test
npm run lint
node node_modules/eslint/bin/eslint.js . --ignore-pattern 'private/**'
npm run typecheck
npm run build
node private/r5-queue-2026-11-12/validate.mjs
git diff --check
```

격리 runner는 tmpfs PostgreSQL·무작위 owner key·loopback 서버만 사용한다. 실제 명령은 migration/Brain/public-read-path/admin-operations integration 파일과 기존 HTTP script를 실행한다. production은 임시 로컬 TLS ingress, dev는 직접 loopback Next 서버로 검수했다. 개발 프록시의 JavaScript 초기화 정지와 sandbox의 loopback EACCES는 검증 환경 문제였으며 직접 개발 서버/허용된 로컬 검증 환경에서 통과했다. 운영 설정은 바꾸지 않았다. 모든 컨테이너·서버·임시 인증 파일은 정리했고 receipt·로그·스크린샷은 Git/Docker 제외 `private/r5-queue-2026-11-12/`에 보관한다.

## 인계

[R2 대장](CURRENT_CLAIMS_INVENTORY.md)에 R2-C01–C05의 현재 코드 대조와 ‘유지/추가 확인’을 기록했다. R4 태그 정규화로 바뀐 파일 hash를 예전 동일성 검증에 덮어쓰지 않았다. 회사 경력의 측정 조건·실제 운영/발행 상태는 여전히 미확인이며 공개 문구를 바꿀 새 근거를 만들지 않았다.

R completed 13/pending 1. 다음은 **R5 Step 2 `local-knowledge-release-rehearsal`**의 전체 연결·공개 경계 검수다. F 22개는 pending이며 기존 전체 관리자 목록/원문 이력 비용과 전체 관계 scan은 후속으로 남는다. 운영 migration 013·배포·실제 발행·provider·timer는 수행하지 않았다.
