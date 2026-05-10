import { parseCliArgs, printJson } from "./lib/cli.mjs"
import { loadNormalizedSessions } from "./lib/load-sessions.mjs"
import { buildSessionSummaries } from "./lib/summaries.mjs"

const options = parseCliArgs(process.argv.slice(2))
const sessions = await loadNormalizedSessions({
  root: options.root ?? undefined,
  limit: options.limit ?? undefined,
})

printJson(buildSessionSummaries(sessions), options.pretty)
