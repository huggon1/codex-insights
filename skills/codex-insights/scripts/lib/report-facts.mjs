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
      user_interruptions: reportData.total_user_interruptions,
      input_tokens: reportData.total_input_tokens,
      cached_input_tokens: reportData.total_cached_input_tokens,
      output_tokens: reportData.total_output_tokens,
      reasoning_output_tokens: reportData.total_reasoning_output_tokens,
      total_tokens: reportData.total_tokens,
    },
    session_quality: {
      include_trivial: reportData.include_trivial,
      analysis_session_count: reportData.analysis_session_count,
      filtered_session_count: reportData.filtered_session_count,
      trivial_session_count: reportData.trivial_session_count,
      abandoned_session_count: reportData.abandoned_session_count,
      likely_retry_group_count: reportData.likely_retry_group_count,
      likely_retry_sessions_involved: reportData.likely_retry_sessions_involved,
      multi_session_overlap: reportData.multi_session_overlap,
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
      token_usage: session.token_usage,
      tool_counts: session.tool_counts,
      first_user_message: session.first_user_message,
      last_assistant_message: session.last_assistant_message,
    })),
  }
}
