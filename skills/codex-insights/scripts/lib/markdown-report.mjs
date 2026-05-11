function renderCountList(counts) {
  const entries = Object.entries(counts ?? {})
  if (entries.length === 0) {
    return "- None"
  }
  return entries.map(([name, count]) => `- \`${name}\`: ${count}`).join("\n")
}

function renderTokenUsage(reportData) {
  if ((reportData.sessions_with_token_usage ?? 0) === 0) {
    return ["- No token usage records found in the analyzed session files."]
  }

  return [
    `- Sessions with token usage: ${reportData.sessions_with_token_usage}`,
    `- Input tokens: ${reportData.total_input_tokens}`,
    `- Cached input tokens: ${reportData.total_cached_input_tokens}`,
    `- Output tokens: ${reportData.total_output_tokens}`,
    `- Reasoning output tokens: ${reportData.total_reasoning_output_tokens}`,
    `- Total tokens: ${reportData.total_tokens}`,
  ]
}

function renderSessionQuality(reportData) {
  const overlap = reportData.multi_session_overlap ?? {}
  return [
    `- Sessions used for narrative analysis: ${reportData.analysis_session_count ?? reportData.session_count}`,
    `- Trivial sessions filtered from narrative analysis: ${reportData.filtered_session_count ?? 0}`,
    `- Include trivial sessions: ${reportData.include_trivial ? "yes" : "no"}`,
    `- Abandoned sessions flagged: ${reportData.abandoned_session_count ?? 0}`,
    `- Retry-like groups flagged: ${reportData.likely_retry_group_count ?? 0}`,
    `- Overlap events: ${overlap.overlap_events ?? 0}`,
    `- Sessions involved in overlap: ${overlap.sessions_involved ?? 0}`,
  ]
}

function renderSessionSnapshots(sessions) {
  if (!sessions?.length) {
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

function getSectionData(section) {
  return section?.status === "ok" ? section.data : null
}

function renderAtAGlance(section) {
  const data = getSectionData(section)
  if (!data) {
    return ["_At-a-glance synthesis was not generated for this report._"]
  }
  return [
    "**What's working**",
    "",
    data.whats_working,
    "",
    "**What's hindering you**",
    "",
    data.whats_hindering,
    "",
    "**Quick wins**",
    "",
    data.quick_wins,
    "",
    "**Ambitious workflows**",
    "",
    data.ambitious_workflows,
  ]
}

function renderProjectAreas(section) {
  const data = getSectionData(section)
  if (!data || !Array.isArray(data.areas) || data.areas.length === 0) {
    return ["_No project areas were identified._"]
  }
  const lines = []
  for (const area of data.areas) {
    lines.push(`- **${area.name}** (${area.session_count} session${area.session_count === 1 ? "" : "s"}) — ${area.description}`)
  }
  return lines
}

function renderInteractionStyle(section) {
  const data = getSectionData(section)
  if (!data) {
    return ["_Interaction style narrative was not generated for this report._"]
  }
  return [data.narrative, "", `**Key pattern:** ${data.key_pattern}`]
}

function renderWhatWorks(section) {
  const data = getSectionData(section)
  if (!data) {
    return ["_What-works narrative was not generated for this report._"]
  }
  const lines = [data.intro]
  if (Array.isArray(data.impressive_workflows) && data.impressive_workflows.length > 0) {
    lines.push("")
    for (const workflow of data.impressive_workflows) {
      lines.push(`- **${workflow.title}** — ${workflow.description}`)
    }
  }
  return lines
}

function renderFrictionAnalysis(section) {
  const data = getSectionData(section)
  if (!data) {
    return ["_Friction analysis was not generated for this report._"]
  }
  const lines = [data.intro]
  if (Array.isArray(data.categories) && data.categories.length > 0) {
    lines.push("")
    for (const entry of data.categories) {
      lines.push(`- **${entry.category}** — ${entry.description}`)
      if (Array.isArray(entry.examples) && entry.examples.length > 0) {
        for (const example of entry.examples) {
          lines.push(`  - ${example}`)
        }
      }
    }
  }
  return lines
}

function renderSectionErrors(sections) {
  const errors = []
  for (const [name, section] of Object.entries(sections ?? {})) {
    if (section?.status === "error") {
      errors.push(`- \`${name}\`: ${section.error}`)
    }
  }
  if (errors.length === 0) {
    return null
  }
  return ["## Section Generation Notes", "", ...errors]
}

export function renderMarkdownReport({ reportData, analysis }) {
  const startDate = reportData.date_range.started_at ?? "unknown"
  const endDate = reportData.date_range.ended_at ?? "unknown"
  const sections = analysis?.sections ?? {}

  const lines = [
    "# Codex Insights Report",
    "",
    `Generated at: ${reportData.generated_at}`,
    `Sessions analyzed: ${reportData.session_count} (${startDate} -> ${endDate})`,
    "",
    "## At a Glance",
    "",
    ...renderAtAGlance(sections.at_a_glance),
    "",
    "## Project Areas",
    "",
    ...renderProjectAreas(sections.project_areas),
    "",
    "## What Works",
    "",
    ...renderWhatWorks(sections.what_works),
    "",
    "## Friction Analysis",
    "",
    ...renderFrictionAnalysis(sections.friction_analysis),
    "",
    "## Interaction Style",
    "",
    ...renderInteractionStyle(sections.interaction_style),
    "",
    "## Stats",
    "",
    "### Totals",
    `- User messages: ${reportData.total_user_messages}`,
    `- Assistant messages: ${reportData.total_assistant_messages}`,
    `- Tool calls: ${reportData.total_tool_calls}`,
    `- Tool failures: ${reportData.total_tool_failures}`,
    `- Warnings: ${reportData.total_warnings}`,
    `- User interruptions: ${reportData.total_user_interruptions ?? 0}`,
    "",
    "### Token Usage",
    ...renderTokenUsage(reportData),
    "",
    "### Session Quality Signals",
    ...renderSessionQuality(reportData),
    "",
    "### Tool Usage",
    renderCountList(reportData.tool_counts),
    "",
    "### Tool Errors By Category",
    renderCountList(reportData.tool_error_categories),
    "",
    "### Sessions By Working Directory",
    renderCountList(reportData.cwd_counts),
    "",
    "### Sessions By Model Provider",
    renderCountList(reportData.model_provider_counts),
    "",
    "## Session Snapshots",
    "",
    renderSessionSnapshots(reportData.sessions),
    "",
  ]

  const errorBlock = renderSectionErrors(sections)
  if (errorBlock) {
    lines.push(...errorBlock, "")
  }

  if (analysis?.cache_stats) {
    lines.push(
      "## Run Metadata",
      "",
      `- Facet cache hits: ${analysis.cache_stats.hits}`,
      `- Facet LLM calls: ${analysis.cache_stats.llm_calls}`,
    )
    if (analysis.usage) {
      lines.push(
        `- Total input tokens: ${analysis.usage.input_tokens ?? 0}`,
        `- Total output tokens: ${analysis.usage.output_tokens ?? 0}`,
      )
    }
    lines.push("")
  }

  return lines.join("\n")
}
