# Step 0: codex-skill-adapter

## 상태와 선행 조건

completed — 2026-11-03 Codex용 선별 지침 이식·실제 스킬 검색·수동 호출 범위 검수 완료. 전체 SEO 감사는 Step 1에 남아 있다.

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

## 완료 기록 — 2026-11-03

관리자 로컬 단계가 완료되고 OCI 운영 보류가 남아 있어 기존 SEO 계획의 첫 로컬 단계를 진행했다. 이 단계는 **Codex 지침 이식**이며 전체 SEO 감사나 앱 최적화 완료가 아니다.

### 산출물

- [hlog-seo/SKILL.md](../../../../.agents/skills/hlog-seo/SKILL.md): 감사/수정 구분, source/local/public 모드, 명시 공개 origin·redirect/subresource 범위, 비공개 경로·credential 제외, 안전한 결과 기록.
- [검사 기준](../../../../.agents/skills/hlog-seo/references/checks.md): page/technical/schema/sitemap/content/images/GEO의 실제 점검 항목을 한국어 포트폴리오와 H-Log 공개 계약에 맞게 재작성했다. 단순 링크 모음이나 원본 installer 복제가 아니다.
- [출처](../../../../.agents/skills/hlog-seo/references/upstream.md)와 [LICENSE](../../../../.agents/skills/hlog-seo/LICENSE): 고정 commit의 7개 지침 경로·Git blob hash·채택/제외 사항과 원본 MIT 저작권/허가를 보존했다.

### 검증

1. 원본 `6be93f45064ffbadced572b5d5c95f55fd263af0`에서 원문 7개와 LICENSE를 읽고 각각 `SHA1(blob <bytes>\0 + content)`가 고정 tree의 Git blob SHA와 일치함을 확인했다. 원격 설치 프로그램·Python requirements·hook·extension·병렬 agent는 실행하지 않았다.
2. `python -X utf8 .../skill-creator/scripts/quick_validate.py .agents/skills/hlog-seo` 통과. 첫 검사에서 발견한 YAML 설명의 콜론 표기를 folded scalar로 고쳤다. 상대 링크·phase JSON·출처/라이선스의 실제 경로와 `git diff --check`도 확인했다.
3. Codex **0.166.0-alpha.5.1**의 읽기 전용 app-server `skills/list`에 루트/앱 cwd와 `forceReload: true`를 전달했다. 두 위치 모두 `name=hlog-seo`, `scope=repo`, `enabled=true`, 동일 SKILL.md 경로 1개·해당 스킬 오류 0건을 반환했다. 새 채팅/모델 호출·전역 설정 변경은 없었다.
4. `$hlog-seo source ... robots.txt ...` 입력을 현재 Codex에서 수동 적용해 실제 스킬·참고 파일·공개 route/origin 소스를 읽었다. **기존 SEO 3 suite / 7 tests 통과**. HTTP/JS/no-JS·실제 색인은 미측정으로 구분했다.
5. 일반 관리자 버튼 간격 수정 입력은 SEO 감사 비선택, 명시적인 private admin URL+소유자 키 요청은 감사 범위 거부로 확인했다. 인증 자료와 관리자 URL을 읽거나 호출하지 않았다. 이 세 사례는 수동 경로 검수이며 별도 모델의 자동 선택률 측정은 아니다.
6. `codex debug prompt-input`은 metadata·명시 호출 문구만 렌더링했다. 이 도구의 결과만으로 스킬 전문 자동 주입을 주장하지 않으며 전문 읽기/적용 근거는 위의 실제 파일 읽기와 source 검수다.

원문·discovery JSON·입력 검수·기준선 로그는 Git 제외 `private/seo-adapter/`에 있다. 스킬에 실행 런처/새 패키지가 없어 설치·Windows 공백 경로의 실행기 테스트는 해당하지 않는다. 앱 코드·UI·DB·배포는 변경하지 않아 전체 앱 build나 브라우저 감사를 반복하지 않았다.

### 남은 일

SEO는 **completed 1 / pending 8 / blocked 1**. 다음 로컬 단계는 **S1 Step 1 `public-audit-baseline`**으로, 합성 공개 ingress에서 실제 HTTP/초기 HTML/JS/no-JS 기준선과 우선순위를 수집한다. 관리자 16/0/1과 모니터링 7/0/1, OCI·실제 발행·GSC 제출·timer 보류는 유지한다.
