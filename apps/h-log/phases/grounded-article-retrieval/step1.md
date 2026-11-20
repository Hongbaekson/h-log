# Step 1 retrieve-draft-evidence

[Step 0](step0.md)의 인용 검증을 통과한 계약을 사용한다. 소유자가 준비한 같은 조사 묶음에서도 작성할 주제에 맞는 구절을 찾아 초안을 생성한다.

## 읽을 파일

[계획과 공통 읽을 파일](../../.codex/docs/harness/SECURITY_PERFORMANCE_REVIEW_2026-11-19.md#rag-보완-계획), `../../.codex/skills/tdd/SKILL.md`, Step 0에서 반영한 파일을 확인한다.

- `lib/blog-topic-research.ts`, `lib/blog-daily-auto-article.ts`, `lib/blog-auto-publish-runner.ts`, `lib/blog-usage-ledger.ts`
- `lib/blog-search.ts`, `lib/blog-tags.ts`, `lib/blog-hermes-article-provider.ts`, `lib/blog-draft-requests.ts`, `lib/blog-automation-runner.ts`
- `scripts/blog-auto-publish.mjs`와 아래 테스트

## 작업

1. 실행 시 선택된 주제·작성 관점으로 허용된 발췌를 검색한다. 기존 한국어 정규화와 태그 별칭을 재사용하고, 짧은 출처 발췌 한 개를 검색의 기본 단위로 삼는다. 공식·원문·직접 근거의 역할, 외부 자료 확인 시각 24시간, 개인 맥락의 `allowedUsage`를 유지한다.
2. 결과는 출처 ID와 해시로 중복을 줄이고 동점 순서를 고정한다. 합성 질문으로 최대 후보 수·선택 구절 수·전체 입력 크기를 정하고 그 상한을 기록한다. 작성기에 선택한 구절과 참조만 한 번 전달하고, 반환된 인용은 같은 선택 목록에서 검증한다.
3. 외부 API 없이 질문·허용 정답 구절·답할 수 없는 사례를 짝지어 일일·관리자 초안 흐름을 확인한다. 기존 예산·정책·동일 날짜 잠금, 결과 저장 재시도를 보존한다.

## 인수 기준

- 예를 들어 같은 배포 자료를 주고 ‘어느 버전에서 수정됐나’와 ‘전환 뒤 캐시를 어떻게 확인했나’를 각각 물으면 예상 구절이 선택되고 각 초안의 인용이 그 구절을 가리킨다. 주제와 무관한 공식 자료만 있으면 writer 호출 0회, 새 공개 작업 0건이다.
- 합성 평가에서 질문별 원하는 구절이 상위 k개에 든 비율과 분모, 근거 없는 질문에서 작성을 멈춘 비율, 인용 불일치 통과 건수, 입력 크기와 호출 수를 남긴다. 같은 입력의 근거 선택은 재실행해도 같아야 한다.
- 중지·예산 초과·만료·미래 시각·금지된 개인 맥락을 포함한 입력은 기존 정책대로 처리한다. 같은 요청의 결과 복구를 위해 writer를 한 번 더 부르지 않는다.

## 검증

~~~sh
node --no-warnings --experimental-strip-types --test lib/blog-topic-research.test.ts lib/blog-daily-auto-article.test.ts lib/blog-auto-publish-runner.test.ts lib/blog-usage-ledger.test.ts
npm run test:drafts
npm run test:automation
~~~

새 구절 선택 테스트와 재현 명령을 함께 기록한다. 모델 호출 횟수와 인용 연결은 테스트 대역으로 확인하고, 실제 모델의 글 품질은 별도 측정값으로 다룬다.

## 하지 말 것

근거에 들어 있는 문장은 인용 자료로만 취급한다. 실행 권한·발행 여부는 서버 정책과 기존 게이트가 결정한다.
