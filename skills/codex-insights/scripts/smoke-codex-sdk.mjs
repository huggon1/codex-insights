#!/usr/bin/env node
import { createCodexClient } from "./lib/codex-client.mjs"

function parseArgs(argv) {
  const options = { prompt: "Reply with the JSON object {\"ok\": true}." }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    const next = argv[index + 1]
    if (arg === "--prompt" && next) {
      options.prompt = next
      index += 1
    }
  }
  return options
}

const SMOKE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["ok"],
  properties: {
    ok: { type: "boolean" },
    note: { type: "string" },
  },
}

const { prompt } = parseArgs(process.argv.slice(2))

const client = createCodexClient()

try {
  const { data, usage, threadId } = await client.runStructured(prompt, SMOKE_SCHEMA)
  process.stdout.write(`${JSON.stringify({ data, usage, threadId }, null, 2)}\n`)
} catch (error) {
  process.stderr.write(`smoke-codex-sdk failed: ${error instanceof Error ? error.message : String(error)}\n`)
  process.exit(1)
}
