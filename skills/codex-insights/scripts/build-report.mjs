import { mkdir, writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import { parseCliArgs } from "./lib/cli.mjs"
import { loadNormalizedSessions } from "./lib/load-sessions.mjs"
import { buildSessionSummaries } from "./lib/summaries.mjs"
import { buildAggregateReportData } from "./lib/aggregate.mjs"
import { runAnalysisFromFile, runFullAnalysis } from "./lib/analysis-runner.mjs"
import { renderMarkdownReport } from "./lib/markdown-report.mjs"
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

const options = parseCliArgs(process.argv.slice(2))
const extra = parseExtraArgs(process.argv.slice(2))

const sessions = await loadNormalizedSessions({
  root: options.root ?? undefined,
  limit: options.limit ?? undefined,
})

const summaries = buildSessionSummaries(sessions)
const reportData = buildAggregateReportData(summaries)

let analysis
if (options.analysisFile) {
  analysis = await runAnalysisFromFile(options.analysisFile)
} else {
  const cacheDir = resolve(extra.cacheDir ?? resolveFacetCacheDir())
  await mkdir(cacheDir, { recursive: true })
  analysis = await runFullAnalysis({
    sessions,
    reportData,
    cacheDir,
    forceRefresh: extra.forceRefresh,
  })
}

const markdown = renderMarkdownReport({ reportData, analysis }).trimEnd()

if (options.outputFile) {
  await writeFile(options.outputFile, `${markdown}\n`, "utf8")
} else {
  console.log(markdown)
}
