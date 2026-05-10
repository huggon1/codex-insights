import { readFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const LIB_DIR = dirname(fileURLToPath(import.meta.url))
const SKILL_DIR = resolve(LIB_DIR, "..", "..")
const DEFAULT_SYSTEM_PROMPT_PATH = resolve(SKILL_DIR, "prompts", "analysis-system.md")
const DEFAULT_USER_PROMPT_PATH = resolve(SKILL_DIR, "prompts", "analysis-user.md")

function interpolateTemplate(template, replacements) {
  return template.replaceAll(/\{\{([A-Z0-9_]+)\}\}/g, (match, key) => replacements[key] ?? match)
}

export async function loadAnalysisPromptTemplates() {
  const [systemTemplate, userTemplate] = await Promise.all([
    readFile(DEFAULT_SYSTEM_PROMPT_PATH, "utf8"),
    readFile(DEFAULT_USER_PROMPT_PATH, "utf8"),
  ])

  return {
    systemTemplate,
    userTemplate,
  }
}

export async function buildAnalysisPrompt({ reportFacts }) {
  const { systemTemplate, userTemplate } = await loadAnalysisPromptTemplates()
  const reportFactsJson = JSON.stringify(reportFacts, null, 2)

  const systemPrompt = interpolateTemplate(systemTemplate, {})
  const userPrompt = interpolateTemplate(userTemplate, {
    REPORT_FACTS_JSON: reportFactsJson,
  })

  return `${systemPrompt.trim()}\n\n---\n\n${userPrompt.trim()}\n`
}
