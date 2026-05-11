import test from "node:test"
import assert from "node:assert/strict"
import { mkdtemp, readFile, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { createFixtureSessions } from "./fixture-data.mjs"
import { loadNormalizedSessions } from "../skills/codex-insights/scripts/lib/load-sessions.mjs"
import {
  buildSessionSummary,
  buildSessionSummaries,
} from "../skills/codex-insights/scripts/lib/summaries.mjs"
import { buildAggregateReportData } from "../skills/codex-insights/scripts/lib/aggregate.mjs"
import { buildReportFacts } from "../skills/codex-insights/scripts/lib/report-facts.mjs"
import { renderMarkdownReport } from "../skills/codex-insights/scripts/lib/markdown-report.mjs"
import { renderHtmlReport } from "../skills/codex-insights/scripts/lib/html-report.mjs"
import { parseCliArgs } from "../skills/codex-insights/scripts/lib/cli.mjs"

const execFileAsync = promisify(execFile)
const REPO_ROOT = "/home/duu/code/codex-insights"

async function loadFixtureSummaries() {
  const { root } = await createFixtureSessions()
  const sessions = await loadNormalizedSessions({ root })
  return buildSessionSummaries(sessions)
}

function buildFakeAnalysis() {
  return {
    sections: {
      at_a_glance: {
        status: "ok",
        data: {
          whats_working: "Inspection-heavy sessions are landing concise summaries quickly.",
          whats_hindering: "Tool failures appear in roughly half the runs.",
          quick_wins: "Add a deterministic failure taxonomy in the report.",
          ambitious_workflows: "Move to a session-typed prompt template per project area.",
        },
      },
      project_areas: {
        status: "ok",
        data: {
          areas: [
            { name: "Repository inspection", session_count: 2, description: "Read-and-summarize loops over repo state." },
            { name: "Test triage", session_count: 1, description: "Investigating failing CI runs." },
          ],
        },
      },
      what_works: {
        status: "ok",
        data: {
          intro: "The user reliably converts inspection into focused conclusions.",
          impressive_workflows: [
            { title: "Inspect-then-summarize", description: "Open files via exec_command then synthesize risks." },
          ],
        },
      },
      friction_analysis: {
        status: "ok",
        data: {
          intro: "Tool failures dominate the friction signal.",
          categories: [
            { category: "exec_command failures", description: "Command runs that exit non-zero block follow-up steps.", examples: ["session-fixture-2 hit ENOENT on TODO.md"] },
          ],
        },
      },
      interaction_style: {
        status: "ok",
        data: {
          narrative: "The user sends short, focused prompts and acts on the first synthesis.",
          key_pattern: "One-shot inspection followed by a one-paragraph conclusion.",
        },
      },
      suggestions: {
        status: "ok",
        data: {
          agents_md_additions: [
            {
              title: "Test-first loops",
              instruction: "Ask Codex to run the relevant test after code edits.",
              evidence: "Fixture sessions include repeated test triage and tool failures.",
            },
          ],
          features_to_try: [
            {
              title: "Report harness",
              why: "The user iterates on Markdown output with fixture data.",
              how_to_try: "Use --analysis-file before spending SDK calls.",
            },
          ],
          usage_patterns: [
            {
              pattern: "Inspection before synthesis",
              recommendation: "Keep asking for repository scans before implementation.",
            },
          ],
        },
      },
      on_the_horizon: {
        status: "ok",
        data: {
          intro: "The next opportunity is to turn repeated inspection loops into reusable workflows.",
          opportunities: [
            {
              title: "Reusable report review",
              whats_possible: "Codex can compare two generated reports and identify quality regressions.",
              how_to_try: "Generate baseline and candidate reports from the same fixtures.",
              copyable_prompt: "Compare these two reports and identify regressions in specificity.",
            },
          ],
        },
      },
      fun_ending: {
        status: "ok",
        data: {
          headline: "The logs are learning to talk",
          detail: "Most sessions start with inspection and end with concise synthesis. That is a good shape for an insights workflow.",
        },
      },
    },
    facets: [],
    cache_stats: { hits: 0, llm_calls: 0 },
    summary: {
      ok: [
        "project_areas",
        "what_works",
        "friction_analysis",
        "interaction_style",
        "suggestions",
        "on_the_horizon",
        "fun_ending",
        "at_a_glance",
      ],
      errors: [],
    },
  }
}

test("buildSessionSummary computes deterministic metrics and snippets", async () => {
  const { root } = await createFixtureSessions()
  const sessions = await loadNormalizedSessions({ root, limit: 1 })
  const summary = buildSessionSummary(sessions[0])

  assert.equal(summary.session_id, "session-fixture-4")
  assert.equal(summary.user_message_count, 2)
  assert.equal(summary.assistant_message_count, 3)
  assert.equal(summary.tool_call_count, 2)
  assert.equal(summary.tool_failure_count, 1)
  assert.equal(summary.duration_seconds, 10)
  assert.deepEqual(summary.tool_counts, { exec_command: 2 })
  assert.equal(
    summary.last_assistant_message,
    "The next steps are to isolate shared fixtures, rerun the failing suite, and compare recent setup changes.",
  )
})

test("buildSessionSummary returns null duration when timestamps are malformed", async () => {
  const { root } = await createFixtureSessions()
  const sessions = await loadNormalizedSessions({ root })
  const summary = sessions
    .map((session) => buildSessionSummary(session))
    .find((item) => item.session_id === "session-fixture-3")

  assert.equal(summary.duration_seconds, null)
  assert.equal(summary.warning_count, 1)
  assert.deepEqual(summary.observed_system_events, ["task_started"])
})

test("aggregate report data and report facts stay stable for fixture input", async () => {
  const summaries = await loadFixtureSummaries()
  const reportData = buildAggregateReportData(summaries, {
    generatedAt: "2026-05-14T00:00:00.000Z",
  })
  const reportFacts = buildReportFacts(reportData)

  assert.equal(reportData.session_count, 4)
  assert.equal(reportData.total_tool_calls, 4)
  assert.equal(reportData.total_tool_failures, 2)
  assert.equal(reportData.total_warnings, 2)
  assert.equal(reportData.total_tokens, 120)
  assert.equal(reportData.filtered_session_count, 1)
  assert.equal(reportData.analysis_session_count, 3)
  assert.deepEqual(reportData.tool_counts, { exec_command: 4 })
  assert.deepEqual(reportData.tool_error_categories, { exec_command: 2 })
  assert.equal(reportFacts.sessions.length, 4)
  assert.equal(reportFacts.totals.tool_failures, 2)
  assert.equal(reportFacts.cwd_distribution[0].name, "/workspace/another-project")
})

test("parseCliArgs supports format and quiet options", () => {
  const options = parseCliArgs(["--format", "html", "--quiet", "--include-trivial"])

  assert.equal(options.format, "html")
  assert.equal(options.quiet, true)
  assert.equal(options.includeTrivial, true)
})

test("renderMarkdownReport emits all narrative sections and stats", async () => {
  const summaries = await loadFixtureSummaries()
  const reportData = buildAggregateReportData(summaries, {
    generatedAt: "2026-05-14T00:00:00.000Z",
  })
  const markdown = renderMarkdownReport({ reportData, analysis: buildFakeAnalysis() })

  assert.match(markdown, /^# Codex Insights Report/m)
  assert.match(markdown, /^## At a Glance$/m)
  assert.match(markdown, /^## Project Areas$/m)
  assert.match(markdown, /^## What Works$/m)
  assert.match(markdown, /^## Friction Analysis$/m)
  assert.match(markdown, /^## Interaction Style$/m)
  assert.match(markdown, /^## Suggestions$/m)
  assert.match(markdown, /^## On The Horizon$/m)
  assert.match(markdown, /^## Fun Ending$/m)
  assert.match(markdown, /^## Stats$/m)
  assert.match(markdown, /^### Token Usage$/m)
  assert.match(markdown, /^### Session Quality Signals$/m)
  assert.match(markdown, /Repository inspection/)
  assert.match(markdown, /Inspect-then-summarize/)
})

test("renderHtmlReport emits self-contained insights sections and stats", async () => {
  const summaries = await loadFixtureSummaries()
  const reportData = buildAggregateReportData(summaries, {
    generatedAt: "2026-05-14T00:00:00.000Z",
  })
  const html = renderHtmlReport({ reportData, analysis: buildFakeAnalysis() })

  assert.match(html, /^<!DOCTYPE html>/)
  assert.match(html, /<title>Codex Insights Report<\/title>/)
  assert.match(html, /<h2>At a Glance<\/h2>/)
  assert.match(html, /<h2>Project Areas<\/h2>/)
  assert.match(html, /<h2>What Works<\/h2>/)
  assert.match(html, /<h2>Friction Analysis<\/h2>/)
  assert.match(html, /<h2>Interaction Style<\/h2>/)
  assert.match(html, /<h2>Suggestions<\/h2>/)
  assert.match(html, /<h2>On The Horizon<\/h2>/)
  assert.match(html, /id="fun-ending"/)
  assert.match(html, /The logs are learning to talk/)
  assert.match(html, /<h2>Stats<\/h2>/)
  assert.match(html, /<h2>Session Snapshots<\/h2>/)
  assert.match(html, /Repository inspection/)
  assert.match(html, /Paste into Codex/)
  assert.match(html, /session-fixture-4/)
  assert.doesNotMatch(html, /<link\b/)
  assert.doesNotMatch(html, /https:\/\/fonts/)
})

test("renderHtmlReport escapes dynamic report content", () => {
  const reportData = buildAggregateReportData([], {
    generatedAt: "2026-05-14T00:00:00.000Z",
  })
  const html = renderHtmlReport({
    reportData,
    analysis: {
      sections: {
        at_a_glance: {
          status: "ok",
          data: {
            whats_working: "<script>alert(1)</script> & \"quoted\"",
            whats_hindering: "safe",
            quick_wins: "safe",
            ambitious_workflows: "safe",
          },
        },
        project_areas: { status: "ok", data: { areas: [] } },
        what_works: { status: "ok", data: { intro: "ok", impressive_workflows: [] } },
        friction_analysis: { status: "ok", data: { intro: "ok", categories: [] } },
        interaction_style: { status: "ok", data: { narrative: "n", key_pattern: "k" } },
        suggestions: {
          status: "ok",
          data: { agents_md_additions: [], features_to_try: [], usage_patterns: [] },
        },
        on_the_horizon: {
          status: "ok",
          data: {
            intro: "ok",
            opportunities: [
              {
                title: "Unsafe prompt",
                whats_possible: "ok",
                how_to_try: "ok",
                copyable_prompt: "<img src=x onerror=alert(1)>",
              },
            ],
          },
        },
        fun_ending: { status: "ok", data: { headline: "h", detail: "d" } },
      },
      cache_stats: { hits: 0, llm_calls: 0 },
    },
  })

  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt; &amp; &quot;quoted&quot;/)
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/)
  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/)
  assert.doesNotMatch(html, /<img src=x onerror=alert\(1\)>/)
})

test("renderMarkdownReport surfaces section-level errors in a notes block", () => {
  const reportData = buildAggregateReportData([], {
    generatedAt: "2026-05-14T00:00:00.000Z",
  })
  const markdown = renderMarkdownReport({
    reportData,
    analysis: {
      sections: {
        at_a_glance: { status: "error", error: "model returned non-JSON" },
        project_areas: { status: "error", error: "schema mismatch" },
        what_works: { status: "ok", data: { intro: "ok", impressive_workflows: [] } },
        friction_analysis: { status: "ok", data: { intro: "ok", categories: [] } },
        interaction_style: { status: "ok", data: { narrative: "n", key_pattern: "k" } },
        suggestions: { status: "error", error: "schema mismatch" },
        on_the_horizon: { status: "ok", data: { intro: "ok", opportunities: [] } },
        fun_ending: { status: "ok", data: { headline: "h", detail: "d" } },
      },
      cache_stats: { hits: 1, llm_calls: 4 },
    },
  })

  assert.match(markdown, /## Section Generation Notes/)
  assert.match(markdown, /at_a_glance.*model returned non-JSON/s)
  assert.match(markdown, /project_areas.*schema mismatch/s)
  assert.match(markdown, /suggestions.*schema mismatch/s)
  assert.match(markdown, /Facet cache hits: 1/)
})

test("build-report script renders markdown end to end with an analysis file", async () => {
  const { root } = await createFixtureSessions()
  const tempDir = await mkdtemp(join(tmpdir(), "codex-insights-report-test-"))
  const analysisFile = join(tempDir, "analysis.json")
  const outputFile = join(tempDir, "report.md")

  await writeFile(analysisFile, JSON.stringify(buildFakeAnalysis(), null, 2), "utf8")

  const { stdout, stderr } = await execFileAsync(
    "node",
    [
      "skills/codex-insights/scripts/build-report.mjs",
      "--root",
      root,
      "--analysis-file",
      analysisFile,
      "--output-file",
      outputFile,
    ],
    { cwd: REPO_ROOT },
  )

  assert.equal(stdout, "")
  assert.match(stderr, /\[codex-insights\] loaded 4 sessions/)
  assert.match(stderr, /\[codex-insights\] selected 3 sessions for narrative analysis; filtered 1 trivial sessions/)
  assert.match(stderr, /\[codex-insights\] loading analysis from /)
  assert.match(stderr, /\[codex-insights\] rendering markdown report/)
  assert.match(stderr, /\[codex-insights\] wrote markdown report to /)
  const report = await readFile(outputFile, "utf8")
  assert.match(report, /^## At a Glance$/m)
  assert.match(report, /^## Suggestions$/m)
  assert.match(report, /Repository inspection/)
  assert.match(report, /Trivial sessions filtered from narrative analysis: 1/)
  assert.match(report, /session-fixture-4/)
})

test("build-report script renders html end to end with an analysis file", async () => {
  const { root } = await createFixtureSessions()
  const tempDir = await mkdtemp(join(tmpdir(), "codex-insights-report-html-test-"))
  const analysisFile = join(tempDir, "analysis.json")
  const outputFile = join(tempDir, "report.html")

  await writeFile(analysisFile, JSON.stringify(buildFakeAnalysis(), null, 2), "utf8")

  const { stdout, stderr } = await execFileAsync(
    "node",
    [
      "skills/codex-insights/scripts/build-report.mjs",
      "--root",
      root,
      "--analysis-file",
      analysisFile,
      "--format",
      "html",
      "--output-file",
      outputFile,
    ],
    { cwd: REPO_ROOT },
  )

  assert.equal(stdout, "")
  assert.match(stderr, /\[codex-insights\] rendering html report/)
  assert.match(stderr, /\[codex-insights\] wrote html report to /)
  const report = await readFile(outputFile, "utf8")
  assert.match(report, /^<!DOCTYPE html>/)
  assert.match(report, /<h2>At a Glance<\/h2>/)
  assert.match(report, /<h2>Suggestions<\/h2>/)
  assert.match(report, /Repository inspection/)
  assert.match(report, /Trivial sessions filtered from narrative analysis: 1/)
  assert.match(report, /session-fixture-4/)
})

test("build-report script suppresses progress output with quiet", async () => {
  const { root } = await createFixtureSessions()
  const tempDir = await mkdtemp(join(tmpdir(), "codex-insights-report-quiet-test-"))
  const analysisFile = join(tempDir, "analysis.json")
  const outputFile = join(tempDir, "report.md")

  await writeFile(analysisFile, JSON.stringify(buildFakeAnalysis(), null, 2), "utf8")

  const { stdout, stderr } = await execFileAsync(
    "node",
    [
      "skills/codex-insights/scripts/build-report.mjs",
      "--root",
      root,
      "--analysis-file",
      analysisFile,
      "--output-file",
      outputFile,
      "--quiet",
    ],
    { cwd: REPO_ROOT },
  )

  assert.equal(stdout, "")
  assert.equal(stderr, "")
})
