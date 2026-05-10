# codex-insights

`codex-insights` is a Codex skill and script pipeline for analyzing local Codex session files and producing an insights-style Markdown report.

## Current Capabilities

- discover local Codex session JSONL files
- normalize raw transcript records into a stable session event model
- compute deterministic per-session summaries and cross-session report facts
- run a controlled Codex analysis prompt over those facts
- render a final Markdown report with fixed sections plus model-generated insights

## Workflow

The current pipeline is:

1. `discover-sessions`
2. `normalize-sessions`
3. `build-session-summaries`
4. `build-report-facts`
5. `build-report`

The LLM analysis layer only receives structured report facts. It does not read raw transcript files directly.

## Scripts

- `node skills/codex-insights/scripts/discover-sessions.mjs --root /path/to/sessions --pretty`
- `node skills/codex-insights/scripts/normalize-sessions.mjs --root /path/to/sessions --pretty`
- `node skills/codex-insights/scripts/build-session-summaries.mjs --root /path/to/sessions --pretty`
- `node skills/codex-insights/scripts/build-report-facts.mjs --root /path/to/sessions --pretty`
- `node skills/codex-insights/scripts/build-report.mjs --root /path/to/sessions`
- `node skills/codex-insights/scripts/build-report.mjs --root /path/to/sessions --output-file ./report.md`

For deterministic testing or prompt iteration, `build-report` also accepts:

- `--analysis-file /path/to/analysis.json`
- `--output-file /path/to/report.md`

That bypasses live model execution and injects a prebuilt structured analysis payload.

## Prompting Notes

- Prompt templates live under `skills/codex-insights/prompts/`.
- The report style is inspired by Claude Code `/insights`.
- Any inferred Claude behavior should be documented as inference rather than stated as a verified implementation detail.

## Testing

- `npm test`

## Current Limits

- Deterministic automated tests cover the pipeline through `--analysis-file` injection rather than live Codex model execution.
- Live `codex exec` analysis is supported by `build-report`, but it still depends on local Codex CLI availability and authentication outside the fixture test path.
