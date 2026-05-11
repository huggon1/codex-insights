import test from "node:test"
import assert from "node:assert/strict"
import { mkdtemp } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  FRICTION_LABELS,
  GOAL_CATEGORIES,
  emptyFrictionCounts,
  getFacetOutputSchema,
  validateFacets,
} from "../skills/codex-insights/scripts/lib/facets.mjs"
import {
  extractFacetsForSession,
  extractFacetsForSessions,
} from "../skills/codex-insights/scripts/lib/facet-extraction.mjs"
import { formatTranscriptForFacets } from "../skills/codex-insights/scripts/lib/transcript-format.mjs"

function buildValidFacets(overrides = {}) {
  return {
    underlying_goal: "Diagnose failing CI runs and propose a focused fix.",
    goal_category: "debug_investigate",
    outcome: "partially_achieved",
    session_type: "iterative_refinement",
    friction_counts: {
      ...emptyFrictionCounts(),
      tool_failed: 1,
    },
    primary_success: "good_debugging",
    brief_summary:
      "User asked for help fixing CI. Codex inspected logs, ran tests, and surfaced a likely cause.",
    ...overrides,
  }
}

test("validateFacets accepts a well-formed object", () => {
  const facets = validateFacets(buildValidFacets(), { sessionId: "s-1" })
  assert.equal(facets.session_id, "s-1")
  assert.equal(facets.goal_category, "debug_investigate")
  assert.equal(facets.friction_counts.tool_failed, 1)
  assert.equal(facets.friction_counts.misunderstood_request, 0)
})

test("validateFacets rejects unknown enum values", () => {
  assert.throws(
    () => validateFacets(buildValidFacets({ goal_category: "make_pizza" })),
    /goal_category/,
  )
})

test("validateFacets rejects missing required fields", () => {
  const facets = buildValidFacets()
  delete facets.brief_summary
  assert.throws(() => validateFacets(facets), /brief_summary/)
})

test("validateFacets rejects unknown friction labels", () => {
  const facets = buildValidFacets()
  facets.friction_counts.something_new = 1
  assert.throws(() => validateFacets(facets), /unknown label/)
})

test("validateFacets rejects negative counts", () => {
  const facets = buildValidFacets()
  facets.friction_counts.tool_failed = -1
  assert.throws(() => validateFacets(facets), /non-negative integer/)
})

test("getFacetOutputSchema covers all friction labels and goal categories", () => {
  const schema = getFacetOutputSchema()
  assert.deepEqual(
    schema.properties.friction_counts.required.sort(),
    [...FRICTION_LABELS].sort(),
  )
  assert.deepEqual(
    schema.properties.goal_category.enum.sort(),
    [...GOAL_CATEGORIES].sort(),
  )
})

test("formatTranscriptForFacets compacts user/assistant/tool events", () => {
  const session = {
    session_id: "s-1",
    events: [
      { event_type: "user_message", text: "hello there" },
      { event_type: "assistant_message", text: "hi back" },
      { event_type: "tool_call", tool_name: "exec_command" },
      { event_type: "tool_result", tool_name: "exec_command", tool_status: "success" },
    ],
  }
  const { transcript, truncated } = formatTranscriptForFacets(session)
  assert.match(transcript, /^USER: hello there/m)
  assert.match(transcript, /^ASSISTANT: hi back/m)
  assert.match(transcript, /^TOOL_CALL: exec_command/m)
  assert.match(transcript, /^TOOL_RESULT: exec_command \[success\]/m)
  assert.equal(truncated, false)
})

