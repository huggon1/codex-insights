import { parseCliArgs } from "./lib/cli.mjs"
import { writeFile } from "node:fs/promises"
import { loadNormalizedSessions } from "./lib/load-sessions.mjs"
import { buildSessionSummaries } from "./lib/summaries.mjs"
import { buildAggregateReportData } from "./lib/aggregate.mjs"
import { buildReportFacts } from "./lib/report-facts.mjs"
import { runCodexAnalysis } from "./lib/analysis-runner.mjs"
import { renderMarkdownReport } from "./lib/markdown-report.mjs"

const options = parseCliArgs(process.argv.slice(2))
const sessions = await loadNormalizedSessions({
  root: options.root ?? undefined,
  limit: options.limit ?? undefined,
})

const summaries = buildSessionSummaries(sessions)
const reportData = buildAggregateReportData(summaries)
const reportFacts = buildReportFacts(reportData)
const analysis = await runCodexAnalysis({
  reportFacts,
  analysisFile: options.analysisFile ?? null,
})

const markdown = renderMarkdownReport({ reportData, analysis }).trimEnd()

if (options.outputFile) {
  await writeFile(options.outputFile, `${markdown}\n`, "utf8")
} else {
  console.log(markdown)
}
