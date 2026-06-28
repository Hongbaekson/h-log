---
name: handdrawn-diagrams
description: Create hand-drawn style architecture and workflow diagrams as SVG assets and wire them into markdown or HTML docs. Use when the user asks for sketchy, handdrawn, whiteboard, diagram, architecture, flow, or visual planning output.
---

# Handdrawn Diagrams

## Quick Start

Use SVG for diagrams that need to live in repo docs or HTML pages. Prefer a whiteboard/paper background, slightly irregular strokes, rounded boxes, handwritten-feeling labels, and clear directional arrows.

## Workflow

1. Identify the exact diagram purpose and audience.
2. Extract only the core components, boundaries, and trust decisions.
3. Layout left-to-right for request/flow diagrams and top-to-bottom for lifecycle diagrams.
4. Use grouped boxes for trust boundaries such as "Company Edge" or "Bot Backend".
5. Emphasize critical security controls with warning tags or red strokes.
6. Save the diagram as a standalone SVG asset next to the document.
7. Link the SVG from the HTML/markdown instead of embedding a large inline blob.

## Style Rules

- Use a light paper background and dark ink strokes.
- Use simple shapes, small wobble offsets, and non-perfect lines for a hand-drawn feel.
- Keep text short enough to read at the document's displayed width.
- Use color sparingly: green for safe/backend controls, yellow for edge/approval, red for risky boundaries, purple for LLM/agent worker.
- Include an accessible title/description in the SVG when practical.

## Security Diagram Checklist

- Show the trust boundary explicitly.
- Show signature verification before persistence or processing.
- Show queue/audit before asynchronous workers.
- Keep LLM/agent worker behind the deterministic backend boundary.
- Show that write actions go through backend policy, preview, approval, and audit.
