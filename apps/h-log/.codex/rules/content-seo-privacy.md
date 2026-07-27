# Content, SEO, and Privacy Rules

이 문서는 Resume, Projects, Blog, Contact, SEO 작업을 할 때만 읽는다.

## Positioning

UI copy는 한국어를 기본으로 한다. 단, `Projects` 표기는 화면에서 `Portfolio`로 사용한다.

핵심 메시지:

```text
백엔드 개발자 손홍백입니다
```

보조 메시지:

```text
Java/Spring 기반 백엔드를 개발합니다. 반복되는 작업은 줄이고, 운영하기 쉬운 구조를 고민합니다.
```

## Home Copy

```text
Badge: 좋은 기회에 열려있습니다
H1: 백엔드 개발자 손홍백입니다
Description: Java/Spring 기반 백엔드를 개발합니다. 반복되는 작업은 줄이고, 운영하기 쉬운 구조를 고민합니다.
```

규칙:

- "안녕하세요"를 꼭 넣을 필요는 없다.
- H1은 1~2줄로 제한한다.
- H1은 역할과 이름만 담백하게 둔다.
- AI/자동화는 첫 문장에 과하게 넣지 말고 보조 키워드로만 둔다.
- 상세한 경력 설명은 Resume과 Projects로 넘긴다.

## Public Content

공개 가능:

- 이름: 손홍백
- 영문명: Hongbaek Son
- 역할: Backend Developer
- GitHub: `https://github.com/Hongbaekson`
- 기술 스택
- 경력 기간
- 교육 이력
- 프로필 사진

2026-07-27 공개 결정:

- 승인되지 않은 고객사명·회사명과 현재 회사 내부 흐름은 일반화한다.
- 정량 성과는 근거 자료가 확인된 값만 공개하고, 프로젝트 수는 실제 공개 data source에서 계산한다.
- GitHub는 공개하고 이메일과 Contact form은 공개하지 않는다.
- 프로필 사진은 공개한다.
- 이력서 PDF는 2페이지 개인정보 검수를 완료했지만, 조직 식별자 일반화와 `이력서` 명칭 통일 후 공개한다.
- 공개 초기 theme은 dark-only로 두고 canonical route는 `/portfolio`로 사용한다. `/projects`는 308 호환 redirect로만 둔다.

공개 금지:

- 전화번호
- 생년월일
- 주소
- 내부 URL
- 서버 IP
- API key/token
- 비공개 저장소명
- 고객사 내부 업무 흐름을 특정할 수 있는 정보

자동 발행 scanner의 회사/고객사명과 비공개 저장소명 목록은 서버 로컬의 `HLOG_PRIVACY_ORGANIZATION_NAMES`, `HLOG_PRIVACY_PRIVATE_REPOSITORIES` JSON 배열로 주입한다. 잘못된 설정은 공개를 계속하지 않고 실패 처리한다.

## Projects

Projects는 연도순만으로 나열하지 않는다.

상단 Featured:

1. AI 기반 백엔드 개발 워크플로우 표준화
2. Redisson 기반 비동기 처리와 DLQ 장애 복구
3. OpenTelemetry 기반 관측성 체계 구축

하단 Career Projects:

- 영화관 POS/KIOSK 차세대 프로젝트
- 영업정보 시스템 현대화
- CRM / 백오피스 운영 개선
- 데이터 마이그레이션

조직 식별자는 일반화된 이름을 사용한다.

## Blog

초기 글은 실전 회고형으로 잡는다.

- 문제
- 선택지
- 구현
- 결과
- 배운 점

회사/고객사 식별 가능 정보는 제거한다.

## SEO

목표 검색어:

- 손홍백
- 손홍백 개발자
- 손홍백 포트폴리오
- Java Spring 백엔드 개발자
- AI Workflow Backend Developer

필수:

- Home H1 또는 상단 텍스트에 `손홍백` 포함
- 페이지별 title/description 분리
- canonical URL 설정
- Person JSON-LD
- WebSite JSON-LD
- Blog detail은 Article 또는 BlogPosting JSON-LD
- sitemap.xml
- robots.txt

Home metadata 초안:

```text
title: 손홍백 | Backend Developer · AI Workflow · Portfolio
description: Java/Spring 기반 백엔드 개발자 손홍백의 포트폴리오입니다. AI 개발 워크플로우, Redis/Kafka 비동기 처리, OpenTelemetry 관측성, DB 성능 최적화 경험을 정리합니다.
```
