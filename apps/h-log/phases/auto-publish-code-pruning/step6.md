# Step 6: remove-unwired-failure-pattern-registry

## 작업

`blog-failure-pattern-registry.ts`의 live caller와 production persistence를 다시 확인하고, 연결이 없으면 모듈과 isolated test를 삭제한다.

## 인수 기준

- 현재 quality gate, privacy scanner, persistent worker failure handling은 유지된다.
- provider prompt 연결, production timer, 새 schema를 추가하지 않는다.
- 기본 앱 gate가 통과한다.

## 하지 말 것

- security/privacy failure handling을 삭제하지 말 것.
- caller가 발견되면 삭제하지 말고 phase를 보류할 것.
