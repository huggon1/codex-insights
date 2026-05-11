import { createHash } from "node:crypto"
import { mkdir, readFile, stat, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { loadPrompt } from "./prompt-loader.mjs"
import { formatTranscriptForFacets } from "./transcript-format.mjs"
import { buildSessionSummary } from "./summaries.mjs"
import { getFacetOutputSchema, validateFacets } from "./facets.mjs"

const FACET_CACHE_VERSION = "v1"

function hashSessionContent(session) {
  const hasher = createHash("sha256")
  hasher.update(`session_id:${session.session_id ?? ""}\n`)
  hasher.update(`event_count:${session.events?.length ?? 0}\n`)
  for (const event of session.events ?? []) {
    hasher.update(JSON.stringify({
      t: event.timestamp ?? null,
      e: event.event_type,
      r: event.role ?? null,
      n: event.tool_name ?? null,
      s: event.tool_status ?? null,
      l: typeof event.text === "string" ? event.text.length : 0,
    }))
    hasher.update("\n")
  }
  return hasher.digest("hex")
}

function buildCacheEntry(facets, contentHash, sourceFile) {
  return {
    cache_version: FACET_CACHE_VERSION,
    content_hash: contentHash,
    source_file: sourceFile ?? null,
    facets,
  }
}

async function readCacheEntry(cachePath) {
  try {
    const raw = await readFile(cachePath, "utf8")
    return JSON.parse(raw)
  } catch (error) {
    if (error.code === "ENOENT") {
      return null
    }
    throw error
  }
}

async function writeCacheEntry(cachePath, entry) {
  await mkdir(dirname(cachePath), { recursive: true })
  await writeFile(cachePath, `${JSON.stringify(entry, null, 2)}\n`, "utf8")
}

function getCachePath(cacheDir, sessionId) {
  const safeId = sessionId.replace(/[^a-zA-Z0-9._-]/g, "_")
  return join(cacheDir, `${safeId}.json`)
}

async function getSourceMtime(sourceFile) {
  if (!sourceFile) {
    return null
  }
  try {
    const stats = await stat(sourceFile)
    return stats.mtimeMs
  } catch (error) {
    if (error.code === "ENOENT") {
      return null
    }
    throw error
  }
}

export async function extractFacetsForSession({
  session,
  client,
  cacheDir,
  forceRefresh = false,
  reasoningEffort,
}) {
  if (!session?.session_id) {
    throw new Error("session must have a session_id to extract facets")
  }

  const summary = buildSessionSummary(session)
  const contentHash = hashSessionContent(session)
  const cachePath = cacheDir ? getCachePath(cacheDir, session.session_id) : null
  const sourceFile = session.source_file ?? session.events?.[0]?.raw_ref?.source_file ?? null
  const sourceMtime = await getSourceMtime(sourceFile)

  if (!forceRefresh && cachePath) {
    const existing = await readCacheEntry(cachePath)
    if (
      existing &&
      existing.cache_version === FACET_CACHE_VERSION &&
      existing.content_hash === contentHash
    ) {
      return {
        facets: validateFacets(existing.facets, { sessionId: session.session_id }),
        cached: true,
        usage: null,
        source_mtime: sourceMtime,
      }
    }
  }

  if (!client) {
    throw new Error(
      "facet cache miss for session " +
        session.session_id +
        " but no codex client was provided",
    )
  }

  const { transcript, truncated, originalLength } = formatTranscriptForFacets(session)

  const prompt = await loadPrompt("facet-extraction.md", {
    SESSION_ID: session.session_id,
    CWD: session.cwd ?? "unknown",
    MODEL_PROVIDER: session.model_provider ?? "unknown",
    DURATION_SECONDS: summary.duration_seconds ?? "unknown",
    USER_MESSAGE_COUNT: summary.user_message_count,
    ASSISTANT_MESSAGE_COUNT: summary.assistant_message_count,
    TOOL_CALL_COUNT: summary.tool_call_count,
    TOOL_FAILURE_COUNT: summary.tool_failure_count,
    TRANSCRIPT: transcript,
  })

  const result = await client.runStructured(prompt, getFacetOutputSchema(), {
    reasoningEffort,
  })

  const facets = validateFacets(result.data, { sessionId: session.session_id })

  if (cachePath) {
    await writeCacheEntry(
      cachePath,
      buildCacheEntry(facets, contentHash, sourceFile),
    )
  }

  return {
    facets,
    cached: false,
    usage: result.usage,
    transcript_truncated: truncated,
    transcript_original_length: originalLength,
    source_mtime: sourceMtime,
  }
}

export async function extractFacetsForSessions({
  sessions,
  client,
  cacheDir,
  forceRefresh = false,
  reasoningEffort,
  concurrency = 3,
  progress,
}) {
  const results = new Array(sessions.length)
  let cursor = 0
  let completed = 0
  progress?.log?.(`extracting facets for ${sessions.length} sessions`)

  async function worker() {
    while (true) {
      const index = cursor
      cursor += 1
      if (index >= sessions.length) {
        return
      }
      const result = await extractFacetsForSession({
        session: sessions[index],
        client,
        cacheDir,
        forceRefresh,
        reasoningEffort,
      })
      results[index] = result
      completed += 1
      progress?.log?.(
        `extracting facets ${completed}/${sessions.length} ` +
          `session=${sessions[index].session_id} cache=${result.cached ? "hit" : "miss"}`,
      )
    }
  }

  const workerCount = Math.max(1, Math.min(concurrency, sessions.length))
  await Promise.all(Array.from({ length: workerCount }, () => worker()))
  progress?.done?.("extracting facets")
  return results
}
