#!/usr/bin/env node
import { mkdir } from "node:fs/promises"
import { resolve } from "node:path"
import { parseCliArgs, printJson } from "./lib/cli.mjs"
import { loadNormalizedSessions } from "./lib/load-sessions.mjs"
import { createCodexClient } from "./lib/codex-client.mjs"
import { extractFacetsForSessions } from "./lib/facet-extraction.mjs"
import { resolveFacetCacheDir } from "./lib/cache-paths.mjs"

function parseExtraArgs(argv) {
  const extras = { forceRefresh: false, cacheDir: null, model: null }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    const next = argv[index + 1]
    if (arg === "--force") {
      extras.forceRefresh = true
      continue
    }
    if (arg === "--cache-dir" && next) {
      extras.cacheDir = next
      index += 1
      continue
    }
    if (arg === "--model" && next) {
      extras.model = next
      index += 1
      continue
    }
  }
  return extras
}

const baseOptions = parseCliArgs(process.argv.slice(2))
const extra = parseExtraArgs(process.argv.slice(2))

const sessions = await loadNormalizedSessions({
  root: baseOptions.root ?? undefined,
  limit: baseOptions.limit ?? undefined,
})

const cacheDir = resolve(extra.cacheDir ?? resolveFacetCacheDir())
await mkdir(cacheDir, { recursive: true })

const client = createCodexClient({
  ...(extra.model ? { model: extra.model } : {}),
})

const results = await extractFacetsForSessions({
  sessions,
  client,
  cacheDir,
  forceRefresh: extra.forceRefresh,
})

const summary = {
  cache_dir: cacheDir,
  session_count: sessions.length,
  cache_hits: results.filter((r) => r.cached).length,
  llm_calls: results.filter((r) => !r.cached).length,
  total_usage: client.getTotalUsage(),
  facets: results.map((result, index) => ({
    session_id: sessions[index].session_id,
    cached: result.cached,
    facets: result.facets,
  })),
}

printJson(summary, baseOptions.pretty)
