# H-Log 최근 글 원고 재현·근거 검수

검수일은 2026-11-09(KST)다. [R2 Step 1](../../../phases/evidence-content-curation/step1.md)에서 [근거 대장](CURRENT_CLAIMS_INVENTORY.md)의 R2-C01을 사용해 **「Next.js Suspense로 최근 글 조회와 홈 렌더링 분리하기」**를 재검수했다. [S2 Step 4 원고](SEO_CONTENT_LINK_REVIEW.md)의 후속 검토본이며 새 글로 편수를 늘리지 않는다. 원고는 로컬 비공개 후보로 준비했고 실제 발행은 하지 않았다.

코드 기준은 `31d9de5769c02a1b2a6d7b36d80dcf694f7fc356`다. 기존 원고·manifest와 자료 확인 시각을 보존하고 별도 사실 보완본·문체 교정본·claim 대장·editorial 후보를 만들었다. 원자료와 전체 원고는 Git/Docker 제외 `private/r2-manuscript-2026-11-09/`에 있으며 앱에서 읽지 않는다.

## 원고에 보완한 내용

| 항목 | 보완 | 근거·한계 |
| --- | --- | --- |
| 상황·선택 | 기존 공개 판정 재사용, 최근 글 대기/오류 분리와 세 가지 대안 비교 유지 | [Home](../../../app/page.tsx), [컴포넌트](../../../components/blog/HomeRecentPosts.tsx), [ADR-032](ADR.md). 대안 세 개를 실제 구현·측정했다는 주장 없음 |
| 검토 시점 | 과거 대안 분석과 44개 테스트를 가리키던 `이번`을 당시 날짜로 명확히 함 | 2026-10-21 기록을 오늘의 실행으로 바꾸지 않음 |
| 캐시 설명 | 목록 전용 SQL·요청 사이의 요약 캐시와 기존 React 요청 단위 재사용을 구분 | [loader](../../../lib/blog-public-source.ts)에 이미 있는 `cache`를 캐시가 전혀 없다는 표현으로 지우지 않음 |
| 재현 절차 | 기준 commit·Node/Next/React 버전, 앱 경로와 공개 읽기/개인정보 단위 명령, 47개 결과 추가 | 현재 실행은 DB·개발 서버가 필요 없는 메모리 기반 테스트. 스트리밍 전송·브라우저를 재현했다는 뜻은 아님 |
| 후속 성능 관찰 | 2026-11-06 합성 목록/본문 비용 관찰과 원본에서 재생성하는 보조 데이터 계획을 별도 후속 설명으로 추가 | [F1–F7 계획](PERFORMANCE_REBUILD_PLAN.md). 홈 대안 비교 실험·운영 개선율·재생성 구현 성과로 확대하지 않음 |
| 읽기 경로 | 기존 Portfolio·Blog 링크와 현재 공개 시리즈 연결 재사용 | 후보 slug `home-recent-posts` 유지. 실제 공개 상태는 운영 DB에서 확인하지 않음 |

새 사실 설명을 먼저 확정한 다음 `espada:humanize-korean`의 SKILL.md와 quick rules로 산문 2곳을 다듬었다. 제목·표·코드·inline code·URL·숫자·날짜를 교정 전후 byte 단위로 비교했다. 사실 보완과 문체 교정은 별도 diff로 남겼다. 새로운 감정·장애 경험·실패한 대안을 만들지 않았다.

## 주장 16개의 근거와 현재성

기존 사례 대장의 11개 ID를 보존하고 최신 검증·후속 관찰 등 5개를 추가했다. 코드 확인, 과거 로컬 실행, 이번 단위 실행, 공식 자료, 현재의 해석과 남은 계획을 분리한다. 출처 레지스트리는 기존 기록을 포함한 25개 항목이며 모두 별개의 독립 증거라는 뜻은 아니다.

