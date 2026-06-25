# UI Guide: H-Log

기준 문서:

- `apps/h-log/.codex/rules/frontend.md`
- `apps/h-log/.codex/rules/content-seo-privacy.md`

## 디자인 원칙

1. 개인 브랜딩 사이트지만 마케팅 랜딩보다 작업 기록과 운영 감각이 느껴져야 한다.
2. Clean Dark Engineer Portfolio + Subtle AI Workflow Console 방향을 유지한다.
3. 화면은 조용하고 밀도 있게 구성하되, 채용 담당자와 개발자가 핵심 정보를 빠르게 스캔할 수 있어야 한다.

## 하지 말 것

| 금지 사항 | 이유 |
| --- | --- |
| 과한 보라/인디고 그라데이션 | AI SaaS 템플릿처럼 보인다. |
| gradient text 남용 | 정보보다 장식이 먼저 보인다. |
| backdrop blur와 glass morphism 남용 | 개인 포트폴리오의 신뢰감을 떨어뜨린다. |
| 카드 안의 카드 | 구조가 복잡해지고 반복 작업 도구 느낌이 약해진다. |
| 둥근 large card만 반복 | 템플릿 느낌이 강해진다. |
| hero에 긴 자기소개 | 핵심 메시지가 늦게 보인다. |
| 기능 설명용 장식 텍스트 | 실제 정보 밀도를 낮춘다. |

## 색상

| 용도 | 값 |
| --- | --- |
| Background | `#080D18`, `#0B1220` |
| Surface | `#111A2E`, `#162238`, `#1B2A44` |
| Border | `#2A3B59` |
| Text Primary | `#F8FAFC` |
| Text Body | `#CBD5E1` |
| Text Muted | `#7C8BA1` |
| Primary | `#4F8CFF` |
| Accent | `#22D3EE`, `#34D399`, `#9B7CFF` |

한 가지 색 계열만 반복하지 않는다. 포인트 색은 상태, 링크, 강조에 제한적으로 쓴다.

## 레이아웃

- 기본 최대 폭은 1120px 근처로 둔다.
- 모바일은 단일 컬럼을 기본으로 한다.
- Home 첫 화면은 짧은 소개, CTA, 상태/지표 카드만 둔다.
- `Portfolio` 화면은 프로젝트 비교와 스캔이 쉬워야 한다.
- `Blog` 화면은 글 목록, 태그, 검색이 우선이다.

## 컴포넌트

공통 UI는 `components/ui`에 둔다.

- `Container`
- `Button`
- `Card`
- `Badge`
- `Metric`
- `SectionHeader`
- `PageHero`
- `ProjectCard`
- `PostCard`

컴포넌트는 실제 중복이 생긴 뒤 추출한다. 미래 확장만을 위한 추상화는 만들지 않는다.

## 인터랙션

- hover는 border, color, translate 정도로 절제한다.
- focus visible을 제공한다.
- 아이콘이 있는 버튼은 lucide-react를 우선한다.
- 모션은 MVP에서 최소화한다.

## 콘텐츠 기준

- UI copy는 한국어를 기본으로 한다.
- 화면 표기는 `Portfolio`를 사용한다.
- Home H1 기본값은 `백엔드 개발자 손홍백입니다`다.
- 회사/고객사 식별 가능 정보는 공개 전 확인한다.

## UI 검증

- 데스크톱 폭에서 첫 화면 핵심 메시지가 보이는가?
- 모바일 폭에서 텍스트가 버튼/카드 밖으로 넘치지 않는가?
- hover/focus 상태가 보이는가?
- 링크와 버튼이 실제 목적지로 이동하는가?
- 고객사명, 이메일, PDF, 프로필 사진 공개 여부가 확인되었는가?
