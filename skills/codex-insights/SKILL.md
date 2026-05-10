---
name: codex-insights
description: Analyze local Codex session files by discovering JSONL transcripts, normalizing raw records into a stable session event model, and preparing deterministic artifacts for later insights reporting.
---

# Codex Insights

Use this skill when the user wants to inspect Codex session activity or build an insights-style workflow on top of local Codex transcripts.

## What This Version Does

This version provides a deterministic ingestion layer only.
It can:

- discover local Codex session files
- parse JSONL transcript records
- normalize raw records into a stable session schema
- emit JSON artifacts for later analytics and reporting

It does not yet generate metrics, semantic summaries, or user-facing reports.

## Workflow

1. Use the scripts in `scripts/` as the primary execution surface.
2. Prefer fixture-based validation before using local session data.
3. Read [references/normalized-event-model.md](references/normalized-event-model.md) when you need the current normalized schema or supported raw record families.

## Scripts

- `node skills/codex-insights/scripts/discover-sessions.mjs --root fixtures/codex-sessions --pretty`
- `node skills/codex-insights/scripts/normalize-session.mjs --file fixtures/codex-sessions/2026/05/10/rollout-fixture-1.jsonl --pretty`
- `node skills/codex-insights/scripts/normalize-sessions.mjs --root fixtures/codex-sessions --pretty`

## Guidance

- Use the deterministic normalized output as the source of truth for later analytics.
- Preserve `warnings` and `raw_ref` fields because the Codex session schema may evolve.
- Do not invent semantic interpretation in this phase. If the user asks for insights, explain that this stage only prepares trustworthy normalized data for later analysis.
