# Code Reviewer Agent Notes

이 문서는 `AGENTS.md`를 보완하여 H-Log 작업을 리뷰할 때 확인할 기준을 정리한다.

## 대응 원칙

- 검증된 사실만 답변한다. 파일 경로, route, 함수, 설정은 직접 확인한다.
- 모호한 구현 상태는 "확인되지 않았다"고 말한다.
- 수정은 요청 범위 안에서만 한다.
- 기존 사용자 변경을 되돌리지 않는다.
- 보안, 개인정보, 공개 가능성, SEO 부작용을 우선 확인한다.

## 구조적 일관성

- [ ] route는 `app/` App Router 구조를 따른다.
- [ ] 공통 UI는 실제 중복이 생긴 뒤 `components/ui`로 추출한다.
- [ ] 도메인별 UI는 `components/{domain}` 또는 page 인접 구조를 따른다.
- [ ] 데이터 loader와 formatting logic은 `lib/`에 두고 테스트를 붙인다.
- [ ] UI copy는 한국어를 기본으로 한다.
- [ ] 화면 표기는 `Projects`가 아니라 `Portfolio`를 사용한다.

## TDD와 검증

- [ ] production behavior 변경에 failing test가 먼저 있었다.
- [ ] focused test를 먼저 실행했다.
- [ ] 필요한 경우 `npm run lint`, `npm run test`, `npm run typecheck`, `npm run build`를 실행했다.
- [ ] UI 변경은 모바일/데스크톱 overflow와 focus/hover를 확인했다.

## 콘텐츠/프라이버시

- [ ] 전화번호, 생년월일, 주소, 내부 URL, 서버 IP, API key/token, 비공개 저장소명이 노출되지 않는다.
- [ ] 고객사명, 회사명, 정량 성과, 현재 회사 내부 워크플로우는 공개 전 확인 상태다.
- [ ] 자동 생성 글은 "직접 해봤다" 표현에 증거가 있다.
- [ ] GeekNews 같은 큐레이션 소스는 discovery 역할로만 사용된다.

## 자동 블로그 플랫폼 리뷰

- [ ] public route는 `published` 최신 버전만 노출한다.
- [ ] failed generation/publish/verification 상태는 공개되지 않는다.
- [ ] required publish job과 retryable job이 분리되어 있다.
- [ ] post content version과 public content hash를 검증한다.
- [ ] source storage가 원문 전체 저장을 기본으로 하지 않는다.
- [ ] visitor chatbot이 추가되지 않았다.
