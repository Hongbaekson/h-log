# Second Brain 기준 노드와 기록 후보 검수

2026-11-10(KST), [R2 Step 2](../../../phases/evidence-content-curation/step2.md)를 완료했다. 기준 commit은 `5f7daf7e85a76b4b46c4f355fee05b4d550db5d7`이다. [근거 대장](CURRENT_CLAIMS_INVENTORY.md)과 [H-Log 원고 검수](EVIDENCE_CASE_MANUSCRIPT_REVIEW.md)를 사용해 기존 기준 노드 3개와 관련 관계 13개를 점검하고, 새 기록 후보 3개·연결 후보 6개를 준비했다.

이번 산출물은 **비공개 검토본**이다. 원고의 내용을 실제 경험이나 공개 노드로 자동 승격하지 않는다. 전체 후보·근거·본인 확인 질문·사실 보완본/문체 교정본과 검증 결과는 Git/Docker 제외 `private/r2-brain-drafts-2026-11-10/`에 보관했다. DB 저장·공개 명령은 실행하지 않았다.

## 기존 기준 노드의 읽기 순서

| 순서 | 기준 노드 | 본문과 기존 연결에서 확인한 역할 | 이번 인계 |
| --- | --- | --- | --- |
| 1 | `operable-backend` — 운영하기 쉬운 백엔드를 만들고 싶다 | 기능 이후의 변경·실패 복구를 함께 본다는 공개 소개 기준. 근거 `profile` | H-Log의 대기/오류 범위를 구체적인 사례로 연결할 후보 준비 |
| 2 | `repeatable-work` — 반복되는 일은 기준으로 남긴다 | 명세·규칙·검증을 재사용한다는 기준. 기존 `supports`가 운영 노드를 향함 | 별도 화면에서도 같은 공개 판정을 쓰는 이유와 연결 |
| 3 | `observe-before-optimize` — 개선의 출발점은 관찰이다 | 응답·대기·운영자 확인 시간을 구분하는 기준. 기존 `supports`가 운영 노드를 향함 | 표시 수와 조회·가공량을 구분하는 메모로 연결 |

세 노드의 본문과 출처, 이들을 출발점 또는 도착점으로 삼는 기존 13개 관계의 방향·이유를 대조했다. 출처는 기존 Resume/Portfolio의 일반화된 기록이며 이번에 회사 자료나 측정 원본을 추가 확인한 것은 아니다. 관계 이유는 기술적 관점의 연결로 읽고 새 성과의 증거로 쓰지 않는다. 원래 `recordedAt`과 본문/관계는 보존했다. [정적 카탈로그](../../../lib/brain-catalog.ts), [Resume](../../../app/resume/page.tsx), [Portfolio](../../../lib/projects.ts).

위 순서는 편집한 읽기 순서다. 세 노드 사이에 새 edge를 만들었다는 뜻이 아니다. R2 Step 0에서 보조 읽기로 제안한 `verification-is-not-a-label`은 이번 복구 질문의 연결 대상으로 활용한다. 기본 세 노드는 Step 2 범위인 운영·반복 작업·관찰에 맞춘다.

## 기록 후보 세 개

| 로컬 후보 ID·제목 | 종류 / 근거 / 주제 | Blog와 다른 초점 | 연결된 원고 claim |
| --- | --- | --- | --- |
| `hlog-home-wait-boundary` — 홈에서 기다릴 부분을 작게 나누기 | `solution` / `implementation` / `boundaries` | 화면의 대기·실패 범위와 공개 판정 재사용을 다음에 확인할 기준으로 남김 | `home-boundary`, `empty-error-retry`, `choice` |
| `hlog-visible-count-read-cost` — 목록 개수보다 먼저 읽는 양을 본다 | `learning` / `implementation` / `data` | 표시 개수와 실제 조회/가공량을 구분하고 변경 전후 공개 결과도 비교할 질문 | `read-cost`, `latest-unit-run`, `cost-followup` |
| `hlog-rebuildable-read-model-question` — 보조 데이터가 없어져도 다시 만들 수 있을까 | `question` / `question` / `data` | 본문 외에 제목·태그·선택 버전·공개 범위가 복구 기준에 포함되는지, 동시 수정·철회를 어떻게 확인할지 질문 | `limits`, `cost-followup` |

