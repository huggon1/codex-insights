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
    },
    facets: [],
    cache_stats: { hits: 0, llm_calls: 0 },
    summary: { ok: ["project_areas", "what_works", "friction_analysis", "interaction_style", "at_a_glance"], errors: [] },
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
  assert.match(markdown, /^## Stats$/m)
  assert.match(markdown, /^### Token Usage$/m)
  assert.match(markdown, /^### Session Quality Signals$/m)
  assert.match(markdown, /Repository inspection/)
  assert.match(markdown, /Inspect-then-summarize/)
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
      },
      cache_stats: { hits: 1, llm_calls: 4 },
    },
  })

  assert.match(markdown, /## Section Generation Notes/)
  assert.match(markdown, /at_a_glance.*model returned non-JSON/s)
  assert.match(markdown, /project_areas.*schema mismatch/s)
  assert.match(markdown, /Facet cache hits: 1/)
})

test("build-report script renders markdown end to end with an analysis file", async () => {
  const { root } = await createFixtureSessions()
  const tempDir = await mkdtemp(join(tmpdir(), "codex-insights-report-test-"))
  const analysisFile = join(tempDir, "analysis.json")
  const outputFile = join(tempDir, "report.md")

  await writeFile(analysisFile, JSON.stringify(buildFakeAnalysis(), null, 2), "utf8")

  const { stdout } = await execFileAsync(
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
  const report = await readFile(outputFile, "utf8")
  assert.match(report, /^## At a Glance$/m)
  assert.match(report, /Repository inspection/)
  assert.match(report, /Trivial sessions filtered from narrative analysis: 1/)
  assert.match(report, /session-fixture-4/)
})
