# Step 0: memory-workspace

이 step은 구현 이력이다. 사용자가 결과를 거절하고 지정한 로컬 UI와 같은 모양을 요청했으므로, 현재 기준은 [Step 1](step1.md)과 ADR-021이다.

## 읽을 파일

- `AGENTS.md`, `.codex/docs/harness/{PRD,ADR,ARCHITECTURE,WORKFLOW,AGENT_LOOP,IMPLEMENTATION_PLAN,SECOND_BRAIN_PLAN}.md`
- `../../.codex/skills/{harness,tdd,sync-repos}/SKILL.md`
- `components/brain/{BrainExplorer,BrainNote}.tsx`, `app/brain/{page.tsx,brain.css}`
- `lib/{brain,brain-catalog}.ts`, `app/layout.tsx`
- `.codex/docs/harness/MEMORY_UI_REFERENCE.md`

## 작업

사용자가 거절한 카드/격자 화면을 Memory의 전체 화면 탐색 구조로 교체한다. 260px 사이드바, 검은 3D 그래프, 떠 있는 검색창, 선택 시에만 열리는 읽기 패널을 제공한다. 모바일도 그래프로 진입하며 필터/본문은 별도의 닫을 수 있는 패널로 연다. Three.js/OrbitControls와 d3-force-3d로 실제 연결에 따른 배치·회전·확대·노드 이동을 구현한다. 2D 배치, 태그/종류/관계 필터, 색상/간격/라벨/초기화, 목록과 키보드 대체 탐색을 연결한다.

## 인수 기준

```bash
node --no-warnings --test --experimental-strip-types lib/brain-layout.test.ts lib/brain.test.ts
npm run test
npm run lint
npm run typecheck
npm run build
git diff --check
```

## 검증

1. 기존 화면에서 전체 화면/기본 닫힘 패널 RED, 배치/필터 단위 RED를 먼저 확인한다.
2. 실제 WebGL 렌더링과 3D/2D 배치, 검색/선택/뒤로 이동/닫기/초기화, WebGL 불가 시 목록을 확인한다.
3. 1440/1024/768/390/320px 화면과 모바일 필터/본문 focus, Escape, reduced motion을 확인한다.
4. 공개 카탈로그, Home/레이더, 기존 상세 URL과 개인정보 경계가 유지되는지 diff로 확인한다.

## 하지 말 것

- 타인의 Memory 내용·브랜딩이나 회사 Wiki를 가져오지 않는다. 승인된 H-Log 기록만 사용한다.
- 노드 수를 부풀리지 않는다. 실제 기록·관계로 그린다.
- 작동하지 않는 채팅/언어 선택을 복제하지 않는다. 상단은 실제 기록 검색이다.
- OCI/운영 배포를 실행하지 않는다. 기존 보류가 유지된다.
