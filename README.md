# codex-insights

`codex-insights` is a Codex skill and script pipeline that turns local
Codex session JSONL transcripts into a Claude Code `/insights`-style
Markdown report.

## Current Capabilities

- discover local Codex session JSONL files
- normalize raw transcript records into a stable session event model
- compute deterministic per-session summaries and cross-session report
  facts (tool counts, tool errors by category, user interruption
  signal, token usage, message-hour histogram, overlap and
  retry-like signals)
- filter trivial sessions out of LLM-driven narrative analysis by
  default while keeping them counted in deterministic stats
- extract per-session semantic facets (goal, outcome, friction,
  primary success, brief summary) via `@openai/codex-sdk` with strict
  `outputSchema`, cached on disk by session content hash
- generate four narrative sections in parallel (project_areas,
  interaction_style, what_works, friction_analysis) and synthesize an
  at-a-glance executive summary
- render a Markdown report with all five sections plus stats, session
  snapshots, and run metadata

## Architecture

Two layers, separated on purpose:

1. **Deterministic** — `discover` → `normalize` → `summaries` →
   `aggregate` → `report-facts`. Pure functions on local files, no
   network.
2. **LLM-driven, multi-pass** — facet extraction per session
   (cached) → 4 parallel narrative sections → at-a-glance synthesis.
   All calls go through `lib/codex-client.mjs`, which wraps
   `@openai/codex-sdk` with `outputSchema`, read-only sandbox, and
   `approvalPolicy: never`.

Section prompts receive a structured JSON context; no section prompt
ever sees a raw transcript directly.

## Required Setup

The narrative pipeline runs through `@openai/codex-sdk`, which shells
out to the local `codex` CLI. You need:

- Node.js 18 or newer
- the `codex` CLI installed and authenticated for your account
- (optional) `OPENAI_API_KEY` if you want to bypass interactive auth

The deterministic pipeline alone does not need any of the above.

## Scripts

```bash
node skills/codex-insights/scripts/discover-sessions.mjs --root <root> --pretty
node skills/codex-insights/scripts/normalize-sessions.mjs --root <root> --pretty
node skills/codex-insights/scripts/build-session-summaries.mjs --root <root> --pretty
node skills/codex-insights/scripts/build-report-facts.mjs --root <root> --pretty
node skills/codex-insights/scripts/extract-session-facets.mjs --root <root> --pretty
node skills/codex-insights/scripts/build-report.mjs --root <root> --output-file ./report.md
node skills/codex-insights/scripts/build-report.mjs --root <root> --analysis-file ./analysis.json
node skills/codex-insights/scripts/smoke-codex-sdk.mjs --prompt "ping"
```

`build-report` and `extract-session-facets` accept:

- `--cache-dir <path>` to override `<repo>/.codex-insights/cache/facets`
- `--force` to ignore the facet cache
- `--model <name>` to override the SDK model
- `--include-trivial` to include very short no-tool sessions in facet
  extraction and narrative generation

By default, sessions with `event_count <= 5`, no tool calls, and at
most one user message are treated as trivial. They remain in the
stats block, but are skipped for facet extraction and narrative
generation so low-signal warmups do not dilute the report.

`--analysis-file` injects a prebuilt `{ sections, facets }` payload
into the renderer so you can iterate on Markdown layout without
spending LLM calls. It is a rendering harness only — every PR that
changes prompts or analysis logic is verified end to end with the
real SDK path (see Testing below).

## Caching

Facet extraction writes JSON files under
`<repo>/.codex-insights/cache/facets/<session-id>.json`. The cache key
is a SHA-256 hash of the session content (event types, roles, tool
names, statuses, text lengths). Editing one session invalidates that
one file; the rest stays cached.

## Testing

```bash
npm test
```

Unit tests cover summary computation, aggregation, facet schema
validation, facet caching, narrative-section orchestration, and
Markdown rendering. They use a fake codex client and never call the
real SDK.

End-to-end verification (real SDK + real model) is a manual or
opt-in step:

```bash
CODEX_INSIGHTS_E2E=1 node --test tests/integration/sdk-end-to-end.test.mjs
```

When the env flag is unset the integration test skips itself so CI
does not require codex CLI auth or network.

## Current Limits

- Live `codex exec --json` is the only model path; HTML output,
  line-diff metrics, and the `suggestions` / `on_the_horizon` /
  `fun_ending` narrative sections are deliberately deferred.
- Retry-like sessions are flagged deterministically but not deduplicated
  or filtered yet.
- The integration test does not assert on narrative wording; it
  asserts that all five sections produced valid JSON and that the
  facet cache invalidates correctly.
