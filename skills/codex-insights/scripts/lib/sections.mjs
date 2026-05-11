import { loadPrompt } from "./prompt-loader.mjs"
import { FRICTION_LABELS } from "./facets.mjs"

export const SECTION_NAMES = [
  "project_areas",
  "interaction_style",
  "friction_analysis",
  "what_works",
]

export const SECTION_SCHEMAS = {
  project_areas: {
    type: "object",
    additionalProperties: false,
    required: ["areas"],
    properties: {
      areas: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["name", "session_count", "description"],
          properties: {
            name: { type: "string" },
            session_count: { type: "integer", minimum: 0 },
            description: { type: "string" },
          },
        },
      },
    },
  },
  interaction_style: {
    type: "object",
    additionalProperties: false,
    required: ["narrative", "key_pattern"],
    properties: {
      narrative: { type: "string" },
      key_pattern: { type: "string" },
    },
  },
  friction_analysis: {
    type: "object",
    additionalProperties: false,
    required: ["intro", "categories"],
    properties: {
      intro: { type: "string" },
      categories: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["category", "description", "examples"],
          properties: {
            category: { type: "string" },
            description: { type: "string" },
            examples: { type: "array", items: { type: "string" } },
          },
        },
      },
    },
  },
  what_works: {
    type: "object",
    additionalProperties: false,
    required: ["intro", "impressive_workflows"],
    properties: {
      intro: { type: "string" },
      impressive_workflows: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["title", "description"],
          properties: {
            title: { type: "string" },
            description: { type: "string" },
          },
        },
      },
    },
  },
  at_a_glance: {
    type: "object",
    additionalProperties: false,
    required: [
      "whats_working",
      "whats_hindering",
      "quick_wins",
      "ambitious_workflows",
    ],
    properties: {
      whats_working: { type: "string" },
      whats_hindering: { type: "string" },
      quick_wins: { type: "string" },
      ambitious_workflows: { type: "string" },
    },
  },
}

function aggregateFrictionCounts(facetsList) {
  const counts = Object.fromEntries(FRICTION_LABELS.map((label) => [label, 0]))
  for (const entry of facetsList) {
    if (!entry?.friction_counts) {
      continue
    }
    for (const [label, count] of Object.entries(entry.friction_counts)) {
      if (counts[label] !== undefined) {
        counts[label] += count
      }
    }
  }
  return counts
}

function aggregateGoalCategories(facetsList) {
  const counts = {}
  for (const entry of facetsList) {
    const key = entry?.goal_category
    if (!key) continue
    counts[key] = (counts[key] ?? 0) + 1
  }
  return counts
}

function aggregateOutcomes(facetsList) {
  const counts = {}
  for (const entry of facetsList) {
    const key = entry?.outcome
    if (!key) continue
    counts[key] = (counts[key] ?? 0) + 1
  }
  return counts
}

function aggregateSessionTypes(facetsList) {
  const counts = {}
  for (const entry of facetsList) {
    const key = entry?.session_type
    if (!key) continue
    counts[key] = (counts[key] ?? 0) + 1
  }
  return counts
}

function aggregatePrimarySuccess(facetsList) {
  const counts = {}
  for (const entry of facetsList) {
    const key = entry?.primary_success
    if (!key) continue
    counts[key] = (counts[key] ?? 0) + 1
  }
  return counts
}

export function buildNarrativeContext({ reportData, facets }) {
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
      sessions_with_token_usage: reportData.sessions_with_token_usage,
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
    tool_counts: reportData.tool_counts,
    tool_error_categories: reportData.tool_error_categories,
    cwd_counts: reportData.cwd_counts,
    model_provider_counts: reportData.model_provider_counts,
    message_hour_histogram: reportData.message_hour_histogram,
    facet_summary: {
      sessions_with_facets: facets.length,
      goal_categories: aggregateGoalCategories(facets),
      outcomes: aggregateOutcomes(facets),
      session_types: aggregateSessionTypes(facets),
      primary_success: aggregatePrimarySuccess(facets),
      friction_counts: aggregateFrictionCounts(facets),
    },
    facet_brief_summaries: facets.map((entry) => ({
      session_id: entry?.session_id ?? null,
      goal_category: entry?.goal_category ?? null,
      outcome: entry?.outcome ?? null,
      brief_summary: entry?.brief_summary ?? null,
    })),
  }
}

async function runSection({ client, name, prompt }) {
  try {
    const result = await client.runStructured(prompt, SECTION_SCHEMAS[name])
    return { name, status: "ok", data: result.data, usage: result.usage }
  } catch (error) {
    return {
      name,
      status: "error",
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

export async function generateNarrativeSections({ client, reportData, facets }) {
  const context = buildNarrativeContext({ reportData, facets })
  const contextJson = JSON.stringify(context, null, 2)

  const sectionPromises = SECTION_NAMES.map(async (name) => {
    const prompt = await loadPrompt(`sections/${name}.md`, {
      CONTEXT_JSON: contextJson,
    })
    return runSection({ client, name, prompt })
  })

  const sectionResults = await Promise.all(sectionPromises)

  const sections = {}
  for (const result of sectionResults) {
    sections[result.name] = result
  }

  const synthesisInput = {
    context,
    sections: Object.fromEntries(
      sectionResults
        .filter((result) => result.status === "ok")
        .map((result) => [result.name, result.data]),
    ),
  }

  const synthesisPrompt = await loadPrompt("sections/at_a_glance.md", {
    SYNTHESIS_INPUT_JSON: JSON.stringify(synthesisInput, null, 2),
  })

  sections.at_a_glance = await runSection({
    client,
    name: "at_a_glance",
    prompt: synthesisPrompt,
  })

  return { sections, context }
}
