import test from "node:test"
import assert from "node:assert/strict"
import { discoverSessionFiles } from "../skills/codex-insights/scripts/lib/discovery.mjs"
import { createFixtureSessions } from "./fixture-data.mjs"

test("discoverSessionFiles finds fixture session files", async () => {
  const { root } = await createFixtureSessions()
  const files = await discoverSessionFiles({ root })

  assert.equal(files.length, 2)
  assert.equal(files[0].relative_path, "2026/05/10/rollout-fixture-1.jsonl")
  assert.equal(files[1].relative_path, "2026/05/11/rollout-fixture-2.jsonl")
})

test("discoverSessionFiles applies limit to the latest lexical files", async () => {
  const { root } = await createFixtureSessions()
  const files = await discoverSessionFiles({ root, limit: 1 })

  assert.equal(files.length, 1)
  assert.equal(files[0].relative_path, "2026/05/11/rollout-fixture-2.jsonl")
})
