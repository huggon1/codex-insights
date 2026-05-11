import { parseCliArgs, printJson } from "./lib/cli.mjs"
import { loadNormalizedSessions } from "./lib/load-sessions.mjs"
import { buildSessionSummaries } from "./lib/summaries.mjs"
import { buildAggregateReportData } from "./lib/aggregate.mjs"
import { buildReportFacts } from "./lib/report-facts.mjs"

const options = parseCliArgs(process.argv.slice(2))
const sessions = await loadNormalizedSessions({
  root: options.root ?? undefined,
  limit: options.limit ?? undefined,
})

const summaries = buildSessionSummaries(sessions)
const reportData = buildAggregateReportData(summaries, {
  includeTrivial: options.includeTrivial,
})

printJson(buildReportFacts(reportData), options.pretty)
