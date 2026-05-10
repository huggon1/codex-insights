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

function buildHourHistogram(messageHours) {
  const histogram = new Array(24).fill(0)
  for (const hour of messageHours) {
    if (Number.isInteger(hour) && hour >= 0 && hour <= 23) {
      histogram[hour] += 1
    }
  }
  return histogram
}

export function buildAggregateReportData(summaries, { generatedAt = new Date().toISOString() } = {}) {
  const cwdCounts = {}
  const modelProviderCounts = {}
  const toolCounts = {}
  const toolErrorCategories = {}
  const systemEventCounts = {}
  const aggregatedMessageHours = []
  let totalUserMessages = 0
  let totalAssistantMessages = 0
  let totalToolCalls = 0
  let totalToolFailures = 0
  let totalWarnings = 0
  let totalUserInterruptions = 0

  for (const summary of summaries) {
    incrementCount(cwdCounts, summary.cwd ?? "unknown")
    incrementCount(modelProviderCounts, summary.model_provider ?? "unknown")
    totalUserMessages += summary.user_message_count
    totalAssistantMessages += summary.assistant_message_count
    totalToolCalls += summary.tool_call_count
    totalToolFailures += summary.tool_failure_count
    totalWarnings += summary.warning_count
    totalUserInterruptions += summary.user_interruption_count ?? 0

    for (const [toolName, count] of Object.entries(summary.tool_counts)) {
      incrementCount(toolCounts, toolName, count)
    }

    for (const [toolName, count] of Object.entries(summary.tool_error_categories ?? {})) {
      incrementCount(toolErrorCategories, toolName, count)
    }

    for (const [systemEvent, count] of Object.entries(summary.system_event_counts ?? {})) {
      incrementCount(systemEventCounts, systemEvent, count)
    }

    if (Array.isArray(summary.message_hours)) {
      aggregatedMessageHours.push(...summary.message_hours)
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
    total_user_interruptions: totalUserInterruptions,
    tool_counts: sortCounts(toolCounts),
    tool_error_categories: sortCounts(toolErrorCategories),
    most_common_system_events: sortCounts(systemEventCounts),
    message_hour_histogram: buildHourHistogram(aggregatedMessageHours),
    sessions: buildSessionSnapshots(summaries),
  }
}
