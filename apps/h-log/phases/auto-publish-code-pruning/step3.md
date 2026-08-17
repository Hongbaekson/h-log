# Step 3: remove-unwired-retryable-job-executor

## 작업

`blog-post-publish-retryable-jobs.ts`의 live caller를 다시 확인하고, production에서 실행되지 않으면 모듈과 isolated test를 삭제한다. Persistent worker가 사용하는 retry limit은 가장 가까운 소유 모듈에 둔다.

## 인수 기준

- persistent worker의 lease, retry stop, operator audit 동작은 유지된다.
- IndexNow/Discord production side effect를 새로 연결하지 않는다.
- 기본 앱 gate와 worker test가 통과한다.

## 하지 말 것

- worker와 generation 책임을 합치지 말 것.
- caller가 발견되면 삭제하지 말고 phase를 보류할 것.
