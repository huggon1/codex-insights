// Session facet schema for the semantic-enrichment layer.
// The shape is a deliberate subset of Claude /insights SessionFacets that
// excludes the most subjective fields (user satisfaction, helpfulness).
// Adding them later is straightforward; getting friction/outcome stable
// first matters more for the report quality.

export const GOAL_CATEGORIES = [
  "debug_investigate",
  "implement_feature",
  "fix_bug",
  "write_script_tool",
  "refactor_code",
  "configure_system",
  "create_pr_commit",
  "analyze_data",
  "understand_codebase",
  "write_tests",
  "write_docs",
  "deploy_infra",
  "warmup_minimal",
]

export const OUTCOME_LABELS = [
  "fully_achieved",
  "mostly_achieved",
  "partially_achieved",
  "not_achieved",
  "unclear_from_transcript",
]

export const SESSION_TYPES = [
  "single_task",
  "multi_task",
  "iterative_refinement",
  "exploration",
  "quick_question",
]

export const FRICTION_LABELS = [
  "misunderstood_request",
  "wrong_approach",
  "buggy_code",
  "user_rejected_action",
  "excessive_changes",
  "user_stopped_early",
  "wrong_file_or_location",
  "slow_or_verbose",
  "tool_failed",
  "user_unclear",
  "external_issue",
]

export const PRIMARY_SUCCESS_LABELS = [
  "none",
  "fast_accurate_search",
  "correct_code_edits",
  "good_explanations",
  "proactive_help",
  "multi_file_changes",
  "good_debugging",
]

function buildIntegerCountSchema(labels) {
  const properties = {}
  for (const label of labels) {
    properties[label] = { type: "integer", minimum: 0 }
  }
  return {
    type: "object",
    additionalProperties: false,
    required: labels,
    properties,
  }
}

export function getFacetOutputSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: [
      "underlying_goal",
      "goal_category",
      "outcome",
      "session_type",
      "friction_counts",
      "primary_success",
      "brief_summary",
    ],
    properties: {
      underlying_goal: { type: "string" },
      goal_category: { type: "string", enum: GOAL_CATEGORIES },
      outcome: { type: "string", enum: OUTCOME_LABELS },
      session_type: { type: "string", enum: SESSION_TYPES },
      friction_counts: buildIntegerCountSchema(FRICTION_LABELS),
      primary_success: { type: "string", enum: PRIMARY_SUCCESS_LABELS },
      brief_summary: { type: "string" },
    },
  }
}

function ensureString(value, fieldName) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`facet field ${fieldName} must be a non-empty string`)
  }
  return value.trim()
}

function ensureEnum(value, allowed, fieldName) {
  ensureString(value, fieldName)
  if (!allowed.includes(value)) {
    throw new Error(`facet field ${fieldName} value "${value}" is not in allowed enum`)
  }
  return value
}

function ensureCountsObject(value, allowedLabels, fieldName) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`facet field ${fieldName} must be an object`)
  }
  const result = {}
  for (const label of allowedLabels) {
    const count = value[label]
    if (count === undefined) {
      result[label] = 0
      continue
    }
    if (!Number.isInteger(count) || count < 0) {
      throw new Error(
        `facet field ${fieldName}.${label} must be a non-negative integer`,
      )
    }
    result[label] = count
  }
  for (const key of Object.keys(value)) {
    if (!allowedLabels.includes(key)) {
      throw new Error(`facet field ${fieldName} contains unknown label "${key}"`)
    }
  }
  return result
}

export function validateFacets(rawFacets, { sessionId } = {}) {
  if (!rawFacets || typeof rawFacets !== "object" || Array.isArray(rawFacets)) {
    throw new Error("facet payload must be a JSON object")
  }

  const validated = {
    session_id: sessionId ?? rawFacets.session_id ?? null,
    underlying_goal: ensureString(rawFacets.underlying_goal, "underlying_goal"),
    goal_category: ensureEnum(rawFacets.goal_category, GOAL_CATEGORIES, "goal_category"),
    outcome: ensureEnum(rawFacets.outcome, OUTCOME_LABELS, "outcome"),
    session_type: ensureEnum(rawFacets.session_type, SESSION_TYPES, "session_type"),
    friction_counts: ensureCountsObject(
      rawFacets.friction_counts,
      FRICTION_LABELS,
      "friction_counts",
    ),
    primary_success: ensureEnum(
      rawFacets.primary_success,
      PRIMARY_SUCCESS_LABELS,
      "primary_success",
    ),
    brief_summary: ensureString(rawFacets.brief_summary, "brief_summary"),
  }

  return validated
}

export function emptyFrictionCounts() {
  const result = {}
  for (const label of FRICTION_LABELS) {
    result[label] = 0
  }
  return result
}
