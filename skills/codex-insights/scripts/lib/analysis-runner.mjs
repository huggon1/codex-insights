import { mkdir, readFile } from "node:fs/promises"
import { resolve } from "node:path"
import { createCodexClient } from "./codex-client.mjs"
import { extractFacetsForSessions } from "./facet-extraction.mjs"
import { generateNarrativeSections } from "./sections.mjs"
import { resolveFacetCacheDir } from "./cache-paths.mjs"

function summarizeSectionResults(sections) {
  const ok = []
  const errors = []
  for (const [name, result] of Object.entries(sections)) {
    if (result.status === "ok") {
      ok.push(name)
    } else {
      errors.push({ name, error: result.error })
    }
  }
  return { ok, errors }
}

export async function runAnalysisFromFile(analysisFile) {
  const raw = await readFile(analysisFile, "utf8")
  const parsed = JSON.parse(raw)
  if (!parsed || typeof parsed !== "object") {
    throw new Error("analysis file must contain a JSON object")
  }
  const sections = parsed.sections ?? {}
  const facets = parsed.facets ?? []
  return {
    sections,
    facets,
    cache_stats: { hits: facets.length, llm_calls: 0 },
    sources: { from_file: analysisFile },
    summary: summarizeSectionResults(sections),
  }
}

export async function runFullAnalysis({
  sessions,
  reportData,
  cacheDir,
  client,
  forceRefresh = false,
  reasoningEffort,
  progress,
}) {
  const resolvedCacheDir = cacheDir ? resolve(cacheDir) : resolveFacetCacheDir()
  await mkdir(resolvedCacheDir, { recursive: true })

  const codexClient = client ?? createCodexClient({})

  const facetResults = await extractFacetsForSessions({
    sessions,
    client: codexClient,
    cacheDir: resolvedCacheDir,
    forceRefresh,
    reasoningEffort,
    progress,
  })

  const facets = facetResults.map((result) => result.facets)

  const { sections } = await generateNarrativeSections({
    client: codexClient,
    reportData,
    facets,
    progress,
  })

  return {
    sections,
    facets,
    cache_stats: {
      hits: facetResults.filter((r) => r.cached).length,
      llm_calls: facetResults.filter((r) => !r.cached).length,
    },
    usage: codexClient.getTotalUsage?.() ?? null,
    summary: summarizeSectionResults(sections),
  }
}
