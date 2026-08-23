# Step 5: remove-unwired-performance-signals

## 작업

`blog-performance-signals.ts`의 live caller와 production persistence를 다시 확인하고, 연결이 없으면 모듈과 isolated test를 삭제한다.

## 인수 기준

- public analytics, visitor/session tracking, 새 schema를 추가하지 않는다.
- 기본 앱 gate가 통과한다.

## 하지 말 것

- 향후 signal 수집을 위한 대체 abstraction을 만들지 말 것.
- caller가 발견되면 삭제하지 말고 phase를 보류할 것.
