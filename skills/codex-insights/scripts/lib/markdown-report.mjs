function renderCountList(counts) {
  const entries = Object.entries(counts)

  if (entries.length === 0) {
    return "- None"
  }

  return entries.map(([name, count]) => `- \`${name}\`: ${count}`).join("\n")
}

function renderInsightsList(items) {
  if (!items.length) {
    return "- None"
  }

  return items.map((item) => `- ${item}`).join("\n")
}

function renderSessionSnapshots(sessions) {
  if (!sessions.length) {
    return "- No sessions found."
  }

  return sessions
    .map((session) => {
      const parts = [
        `- \`${session.session_id}\``,
        `start: ${session.started_at ?? "unknown"}`,
        `cwd: ${session.cwd ?? "unknown"}`,
        `model: ${session.model_provider ?? "unknown"}`,
        `duration: ${session.duration_seconds === null ? "unknown" : `${session.duration_seconds}s`}`,
        `warnings: ${session.warning_count}`,
        `tool failures: ${session.tool_failure_count}`,
      ]

      const snippets = []
      if (session.first_user_message) {
        snippets.push(`first user: "${session.first_user_message}"`)
      }
      if (session.last_assistant_message) {
        snippets.push(`last assistant: "${session.last_assistant_message}"`)
      }

      return snippets.length > 0 ? `${parts.join(", ")}. ${snippets.join("; ")}` : parts.join(", ")
    })
    .join("\n")
}

export function renderMarkdownReport({ reportData, analysis }) {
  const startDate = reportData.date_range.started_at ?? "unknown"
  const endDate = reportData.date_range.ended_at ?? "unknown"

  return [
    "# Codex Insights Report",
    "",
    `Generated at: ${reportData.generated_at}`,
    "",
    "## Coverage Summary",
    `- Sessions analyzed: ${reportData.session_count}`,
    `- Session date range: ${startDate} -> ${endDate}`,
    "",
    "## Key Totals",
    `- User messages: ${reportData.total_user_messages}`,
    `- Assistant messages: ${reportData.total_assistant_messages}`,
    `- Tool calls: ${reportData.total_tool_calls}`,
    `- Tool failures: ${reportData.total_tool_failures}`,
    `- Warnings: ${reportData.total_warnings}`,
    "",
    "## Tool Usage Overview",
    renderCountList(reportData.tool_counts),
    "",
    "## Failures And Warnings",
    `- Total tool failures: ${reportData.total_tool_failures}`,
    `- Total warnings: ${reportData.total_warnings}`,
    "",
    "## Session Distribution",
    "### By Working Directory",
    renderCountList(reportData.cwd_counts),
    "",
    "### By Model Provider",
    renderCountList(reportData.model_provider_counts),
    "",
    "## Insights Summary",
    analysis.headline,
    "",
    analysis.overview,
    "",
    "## Key Observations",
    renderInsightsList(analysis.key_observations),
    "",
    "## Workflow Patterns",
    renderInsightsList(analysis.workflow_patterns),
    "",
    "## Failures And Risks",
    renderInsightsList(analysis.failures_and_risks),
    "",
    "## Recommended Actions",
    renderInsightsList(analysis.recommended_actions),
    "",
    "## Analysis Notes",
    renderInsightsList(analysis.analysis_notes),
    "",
    "## Session Snapshots",
    renderSessionSnapshots(reportData.sessions),
    "",
  ].join("\n")
}
