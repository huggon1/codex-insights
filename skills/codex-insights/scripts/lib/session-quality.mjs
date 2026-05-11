const THIRTY_MINUTES_MS = 30 * 60 * 1000

export const TRIVIAL_SESSION_THRESHOLDS = {
  max_event_count: 5,
  max_user_message_count: 1,
  required_tool_call_count: 0,
}

function parseTimestamp(value) {
  if (typeof value !== "string") {
    return null
  }
  const timestamp = Date.parse(value)
  return Number.isNaN(timestamp) ? null : timestamp
}

function normalizePrompt(value) {
  if (typeof value !== "string") {
    return null
  }
  const normalized = value.toLowerCase().replace(/\s+/g, " ").trim()
  return normalized || null
}

function isTaskComplete(summary) {
  return Array.isArray(summary.observed_system_events)
    && summary.observed_system_events.includes("task_complete")
}

export function classifySessionSummary(summary) {
  const isTrivial =
    summary.event_count <= TRIVIAL_SESSION_THRESHOLDS.max_event_count
    && summary.tool_call_count === TRIVIAL_SESSION_THRESHOLDS.required_tool_call_count
    && summary.user_message_count <= TRIVIAL_SESSION_THRESHOLDS.max_user_message_count

  return {
    session_id: summary.session_id,
    is_trivial: isTrivial,
    is_abandoned: summary.user_message_count > 0 && !isTaskComplete(summary),
  }
}

export function selectAnalysisSessions(sessions, summaries, { includeTrivial = false } = {}) {
  const classificationById = new Map(
    summaries.map((summary) => [summary.session_id, classifySessionSummary(summary)]),
  )

  const selected = []
  const filtered = []

  for (const session of sessions) {
    const classification = classificationById.get(session.session_id)
    if (!includeTrivial && classification?.is_trivial) {
      filtered.push(session)
      continue
    }
    selected.push(session)
  }

  return {
    sessions: selected,
    filtered_sessions: filtered,
    include_trivial: includeTrivial,
    analysis_session_count: selected.length,
    filtered_session_count: filtered.length,
  }
}

function buildOverlapReport(summaries) {
  const intervals = summaries
    .map((summary) => ({
      session_id: summary.session_id,
      cwd: summary.cwd,
      start: parseTimestamp(summary.started_at),
      end: parseTimestamp(summary.ended_at),
    }))
    .filter((entry) => entry.start !== null && entry.end !== null && entry.end >= entry.start)
    .sort((left, right) => left.start - right.start)

  const involved = new Set()
  const examples = []
  let overlapEvents = 0

  for (let leftIndex = 0; leftIndex < intervals.length; leftIndex += 1) {
    const left = intervals[leftIndex]
    for (let rightIndex = leftIndex + 1; rightIndex < intervals.length; rightIndex += 1) {
      const right = intervals[rightIndex]
      if (right.start >= left.end) {
        break
      }

      const overlapMs = Math.min(left.end, right.end) - right.start
      if (overlapMs <= 0) {
        continue
      }

      overlapEvents += 1
      involved.add(left.session_id)
      involved.add(right.session_id)
      if (examples.length < 5) {
        examples.push({
          session_ids: [left.session_id, right.session_id],
          cwd: left.cwd === right.cwd ? left.cwd : null,
          overlap_seconds: Math.round(overlapMs / 1000),
        })
      }
    }
  }

  return {
    overlap_events: overlapEvents,
    sessions_involved: involved.size,
    examples,
  }
}

function buildRetryLikeReport(summaries) {
  const grouped = new Map()
  for (const summary of summaries) {
    const prompt = normalizePrompt(summary.first_user_message)
    const start = parseTimestamp(summary.started_at)
    if (!prompt || start === null) {
      continue
    }

    const key = `${summary.cwd ?? "unknown"}\n${prompt}`
    const entries = grouped.get(key) ?? []
    entries.push({
      session_id: summary.session_id,
      cwd: summary.cwd,
      first_user_message: summary.first_user_message,
      start,
    })
    grouped.set(key, entries)
  }

  const examples = []
  let groupCount = 0
  let sessionsInvolved = 0

  for (const entries of grouped.values()) {
    const sorted = entries.sort((left, right) => left.start - right.start)
    let cluster = []

    const flushCluster = () => {
      if (cluster.length < 2) {
        return
      }
      groupCount += 1
      sessionsInvolved += cluster.length
      if (examples.length < 5) {
        examples.push({
          session_ids: cluster.map((entry) => entry.session_id),
          cwd: cluster[0].cwd,
          first_user_message: cluster[0].first_user_message,
        })
      }
    }

    for (const entry of sorted) {
      const previous = cluster.at(-1)
      if (!previous || entry.start - previous.start <= THIRTY_MINUTES_MS) {
        cluster.push(entry)
        continue
      }
      flushCluster()
      cluster = [entry]
    }
    flushCluster()
  }

  return {
    group_count: groupCount,
    sessions_involved: sessionsInvolved,
    examples,
  }
}

export function buildSessionQualityReport(summaries, { includeTrivial = false } = {}) {
  const classifications = summaries.map((summary) => classifySessionSummary(summary))
  const trivialCount = classifications.filter((entry) => entry.is_trivial).length
  const abandonedCount = classifications.filter((entry) => entry.is_abandoned).length

  return {
    include_trivial: includeTrivial,
    trivial_session_count: trivialCount,
    analysis_session_count: includeTrivial ? summaries.length : summaries.length - trivialCount,
    filtered_session_count: includeTrivial ? 0 : trivialCount,
    abandoned_session_count: abandonedCount,
    multi_session_overlap: buildOverlapReport(summaries),
    likely_retry_groups: buildRetryLikeReport(summaries),
  }
}

