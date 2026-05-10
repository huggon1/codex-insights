---
name: codex-insights
description: Analyze local Codex session files end to end — discover JSONL transcripts, normalize raw records, extract per-session semantic facets via the codex SDK, generate a multi-section insights report, and render Markdown shaped after Claude Code /insights.
---

# Codex Insights

Use this skill when the user wants to inspect Codex session activity or
produce a Claude Code `/insights`-style report from local Codex
transcripts.

## What This Version Does

End-to-end local session analysis with a multi-pass narrative layer:

- discover local Codex session files and parse JSONL transcripts
- normalize raw records into a stable session schema
- compute deterministic per-session summaries and cross-session
  aggregate facts (tool errors by category, user interruption signal,
  message-hour histogram)
- extract per-session semantic facets (goal, outcome, friction,
  primary success, brief summary) via `@openai/codex-sdk` with strict
  `outputSchema`, cached on disk by content hash
- generate four narrative sections in parallel (project_areas,
  interaction_style, what_works, friction_analysis), then synthesize an
  at-a-glance summary on top of them
- render an insights-style Markdown report

It does not yet handle live `codex exec --json` runs, HTML output,
multi-clauding overlap detection, or token/line-diff metrics. Those are
explicitly deferred.

## Required Setup

The narrative pipeline runs through `@openai/codex-sdk`, which itself
shells out to the local `codex` CLI. You need:

- Node.js 18 or newer
- the `codex` CLI installed and authenticated for your account
- (optional) `OPENAI_API_KEY` if you want to bypass interactive auth

The deterministic pipeline (`discover`, `normalize`, summary, report
facts) does not require any of the above.

## Workflow

1. Use the scripts in `scripts/` as the primary execution surface.
2. Start from local persisted Codex session files
   (`~/.codex/sessions/...` or a fixture root).
3. The default `build-report.mjs` runs the full pipeline including
   facet extraction and section generation.
4. Pass `--analysis-file <path>` when iterating on Markdown rendering
   without spending real LLM calls. The injected file shape is
   `{ sections: { ... }, facets: [...] }`. Treat this strictly as a
   rendering harness — verification of analysis quality always uses
   the real SDK path.
5. Read [references/normalized-event-model.md](references/normalized-event-model.md)
   when you need the current normalized schema or supported raw record
   families.

## Scripts

```
node skills/codex-insights/scripts/discover-sessions.mjs --root <root> --pretty
node skills/codex-insights/scripts/normalize-sessions.mjs --root <root> --pretty
node skills/codex-insights/scripts/build-session-summaries.mjs --root <root> --pretty
node skills/codex-insights/scripts/build-report-facts.mjs --root <root> --pretty
node skills/codex-insights/scripts/extract-session-facets.mjs --root <root> --pretty
node skills/codex-insights/scripts/build-report.mjs --root <root> --output-file ./report.md
node skills/codex-insights/scripts/build-report.mjs --root <root> --analysis-file ./fixtures/analysis.json
node skills/codex-insights/scripts/smoke-codex-sdk.mjs --prompt "ping"
```

`build-report` accepts `--cache-dir <path>`, `--force` (ignore facet
cache), and `--model <name>` to override the SDK model.

## Caching

Facet extraction writes JSON files under
`<repo>/.codex-insights/cache/facets/<session-id>.json`. The cache
key is a SHA-256 hash of the session content (event types, roles,
tool names, statuses, text lengths). Editing a session invalidates
that one file only; all other sessions remain cached.

## Guidance

- Use the deterministic normalized output and report facts as the
  source of truth for later analytics.
- Preserve `warnings` and `raw_ref` fields because the Codex session
  schema may evolve.
- Section prompts get a structured JSON context; they should not be
  asked to inspect raw transcript files directly.
- Treat generated reports as artifacts unless the user explicitly asks
  to commit them.
- If the report style borrows from Claude Code `/insights`, describe
  that as an inferred direction rather than a guaranteed implementation
  match.
