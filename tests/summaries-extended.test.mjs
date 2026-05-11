import test from "node:test"
import assert from "node:assert/strict"
import { createFixtureSessions } from "./fixture-data.mjs"
import { loadNormalizedSessions } from "../skills/codex-insights/scripts/lib/load-sessions.mjs"
import {
  buildSessionSummary,
  buildSessionSummaries,
} from "../skills/codex-insights/scripts/lib/summaries.mjs"
import { buildAggregateReportData } from "../skills/codex-insights/scripts/lib/aggregate.mjs"
import { selectAnalysisSessions } from "../skills/codex-insights/scripts/lib/session-quality.mjs"

test("session summary captures tool error categories per failing tool", async () => {
  const { root } = await createFixtureSessions()
  const sessions = await loadNormalizedSessions({ root })
  const summaries = buildSessionSummaries(sessions)

  const fixtureFour = summaries.find((s) => s.session_id === "session-fixture-4")
  assert.ok(fixtureFour, "fixture-4 summary missing")
  // fixture-4 has 1 exec_command failure
  assert.deepEqual(fixtureFour.tool_error_categories, { exec_command: 1 })

  const fixtureTwo = summaries.find((s) => s.session_id === "session-fixture-2")
  assert.deepEqual(fixtureTwo.tool_error_categories, { exec_command: 1 })
})

test("session summary records UTC hour for each user message", async () => {
  const { root } = await createFixtureSessions()
  const sessions = await loadNormalizedSessions({ root })
  const fixtureFour = sessions.find((s) => s.session_id === "session-fixture-4")
  const summary = buildSessionSummary(fixtureFour)

  // fixture-4 has user messages at 07:30:02 and 07:30:08 UTC
  assert.deepEqual(summary.message_hours, [7, 7])
})

test("session summary skips invalid timestamps when collecting message hours", async () => {
  const { root } = await createFixtureSessions()
  const sessions = await loadNormalizedSessions({ root })
  const fixtureThree = sessions.find((s) => s.session_id === "session-fixture-3")
  const summary = buildSessionSummary(fixtureThree)

  // fixture-3 has malformed timestamps, so message_hours should be empty.
  assert.deepEqual(summary.message_hours, [])
})

test("session summary counts user interruptions on consecutive user messages", () => {
  const session = {
    session_id: "synthetic",
    started_at: "2026-05-10T00:00:00.000Z",
    cwd: "/tmp",
    model_provider: "openai",
    warnings: [],
    events: [
      { event_type: "user_message", text: "first", timestamp: "2026-05-10T00:00:01.000Z" },
      { event_type: "user_message", text: "interrupt", timestamp: "2026-05-10T00:00:02.000Z" },
      { event_type: "assistant_message", text: "ok", timestamp: "2026-05-10T00:00:03.000Z" },
      { event_type: "user_message", text: "third", timestamp: "2026-05-10T00:00:04.000Z" },
      { event_type: "user_message", text: "another interrupt", timestamp: "2026-05-10T00:00:05.000Z" },
      { event_type: "user_message", text: "yet another", timestamp: "2026-05-10T00:00:06.000Z" },
    ],
  }

  const summary = buildSessionSummary(session)
  assert.equal(summary.user_message_count, 5)
  // Two transitions where prev was also user_message: msg2 and msg5, msg6.
  assert.equal(summary.user_interruption_count, 3)
})

test("aggregate report rolls up new deterministic fields", async () => {
  const { root } = await createFixtureSessions()
  const sessions = await loadNormalizedSessions({ root })
  const summaries = buildSessionSummaries(sessions)
  const reportData = buildAggregateReportData(summaries, {
    generatedAt: "2026-05-14T00:00:00.000Z",
  })

  assert.deepEqual(reportData.tool_error_categories, { exec_command: 2 })
  assert.equal(reportData.total_user_interruptions, 0)
  assert.equal(reportData.total_input_tokens, 100)
  assert.equal(reportData.total_cached_input_tokens, 40)
  assert.equal(reportData.total_output_tokens, 20)
  assert.equal(reportData.total_reasoning_output_tokens, 5)
  assert.equal(reportData.total_tokens, 120)
  assert.equal(reportData.sessions_with_token_usage, 1)
  assert.equal(reportData.trivial_session_count, 1)
  assert.equal(reportData.filtered_session_count, 1)
  assert.equal(reportData.analysis_session_count, 3)
  assert.equal(reportData.message_hour_histogram.length, 24)
  // fixture-4 contributes 2 user messages at hour 7; total user messages elsewhere
  // are at hours 2, 9, and one with bad timestamp (skipped).
  assert.equal(reportData.message_hour_histogram[7], 2)
  assert.equal(reportData.message_hour_histogram[2], 1)
  assert.equal(reportData.message_hour_histogram[9], 1)
})

test("selectAnalysisSessions filters trivial sessions unless requested", async () => {
  const { root } = await createFixtureSessions()
  const sessions = await loadNormalizedSessions({ root })
  const summaries = buildSessionSummaries(sessions)

  const defaultSelection = selectAnalysisSessions(sessions, summaries)
  assert.equal(defaultSelection.analysis_session_count, 3)
  assert.equal(defaultSelection.filtered_session_count, 1)
  assert.equal(
    defaultSelection.filtered_sessions[0].session_id,
    "session-fixture-3",
  )

  const inclusiveSelection = selectAnalysisSessions(sessions, summaries, {
    includeTrivial: true,
  })
  assert.equal(inclusiveSelection.analysis_session_count, 4)
  assert.equal(inclusiveSelection.filtered_session_count, 0)
})

test("aggregate report detects overlap and retry-like session groups", () => {
  const baseSummary = {
    cwd: "/workspace/app",
    model_provider: "openai",
    event_count: 8,
    user_message_count: 1,
    assistant_message_count: 1,
    tool_call_count: 1,
    tool_result_count: 1,
    tool_success_count: 1,
    tool_failure_count: 0,
    tool_counts: {},
    tool_error_categories: {},
    user_interruption_count: 0,
    message_hours: [],
    warning_count: 0,
    duration_seconds: 600,
    first_user_message: "Fix the failing auth test.",
    last_assistant_message: "Done",
    tool_failure_examples: [],
    observed_system_events: [],
    system_event_counts: {},
    token_usage: null,
  }

  const reportData = buildAggregateReportData([
    {
      ...baseSummary,
      session_id: "s-1",
      started_at: "2026-05-10T00:00:00.000Z",
      ended_at: "2026-05-10T00:10:00.000Z",
    },
    {
      ...baseSummary,
      session_id: "s-2",
      started_at: "2026-05-10T00:05:00.000Z",
      ended_at: "2026-05-10T00:15:00.000Z",
    },
    {
      ...baseSummary,
      session_id: "s-3",
      first_user_message: "Inspect docs.",
      started_at: "2026-05-10T02:00:00.000Z",
      ended_at: "2026-05-10T02:01:00.000Z",
    },
  ], {
    generatedAt: "2026-05-14T00:00:00.000Z",
  })

  assert.equal(reportData.multi_session_overlap.overlap_events, 1)
  assert.equal(reportData.multi_session_overlap.sessions_involved, 2)
  assert.equal(reportData.likely_retry_group_count, 1)
  assert.equal(reportData.likely_retry_sessions_involved, 2)
  assert.equal(reportData.abandoned_session_count, 3)
})
