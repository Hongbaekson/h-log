# Step 0: codex-skill-adapter

## 상태와 선행 조건

pending — 계획 등록이며 미구현/미실행.

없음. 이번 계획의 upstream 고정 자료와 현재 Codex 스킬 검색 경로를 다시 확인한다.

## 읽을 파일

경로는 저장소 루트 기준이다. S1 이후 생성된 adapter·감사 보고서와 앞 단계의 완료 기록도 먼저 읽는다. 아래 목록은 계획 등록 시 존재하는 파일이다.

- `AGENTS.md`
- `apps/h-log/AGENTS.md`
- `.codex/skills/harness/SKILL.md`
- `.codex/skills/sync-repos/SKILL.md`
- `apps/h-log/.codex/docs/harness/PRD.md`
- `apps/h-log/.codex/docs/harness/ADR.md`
- `apps/h-log/.codex/docs/harness/ARCHITECTURE.md`
- `apps/h-log/.codex/docs/harness/WORKFLOW.md`
- `apps/h-log/.codex/docs/harness/AGENT_LOOP.md`
- `apps/h-log/.codex/docs/harness/IMPLEMENTATION_PLAN.md`
- `apps/h-log/.codex/docs/harness/SEO_OPTIMIZATION_PLAN.md`
- `apps/h-log/.codex/rules/content-seo-privacy.md`
- `apps/h-log/phases/seo-codex-foundation/index.json`
- `.gitignore`
- `apps/h-log/package.json`
- `apps/h-log/lib/site-seo.test.ts`

## 작업

1. 현재 사용 가능한 skill-creator 지침을 읽고 루트 `.agents/skills/hlog-seo/`의 instruction-first adapter를 만든다. 동일 이름/기존 파일이 있으면 읽고 보존한다. 기존 `.codex/skills` 구조 전체를 옮기지 않는다.
2. 원본 commit `6be93f45064ffbadced572b5d5c95f55fd263af0`에서 page/technical/schema/sitemap/content/images/GEO 중 실제 필요한 참고 자료만 선별한다. LICENSE·원저작자·원본 경로/sha·변경점을 보존하고 단순 링크 모음만으로 이식 완료를 표시하지 않는다.
3. Claude의 slash command·tool 이름·model/agent 지정·plugin root·PostToolUse hook 의존을 Codex의 명시적 호출과 검증 명령으로 치환한다. audit와 fix를 구분하고 결과가 자동으로 코드/공개 글을 바꾸지 않게 한다. upstream의 병렬 agent 지시를 그대로 활성화하지 않는다.
4. 기본 작업은 기존 shell/HTTP·브라우저 도구로 수행한다. Python 도구를 포함해야 한다면 실행 전 의존 파일·네트워크/출력·Windows 경로를 검사하고 전용 환경에만 둔다. 원본 requirements 전체나 extension을 필요 없이 설치하지 않는다.
5. source/local/public 모드, 공개 origin allowlist, 비공개 경로 제외, 출력 위치와 비용/측정 한계를 스킬에 넣는다. loopback의 별도 테스트를 위해 원본 SSRF 검사를 전역 해제하지 않는다.

## 인수 기준

Codex가 `$hlog-seo`를 실제로 찾아 읽고 공개 URL 감사 지침을 올바르게 선택한다. 한국어 일반 코딩 요청에서는 불필요하게 동작하지 않으며 관리자 URL/credential/외부 설치 요청을 자동 수용하지 않는다.

## 검증

1. frontmatter name/description, 상대 참조·출처/sha·LICENSE를 파싱하고 모든 필요한 경로가 존재하는지 확인한다.
2. 명시 감사, 일반 코드 수정, 관리자 URL의 세 가지 입력으로 선택/비선택/범위 거부를 기록한다. installer·실제 공개 사이트 감사·유료 API 없이 먼저 smoke한다.
3. 런처를 새로 작성했다면 경로에 공백이 있는 환경·누락 도구·local/public 경계의 focused 검증을 추가한다. 실제 도구 없이 통과한 것으로 기록하지 않는다.

문서/JSON은 관련 파서·링크 검사와 `git diff --check`를 실행한다. 실행 도구를 새로 만들면 실제 smoke 결과와 실패 경계를 기록한다.

## 하지 말 것

- SEO 점수 때문에 비공개 데이터·관리 경로를 공개하지 말 것. 인증/공개 사본 정책이 SEO보다 우선한다.
- 근거 없는 경험·성과·검색량·구조화 데이터를 만들지 말 것. 기존 공개 근거와 한국어 작성 기준을 보존한다.
- 원격 installer·extension·새 provider·전체 upstream agent 실행을 자동 적용하지 말 것. 이 단계에서 필요한 자료와 도구만 사용한다.
- 운영 보류를 해제하거나 DNS/TLS·GSC 제출·실제 글/PDF 발행을 계획 승인만으로 수행하지 말 것. 로컬 변경과 외부 상태 변경은 별도 범위다.
- Home 레이더·승인된 Brain UI·DB published-current/hash를 SEO 작업에 섞어 전면 변경하지 말 것.

## 다음 단계

S1 Step 1 `public-audit-baseline`.