후보마다 공개용 요약·짧은 본문·질문 2개·출처 2개·연결 2개와 별도의 비공개 작성 맥락을 준비했다. 첫 두 기록은 코드를 읽은 구현 메모이며 개인의 당시 동기·기여·장애 감정을 확정하지 않는다. 마지막 기록은 [원본/보조 데이터 계획](PERFORMANCE_REBUILD_PLAN.md)에서 나온 질문이다. 구현·유실 사고·복구 검증을 마쳤다는 문장은 넣지 않았다.

Blog는 선택·재현·검증의 순서를 설명하고, 이번 Brain 후보는 다른 문제에도 다시 써 볼 기준과 미확인 질문을 남긴다. 원고 본문과 같은 긴 문장을 복제하지 않았는지 검사하고 의미도 수동 대조했다. 사실 내용을 확정한 뒤 기존 `espada:humanize-korean` 지침으로 산문 2곳을 다듬었으며 숫자·식별자·출처·분류·질문과 연결은 보존했다.

첫 두 후보는 실제 존재하는 `/portfolio/h-log-public-reading`과 제목만 있는 검수 출처를 사용한다. 마지막 후보는 계획과 작성자가 제시한 원칙을 제목으로 남긴다. 원자료 경로·비공개 원고 URL은 공개 출처에 넣지 않는다. `/blog/home-recent-posts`는 아직 후보의 출처 href로 넣지 않았으며, [R3 Step 0](../../../phases/public-knowledge-connections/step0.md)에서 공개 판정 계약과 실제 대상 상태를 확인한 뒤 연결한다.

## 연결의 방향과 이유

방향은 기존 `BrainDraft.links` 계약대로 **새 후보 → 대상 기록**이다. 연결 이유는 두 기록 사이의 관계만 설명한다.

| 출발 후보 | 도착 기록 | 관계 | 연결 이유 |
| --- | --- | --- | --- |
| `hlog-home-wait-boundary` | `operable-backend` | `supports` | 조회 실패 범위를 좁히고 다시 요청할 경로를 둔 사례로 운영 기준을 구체화 |
| `hlog-home-wait-boundary` | `repeatable-work` | `applies` | 새 화면에서도 기존 공개 판정을 재사용한 사례 |
| `hlog-visible-count-read-cost` | `observe-before-optimize` | `applies` | 표시 수와 실제 조회·가공 범위를 나눠 어떤 단계의 비용인지 확인 |
| `hlog-visible-count-read-cost` | `hlog-home-wait-boundary` | `extends` | 화면 대기 분리에서 데이터 조회·가공 비용의 질문으로 확장 |
| `hlog-rebuildable-read-model-question` | `hlog-visible-count-read-cost` | `questions` | 비용을 줄일 별도 데이터의 유실·재생성·공개 기준을 함께 확인할 필요를 질문 |
| `hlog-rebuildable-read-model-question` | `verification-is-not-a-label` | `extends` | 준비 상태와 검증 결과를 구분하는 기준을 복구 조건으로 확장 |

대상 존재·자기 연결·중복·방향·이유를 검사했다. `revises`는 0개다. 후속 검토일이 더 늦다는 사실만으로 개인의 생각이 바뀌었다고 판단하지 않는다. 나중에 실제 변화가 확인되면 기존 회고 기능으로 새 메모를 만들고 이전 기록을 가리킨다. [BrainCapture](../../../components/brain/BrainCapture.tsx), [관계/날짜 계약](../../../lib/brain-capture.ts), [ADR-023](ADR.md).

## 날짜·기존 이력·저장 인계

