import { Codex } from "@openai/codex-sdk"

const DEFAULT_REASONING_EFFORT = "medium"

function buildThreadOptions({ workingDirectory, model, reasoningEffort }) {
  const options = {
    skipGitRepoCheck: true,
    sandboxMode: "read-only",
    approvalPolicy: "never",
    webSearchEnabled: false,
    modelReasoningEffort: reasoningEffort ?? DEFAULT_REASONING_EFFORT,
  }

  if (workingDirectory) {
    options.workingDirectory = workingDirectory
  }

  if (model) {
    options.model = model
  }

  return options
}

function parseStructuredResponse(turn) {
  const text = typeof turn?.finalResponse === "string" ? turn.finalResponse.trim() : ""
  if (!text) {
    throw new Error("Codex returned an empty final response.")
  }

  try {
    return JSON.parse(text)
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    throw new Error(`Codex returned a non-JSON response despite outputSchema: ${detail}`)
  }
}

export function createCodexClient({
  apiKey,
  baseUrl,
  model,
  reasoningEffort,
  workingDirectory,
  codex,
} = {}) {
  const client =
    codex ??
    new Codex({
      ...(apiKey ? { apiKey } : {}),
      ...(baseUrl ? { baseUrl } : {}),
    })

  let totalCalls = 0
  let totalUsage = {
    input_tokens: 0,
    cached_input_tokens: 0,
    output_tokens: 0,
    reasoning_output_tokens: 0,
  }

  async function runStructured(prompt, schema, overrides = {}) {
    if (typeof prompt !== "string" || prompt.trim() === "") {
      throw new Error("runStructured requires a non-empty prompt string.")
    }

    if (!schema || typeof schema !== "object") {
      throw new Error("runStructured requires a JSON schema describing the expected output.")
    }

    const thread = client.startThread(
      buildThreadOptions({
        workingDirectory: overrides.workingDirectory ?? workingDirectory,
        model: overrides.model ?? model,
        reasoningEffort: overrides.reasoningEffort ?? reasoningEffort,
      }),
    )

    const turn = await thread.run(prompt, { outputSchema: schema })
    totalCalls += 1
    if (turn?.usage) {
      totalUsage = mergeUsage(totalUsage, turn.usage)
    }

    return {
      data: parseStructuredResponse(turn),
      usage: turn?.usage ?? null,
      threadId: thread.id ?? null,
    }
  }

  function getCallCount() {
    return totalCalls
  }

  function getTotalUsage() {
    return { ...totalUsage }
  }

  return { runStructured, getCallCount, getTotalUsage }
}

function mergeUsage(base, addition) {
  return {
    input_tokens: base.input_tokens + (addition.input_tokens ?? 0),
    cached_input_tokens: base.cached_input_tokens + (addition.cached_input_tokens ?? 0),
    output_tokens: base.output_tokens + (addition.output_tokens ?? 0),
    reasoning_output_tokens:
      base.reasoning_output_tokens + (addition.reasoning_output_tokens ?? 0),
  }
}
