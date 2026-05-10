import { readdir } from "node:fs/promises"
import { homedir } from "node:os"
import { join, resolve } from "node:path"

export function getDefaultSessionsRoot() {
  return join(homedir(), ".codex", "sessions")
}

export async function discoverSessionFiles({
  root = getDefaultSessionsRoot(),
  limit = null,
} = {}) {
  const sessionFiles = []
  const resolvedRoot = resolve(root)

  async function walk(currentDir) {
    const entries = await readdir(currentDir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name)

      if (entry.isDirectory()) {
        await walk(fullPath)
        continue
      }

      if (entry.isFile() && entry.name.endsWith(".jsonl")) {
        sessionFiles.push(fullPath)
      }
    }
  }

  await walk(resolvedRoot)

  sessionFiles.sort((left, right) => left.localeCompare(right))

  const finalFiles = limit ? sessionFiles.slice(-limit) : sessionFiles
  return finalFiles.map((filePath) => ({
    path: filePath,
    relative_path: filePath.slice(resolvedRoot.length + 1),
  }))
}
