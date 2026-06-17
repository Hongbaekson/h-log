# Frontend Rules

이 문서는 UI, 컴포넌트, 페이지 작업을 할 때만 읽는다.

## Stack

- React Server Components를 기본으로 사용한다.
- client component는 상태, 이벤트, 브라우저 API가 필요할 때만 사용한다.
- 스타일은 Tailwind CSS를 기본으로 한다.
- 공통 UI는 `components/ui`에 둔다.
- 페이지 섹션은 `components/sections` 또는 도메인 폴더에 둔다.

## Design Direction

- Clean Dark Engineer Portfolio
- Subtle AI Workflow Console
- 과한 사이버펑크, particle, 3D, 장식성 배경은 피한다.
- 카드 안에 카드를 중첩하지 않는다.
- Home 우측은 일반 프로필 카드보다 Automation Status Card로 구성한다.
- Home 첫 화면은 짧은 소개, CTA, 상태/지표 카드만 둔다.
- "안녕하세요"식 인사형 H1이나 긴 자기소개 레이아웃은 피한다.

## Layout

- 기본 최대 폭은 `1120px` 근처로 잡는다.
- 모바일은 단일 컬럼을 기본으로 한다.
- 고정 형식 UI는 `min/max`, `aspect-ratio`, grid track으로 크기를 안정화한다.
- 텍스트가 버튼, 카드, 필터 안에서 넘치지 않게 한다.

## Components

우선 구현 대상:

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

## Colors

기준 팔레트:

- Background: `#080D18`, `#0B1220`
- Surface: `#111A2E`, `#162238`, `#1B2A44`
- Border: `#2A3B59`
- Text: `#F8FAFC`, `#CBD5E1`, `#7C8BA1`
- Primary: `#4F8CFF`
- Accent: `#22D3EE`, `#34D399`, `#9B7CFF`

한 가지 색 계열만 반복하는 단조로운 화면을 피한다.

## Interaction

- hover는 border, color, translate 정도로 절제한다.
- focus visible을 제공한다.
- 모션은 MVP에서 최소화한다.
- Framer Motion은 필요성이 명확할 때만 추가한다.

## Validation

UI 단위가 끝나면 확인한다.

- 데스크톱 폭
- 모바일 폭
- 텍스트 overflow
- hover/focus 상태
- 링크와 버튼 동작