| Claim ID | 확인한 내용 | 근거·현재성 |
| --- | --- | --- |
| `home-boundary` | 소개·프로젝트는 최근 글 Suspense 밖에 있음 | Home·컴포넌트의 현재 코드. 운영 배포 관측 없음 |
| `loading` | null fallback과 지원되는 대기 조건 | Home 코드와 React 공식 문서 재확인. 임의 비동기 요청 전체를 감지한다는 주장 없음 |
| `empty-error-retry` | 성공 0건 생략, 오류 안내, 전체 GET 재시도, 고정 로그 | 컴포넌트의 현재 catch 범위 확인. DB 오류 주입은 이번에 실행하지 않음 |
| `current-public` | 현재 공개 버전 선택과 비공개·철회·버전 누락 제외 | 현재 selector와 이번 단위 결과 |
| `date-fallback` | 기존 목록의 publishedAt 누락 시 updatedAt fallback | [목록 모델](../../../lib/blog-public.ts). 실제 발행일·검증일 추정에 사용하지 않음 |
| `read-cost` | 전체 공개 조회·본문 가공 뒤 slice | [repository](../../../lib/blog-postgres-repository.ts), loader·목록 모델과 React cache 설명. 3개 표시가 SQL 3행 제한은 아님 |
| `choice` | 공개 기준 재사용과 대기/오류 분리의 이유 | ADR-032의 기존 결정. 당시 동기를 새로 구성하지 않음 |
| `alternatives` | 세 가지 대안의 비교 | 2026-10-21 코드 검토에서 정리한 분석. 실제 세 대안 실행 결과 없음 |
| `current-tests` | 2026-10-21 공개 글 테스트 44개 | ID는 보존하고 근거 분류는 과거 실행 기록으로 표시. 오늘 결과와 분리 |
| `historical-tests` | 이전 35개 테스트·지연/재시도/모바일 검수 | [당시 단계](../../../phases/blog-discovery-and-home/step2.md)와 기존 원고. 당시 임시 원자료를 복원하거나 재실행하지 않음 |
| `limits` | 운영 지연·장애율·실제 배포 전송은 미측정 | 원고의 한계 유지. 이후 합성 비용 관찰과 아직 pending인 구현을 구분 |
| `no-js` | Home 직접 링크 제한과 Blog 경유 탐색 | S2의 기존 로컬 HTTP/브라우저 receipt. 이번 실행 결과로 날짜를 갱신하지 않음 |
| `latest-unit-run` | 공개 읽기/개인정보 47 pass, 0 fail, 0 skip | 이번 focused log와 package/lockfile. DB/HTTP/브라우저 통과로 확대하지 않음 |
| `source-refresh` | fallback/Effect·이벤트 핸들러 조건 재확인 | 공식 문서 표시 19.3, 로컬 React 19.2.7. 새 API는 원고에 도입하지 않음 |
| `cost-followup` | 합성 목록·본문 비용 관찰과 개선 계획 | 2026-11-06 CPU/runtime receipt와 F 계획. 새 측정·홈 실험·운영 성과 없음 |
| `reader-links` | 기존 프로젝트·목록·현재 공개 시리즈 연결 | [mapping](../../../lib/portfolio-posts.ts), [시리즈](../../../lib/blog-series.ts), 메모리 사본 검수. 원고의 실제 발행은 미확인 |

