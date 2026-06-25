# Dogfood Codex Structure Analysis

분석 대상: `D:\dogfood\backend`

## 확인된 구조

```text
.codex/
├── agents/
│   └── code-reviewer.md
├── docs/
│   ├── PRD.md
│   ├── ADR.md
│   ├── ARCHITECTURE.md
│   ├── BACKEND_WORKFLOW.md
│   ├── AGENT_LOOP.md
│   ├── IMPLEMENTATION_PLAN.md
│   └── UI_GUIDE.md
└── skills/
    ├── harness/
    ├── tdd/
    ├── grill-me/
    └── sync-repos/

phases/
├── index.json
└── d01-webhook-mvp/
    ├── index.json
    ├── step0.md
    ├── step1.md
    └── ...
```

## 핵심 패턴

- `AGENTS.md`가 필수 문서 읽기 순서를 강제한다.
- `PRD.md`, `ADR.md`, `ARCHITECTURE.md`가 구현 판단의 기준이다.
- `AGENT_LOOP.md`가 한 번에 한 step만 실행하도록 제한한다.
- `BACKEND_WORKFLOW.md`가 상세 실행 규칙이다.
- `IMPLEMENTATION_PLAN.md`가 제품 계획을 Harness step 후보로 바꾼다.
- `phases/index.json`과 `phases/{task}/index.json`이 진행 상태를 기록한다.
- `stepN.md`는 독립 실행 가능한 작업 지시서다.
- production code 변경은 `tdd` skill을 함께 읽고 RED -> GREEN -> REFACTOR를 강제한다.

## H-Log 적용 방식

Dogfood의 backend 전용 항목은 그대로 복사하지 않고 H-Log에 맞게 바꾼다.

| Dogfood | H-Log |
| --- | --- |
| `.codex/docs/BACKEND_WORKFLOW.md` | `apps/h-log/.codex/docs/harness/WORKFLOW.md` |
| Go backend, PGMQ, Discord/GitHub webhook | Next.js personal site, blog, future automated publishing |
| `go test ./...` | `npm run test`, `npm run lint`, `npm run typecheck`, `npm run build` |
| `phases/` at backend root | `apps/h-log/phases/` |
| proto/schema/backend sync skill | h-log docs/app/deploy sync skill |

## 가져온 skill

- `harness`: phase/step 설계와 실행 기준
- `tdd`: production behavior 변경의 test-first 기준
- `grill-me`: 계획 압박 질문과 결정 트리 정리
- `sync-repos`: 원본은 proto/schema/backend 전용이므로 h-log 문서/앱/배포 동기화용으로 재작성

## 적용상 주의

- 현재 h-log 블로그 본선은 DB 기반 수동 발행부터 시작한다.
- 파일 기반 blog loader는 import/transition support로만 둔다.
- 자동 글이 실제 경험처럼 보이지 않도록 evidence gate를 강제해야 한다.
- 방문자 챗봇은 만들지 않는다.
