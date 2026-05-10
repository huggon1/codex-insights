import test from "node:test"
import assert from "node:assert/strict"
import { mkdtemp, readFile, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { createFixtureSessions } from "./fixture-data.mjs"
import { loadNormalizedSessions } from "../skills/codex-insights/scripts/lib/load-sessions.mjs"
import { buildSessionSummary, buildSessionSummaries } from "../skills/codex-insights/scripts/lib/summaries.mjs"
import { buildAggregateReportData } from "../skills/codex-insights/scripts/lib/aggregate.mjs"
import { buildReportFacts } from "../skills/codex-insights/scripts/lib/report-facts.mjs"
import { normalizeAnalysisOutput } from "../skills/codex-insights/scripts/lib/analysis-output.mjs"
import { buildAnalysisPrompt } from "../skills/codex-insights/scripts/lib/analysis-prompt.mjs"
import { renderMarkdownReport } from "../skills/codex-insights/scripts/lib/markdown-report.mjs"

const execFileAsync = promisify(execFile)

async function loadFixtureSummaries() {
  const { root } = await createFixtureSessions()
  const sessions = await loadNormalizedSessions({ root })
  return buildSessionSummaries(sessions)
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
  assert.deepEqual(reportData.tool_counts, { exec_command: 4 })
  assert.equal(reportFacts.sessions.length, 4)
  assert.equal(reportFacts.totals.tool_failures, 2)
  assert.equal(reportFacts.cwd_distribution[0].name, "/workspace/another-project")
})

test("analysis prompt includes structured report facts", async () => {
  const summaries = await loadFixtureSummaries()
  const reportFacts = buildReportFacts(buildAggregateReportData(summaries))
  const prompt = await buildAnalysisPrompt({ reportFacts })

  assert.match(prompt, /Return JSON only\./)
  assert.match(prompt, /"session_count": 4/)
  assert.match(prompt, /tool_usage/)
})

test("normalizeAnalysisOutput sanitizes structured model output", () => {
  const analysis = normalizeAnalysisOutput({
    headline: "  Repeated test triage workflow  ",
    overview: "  Most sessions focus on inspection and triage.  ",
    key_observations: [" Tool usage clusters around exec_command. ", "", 2],
    workflow_patterns: ["Inspect files before summarizing failures."],
    failures_and_risks: ["Tool failures are concentrated in rerun attempts."],
    recommended_actions: ["Add a deterministic failure taxonomy."],
    analysis_notes: ["Sparse fixtures underrepresent multi-tool sessions."],
  })

  assert.equal(analysis.headline, "Repeated test triage workflow")
  assert.deepEqual(analysis.key_observations, ["Tool usage clusters around exec_command."])
})

test("renderMarkdownReport emits fixed sections and insights content", async () => {
  const summaries = await loadFixtureSummaries()
  const reportData = buildAggregateReportData(summaries, {
    generatedAt: "2026-05-14T00:00:00.000Z",
  })
  const markdown = renderMarkdownReport({
    reportData,
    analysis: {
      headline: "Repeated inspection-heavy workflows dominate the sample.",
      overview: "Most sessions gather evidence with shell commands before delivering concise conclusions.",
      key_observations: ["`exec_command` is the only observed tool and appears in every tool-using session."],
      workflow_patterns: ["Sessions usually start with repository inspection or log review, then shift to concise synthesis."],
      failures_and_risks: ["Tool failures appear in follow-up validation steps, which can interrupt the final summary cadence."],
      recommended_actions: ["Promote recurring failure checks into explicit templates inside the skill."],
      analysis_notes: ["This report shape is inspired by Claude Code /insights, but the workflow is inferred rather than copied from source."],
    },
  })

  assert.match(markdown, /^# Codex Insights Report/m)
  assert.match(markdown, /^## Tool Usage Overview$/m)
  assert.match(markdown, /^## Insights Summary$/m)
  assert.match(markdown, /^## Session Snapshots$/m)
})

test("build-report script renders markdown end to end with a fixture analysis file", async () => {
  const { root } = await createFixtureSessions()
  const tempDir = await mkdtemp(join(tmpdir(), "codex-insights-report-test-"))
  const analysisFile = join(tempDir, "analysis.json")
  const outputFile = join(tempDir, "report.md")

  await writeFile(
    analysisFile,
    JSON.stringify(
      {
        headline: "Investigation-oriented sessions dominate the sample.",
        overview: "The dataset shows a repeatable pattern of inspect, run a command, then summarize outcomes.",
        key_observations: ["`exec_command` drives all observed tool activity."],
        workflow_patterns: ["Users often ask for inspection first and recommendations second."],
        failures_and_risks: ["Failed commands cluster in validation and rerun steps."],
        recommended_actions: ["Add explicit report sections for recurring failure categories."],
        analysis_notes: ["Fixture analysis is injected through --analysis-file for deterministic testing."],
      },
      null,
      2,
    ),
    "utf8",
  )

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
    {
      cwd: "/home/duu/code/codex-insights",
    },
  )

  assert.equal(stdout, "")
  const report = await readFile(outputFile, "utf8")
  assert.match(report, /Investigation-oriented sessions dominate the sample\./)
  assert.match(report, /## Recommended Actions/)
  assert.match(report, /session-fixture-4/)
})
