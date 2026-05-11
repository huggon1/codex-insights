import test from "node:test"
import assert from "node:assert/strict"
import { discoverSessionFiles } from "../skills/codex-insights/scripts/lib/discovery.mjs"
import { loadJsonlRecords } from "../skills/codex-insights/scripts/lib/jsonl.mjs"
import { normalizeSessionRecords } from "../skills/codex-insights/scripts/lib/normalize.mjs"
import { createFixtureSessions } from "./fixture-data.mjs"

test("normalizeSessionRecords produces stable normalized events", async () => {
  const { firstFile: file } = await createFixtureSessions()
  const { records, warnings } = await loadJsonlRecords(file)
  const normalized = normalizeSessionRecords(records, warnings)

  assert.equal(normalized.session_id, "session-fixture-1")
  assert.equal(normalized.cwd, "/workspace/demo")
  assert.equal(normalized.events[0].event_type, "session_meta")
  assert.equal(normalized.events[2].event_type, "user_message")
  assert.equal(normalized.events[4].event_type, "tool_call")
  assert.equal(normalized.events[4].tool_name, "exec_command")
  assert.equal(normalized.events[5].event_type, "tool_result")
  assert.equal(normalized.events[5].tool_status, "success")
  assert.equal(normalized.events[6].event_type, "assistant_message")
  assert.equal(normalized.events[7].event_type, "system_event")
  assert.equal(normalized.events[7].text, "token_count")
  assert.deepEqual(normalized.events[7].token_usage, {
    input_tokens: 100,
    cached_input_tokens: 40,
    output_tokens: 20,
    reasoning_output_tokens: 5,
    total_tokens: 120,
  })
  assert.deepEqual(normalized.warnings, [])
})

test("normalizeSessionRecords preserves warnings for unsupported records", async () => {
  const { secondFile: file } = await createFixtureSessions()
  const { records, warnings } = await loadJsonlRecords(file)
  const normalized = normalizeSessionRecords(records, warnings)

  assert.equal(normalized.session_id, "session-fixture-2")
  assert.equal(normalized.events[2].event_type, "system_event")
  assert.equal(normalized.events[4].tool_status, "failure")
  assert.ok(
    normalized.warnings.some((warning) => warning.code === "unsupported_record_type"),
  )
})

test("discovery plus normalization produces normalized sessions for fixture roots", async () => {
  const { root } = await createFixtureSessions()
  const files = await discoverSessionFiles({ root })
  const sessions = []

  for (const file of files) {
    const { records, warnings } = await loadJsonlRecords(file.path)
    sessions.push(normalizeSessionRecords(records, warnings))
  }

  assert.equal(sessions.length, 4)
  assert.equal(sessions[0].session_id, "session-fixture-1")
  assert.equal(sessions[1].session_id, "session-fixture-2")
  assert.equal(sessions[2].session_id, "session-fixture-3")
  assert.equal(sessions[3].session_id, "session-fixture-4")
  assert.equal(Array.isArray(sessions[0].events), true)
  assert.equal(Array.isArray(sessions[3].warnings), true)
})
