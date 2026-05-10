function ensureString(value) {
  if (typeof value !== "string") {
    return null
  }

  const normalized = value.trim()
  return normalized || null
}

function ensureStringArray(value) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => ensureString(item))
    .filter((item) => item !== null)
}

export function getAnalysisOutputSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: [
      "headline",
      "overview",
      "key_observations",
      "workflow_patterns",
      "failures_and_risks",
      "recommended_actions",
      "analysis_notes",
    ],
    properties: {
      headline: { type: "string" },
      overview: { type: "string" },
      key_observations: { type: "array", items: { type: "string" } },
      workflow_patterns: { type: "array", items: { type: "string" } },
      failures_and_risks: { type: "array", items: { type: "string" } },
      recommended_actions: { type: "array", items: { type: "string" } },
      analysis_notes: { type: "array", items: { type: "string" } },
    },
  }
}

export function normalizeAnalysisOutput(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Analysis output must be a JSON object.")
  }

  return {
    headline: ensureString(value.headline) ?? "No headline generated.",
    overview: ensureString(value.overview) ?? "No overview generated.",
    key_observations: ensureStringArray(value.key_observations),
    workflow_patterns: ensureStringArray(value.workflow_patterns),
    failures_and_risks: ensureStringArray(value.failures_and_risks),
    recommended_actions: ensureStringArray(value.recommended_actions),
    analysis_notes: ensureStringArray(value.analysis_notes),
  }
}
