# Step 2: remove-unused-content-hash-reconciliation

## 작업

`blog-content-hash-reconciliation.ts`의 live caller를 다시 확인하고, production에서 호출되지 않으면 모듈과 isolated test를 삭제한다.

## 인수 기준

- required publish adapter의 실제 content-hash 검증은 유지된다.
- 새 reconciliation service, scheduler, dependency를 만들지 않는다.
- 기본 앱 gate와 관련 hash verification test가 통과한다.

## 하지 말 것

- production DB나 crawler output을 변경하지 말 것.
- caller가 발견되면 삭제하지 말고 phase를 보류할 것.
