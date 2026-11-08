# 현재 주장과 근거의 연결 대장

확인일은 2026-11-09(KST), 코드 기준은 `e906c1ffc0b29a1cbda8dfc58a41eb46e9e400a2`다. [R2 Step 0](../../../phases/evidence-content-curation/step0.md)의 대표 주장 5건을 검토했다. 기존 공개용 콘텐츠와 저장소 코드, 보관된 원고·검수 기록을 대조한 결과다. 운영 사이트의 현재 발행 목록과 사내 시스템의 현재 구성은 이 대장의 확인 범위에 포함하지 않는다.

다음 원고는 **「Next.js Suspense로 최근 글 조회와 홈 렌더링 분리하기」**를 재사용한다. S2 Step 4에서 검수한 같은 글이며 새 원고 한 편으로 중복 계산하지 않는다. 나머지 경력 사례는 기존 승인 기록과 확인이 필요한 측정 조건을 구분해 후속 후보로 남긴다.

## 근거를 읽는 기준

`확인`은 이번에 읽은 코드나 자료에서 직접 찾은 내용, `추론`은 그 자료를 바탕으로 한 현재의 해석, `질문`은 아직 확인하지 않은 내용이다. 자료를 확인한 날짜는 사건일·실행일·공개 승인일과 다르다. 아래 5건 모두 자료 대조일은 2026-11-09다.

| 현재성 | 이번 대장의 사용 기준 |
| --- | --- |
| 현재 적용 | 기준 commit에서 호출 경로까지 확인한 H-Log 구현. 운영 배포 여부까지 포함하지 않음 |
| 과거 기록·실험 | 승인된 경력 기술 또는 날짜가 있는 기존 로컬 검수. 당시 조건만 뒷받침 |
| 대체된 판단 | 이전 판단과 변경 근거가 함께 있을 때 사용. 이번 5건에서 기술을 실제 교체했다는 근거는 확보하지 못함 |
| 미확인 | 현재 운영 구성, 원고의 실제 발행 여부, 측정 원자료나 사건일이 없는 항목 |

기존 경력 문구의 `2025.03 - 현재`와 Brain의 `recordedAt: 2026-10-06`만으로 오늘의 기술 구성이나 사건 날짜를 판단하지 않는다. Brain의 `profile`은 공개 경력을 재정리한 근거 수준이며 독립적인 측정 증거가 아니다. `implementation` 메모도 당시 코드 관찰과 현재 실행 결과를 구분한다.

## 화면과 후보의 연결

Resume의 경력 문구는 [페이지의 timelineItems](../../../app/resume/page.tsx)에 있다. 계획의 읽을 파일인 [resume-profile.ts](../../../lib/resume-profile.ts)는 사진 정보만 갖고 있어 실제 주장 대조에는 페이지를 추가로 읽었다. Portfolio는 [projects.ts](../../../lib/projects.ts), Brain은 [정적 카탈로그](../../../lib/brain-catalog.ts)를 기준으로 했다. DB에 별도로 저장한 Brain 기록은 조사하지 않았다.

| ID·대표 주장 | Portfolio | Resume | Blog 후보·기존 연결 | Brain의 기존 기록 |
| --- | --- | --- | --- | --- |
| R2-C01 최근 글의 대기와 홈 렌더링 분리 | `h-log-public-reading` | 개인 프로젝트 기술 스택만 있음. 이 사례의 별도 성과 문구는 없음 | `home-recent-posts` 검토 원고. 프로젝트 mapping과 시리즈 첫 편 정의가 있음 | `operable-backend`, `observe-before-optimize`, `verification-is-not-a-label`은 주제상 연결 후보. 이 H-Log 사례의 직접 출처·전용 노드는 아직 없음 |
| R2-C02 Redisson Queue·재시도·DLQ | `redisson-async-processing-recovery` | 응답 약 80% 단축·처리량 2배·평균 복구 30초 이내 | `redis-pubsub-delivery` 문서 분석 원고와 명시적 mapping. 도입·교체 경험을 주장하지 않는 연결 이유가 이미 있음 | `async-request-boundary`, `dlq-recovery`가 해당 Portfolio를 출처로 사용. `pubsub-delivery`는 별도 질문 |
| R2-C03 Redis 예열과 중복 실행 제한 | 이 예열 경험의 전용 사례는 없음. POS/KIOSK의 Cache-Aside 사례는 다른 경력 | ApplicationReadyEvent·ShedLock/JDBC LockProvider, 35분 36초→68초 | 검토한 기존 원고 묶음에 이 경험의 완성 원고 없음 | `cache-warmup-cost`가 Resume를 출처로 사용. `cache-readiness-is-not-use`는 별도 일반화 메모 |
| R2-C04 명세 기반 AI 구현·검증 | `ai-backend-workflow-standardization` | 단순 기능 1일→2시간, 컨벤션 지적 약 80% 감소 | 검토한 기존 원고 묶음에 이 성과의 완성 원고 없음 | `repeatable-work`, `contract-before-generated-code`의 Portfolio 출처. `verification-is-not-a-label`은 별도 검증 관점 |
| R2-C05 OpenTelemetry 관측과 원인 식별 | `opentelemetry-observability` | 원인 식별 시간 약 87% 단축 | 검토한 기존 원고 묶음에 이 성과의 완성 원고 없음 | `observe-before-optimize`의 Portfolio 출처. `telemetry-with-less-data`는 별도 구현 관찰을 포함 |