- `preparedOn=2026-11-10`은 로컬 후보 준비일이다. 메모리 미리보기의 정리일도 이 값으로 검수했지만 실제 DB의 정리일로 등록하지 않았다. 실제 관리자 신규 저장 때는 서버 `created_at`이 정리일을 정한다.
- 사건일은 세 후보 모두 `occurredOn=""`, `shareOccurredOn=false`다. 기존 테스트나 성능 관찰 날짜를 개인 사건일로 복사하지 않는다. 감정도 작성하지 않았다.
- 본인에게 확인할 당시 맥락·판단 변화·실제 복구 경험은 별도 private 질문으로 남겼다. 확인 전에도 구현 메모/질문 후보의 검수는 가능하다.
- 후보 ID는 로컬 별칭이다. 실제 [repository](../../../lib/brain-postgres-repository.ts)의 신규 저장은 `note-UUID`를 발급하므로 첫 후보를 저장한 뒤 반환 ID를 두 번째 후보의 연결에, 두 번째 반환 ID를 세 번째 연결에 사용해야 한다. 모든 후보 별칭을 실제 API ID처럼 제출하지 않는다.
- 기존 관리자 입력과 저장/미리보기/명시 공개 흐름을 사용한다. 별도 import API·bulk 저장 기능은 추가하지 않았다. 공개 여부는 저장과 구분하며, 직접 저장할 때 대상이 여전히 있는지와 현재 revision을 확인한다.

기존 28개 노드/42개 관계 파일과 R2 Step 1 원고·manifest·근거 파일을 hash로 대조했다. DB를 조회하거나 쓰지 않아 실제 저장된 원문 이력을 바꾸지 않았다. 공개로 보이는 현재 DB 전체 노드 수를 28개라고 단정하지 않으며 이 수는 정적 카탈로그에 한정한다.

## 검증 결과

앱 디렉터리에서 실행했다. 문서·비공개 후보 단계이므로 앱 build·UI 검수나 DB/HTTP 테스트를 새로 실행하지 않는다.

```powershell
node --no-warnings --experimental-strip-types --test lib/brain.test.ts lib/brain-curation.test.ts lib/brain-suggestions.test.ts
python private/r2-brain-drafts-2026-11-10/prepare.py
node --no-warnings --experimental-strip-types private/r2-brain-drafts-2026-11-10/verify.mjs
node private/r2-brain-drafts-2026-11-10/validate-docs.mjs
git diff --check
```

| 검증 | 결과 |
| --- | --- |
| 기존 Brain·curation·suggestion 단위 | **9/9 통과**, 실패·skip 0 |
| 후보 형식/근거 | 3개 모두 기존 parser·public projection 통과. 원고 claim ID 존재, 출처 6개/질문 6개와 Portfolio 대상 확인 |
| 개인정보·원문 | 기본 공개 privacy 검사 통과. 원문·사건일 미포함, 내부 경로·새 회사 자료 없음. 운영 조직명 정책은 별도 발행 검수 대상 |
| 비공개 제외 | 후보를 private로 둔 메모리 catalog는 기존 **28개/42개**와 동일 |
| 메모리 미리보기 | 사본 3개를 가정한 결과 **31개/48개**, 실제 저장/공개 결과가 아님 |
| 철회·연결 | 후보 3개의 공개 부분집합 8조합에서 양쪽 공개인 edge만 남음. 후보 별칭→실제 ID 형식 매핑 후에도 6개 연결 일치 |
| 기존 후보 제안 | 제목·태그 기반 함수 호출 뒤 원본·카탈로그 불변. 직접 쓴 연결 이유를 추천 결과로 자동 교체하지 않음 |
| 보존·문체 | 근거 파일 19개 hash, 기존 원고/hash·카탈로그·protected span 보존, Blog의 긴 문장 복제 없음 |
| 문서 | Markdown/JSON·상대 링크·읽을 경로·phase 상태·다른 트랙 보존·private 제외·diff 검수 |

실제 DB 저장·공개 명령·브라우저·외부 문서 재조회와 AI 호출은 실행하지 않았다. 메모리의 공개/철회 검증을 DB transaction·HTTP 검증으로 표현하지 않는다. 후보 준비가 끝났다는 기록이며 운영 콘텐츠 등록 완료가 아니다.

## 다음 단계

**R2의 3개 step 완료**, R 트랙은 **completed 6·pending 8**이다. 다음은 **R3 Step 0 `published-source-connections`**로 현재 공개 글만 Brain 출처에 연결하는 동작을 구현한다. 세 후보와 원고는 검수 자료로 사용하며 실제 공개 여부와 분리한다. F 트랙 22개 step과 SEO/관리자/모니터링의 기존 운영 조건은 그대로다.
