import test from "node:test"
import assert from "node:assert/strict"
import {
  SECTION_NAMES,
  SECTION_SCHEMAS,
  buildNarrativeContext,
  generateNarrativeSections,
} from "../skills/codex-insights/scripts/lib/sections.mjs"

function buildReportData(overrides = {}) {
  return {
    generated_at: "2026-05-14T00:00:00.000Z",
    session_count: 3,
    date_range: { started_at: "2026-05-10", ended_at: "2026-05-13" },
    cwd_counts: { "/workspace/a": 2, "/workspace/b": 1 },
    model_provider_counts: { openai: 3 },
    total_user_messages: 6,
    total_assistant_messages: 7,
    total_tool_calls: 4,
    total_tool_failures: 2,
    total_warnings: 1,
    total_user_interruptions: 1,
    tool_counts: { exec_command: 4 },
    tool_error_categories: { exec_command: 2 },
    most_common_system_events: { task_started: 3 },
    message_hour_histogram: new Array(24).fill(0).map((_, i) => (i === 9 ? 4 : 0)),
    sessions: [],
    ...overrides,
  }
}

function buildFacets() {
  return [
    {
      session_id: "s-1",
      goal_category: "debug_investigate",
      outcome: "mostly_achieved",
      session_type: "iterative_refinement",
      friction_counts: { tool_failed: 2 },
      primary_success: "good_debugging",
      brief_summary: "Fixed CI by isolating the flaky integration test.",
    },
    {
      session_id: "s-2",
      goal_category: "implement_feature",
      outcome: "fully_achieved",
      session_type: "single_task",
      friction_counts: {},
      primary_success: "correct_code_edits",
      brief_summary: "Added a new auth middleware with passing tests.",
    },
  ]
}

test("buildNarrativeContext rolls up facet aggregations", () => {
  const context = buildNarrativeContext({
    reportData: buildReportData(),
    facets: buildFacets(),
  })

  assert.equal(context.session_count, 3)
  assert.equal(context.facet_summary.sessions_with_facets, 2)
  assert.equal(context.facet_summary.goal_categories.debug_investigate, 1)
  assert.equal(context.facet_summary.outcomes.fully_achieved, 1)
  assert.equal(context.facet_summary.friction_counts.tool_failed, 2)
  assert.equal(context.facet_brief_summaries.length, 2)
})

test("generateNarrativeSections runs 4 parallel sections plus at_a_glance", async () => {
  const calls = []
  const fakeClient = {
    async runStructured(prompt, schema) {
      const sectionName =
        SECTION_NAMES.find((name) =>
          prompt.includes(`sections/${name}.md`) || prompt.includes(`Project Areas`) && name === "project_areas",
        ) ?? null
      // We do not have section-name markers in prompts, so detect based
      // on schema identity.
      let detected = null
      for (const name of [...SECTION_NAMES, "at_a_glance"]) {
        if (SECTION_SCHEMAS[name] === schema) {
          detected = name
          break
        }
      }
      calls.push(detected)

      const stubs = {
        project_areas: { areas: [{ name: "CI debugging", session_count: 2, description: "x" }] },
        interaction_style: { narrative: "n", key_pattern: "k" },
        friction_analysis: { intro: "i", categories: [] },
        what_works: { intro: "i", impressive_workflows: [] },
        at_a_glance: {
          whats_working: "ww",
          whats_hindering: "wh",
          quick_wins: "qw",
          ambitious_workflows: "aw",
        },
      }

      return {
        data: stubs[detected],
        usage: { input_tokens: 1, cached_input_tokens: 0, output_tokens: 1, reasoning_output_tokens: 0 },
      }
    },
  }

  const { sections, context } = await generateNarrativeSections({
    client: fakeClient,
    reportData: buildReportData(),
    facets: buildFacets(),
  })

  assert.equal(Object.keys(sections).length, 5)
  for (const name of SECTION_NAMES) {
    assert.equal(sections[name].status, "ok", `${name} should succeed`)
  }
  assert.equal(sections.at_a_glance.status, "ok")
  assert.equal(sections.at_a_glance.data.whats_working, "ww")
  assert.equal(context.session_count, 3)

  // The 4 parallel sections should have been called before at_a_glance.
  const lastCall = calls.at(-1)
  assert.equal(lastCall, "at_a_glance")
})

test("generateNarrativeSections records section-level errors without aborting", async () => {
  const fakeClient = {
    async runStructured(_prompt, schema) {
      if (schema === SECTION_SCHEMAS.friction_analysis) {
        throw new Error("model returned bad json")
      }
      const stubs = new Map([
        [SECTION_SCHEMAS.project_areas, { areas: [] }],
        [SECTION_SCHEMAS.interaction_style, { narrative: "n", key_pattern: "k" }],
        [SECTION_SCHEMAS.what_works, { intro: "i", impressive_workflows: [] }],
        [SECTION_SCHEMAS.at_a_glance, {
          whats_working: "ww", whats_hindering: "wh", quick_wins: "qw", ambitious_workflows: "aw",
        }],
      ])
      return { data: stubs.get(schema), usage: null }
    },
  }

  const { sections } = await generateNarrativeSections({
    client: fakeClient,
    reportData: buildReportData(),
    facets: buildFacets(),
  })

  assert.equal(sections.friction_analysis.status, "error")
  assert.match(sections.friction_analysis.error, /bad json/)
  assert.equal(sections.project_areas.status, "ok")
  assert.equal(sections.at_a_glance.status, "ok",
    "at_a_glance should still synthesize even when one upstream section failed")
})
