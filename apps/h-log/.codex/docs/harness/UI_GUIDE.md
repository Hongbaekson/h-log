# UI Guide: H-Log

기준 문서:

- `apps/h-log/.codex/rules/frontend.md`
- `apps/h-log/.codex/rules/content-seo-privacy.md`

## 디자인 원칙

### 2026-10-15 Second Brain 전용 수정

사용자가 최종 기준을 공개 `careerhackeralex.com/memory` 화면으로 확정했다. `/brain`에 한해 [실제 사이트 기준](MEMORY_UI_REFERENCE.md)과 ADR-031의 260px 밝은 sidebar·상단 검색·관계 기반 3D 별자리·밝은 평면 배치·480px preview·560px 전체 높이 본문을 우선한다. 모바일은 전체 화면 본문과 필터 drawer를 사용한다. 밝은 sidebar/평면 모드는 이 경로의 사용자 요청에 따른 예외이며 전역 Light theme을 추가하지 않는다. 다른 경로의 Discord 스타일과 Home 레이더 전체를 보존한다.

### 2026-09-29 승인된 디자인

사용자 요청으로 `apps/h-log/DESIGN.md`의 Discord 디자인을 설치했다. `discord-design-preview`에서 구현한 홈과 공통 shell의 화면 검토를 마치고 사용자 승인을 받았다. 아래 기존 팔레트보다 deep indigo `#0c0f23`/`#11152f`, raised surface `#191d3a`, Blurple `#5865f2`, lavender `#a3aaff`를 우선한다. Green `#35ed7e`는 홈의 주 CTA에만 사용한다. Magenta는 작은 AI 아이콘과 제한된 배경에만 쓴다.

한국어 font stack, dark-only, 기존 공개 정보와 레이더 값은 유지한다. 게임 캐릭터나 전용 font 대신 Lucide의 일관된 선 두께와 명세 → AI 구현 → 검증의 벡터 요소를 사용한다. 확대된 display type, 24–32px 패널 모서리, 낮은 대비의 border와 넓은 간격으로 Discord의 표현을 개발자 포트폴리오에 맞게 조정한다. 사용자 승인 범위는 디자인 반영과 커밋·푸시이며 운영 배포 검증은 별도다.

### 기본 원칙

2026-10-01 공개 경험 개선에서는 Discord 스타일을 유지하면서 Blog/Portfolio의 구조와 레이아웃을 조정한다. 레이더의 값뿐 아니라 축·형태·동작·배치와 현재 주변 영역 전체를 보존한다. 상세 순서는 [공개 경험 개선 계획](PUBLIC_EXPERIENCE_PLAN.md)과 phase registry를 따른다.

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
- `Blog` 일반 목록과 검색 결과는 `BlogPostRow`를 공유한다. 제목 24px/모바일 20px, 요약 16px·28px 줄 간격과 두 줄 제한을 사용한다. 제목·태그는 줄바꿈하고 날짜·글 유형 또는 검색 일치 정보는 요약 아래에 별도로 표시한다. 검색과 모바일 태그 필터는 계속 노출한다.
- 목록 썸네일은 명시적으로 지정하고 현재 버전·파일 해시를 검증한 PNG/WebP만 표시한다. 데스크톱은 글 오른쪽 192–224px, 모바일은 텍스트 아래 단일 열로 배치하고 8:5 공간 안에 원본 비율을 보존한다. 없거나 로딩에 실패하면 이미지 공간을 생략하고 제목 링크를 유지한다.

### Blog 본문 읽기 기준

상세 제목·도입부·본문은 최대 46rem(736px)로 정렬하고 데스크톱 목차는 별도 14rem 열에 둔다. 본문은 17px/32px, 제목은 모바일 36px·데스크톱 48px로 표시한다. H2는 24/28px·위 여백 48px, H3는 20px·위 여백 32px, 문단 위 여백은 20px이며 첫 문단의 중복 여백은 없앤다. 코드·표·그림 전후는 32px로 맞추고 표와 그림 설명은 15px, 코드 내부는 기존 14px/24px를 유지한다. 모바일 목차는 접고 긴 코드·표의 가로 스크롤은 해당 영역 안으로 제한한다.

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
