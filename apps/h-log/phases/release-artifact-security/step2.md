# Step 2 bound-standalone-file-tracing

standalone에 필요한 파일만 포함시킨다. A1의 패치된 빌드에서 같은 현상이 남는지 먼저 확인한다.

## 읽을 파일

앱 디렉터리를 기준으로 한다. [검토 근거와 실행 순서](../../.codex/docs/harness/SECURITY_PERFORMANCE_REVIEW_2026-11-19.md), [PRD](../../.codex/docs/harness/PRD.md), [ADR](../../.codex/docs/harness/ADR.md), [아키텍처](../../.codex/docs/harness/ARCHITECTURE.md), [워크플로](../../.codex/docs/harness/WORKFLOW.md), [실행 루프](../../.codex/docs/harness/AGENT_LOOP.md), [구현 계획](../../.codex/docs/harness/IMPLEMENTATION_PLAN.md)을 함께 읽는다.

- `AGENTS.md`
- `../../AGENTS.md`
- `../../.codex/skills/harness/SKILL.md`
- `../../.codex/skills/tdd/SKILL.md`
- `next.config.ts`
- `Dockerfile`
- `.dockerignore`
- `lib/blog-thumbnails.ts`
- `lib/blog-public.test.ts`
- `lib/public-blog-list.ts`
- `package.json`
- `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/output.md`

## 작업

깨끗한 임시 checkout에서 가짜 private 파일·배포 env·정상 공개 썸네일을 만들고 standalone과 라우트별 NFT 목록을 집계한다. 두 동적 파일 접근 경고의 실제 입력을 확인해 추적 루트를 좁히거나 필요한 제외 규칙을 둔다. 패치 버전에서 경계가 이미 만족되면 검증만 기록한다.

## 인수 기준

직접 빌드한 standalone과 Docker runner 모두에서 비공개 표식·운영 env·불필요한 phase 문서가 0개다. 파일 수와 바이트를 전후 비교하고 런타임에 필요한 공개 썸네일·static·이미지 처리 및 누락/손상 fallback을 확인한다. 기존 hash/공개 검증을 통과해야 한다.

## 검증

앱 디렉터리에서 실행한다. 동작 변경은 해당 경로의 실패하는 회귀 검사를 먼저 확인한다. Compose 명령은 격리된 로컬 테스트 프로젝트를 지정한 세션에서 수행한다.

```sh
npm run build
node --no-warnings --experimental-strip-types --test lib/blog-public.test.ts
# 임시 checkout에서만 runner를 만든다.
docker build --target runner -t hlog-trace-check .
```

검증 결과와 남은 제한을 이 phase의 `index.json`에 기록한다.

## 2026-11-20 검증 결과

A1 커밋 `d4e0fa3`과 A2 후보를 각각 깨끗한 디렉터리에 두고, 같은 합성 private JSON 1개·배포 설정 3개·SHA-256 파일명의 공개 PNG 1개로 비교했다. Node 24.19.0과 Next.js 16.4.6에서 측정한 일반 파일의 수와 크기다. 직접 빌드는 `.next/standalone`, Docker는 최종 runner의 `/app`을 집계했다.

| 산출물 | 전체 파일 수 | 전체 바이트 | private 파일 | 운영 env·Compose override | phase 문서 | 제외 경로를 참조한 라우트 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 직접 빌드 전 | 2,417 | 67,654,647 | 1 | 3 | 287 | 19/37 |
| 직접 빌드 후 | 1,756 | 62,834,436 | 0 | 0 | 0 | 0/37 |
| Docker 전 | 2,456 | 68,626,092 | 0 | 0 | 287 | 19/37 |
| Docker 후 | 1,800 | 63,935,539 | 0 | 0 | 0 | 0/37 |

- 썸네일 읽기 경로를 고정 디렉터리와 검증된 파일명으로 조합하자 전체 프로젝트 추적 경고 2건이 사라졌다. 중간 빌드에서 관리자 모니터링 라우트가 여전히 JSON 파일을 추적하는 것을 확인했다. 상태값 목록을 수집기의 파일 읽기 모듈에서 분리한 뒤 산출물과 서버 추적 목록 회귀 검사 2개가 모두 통과했다. CI에서도 합성 파일을 만든 뒤 빌드마다 같은 검사를 실행한다.
- 소스 트리 밖에 복사한 standalone과 Docker runner를 각각 격리 PostgreSQL에 연결했다. 두 서버 모두 공개 글과 정상 PNG, JS·CSS를 제공했고 프로필 이미지의 256px WebP를 디코딩했다. 서버 실행 중 PNG를 손상시킨 경우와 삭제한 경우 모두 다음 요청에서 글과 링크가 유지되고 썸네일만 빠졌다.
- 공개 글·모니터링 집중 검사 58개, 단위 테스트 305개(별도 DB가 필요한 29개 생략), projection 단위 6개, DB 통합 33개, projection DB 통합 33개가 통과했다. 타입 검사, lint와 production 빌드도 통과했다.

검증 대상은 위 합성 입력으로 새로 만든 산출물이다. 기존 운영 이미지의 포함 파일은 확인하지 않았다.

## 하지 말 것

실제 비공개 파일 내용이나 이름을 보고서에 복사하지 않는다. 개수·크기와 합성 표식으로 경계를 판정할 수 있다.
