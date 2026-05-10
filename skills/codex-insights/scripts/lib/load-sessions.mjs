import { discoverSessionFiles } from "./discovery.mjs"
import { loadJsonlRecords } from "./jsonl.mjs"
import { normalizeSessionRecords } from "./normalize.mjs"

export async function loadNormalizedSessions({
  root = undefined,
  limit = undefined,
} = {}) {
  const files = await discoverSessionFiles({ root, limit })
  const sessions = []

  for (const file of files) {
    const { records, warnings } = await loadJsonlRecords(file.path)
    sessions.push(normalizeSessionRecords(records, warnings))
  }

  return sessions
}
