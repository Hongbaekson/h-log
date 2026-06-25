# Step 1: file-based-list-and-detail

## 상태

Blocked.

## 보류 이유

수정된 `plans/automated-blog-publishing-plan.md`는 블로그 방향을 `DB + generated Markdown/HTML`, `PostgreSQL + pgvector`, 자동화 중심으로 변경했다. 따라서 파일 기반 `/blog` 목록과 `/blog/[slug]` 상세를 계속 구현하지 않는다.

## 다시 진행할 조건

- 사용자가 file-based MVP를 먼저 공개하겠다고 명시한다.
- `apps/h-log/.codex/docs/harness/PRD.md`, `ADR.md`, `ARCHITECTURE.md`가 file-based MVP 우선 방향으로 되돌아간다.
- DB 기반 수동 발행 phase보다 파일 기반 공개가 우선임을 phase registry에 기록한다.

## 하지 말 것

- 이 step을 임의로 진행하지 말 것. 이유: 현재 계획의 다음 실행 대상은 DB 기반 수동 발행이다.
- 파일 기반 route를 DB route와 동시에 확장하지 말 것. 이유: public exposure 규칙이 섞인다.
