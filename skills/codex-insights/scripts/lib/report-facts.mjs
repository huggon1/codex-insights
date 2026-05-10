function toRankedList(counts) {
  return Object.entries(counts).map(([name, count]) => ({
    name,
    count,
  }))
}

export function buildReportFacts(reportData) {
  return {
    generated_at: reportData.generated_at,
    session_count: reportData.session_count,
    date_range: reportData.date_range,
    totals: {
      user_messages: reportData.total_user_messages,
      assistant_messages: reportData.total_assistant_messages,
      tool_calls: reportData.total_tool_calls,
      tool_failures: reportData.total_tool_failures,
      warnings: reportData.total_warnings,
    },
    cwd_distribution: toRankedList(reportData.cwd_counts),
    model_provider_distribution: toRankedList(reportData.model_provider_counts),
    tool_usage: toRankedList(reportData.tool_counts),
    system_event_usage: toRankedList(reportData.most_common_system_events),
    sessions: reportData.sessions.map((session) => ({
      session_id: session.session_id,
      started_at: session.started_at,
      ended_at: session.ended_at,
      cwd: session.cwd,
      model_provider: session.model_provider,
      duration_seconds: session.duration_seconds,
      warning_count: session.warning_count,
      tool_failure_count: session.tool_failure_count,
      tool_counts: session.tool_counts,
      first_user_message: session.first_user_message,
      last_assistant_message: session.last_assistant_message,
    })),
  }
}
