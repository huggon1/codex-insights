import { test } from "node:test"
import { strict as assert } from "node:assert"
import { createCodexClient } from "../skills/codex-insights/scripts/lib/codex-client.mjs"

function createFakeCodex({ responses }) {
  const calls = []
  const fakeCodex = {
    startThread(threadOptions) {
      const threadId = `thread-${calls.length + 1}`
      const captured = { threadOptions, runs: [] }
      calls.push(captured)
      return {
        id: threadId,
        async run(input, turnOptions) {
          captured.runs.push({ input, turnOptions })
          const next = responses.shift()
          if (!next) {
            throw new Error("No fake response queued.")
          }
          if (next.error) {
            throw next.error
          }
          return {
            finalResponse: next.finalResponse,
            usage: next.usage ?? null,
            items: [],
          }
        },
      }
    },
  }
  return { fakeCodex, calls }
}

test("runStructured passes thread options and parses JSON", async () => {
  const { fakeCodex, calls } = createFakeCodex({
    responses: [
      {
        finalResponse: JSON.stringify({ ok: true }),
        usage: {
          input_tokens: 10,
          cached_input_tokens: 1,
          output_tokens: 5,
          reasoning_output_tokens: 2,
        },
      },
    ],
  })

  const client = createCodexClient({
    codex: fakeCodex,
    model: "gpt-test",
    reasoningEffort: "low",
    workingDirectory: "/tmp/work",
  })

  const result = await client.runStructured(
    "say hi as JSON",
    { type: "object", required: ["ok"], properties: { ok: { type: "boolean" } } },
  )

  assert.deepEqual(result.data, { ok: true })
  assert.equal(result.threadId, "thread-1")
  assert.equal(calls.length, 1)
  assert.equal(calls[0].threadOptions.model, "gpt-test")
  assert.equal(calls[0].threadOptions.modelReasoningEffort, "low")
  assert.equal(calls[0].threadOptions.workingDirectory, "/tmp/work")
  assert.equal(calls[0].threadOptions.sandboxMode, "read-only")
  assert.equal(calls[0].threadOptions.approvalPolicy, "never")
  assert.equal(calls[0].threadOptions.webSearchEnabled, false)
  assert.equal(calls[0].threadOptions.skipGitRepoCheck, true)

  const usage = client.getTotalUsage()
  assert.equal(usage.input_tokens, 10)
  assert.equal(usage.output_tokens, 5)
  assert.equal(client.getCallCount(), 1)
})

test("runStructured rejects empty prompt", async () => {
  const { fakeCodex } = createFakeCodex({ responses: [] })
  const client = createCodexClient({ codex: fakeCodex })
  await assert.rejects(
    client.runStructured("", { type: "object" }),
    /non-empty prompt/,
  )
})

test("runStructured rejects missing schema", async () => {
  const { fakeCodex } = createFakeCodex({ responses: [] })
  const client = createCodexClient({ codex: fakeCodex })
  await assert.rejects(
    client.runStructured("hi", null),
    /JSON schema/,
  )
})

test("runStructured surfaces JSON parse failures with context", async () => {
  const { fakeCodex } = createFakeCodex({
    responses: [{ finalResponse: "not-json" }],
  })
  const client = createCodexClient({ codex: fakeCodex })
  await assert.rejects(
    client.runStructured("hi", { type: "object" }),
    /non-JSON response/,
  )
})

test("runStructured aggregates usage across calls", async () => {
  const { fakeCodex } = createFakeCodex({
    responses: [
      {
        finalResponse: JSON.stringify({ a: 1 }),
        usage: {
          input_tokens: 3,
          cached_input_tokens: 0,
          output_tokens: 4,
          reasoning_output_tokens: 1,
        },
      },
      {
        finalResponse: JSON.stringify({ a: 2 }),
        usage: {
          input_tokens: 7,
          cached_input_tokens: 2,
          output_tokens: 6,
          reasoning_output_tokens: 0,
        },
      },
    ],
  })

  const client = createCodexClient({ codex: fakeCodex })
  await client.runStructured("p1", { type: "object" })
  await client.runStructured("p2", { type: "object" })

  const usage = client.getTotalUsage()
  assert.equal(usage.input_tokens, 10)
  assert.equal(usage.cached_input_tokens, 2)
  assert.equal(usage.output_tokens, 10)
  assert.equal(usage.reasoning_output_tokens, 1)
  assert.equal(client.getCallCount(), 2)
})

test("per-call overrides win over client defaults", async () => {
  const { fakeCodex, calls } = createFakeCodex({
    responses: [{ finalResponse: JSON.stringify({}) }],
  })

  const client = createCodexClient({
    codex: fakeCodex,
    model: "default-model",
    workingDirectory: "/tmp/default",
  })

  await client.runStructured("p", { type: "object" }, {
    model: "override-model",
    workingDirectory: "/tmp/override",
    reasoningEffort: "high",
  })

  assert.equal(calls[0].threadOptions.model, "override-model")
  assert.equal(calls[0].threadOptions.workingDirectory, "/tmp/override")
  assert.equal(calls[0].threadOptions.modelReasoningEffort, "high")
})
