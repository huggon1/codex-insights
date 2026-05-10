import { resolve } from "node:path"
import { parseCliArgs, printJson } from "./lib/cli.mjs"
import { loadJsonlRecords } from "./lib/jsonl.mjs"
import { normalizeSessionRecords } from "./lib/normalize.mjs"

const options = parseCliArgs(process.argv.slice(2))

if (!options.file) {
  process.stderr.write("Missing required --file argument.\n")
  process.exit(1)
}

const { records, warnings } = await loadJsonlRecords(resolve(options.file))
const normalized = normalizeSessionRecords(records, warnings)

printJson(normalized, options.pretty)
