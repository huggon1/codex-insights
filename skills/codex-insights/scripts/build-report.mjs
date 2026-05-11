import { mkdir, writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import { parseCliArgs } from "./lib/cli.mjs"
import { loadNormalizedSessions } from "./lib/load-sessions.mjs"
import { buildSessionSummaries } from "./lib/summaries.mjs"
import { buildAggregateReportData } from "./lib/aggregate.mjs"
import { selectAnalysisSessions } from "./lib/session-quality.mjs"
import { runAnalysisFromFile, runFullAnalysis } from "./lib/analysis-runner.mjs"
import { renderHtmlReport } from "./lib/html-report.mjs"
import { renderMarkdownReport } from "./lib/markdown-report.mjs"
import { resolveFacetCacheDir } from "./lib/cache-paths.mjs"
import { createProgressLogger } from "./lib/progress.mjs"

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
const progress = createProgressLogger({ enabled: !options.quiet })

const sessions = await loadNormalizedSessions({
  root: options.root ?? undefined,
  limit: options.limit ?? undefined,
})
progress.log(`loaded ${sessions.length} sessions`)

const summaries = buildSessionSummaries(sessions)
progress.log(`built ${summaries.length} session summaries`)
const reportData = buildAggregateReportData(summaries, {
  includeTrivial: options.includeTrivial,
})
const analysisSelection = selectAnalysisSessions(sessions, summaries, {
  includeTrivial: options.includeTrivial,
})
progress.log(
  `selected ${analysisSelection.analysis_session_count} sessions for narrative analysis; ` +
    `filtered ${analysisSelection.filtered_session_count} trivial sessions`,
)

let analysis
if (options.analysisFile) {
  progress.log(`loading analysis from ${options.analysisFile}`)
  analysis = await runAnalysisFromFile(options.analysisFile)
  progress.done("loaded analysis file")
} else {
  const cacheDir = resolve(extra.cacheDir ?? resolveFacetCacheDir())
  await mkdir(cacheDir, { recursive: true })
  progress.log(`using facet cache ${cacheDir}`)
  analysis = await runFullAnalysis({
    sessions: analysisSelection.sessions,
    reportData,
    cacheDir,
    forceRefresh: extra.forceRefresh,
    progress,
  })
}

progress.log(`rendering ${options.format} report`)
const output = (options.format === "html"
  ? renderHtmlReport({ reportData, analysis })
  : renderMarkdownReport({ reportData, analysis })).trimEnd()

if (options.outputFile) {
  await writeFile(options.outputFile, `${output}\n`, "utf8")
  progress.log(`wrote ${options.format} report to ${options.outputFile}`)
} else {
  progress.log(`writing ${options.format} report to stdout`)
  console.log(output)
}
