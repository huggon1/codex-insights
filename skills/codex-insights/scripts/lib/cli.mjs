export function parseCliArgs(argv) {
  const options = {
    root: null,
    file: null,
    limit: null,
    analysisFile: null,
    outputFile: null,
    pretty: false,
    includeTrivial: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    const next = argv[index + 1]

    if (arg === "--root" && next) {
      options.root = next
      index += 1
      continue
    }

    if (arg === "--file" && next) {
      options.file = next
      index += 1
      continue
    }

    if (arg === "--limit" && next) {
      const parsed = Number.parseInt(next, 10)
      if (!Number.isNaN(parsed) && parsed > 0) {
        options.limit = parsed
      }
      index += 1
      continue
    }

    if (arg === "--analysis-file" && next) {
      options.analysisFile = next
      index += 1
      continue
    }

    if (arg === "--output-file" && next) {
      options.outputFile = next
      index += 1
      continue
    }

    if (arg === "--pretty") {
      options.pretty = true
      continue
    }

    if (arg === "--include-trivial") {
      options.includeTrivial = true
    }
  }

  return options
}

export function printJson(value, pretty = false) {
  const spacing = pretty ? 2 : 0
  process.stdout.write(`${JSON.stringify(value, null, spacing)}\n`)
}