2026-11-09 공식 문서에서는 자식이 suspend할 때의 fallback, Effect·이벤트 핸들러 요청의 제외 조건과 요청별 cache 생명주기만 다시 확인했다. 문서의 현재 버전 표시와 로컬 실행 버전을 따로 적고 실험 기능을 적용한 것처럼 설명하지 않았다. [React Suspense](https://react.dev/reference/react/Suspense), [React cache](https://react.dev/reference/react/cache).

## 재현 조건과 이번 결과

Windows의 Node `24.22.1`, lockfile 및 설치된 Next.js `16.4.3`·React `19.2.7`을 대조했다. 앱 디렉터리에서 실행한 명령은 다음과 같다. 원고에는 독자가 실행할 수 있는 공개 단위 명령과 범위만 넣고 로컬 검수 helper 경로는 넣지 않았다.

```powershell
node --no-warnings --experimental-strip-types --test lib/blog-public.test.ts lib/blog-privacy-scanner.test.ts
python private/r2-manuscript-2026-11-09/prepare.py
node --no-warnings --experimental-strip-types private/r2-manuscript-2026-11-09/verify.mjs
node private/r2-manuscript-2026-11-09/validate-docs.mjs
git diff --check
```

| 검증 | 결과 |
| --- | --- |
| 공개 읽기·개인정보 단위 | **47/47 통과**, 실패·skip 0 |
| claim·출처 | 16개 claim의 출처 ID 모두 존재. 25개 출처 중 로컬 파일은 hash 대조, 외부 공식 문서는 2개 재확인. 의미와 적용 범위는 수동 검수 |
| 원고·문체 | 원본/이전 manifest 불변, 산문 2곳 외 protected span 동일, Markdown 파싱과 기본 privacy 검사 통과 |
| 본문·editorial | 기존 변환 함수로 Markdown/HTML/content hash 생성. 제안 editorial을 기존 parser와 공개 모델에서 그대로 확인 |
| 공개 경계 | 메모리의 drafted 후보는 공개 0건. 별도 메모리 사본에서 현재 제목·본문·목차·코드 2개·프로젝트/시리즈를 읽고 unpublished/retracted 시 제외 확인 |
| 원본 보존 | 기존 원고와 메모리 store의 내용 불변. Windows 원고 파일 hash와 LF로 정규화한 canonical content hash는 구분 |
| 문서·상태 | Markdown/JSON·상대 링크·읽을 경로·단계 수·다른 트랙 상태·Git/Docker 제외·diff 검사 |

검수 helper에서 HTTPS를 Windows 경로로 잘못 인식한 정규식과 CRLF/LF 동일성 가정을 기존 계약에 맞춰 고친 뒤 통과했다. 앱 결함이나 production 코드 수정으로 계산하지 않는다. 전체 lint/typecheck/build와 DB/HTTP/브라우저는 문서·비공개 원고 단계의 검증에 포함하지 않았다. 조직명 정책은 운영 환경에서 읽지 않았으며 실제 발행 때 별도 검수가 필요하다.

## 원고 버전과 공개 확인 정보

| 자료 | SHA-256 |
| --- | --- |
| 보존한 S2 원고 파일 | `40cb9b4991fdd9e1429907cb9b5a0cd97268bdbc92057d6f583e76dcb628dd0b` |
| 이번 교정 원고 파일 | `854a92facedd8e118ee04eef056580aa99d1292fee62f4baccd630f3daf6ffa5` |
| 이번 canonical content hash | `a34b4400301bbd8e80c4e211c0e18d5eba569c4e724b12947c38c57b684a578b` |

editorial은 **제안값**이다. `verification.method=local_test`, `checkedOn=2026-11-09`에 이번 단위 검증과 출처 대조만 적고 DB·HTTP·브라우저·운영 성능 미재실행을 한계로 둔다. 미발행 원고의 공개 수정 이력을 만들지 않도록 `revisions=[]`로 준비했다. 운영의 기존 editorial을 조회하거나 갱신하지 않았으며 확인일을 발행일로 사용하지 않는다.

최종 발행 전에는 실제 중복 글·slug, 최신 코드·공식 자료·claim/privacy와 공개할 검증 정보를 다시 확인하고 새 불변 버전으로 등록한다. 이번 검수 결과를 이후 변경본이나 자동 발행 입력의 freshness 승인으로 승계하지 않는다.

## 인계

**R2 Step 1 완료, 다음은 R2 Step 2 `principle-and-revisit-drafts`**다. 이 원고와 근거 대장을 바탕으로 기존 기준 노드의 읽기 순서와 H-Log 사례를 잇는 기록 2~3개를 검토한다. 사실로 확인한 구현과 아직 답하지 못한 질문을 구분하고 원고 본문을 그대로 복제하지 않는다.

R 트랙은 **completed 5·pending 9**, R2는 **2/3 완료**다. F 22개 step은 pending이며 이번의 후속 관찰 정리가 F1 재현 기준선 구현을 대신하지 않는다.

## R2 Step 2 후속 — 2026-11-10

[기준 노드·기록 후보 검수](BRAIN_PRINCIPLE_DRAFT_REVIEW.md)에서 이 원고를 근거로 세 개의 비공개 Brain 후보를 준비했다. 본문 복제 없이 대기 경계·조회 비용·복구 조건을 다시 사용할 기준과 질문으로 정리했고 기존 원고/hash는 보존했다. R2 전체 완료, 다음은 R3 Step 0이다.
