// Compact transcript formatter for facet extraction.
// Mirrors the spirit of reference formatTranscriptForFacets: keep user
// messages verbatim, summarize assistant turns to leading sentences,
// and only mention tool names + status (not full output) so the prompt
// stays under typical context budgets.

const MAX_USER_CHARS = 1200
const MAX_ASSISTANT_CHARS = 600
const DEFAULT_TRUNCATE_AT = 30000

function truncate(text, max) {
  if (typeof text !== "string") {
    return ""
  }
  const normalized = text.replace(/\s+/g, " ").trim()
  if (normalized.length <= max) {
    return normalized
  }
  return `${normalized.slice(0, max - 1)}…`
}

function formatEvent(event) {
  switch (event.event_type) {
    case "user_message":
      return `USER: ${truncate(event.text ?? "", MAX_USER_CHARS)}`
    case "assistant_message":
      return `ASSISTANT: ${truncate(event.text ?? "", MAX_ASSISTANT_CHARS)}`
    case "tool_call":
      return `TOOL_CALL: ${event.tool_name ?? "unknown"}`
    case "tool_result": {
      const status = event.tool_status ?? "unknown"
      return `TOOL_RESULT: ${event.tool_name ?? "unknown"} [${status}]`
    }
    case "system_event":
      return `SYSTEM: ${truncate(event.text ?? "", 80)}`
    default:
      return null
  }
}

export function formatTranscriptForFacets(session, { maxChars = DEFAULT_TRUNCATE_AT } = {}) {
  const lines = []
  for (const event of session.events ?? []) {
    const formatted = formatEvent(event)
    if (formatted) {
      lines.push(formatted)
    }
  }

  const joined = lines.join("\n")
  if (joined.length <= maxChars) {
    return { transcript: joined, truncated: false, originalLength: joined.length }
  }

  // Keep the first quarter and last three quarters of the budget so that
  // both opening intent and final outcome stay represented.
  const headBudget = Math.floor(maxChars * 0.25)
  const tailBudget = maxChars - headBudget - 16
  const head = joined.slice(0, headBudget)
  const tail = joined.slice(joined.length - tailBudget)
  return {
    transcript: `${head}\n…[truncated]…\n${tail}`,
    truncated: true,
    originalLength: joined.length,
  }
}
