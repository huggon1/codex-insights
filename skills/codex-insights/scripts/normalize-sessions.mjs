import { parseCliArgs, printJson } from "./lib/cli.mjs"
import { discoverSessionFiles } from "./lib/discovery.mjs"
import { loadJsonlRecords } from "./lib/jsonl.mjs"
import { normalizeSessionRecords } from "./lib/normalize.mjs"

const options = parseCliArgs(process.argv.slice(2))
const files = await discoverSessionFiles({
  root: options.root ?? undefined,
  limit: options.limit ?? undefined,
})

const sessions = []
for (const file of files) {
  const { records, warnings } = await loadJsonlRecords(file.path)
  sessions.push(normalizeSessionRecords(records, warnings))
}

printJson(sessions, options.pretty)