표의 Blog slug는 기존 후보·mapping을 식별한다. [프로젝트 연결](../../../lib/portfolio-posts.ts)과 [시리즈](../../../lib/blog-series.ts)는 현재 공개 판정을 통과한 글만 내보낸다. 정의가 있다는 사실만으로 실제 글이 공개됐다고 판정하지 않는다. Brain의 주제상 연결 후보도 현재 존재하는 edge나 새 출처 링크로 계산하지 않는다.

## R2-C01 — H-Log 최근 글 조회

**확인·현재 적용.** [Home](../../../app/page.tsx)의 소개·프로젝트 뒤에 `Suspense fallback={null}`로 [HomeRecentPosts](../../../components/blog/HomeRecentPosts.tsx)를 배치한다. 컴포넌트는 기존 loader와 `getPublicBlogIndex({ pageSize: 3 })`를 사용한다. 정상 0건은 생략하고 조회·모델 오류는 해당 영역의 안내와 홈 GET 재시도로 처리한다. 이 catch의 로그는 고정 식별자다. [ADR-032](ADR.md)의 선택 이유와 일치한다.

**확인·비용 경계.** [공개 repository](../../../lib/blog-postgres-repository.ts)는 published 현재 버전 전체를 후보로 읽고 개인정보 판정을 적용한다. [목록 모델](../../../lib/blog-public.ts)은 모든 공개 본문의 읽기 모델을 만든 다음 slice한다. 3개 표시가 SQL 3행 제한이라는 주장은 성립하지 않는다. 이 코드와 [공개 loader](../../../lib/blog-public-source.ts)는 S2 원고 검수 때 기록한 파일 hash와 같다.

**과거 검증.** [2026-10-21 사례 검수](BLOG_CASE_STUDY_REVIEW.md)의 unit 44개, [2026-11-05 S2 검수](SEO_CONTENT_LINK_REVIEW.md)의 unit 66개·HTTP·브라우저 결과는 당시 기록이다. 이번에는 S2 최종 receipt와 원고·원본 hash, 근거 파일 11개의 동일성을 대조했다. runtime을 재실행한 결과로 날짜를 갱신하지 않는다. no-JS에서 Home 최근 글 직접 링크가 없고 Blog 경유 탐색은 가능하다는 관찰도 해당 실행 시점에 한정한다.

**추론·수정 후보.** 원고의 전체 조회 비용 설명은 현재 코드와 맞다. 11월 6일 합성 성능 관찰을 반영한다면 기존 실행 결과를 고치기보다 별도 후속 문단으로 연결한다. [F1–F7 계획](PERFORMANCE_REBUILD_PLAN.md)은 경량 조회·재생성 가능한 보조 데이터를 다룰 예정이며 아직 구현 완료가 아니다. 별도 조회를 검토하겠다는 과거 판단에서 측정·계획으로 진행됐지만 실제 최적화나 구조 교체의 성과는 주장할 수 없다.

**질문·다음 단계.** 운영 지연·장애율·실제 발행 상태는 미확인이다. R2 Step 1에서 기존 원고의 재현 조건과 실행 순서가 충분한지 확인하고 새로 실행한 검증만 별도 날짜로 기록한다. 공개 연결은 R3의 현재 공개 selector 계약을 따른다.

## R2-C02 — 비동기 처리와 장애 복구

