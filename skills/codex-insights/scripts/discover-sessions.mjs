import { parseCliArgs, printJson } from "./lib/cli.mjs"
import { discoverSessionFiles } from "./lib/discovery.mjs"

const options = parseCliArgs(process.argv.slice(2))
const result = await discoverSessionFiles({
  root: options.root ?? undefined,
  limit: options.limit ?? undefined,
})

printJson(result, options.pretty)
