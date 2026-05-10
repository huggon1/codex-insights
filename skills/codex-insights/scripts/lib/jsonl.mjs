import { readFile } from "node:fs/promises"
import { resolve } from "node:path"

export async function loadJsonlRecords(filePath) {
  const resolvedPath = resolve(filePath)
  const content = await readFile(resolvedPath, "utf8")
  const lines = content.split(/\r?\n/)
  const records = []
  const warnings = []

  lines.forEach((line, index) => {
    if (!line.trim()) {
      return
    }

    try {
      const parsed = JSON.parse(line)
      records.push({
        timestamp: parsed.timestamp ?? null,
        type: parsed.type ?? "unknown",
        payload: parsed.payload ?? null,
        raw: parsed,
        source_file: resolvedPath,
        line_number: index + 1,
      })
    } catch (error) {
      warnings.push({
        code: "invalid_jsonl_line",
        message: error instanceof Error ? error.message : "Failed to parse JSONL line.",
        source_file: resolvedPath,
        line_number: index + 1,
      })
    }
  })

  return { records, warnings }
}
