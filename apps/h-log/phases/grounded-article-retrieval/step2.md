# Step 2 retrieve-published-knowledge

[Step 1](step1.md)과 [F4의 공개 검색 조회](../indexed-blog-search/step1.md)를 바탕으로, 초안에 연결할 h-log의 과거 글과 기술 노트를 찾는다.

## 읽을 파일

[계획과 공통 읽을 파일](../../.codex/docs/harness/SECURITY_PERFORMANCE_REVIEW_2026-11-19.md#rag-보완-계획), `../../.codex/skills/tdd/SKILL.md`, 선행 step의 후보 검색·검증 파일을 읽는다.

- `lib/blog-public-source.ts`, `lib/public-read-source.ts`, `lib/public-read-transaction.ts`, `lib/blog-search.ts`
- `lib/brain-server.ts`, `lib/brain-postgres-repository.ts`, `lib/brain-catalog.ts`, `lib/brain-blog-sources.ts`
- `lib/blog-daily-auto-article.ts`, `lib/blog-draft-requests.ts`, `lib/blog-automation-runner.ts`, `lib/blog-required-publish-job-adapter.ts`, `lib/blog-persistent-worker.ts` 및 아래 검증 대상

## 작업

1. 주제와 관련 있는 공개 후보를 좁힌 후 필요한 문단만 뽑는다. 제목·절·문단 경계를 보존하고 한 문서가 후보를 독점하지 않도록 선택한다. Blog는 현재 공개 버전 ID·내용 해시·링크를, DB Brain은 승인한 공개 사본의 revision·링크를, 편집형 카탈로그는 공개 노드 ID·내용 해시를 근거에 남긴다.
2. 기존 공개 판정과 개인정보 검사를 재사용한다. Brain DB 기능 설정을 따르고 기존 비공개 조회와 공개 조회를 구분한다. Node 작성 작업에서도 사용할 수 있는 저장소 읽기 함수를 사용한다. 검색 장애와 정상 0건은 기존 오류 정책에 맞게 구분한다.
3. 모델 호출 전, 결과 저장·재시도, 대기 중인 글의 공개 전환에서 참조한 내부 자료의 공개 여부와 버전을 확인한다. 쓰기와 경합하는 마지막 판정은 공개 전환과 일관된 시점에 묶는다. 늦은 모델 응답이나 `result_ready` 복구에서 자료가 바뀌면 검토 대상으로 처리한다. 내부 글의 작성일과 외부 연구 자료의 24시간 확인 시각은 각각 기록한다.

## 인수 기준

- 공개 글 1개와 검수된 Brain 사본 1개가 필요한 합성 주제에서 각각의 구절·출처로 돌아갈 수 있다. 사본을 만든 뒤 비공개로만 수정한 문장은 후보·프롬프트·공개 응답 어디에도 나타나지 않는다.
- 검색 캐시 적중, 공개 버전 교체, 철회, DB Brain 비활성, 기능을 켠 상태의 DB 오류, 생성 중 철회와 저장 재시도를 검수한다. 철회·다른 버전의 구절로 새 발행을 승인한 경우는 0건이어야 한다.
- 연관 글은 작성 맥락으로 표시한다. 오래된 블로그가 외부 제품의 현재 버전이나 직접 경험을 증명하는 근거로 승격되지 않는 사례를 확인한다.

## 검증

~~~sh
npm run test:public-read-path
npm run test:brain
npm run test:drafts
npm run test:automation
npm run test:worker
~~~

격리 DB에 공개·비공개 쌍과 서로 다른 두 버전을 준비한다. 후보 수와 읽은 본문 수, 정상·철회 경합의 결과를 같은 fixture로 기록한다.

## 하지 말 것

Brain 원문을 검색 인덱스에 옮기거나 개인 자료 전체를 외부로 보내면 소유자가 승인한 공개 사본의 경계가 깨진다. 자료 선택은 공개 조회에서 시작한다.
