import { readFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const LIB_DIR = dirname(fileURLToPath(import.meta.url))
const SKILL_DIR = resolve(LIB_DIR, "..", "..")
export const PROMPTS_DIR = resolve(SKILL_DIR, "prompts")

export function interpolateTemplate(template, replacements) {
  return template.replaceAll(/\{\{([A-Z0-9_]+)\}\}/g, (_match, key) => {
    const value = replacements[key]
    if (value === undefined || value === null) {
      return ""
    }
    return String(value)
  })
}

export async function loadPrompt(relativePath, replacements = {}) {
  const fullPath = resolve(PROMPTS_DIR, relativePath)
  const template = await readFile(fullPath, "utf8")
  return interpolateTemplate(template, replacements)
}
