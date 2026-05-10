function incrementCount(counts, key, amount = 1) {
  if (!key) {
    return
  }

  counts[key] = (counts[key] ?? 0) + amount
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

function getDateRange(summaries) {
  const startValues = summaries
    .map((summary) => summary.started_at)
    .filter((value) => typeof value === "string" && !Number.isNaN(Date.parse(value)))
    .sort((left, right) => left.localeCompare(right))

  const endValues = summaries
    .map((summary) => summary.ended_at)
    .filter((value) => typeof value === "string" && !Number.isNaN(Date.parse(value)))
    .sort((left, right) => left.localeCompare(right))

  return {
    started_at: startValues[0] ?? null,
    ended_at: endValues.at(-1) ?? null,
  }
}

function buildSessionSnapshots(summaries) {
  return [...summaries]
    .sort((left, right) => {
      const leftTime = left.started_at ?? ""
      const rightTime = right.started_at ?? ""
      return leftTime.localeCompare(rightTime)
    })
    .map((summary) => ({
      session_id: summary.session_id,
      started_at: summary.started_at,
      ended_at: summary.ended_at,
      cwd: summary.cwd,
      model_provider: summary.model_provider,
      duration_seconds: summary.duration_seconds,
      warning_count: summary.warning_count,
      tool_failure_count: summary.tool_failure_count,
      tool_counts: summary.tool_counts,
      first_user_message: summary.first_user_message,
      last_assistant_message: summary.last_assistant_message,
    }))
}

export function buildAggregateReportData(summaries, { generatedAt = new Date().toISOString() } = {}) {
  const cwdCounts = {}
  const modelProviderCounts = {}
  const toolCounts = {}
  const systemEventCounts = {}
  let totalUserMessages = 0
  let totalAssistantMessages = 0
  let totalToolCalls = 0
  let totalToolFailures = 0
  let totalWarnings = 0

  for (const summary of summaries) {
    incrementCount(cwdCounts, summary.cwd ?? "unknown")
    incrementCount(modelProviderCounts, summary.model_provider ?? "unknown")
    totalUserMessages += summary.user_message_count
    totalAssistantMessages += summary.assistant_message_count
    totalToolCalls += summary.tool_call_count
    totalToolFailures += summary.tool_failure_count
    totalWarnings += summary.warning_count

    for (const [toolName, count] of Object.entries(summary.tool_counts)) {
      incrementCount(toolCounts, toolName, count)
    }

    for (const [systemEvent, count] of Object.entries(summary.system_event_counts ?? {})) {
      incrementCount(systemEventCounts, systemEvent, count)
    }
  }

  return {
    generated_at: generatedAt,
    session_count: summaries.length,
    date_range: getDateRange(summaries),
    cwd_counts: sortCounts(cwdCounts),
    model_provider_counts: sortCounts(modelProviderCounts),
    total_user_messages: totalUserMessages,
    total_assistant_messages: totalAssistantMessages,
    total_tool_calls: totalToolCalls,
    total_tool_failures: totalToolFailures,
    total_warnings: totalWarnings,
    tool_counts: sortCounts(toolCounts),
    most_common_system_events: sortCounts(systemEventCounts),
    sessions: buildSessionSnapshots(summaries),
  }
}
