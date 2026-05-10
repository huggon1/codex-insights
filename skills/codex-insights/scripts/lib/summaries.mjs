function incrementCount(counts, key) {
  if (!key) {
    return
  }

  counts[key] = (counts[key] ?? 0) + 1
}

function sortCounts(counts) {
  return Object.fromEntries(
    Object.entries(counts).sort((left, right) => {
      if (right[1] !== left[1]) {
        return right[1] - left[1]
      }
      return left[0].localeCompare(right[0])
    }),
  )
}

function compactText(value) {
  if (typeof value !== "string") {
    return null
  }

  const normalized = value.replace(/\s+/g, " ").trim()
  return normalized || null
}

function trimSnippet(value, maxLength = 160) {
  const normalized = compactText(value)
  if (!normalized) {
    return null
  }

  if (normalized.length <= maxLength) {
    return normalized
  }

  return `${normalized.slice(0, maxLength - 3)}...`
}

function parseTimestamp(value) {
  if (typeof value !== "string") {
    return null
  }

  const timestamp = Date.parse(value)
  return Number.isNaN(timestamp) ? null : timestamp
}

function getDurationSeconds(events) {
  const validTimestamps = events
    .map((event) => parseTimestamp(event.timestamp))
    .filter((value) => value !== null)

  if (validTimestamps.length < 2) {
    return null
  }

  return Math.max(0, Math.round((validTimestamps.at(-1) - validTimestamps[0]) / 1000))
}

function getLastValidTimestamp(events) {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const timestamp = events[index]?.timestamp
    if (parseTimestamp(timestamp) !== null) {
      return timestamp
    }
  }

  return null
}

export function buildSessionSummary(session) {
  const toolCounts = {}
  const systemEventCounts = {}
  const toolFailureExamples = []
  let userMessageCount = 0
  let assistantMessageCount = 0
  let toolCallCount = 0
  let toolResultCount = 0
  let toolSuccessCount = 0
  let toolFailureCount = 0
  let firstUserMessage = null
  let lastAssistantMessage = null

  for (const event of session.events) {
    if (event.event_type === "user_message") {
      userMessageCount += 1
      if (!firstUserMessage) {
        firstUserMessage = trimSnippet(event.text)
      }
      continue
    }

    if (event.event_type === "assistant_message") {
      assistantMessageCount += 1
      const snippet = trimSnippet(event.text)
      if (snippet) {
        lastAssistantMessage = snippet
      }
      continue
    }

    if (event.event_type === "tool_call") {
      toolCallCount += 1
      incrementCount(toolCounts, event.tool_name ?? "unknown")
      continue
    }

    if (event.event_type === "tool_result") {
      toolResultCount += 1
      if (event.tool_status === "success") {
        toolSuccessCount += 1
      }
      if (event.tool_status === "failure") {
        toolFailureCount += 1
        toolFailureExamples.push({
          tool_name: event.tool_name ?? "unknown",
          message: trimSnippet(event.text ?? "Tool execution failed."),
        })
      }
      continue
    }

    if (event.event_type === "system_event") {
      incrementCount(systemEventCounts, event.text ?? "unknown")
    }
  }

  const observedSystemEvents = Object.entries(systemEventCounts)
    .sort((left, right) => {
      if (right[1] !== left[1]) {
        return right[1] - left[1]
      }
      return left[0].localeCompare(right[0])
    })
    .map(([eventName]) => eventName)

  return {
    session_id: session.session_id,
    started_at: session.started_at,
    ended_at: getLastValidTimestamp(session.events),
    cwd: session.cwd,
    model_provider: session.model_provider,
    event_count: session.events.length,
    user_message_count: userMessageCount,
    assistant_message_count: assistantMessageCount,
    tool_call_count: toolCallCount,
    tool_result_count: toolResultCount,
    tool_success_count: toolSuccessCount,
    tool_failure_count: toolFailureCount,
    tool_counts: sortCounts(toolCounts),
    warning_count: session.warnings.length,
    duration_seconds: getDurationSeconds(session.events),
    first_user_message: firstUserMessage,
    last_assistant_message: lastAssistantMessage,
    tool_failure_examples: toolFailureExamples.slice(0, 3),
    observed_system_events: observedSystemEvents,
    system_event_counts: sortCounts(systemEventCounts),
  }
}

export function buildSessionSummaries(sessions) {
  return sessions.map((session) => buildSessionSummary(session))
}