**확인·과거 경력 기록.** Portfolio와 Resume의 Redisson RBlockingQueue, 자동 재시도·DLQ 격리, 응답 약 80%·처리량 2배·평균 복구 30초 이내 표기가 일치한다. [기존 공개 정책](../../rules/content-seo-privacy.md)의 경력기술서 대조·일반화 결정과 승인된 콘텐츠를 재사용했다. 이번에 원본 PDF·회사 코드·운영 수치를 다시 검증한 것은 아니다. 관련 Brain 두 노드는 같은 경력 내용을 다시 정리한 기록이다.

**추론·수정 후보.** API 응답 완료, 작업 처리 완료, 재시도 성공, 운영자 DLQ 복구를 분리해서 설명해야 한다. 현재 문구만으로 모든 실패가 자동으로 30초 안에 복구된다거나 전달 유실이 없다고 확대할 수 없다. `dlq-recovery`의 타임아웃·수동 재처리 배경은 이번에 추가 증거를 확보하지 못했으므로 새 원고의 상세 장애 서사로 옮기기 전에 확인한다.

**질문·미확인.** 측정 대상 API·부하·기간·실패 종류, 평균 복구의 시작/종료 기준, 현재 사용 버전과 기술 교체 이력은 추가 확인 대상이다. [기존 문체 검수](BLOG_WRITING_GUIDE.md)의 Pub/Sub 원고는 문서 분석으로 남긴다. Pub/Sub/Streams 전환, MSA·outbox 도입이나 실제 장애 실험의 증거로 사용하지 않는다. 이번에는 외부 기술 문서를 새로 검증하지 않았다.

## R2-C03 — 캐시 예열과 원본의 역할

**확인·과거 경력 기록.** Resume와 `cache-warmup-cost`에는 같은 35분 36초→68초와 시작 이벤트·분산 실행 제한이 적혀 있다. 출처는 기존 승인 경력이며 두 화면의 일치는 두 번의 독립 측정을 뜻하지 않는다. `cache-readiness-is-not-use`는 설정과 적용 효과를 구분한 별도 메모다. POS/KIOSK의 3,000ms→900ms와 이 예열 시간을 한 실험의 결과로 합치지 않는다.

**추론·수정 후보.** 원본 DB에서 캐시를 다시 채우는 관점은 [F3 Step 0](../../../phases/rebuildable-public-read-models/step0.md)의 계약 후보로 연결할 수 있다. 다만 예열을 구현했다는 경력만으로 전체 유실 뒤 재생성·중단 재개·동시 원본 갱신까지 검증했다고 쓸 수 없다. H-Log의 원본·파생 데이터 설계와 회사의 과거 캐시 구현을 분리해 설명한다.

**질문·미확인.** 데이터 수·인스턴스 수·비교 환경, 예열 실패와 동시 갱신을 실제로 다뤘는지, 현재도 같은 경로를 쓰는지 확인이 필요하다. 이 정보가 없는 동안은 복구를 완료한 경험 대신 검증할 질문으로 남긴다. 기존 승인 노드의 날짜·본문·수치는 이번 대장에서 수정하지 않는다.

## R2-C04 — 명세와 AI 개발 워크플로우

**확인·과거 경력 기록.** Portfolio와 Resume의 단순 기능 1일→2시간, 컨벤션 리뷰 약 80% 감소가 일치한다. Portfolio의 `detail.evidence`는 Controller·DTO 같은 단순 기능과 컨벤션 검토 범위를 명시하고 측정 기간·표본·난도 비교 조건이 없다는 한계도 이미 적고 있다. Brain의 명세·반복 작업 노드는 이 공개 설명에 연결된다.

**추론·수정 후보.** 같은 한계를 원고에서도 유지한다. 전체 개발 생산성이나 팀 전체 코드 품질이 해당 비율만큼 개선됐다고 확대하지 않는다. H-Log 저장소의 실제 Harness/TDD 규칙은 별도 로컬 구현 증거이며 회사 워크플로우의 수치나 개인의 당시 고민을 새로 증명하지 않는다.

**질문·미확인.** 작업별 표본·측정 기간·리뷰 분류와 현재 도구/명세 흐름, 바뀐 판단의 시점·이유가 필요하다. 실제 변경 기록 없이 `revises` 관계나 도구 교체 회고를 만들지 않는다.

## R2-C05 — 관측과 장애 분석

