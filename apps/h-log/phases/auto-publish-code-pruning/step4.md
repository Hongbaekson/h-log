# Step 4: remove-unwired-persona-learning

## 작업

`blog-persona-learning.ts`의 live caller와 production persistence를 다시 확인하고, 연결이 없으면 모듈과 isolated test를 삭제한다.

## 인수 기준

- 현재 article validation과 provider prompt 경계는 유지된다.
- persona activation, production prompt 변경, 새 schema를 추가하지 않는다.
- 기본 앱 gate가 통과한다.

## 하지 말 것

- 삭제한 contract를 다른 framework로 다시 만들지 말 것.
- caller가 발견되면 삭제하지 말고 phase를 보류할 것.