test("extractFacetsForSession caches by content hash and reuses on second call", async () => {
  const cacheDir = await mkdtemp(join(tmpdir(), "facet-cache-"))

  let llmCalls = 0
  const fakeClient = {
    async runStructured() {
      llmCalls += 1
      return {
        data: buildValidFacets(),
        usage: null,
        threadId: `t-${llmCalls}`,
      }
    },
    getCallCount: () => llmCalls,
    getTotalUsage: () => ({}),
  }

  const session = {
    session_id: "s-cached",
    cwd: "/tmp",
    model_provider: "openai",
    warnings: [],
    events: [
      { event_type: "user_message", text: "fix the bug", timestamp: "2026-05-10T00:00:00.000Z" },
      { event_type: "assistant_message", text: "looking", timestamp: "2026-05-10T00:00:01.000Z" },
    ],
  }

  const first = await extractFacetsForSession({ session, client: fakeClient, cacheDir })
  assert.equal(first.cached, false)
  assert.equal(llmCalls, 1)

  const second = await extractFacetsForSession({ session, client: fakeClient, cacheDir })
  assert.equal(second.cached, true)
  assert.equal(llmCalls, 1, "cache should suppress LLM call")
  assert.equal(second.facets.goal_category, "debug_investigate")
})

test("extractFacetsForSession invalidates cache when session content changes", async () => {
  const cacheDir = await mkdtemp(join(tmpdir(), "facet-cache-invalidate-"))

  let llmCalls = 0
  const fakeClient = {
    async runStructured() {
      llmCalls += 1
      return { data: buildValidFacets(), usage: null }
    },
    getCallCount: () => llmCalls,
    getTotalUsage: () => ({}),
  }

  const baseSession = {
    session_id: "s-evolve",
    cwd: "/tmp",
    model_provider: "openai",
    warnings: [],
    events: [
      { event_type: "user_message", text: "hi", timestamp: "2026-05-10T00:00:00.000Z" },
    ],
  }

  await extractFacetsForSession({ session: baseSession, client: fakeClient, cacheDir })
  assert.equal(llmCalls, 1)

  const evolved = {
    ...baseSession,
    events: [
      ...baseSession.events,
      { event_type: "assistant_message", text: "yo", timestamp: "2026-05-10T00:00:01.000Z" },
    ],
  }

  await extractFacetsForSession({ session: evolved, client: fakeClient, cacheDir })
  assert.equal(llmCalls, 2, "content change should invalidate cache")
})

test("extractFacetsForSession throws on cache miss without a client", async () => {
  await assert.rejects(
    extractFacetsForSession({
      session: {
        session_id: "s-no-client",
        events: [],
        warnings: [],
      },
      client: null,
      cacheDir: null,
    }),
    /no codex client/,
  )
})

test("extractFacetsForSessions reports progress with cache status", async () => {
  const cacheDir = await mkdtemp(join(tmpdir(), "facet-cache-progress-"))
  let llmCalls = 0
  const fakeClient = {
    async runStructured() {
      llmCalls += 1
      return { data: buildValidFacets(), usage: null }
    },
    getTotalUsage: () => ({}),
  }

  const firstSession = {
    session_id: "s-progress-cached",
    cwd: "/tmp",
    model_provider: "openai",
    warnings: [],
    events: [
      { event_type: "user_message", text: "cached", timestamp: "2026-05-10T00:00:00.000Z" },
    ],
  }
  const secondSession = {
    session_id: "s-progress-miss",
    cwd: "/tmp",
    model_provider: "openai",
    warnings: [],
    events: [
      { event_type: "user_message", text: "miss", timestamp: "2026-05-10T00:00:00.000Z" },
    ],
  }

  await extractFacetsForSession({ session: firstSession, client: fakeClient, cacheDir })

  const messages = []
  const progress = {
    log(message) {
      messages.push(message)
    },
    done(label) {
      messages.push(`${label} done`)
    },
  }

  const results = await extractFacetsForSessions({
    sessions: [firstSession, secondSession],
    client: fakeClient,
    cacheDir,
    concurrency: 1,
    progress,
  })

  assert.equal(results[0].cached, true)
  assert.equal(results[1].cached, false)
  assert.deepEqual(messages, [
    "extracting facets for 2 sessions",
    "extracting facets 1/2 session=s-progress-cached cache=hit",
    "extracting facets 2/2 session=s-progress-miss cache=miss",
    "extracting facets done",
  ])
})