**확인·과거 경력 기록.** Portfolio와 Resume가 주장하는 약 87%는 장애 원인 식별 시간이다. Portfolio에는 성공 요청 표본 수집·오류 span 전수 수집·trace/metric/log 연결을 적고 있다. `observe-before-optimize`는 이 사례에 연결된다. `telemetry-with-less-data`의 Redis tracing 수집 제한은 별도 코드 관찰이며 같은 운영 실험이라는 근거는 이번에 확보하지 못했다.

**추론·수정 후보.** 원인 식별 시간을 장애 복구 시간이나 서비스 응답 속도로 바꾸지 않는다. 오류 전수 수집이라는 기존 설계 설명에서 수집기 장애·샘플링 조건과 무관하게 모든 오류가 보관됐다는 보장으로 확장하지 않는다. H-Log의 비공개 Prometheus/Grafana와 [F7 관측 계획](../../../phases/performance-observation-rehearsal/index.json)은 별도 작업이다.

**질문·미확인.** 비교한 장애·표본·기준 시각, 현재 수집 정책과 실제 손실 검증이 필요하다. 기존 자료만으로 당시 감정이나 실패한 대안의 실험 과정을 복원하지 않는다.

## 다음 원고와 Brain 인계

R2 Step 1은 R2-C01을 사용한다. 기존 후보의 파일 SHA-256은 `40cb9b4991fdd9e1429907cb9b5a0cd97268bdbc92057d6f583e76dcb628dd0b`이며 [S2 검수](SEO_CONTENT_LINK_REVIEW.md)에 기록된 값과 동일하다. 당시 생성한 content hash는 `932188a374a4fa3d658ef63cc8f48b30283498d73225fdef1edcbce458a0b7db`다. 이 hash의 존재는 새로운 발행 승인이 아니다.

1. 기존 원고·manifest·과거 실행 시각을 보존한 채 상황→대안→선택→재현→한계가 충분한지 점검한다. 부족한 조건만 별도 검토본에 보완한다.
2. 원고를 바꾸면 해당 버전의 Markdown/HTML/content hash·privacy·claim·출처를 다시 검수한다. 이전 검수일을 새 공식 자료 확인일이나 새 실험일로 사용하지 않는다.
3. R2 Step 2는 `operable-backend` → `observe-before-optimize` → `verification-is-not-a-label`을 읽기 후보로 검토한다. H-Log 사례와 이어질 기록 2~3개를 준비하되 기존 연결이 있다고 가정하지 않는다. 개인의 생각 변화가 확인되지 않으면 `revises`를 쓰지 않는다.
4. R3에서 실제 공개된 글만 Brain 출처로 연결한다. 후보 slug를 먼저 공개 링크로 넣거나 시리즈 정의만 보고 글이 발행됐다고 처리하지 않는다.

경력 사례의 추가 본인 확인은 위 다섯 주장별로 남겨 두었다. 자료가 확보된 H-Log 원고의 검토는 그 답변을 기다리지 않고 진행할 수 있다. 기존 원고 원자료·파일별 hash·구체적인 확인 질문은 Git/Docker 제외 검수 묶음에 보관하며 앱에서 읽지 않는다.

## 검증과 완료 범위

문서·JSON 전용 단계다. 대표 5건의 화면별 일치/차이와 현재성, 기존 원고·과거 원본 보존, S2 근거 11개 파일의 hash 일치를 확인했다. 전체 phase/step과 Markdown 파싱, 상대 링크·읽을 파일 경로, 다른 트랙 상태 보존, private의 Git/Docker 제외 및 `git diff --check`를 검사했다. 검사 명령과 결과는 [Step 0 완료 기록](../../../phases/evidence-content-curation/step0.md)에 둔다.

새 DB/HTTP/브라우저 검증과 외부 문서 확인은 실행하지 않았다. 이 단계는 연결 대장 준비 완료이며 원고 재검수·새 Brain 노드·공개 발행 완료가 아니다. 다음은 **R2 Step 1 `evidence-case-manuscript`**다.

## R2 Step 1 후속 검수 — 2026-11-09

위 대장 확인 당시의 원고/hash와 판단은 보존했다. [원고 검수 결과](EVIDENCE_CASE_MANUSCRIPT_REVIEW.md)에서 같은 S2 원고를 별도 후보로 보완했다. 재현 명령·현재 단위 47/47·캐시 설명·후속 성능 관찰을 구분하고 주장 16개와 출처 25개를 검수했다. 실제 발행은 하지 않았으며 다음은 R2 Step 2의 기준 노드·기록 후보 준비다.
