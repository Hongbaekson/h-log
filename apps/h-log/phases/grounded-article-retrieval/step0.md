# Step 0 verify-source-passages

자동 작성한 사실 주장과 인용을 이번 실행에서 확인한 출처에 묶는다. 지금의 입력 파일로 시작할 수 있다.

## 읽을 파일

경로는 앱 기준이다. [계획과 공통 읽을 파일](../../.codex/docs/harness/SECURITY_PERFORMANCE_REVIEW_2026-11-19.md#rag-보완-계획), `../../.codex/skills/tdd/SKILL.md`를 먼저 확인한다.

- `lib/blog-topic-research.ts`, `lib/blog-daily-auto-article.ts`, `lib/blog-article-generation.ts`, `lib/blog-privacy-scanner.ts`
- `lib/blog-hermes-article-provider.ts`, `lib/blog-draft-requests.ts`, `lib/blog-automation-runner.ts`, `lib/blog-postgres-repository.ts`
- `lib/blog-editorial-actions.ts`, `lib/blog-admin-review.ts`, `migrations/008_blog_editorial_commands.sql` 및 아래 검증 대상

## 작업

1. `buildResearchPack`이 만든 출처 ID·정규화 URL·해시·확인 시각과 480자 이내의 발췌를 사용한다. 작성기에 실제로 전달할 객체 전체에 개인정보 검사를 적용한다. 현재 검사 대상과 별도로 넘기는 `sources`도 포함한다.
2. 작성기가 돌려준 인용은 같은 출처 스냅샷의 연속 구절과 대조한다. 기존 240자 한도를 지키고 공백·줄바꿈 정규화 범위를 테스트로 고정한다. 출처 ID와 URL이 함께 있으면 같은 원본을 가리켜야 한다. 직접 실험은 입력에서 허용한 근거 경로·개인 맥락의 버전과 사용 범위를 대조한다.
3. 버전·보안·성능 수치처럼 사실 확인이 필요한 주장은 해당 근거가 있어야 공개 작업으로 넘어간다. 명시된 수치·단위·적용 버전은 대조하고, 해석이 갈리는 주장과 출처 간 충돌은 소유자가 판정한다. 근거가 부족한 생성 결과는 기존 일일 `generation_failed`와 관리자 요청 `blocked` 경로에서 멈춘다. 의견에는 기존 구분을 적용한다.
4. 검토자는 기존 소유자 검토 경로에서 생성 버전에 연결된 주장, 출처·해시와 짧은 인용을 다시 확인할 수 있어야 한다. 기존 버전별 검토 자료와 저장 트랜잭션을 우선 사용한다. 관리자 초안에서 저장용 출처 ID를 바꾸는 경우에도 원본과의 대응을 보존한다.

## 인수 기준

- 같은 공식 자료의 정상 인용은 통과한다. 다른 출처의 인용, 한 단어가 달라진 직접 인용, 입력에 없는 근거 경로, 근거 없는 수치는 작성·검토 경로에서 검증 완료로 넘어간 사례가 0건이어야 한다.
- 개인정보 표식이 출처 요약이나 발췌에만 있어도 모델 호출 0회다. 인용 검증 실패는 공개 작업 0건이며 원문을 오류에 담지 않는다. 과거 버전은 그대로 열리며, 근거가 빠진 예전 초안을 발행하려면 기존 소유자 편집 경로에서 새 버전에 근거를 보완할 수 있어야 한다.
- 일일 실행과 관리자 초안을 각각 확인한다. 저장 재시도 뒤에도 같은 버전·출처·인용을 한 번만 볼 수 있다.

## 검증

`apps/h-log`에서 합성 입력과 가짜 writer로 먼저 검증한다. DB 명령은 격리된 테스트 DB를 사용한다. 공통 코드 검증을 마치고 결과를 phase index에 기록한다.

~~~sh
node --no-warnings --experimental-strip-types --test lib/blog-topic-research.test.ts lib/blog-article-generation.test.ts lib/blog-daily-auto-article.test.ts lib/blog-hermes-article-provider.test.ts
npm run test:drafts
npm run test:editorial
~~~

## 하지 말 것

검토 대장은 소유자만 읽을 수 있게 하고, 출처에서 보존하는 내용은 짧은 발췌와 식별 정보로 한정한다. 작성기가 제안한 경로나 URL을 열어 근거를 보충하면 입력에서 허용한 자료의 범위가 달라진다.
