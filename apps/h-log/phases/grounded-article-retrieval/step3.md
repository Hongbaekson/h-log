# Step 3 evaluate-hybrid-retrieval

[F4 질문셋](../indexed-blog-search/step0.md)이 준비되면 공개 글 비교를 시작할 수 있다. 작성 경로는 [작성 근거 검색](step1.md)과 [공개 자료 연결](step2.md)에서 나온 구절을 사용한다. h-log에서 키워드만으로 놓치는 질문을 의미 검색이 찾아내는지 측정한다.

## 읽을 파일

[계획과 공통 읽을 파일](../../.codex/docs/harness/SECURITY_PERFORMANCE_REVIEW_2026-11-19.md#rag-보완-계획), `../../.codex/skills/tdd/SKILL.md`, [성능 기준선·예산](../../.codex/docs/harness/PERFORMANCE_BASELINE_REVIEW.md), 선행 단계의 질문셋과 실행 명령을 확인한다.

- `lib/blog-search.ts`, `lib/blog-tags.ts`, `app/api/search/route.ts`, `lib/blog-usage-ledger.ts`
- `lib/public-read-model.ts`, `migrations/001_blog_core.sql`, `lib/blog-daily-auto-article.ts`, `scripts/performance-baseline.mjs`

## 작업

1. 검색기 조정 전에 문서 버전·질문·복수 정답·근거 구절·상위 k와 판정 기준을 고정한다. 정확한 기술명, 한영 약어, 의역, 과거·현재 버전, 정답 없는 질문을 포함한다. 예전 정답표와 변경 이유를 보존하며 최종 평가 질문은 조정에 사용하지 않는다.
2. 동일 자료에서 F4의 어휘 검색과 키워드+의미 검색을 비교한다. 평가용 로컬 모델이나 출처·모델 버전이 확인된 벡터가 있으면 기존 PostgreSQL의 정확 최근접 검색부터 측정한다. 후보 안에 정답이 있는데 순서만 나쁠 때 재정렬 실험을 추가한다. [pgvector 공식 문서](https://github.com/pgvector/pgvector#querying)
3. 공개 검색과 작성용 근거 검색의 분모를 구분한다. 공개 글 Hit@3, 정답 구절 Recall@k, 근거 없는 질문의 중단율, 인용 불일치 건수를 기록한다. 검색·재정렬·전체 지연의 p50/p95, 입력 크기, 모델 호출 수·비용, 인덱스 크기·재생성 시간도 같은 조건에서 측정한다.

## 인수 기준

- 별도 평가 질문에서 미리 정한 지표(문서 Hit@3 또는 구절 Recall@k)가 기준선보다 개선되고, 정확한 기술명·무응답·인용 검사와 F1 지연 예산·사용량 한도를 만족할 때 채택한다. 구절 검색과 생성 결과를 각각 점검한다. 가짜 벡터로 확인한 계약과 실측 품질을 구분한다.
- 채택할 경우 효과를 확인한 경로의 기존 계약에 연결한다. 벡터는 원본 버전·구절 해시·분할 규칙·모델 버전/차원에 묶고, 수정된 구절의 갱신·철회·재시도와 전체 재생성을 확인한다. 미설정·한도 초과·장애 시 적용 경로별 기존 키워드 검색이나 비공개 중단 정책으로 복귀하는지 검증한다.
- 개선이 없으면 어휘 검색을 유지하고 실패한 질문 유형을 기록한다. 실측할 모델·벡터가 없으면 의미 검색은 `미측정`으로 남기고 어휘 기준선 결과와 재개 조건을 기록한다.

## 검증

~~~sh
node --no-warnings --experimental-strip-types --test lib/blog-search.test.ts lib/blog-usage-ledger.test.ts lib/blog-daily-auto-article.test.ts
node --no-warnings --experimental-strip-types --test scripts/performance-baseline.test.mjs
~~~

질문셋·자료·모델 버전, 실행 명령, 표본 수와 캐시 조건을 결과에 남긴다. 파생 저장을 구현한 경우 격리 DB에서 `npm run test:migrations`와 `npm run test:projection:db`도 실행한다.

## 하지 말 것

합성 비용·가짜 임베딩·타 사이트의 응답 시간으로 운영 효과를 추정하지 않는다. 실제 외부 호출과 운영 전환은 기존 승인 절차를 따른다.
