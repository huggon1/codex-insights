---
name: codex-insights
description: Analyze local Codex session files by discovering JSONL transcripts, normalizing raw records, computing deterministic report facts, and rendering an insights-style Markdown report through a controlled Codex analysis prompt.
---

# Codex Insights

Use this skill when the user wants to inspect Codex session activity or build an insights-style workflow on top of local Codex transcripts.

## What This Version Does

This version provides an end-to-end local session analysis workflow.
It can:

- discover local Codex session files
- parse JSONL transcript records
- normalize raw records into a stable session schema
- compute deterministic session summaries and aggregate report facts
- run a constrained analysis prompt over the structured facts
- render an insights-style Markdown report

It does not yet analyze live `codex exec --json` runs or claim parity with Claude Code internals.

## Workflow

1. Use the scripts in `scripts/` as the primary execution surface.
2. Start from local persisted Codex session files.
3. Generate deterministic facts before invoking the analysis prompt.
4. Prefer fixture-based validation before using local session data.
5. Read [references/normalized-event-model.md](references/normalized-event-model.md) when you need the current normalized schema or supported raw record families.

## Scripts

- `node skills/codex-insights/scripts/discover-sessions.mjs --root fixtures/codex-sessions --pretty`
- `node skills/codex-insights/scripts/normalize-session.mjs --file fixtures/codex-sessions/2026/05/10/rollout-fixture-1.jsonl --pretty`
- `node skills/codex-insights/scripts/normalize-sessions.mjs --root fixtures/codex-sessions --pretty`
- `node skills/codex-insights/scripts/build-session-summaries.mjs --root fixtures/codex-sessions --pretty`
- `node skills/codex-insights/scripts/build-report-facts.mjs --root fixtures/codex-sessions --pretty`
- `node skills/codex-insights/scripts/build-report.mjs --root fixtures/codex-sessions`
- `node skills/codex-insights/scripts/build-report.mjs --root fixtures/codex-sessions --output-file ./codex-insights-report.md`

## Guidance

- Use the deterministic normalized output and report facts as the source of truth for later analytics.
- Preserve `warnings` and `raw_ref` fields because the Codex session schema may evolve.
- Keep analysis grounded in the generated facts payload. Do not let the model inspect raw transcript files directly.
- Treat generated reports as artifacts unless the user explicitly asks to commit them.
- If the report style borrows from Claude Code `/insights`, describe that as an inferred direction rather than a guaranteed implementation match.
