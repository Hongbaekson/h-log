# Step 0: home-and-shared-shell-preview

## 읽을 파일

- `apps/h-log/AGENTS.md`, `apps/h-log/DESIGN.md`
- `.codex/skills/harness/SKILL.md`, `.codex/skills/tdd/SKILL.md`, `.codex/skills/ui-ux-pro-max/SKILL.md`
- `apps/h-log/.codex/docs/harness/PRD.md`, `ADR.md`, `ARCHITECTURE.md`, `WORKFLOW.md`, `AGENT_LOOP.md`, `IMPLEMENTATION_PLAN.md`, `UI_GUIDE.md`
- `apps/h-log/.codex/rules/frontend.md`, `content-seo-privacy.md`
- `apps/h-log/app/page.tsx`, `globals.css`, `layout.tsx`
- `apps/h-log/components/layout/`, `components/ui/`
- `apps/h-log/lib/site.test.ts`, `projects.test.ts`, `projects.ts`

## 작업

사용자가 요청한 `npx getdesign@latest add discord`로 설치한 `DESIGN.md`를 기준으로 홈과 공통 shell의 로컬 시안을 만든다. Deep indigo/Blurple, 부드러운 모서리, 명확한 활자 위계를 개인 개발자 사이트에 맞게 조정한다. AI 아이콘과 레이더는 개발자 정체성을 유지하며 정돈한다. 기존 H1, 공개 콘텐츠, 프로젝트 집계, route/SEO와 개인정보 정책은 유지한다.

소개와 지표, 기술 프로필, 대표 프로젝트를 분리해 기존 hero 오른쪽의 정보 편중을 해소한다. 공통 header/footer/button/card의 색상과 간격을 맞추며 다른 페이지는 공통 스타일 영향만 점검한다. 사용자 검토를 위한 작업본과 화면 캡처를 제공한다.

## 인수 기준

- 기존 Home/공통 shell characterization 테스트 통과.
- 모바일 menu의 44px 터치 영역, 열기/닫기/Escape/포커스 복귀 확인.
- 320/390/768/1024/1440px overflow, reduced-motion, 키보드 탐색과 주요 route 확인.
- 데스크톱·모바일 스크린샷과 로컬 미리보기 제공.

```sh
npm run test
npm run lint
npm run typecheck
npm run build
git diff --check
```

## 검증 기록

- RED: 기존 모바일 menu는 실제 브라우저 측정 36×36px로 44px 최소 터치 영역 검증에 실패했다.
- 변경 전 기존 site/projects characterization 15/15 통과. 레이더 값과 공개 프로젝트 데이터는 유지하며 표현을 바꾼다.
- GREEN: 모바일 menu 44×44px, 열기/Escape/포커스 복귀, skip link로 main 이동, reduced-motion 및 5개 폭에서 overflow/레이더 label 비잘림을 확인했다.
- 최종 gate: 전체 테스트 151 pass/12 DB environment skip, lint, typecheck, build 통과. 이력서·포트폴리오는 desktop/mobile HTTP 200과 공통 스타일을 확인했다. Blog는 로컬 DB가 없어 기존 unavailable 상태까지만 확인했다.
- 캡처: Git 제외된 `apps/h-log/.codex/tmp/discord-preview/`의 `desktop.png`, `mobile.png`, `mobile-first-screen.png`와 기존 `desktop-before.png`. 브라우저 helper는 저장소 밖 임시 디렉터리에 보관한다.
- 2026-09-29 사용자가 시안을 검토하고 디자인 반영과 커밋·푸시를 승인했다. 운영 배포 검증은 별도다.

## 하지 말 것

- Discord 로고·게임 캐릭터·전용 폰트를 사이트 브랜드로 바꾸지 말 것. Reason: 개인 개발자/AI 정체성과 한국어 가독성이 우선이다.
- 디자인 승인과 커밋·푸시를 운영 배포 검증으로 취급하지 말 것. Reason: 운영 서버와 실제 데이터 확인은 별도 검증이 필요하다.
- 새 연락처, 회사명, 수치, 가짜 실시간 운영 상태를 추가하지 말 것. Reason: 기존 공개 근거를 유지한다.
