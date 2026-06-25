---
name: grill-me
description: "Use when the user wants a plan, architecture, workflow, or product decision stress-tested with direct questions and recommended answers."
---

# Grill Me

Use this skill to pressure-test a plan until the decision tree is clear.

## Method

1. Identify the decision being tested.
2. Read relevant repo documents or code if the answer can be discovered locally.
3. Ask one high-leverage question at a time unless the user explicitly asks for a list.
4. For each question, include the recommended answer.
5. Resolve dependencies between decisions before moving to lower-level details.
6. End with explicit open decisions, risks, and the next concrete action.

## H-Log Focus Areas

- MVP file-based blog vs automated DB platform transition
- Public privacy boundaries
- "I tried this" evidence requirements for generated posts
- Visitor chatbot exclusion
- OCI/Docker/Nginx deployment responsibility
- DB/worker/public route state transitions
- SEO and content ownership

## Output Shape

Prefer Korean by default for this repository.

Use this pattern:

```text
질문: ...
추천 답변: ...
이 답변이면 다음 결정은 ...
```

If the user asks for a direct checklist, provide a compact checklist instead of one-by-one interviewing.
