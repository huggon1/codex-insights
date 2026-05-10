import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { spawn } from "node:child_process"
import { buildAnalysisPrompt } from "./analysis-prompt.mjs"
import { getAnalysisOutputSchema, normalizeAnalysisOutput } from "./analysis-output.mjs"

function runCommand(command, args, input) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["pipe", "pipe", "pipe"],
    })

    let stderr = ""
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString()
    })

    child.on("error", (error) => {
      reject(error)
    })

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `Command failed with exit code ${code}.`))
        return
      }

      resolve()
    })

    child.stdin.end(input)
  })
}

export async function runCodexAnalysis({ reportFacts, analysisFile = null }) {
  if (analysisFile) {
    const content = await readFile(analysisFile, "utf8")
    return normalizeAnalysisOutput(JSON.parse(content))
  }

  const prompt = await buildAnalysisPrompt({ reportFacts })
  const tempDir = await mkdtemp(join(tmpdir(), "codex-insights-analysis-"))
  const schemaPath = join(tempDir, "analysis-schema.json")
  const outputPath = join(tempDir, "analysis-output.json")

  try {
    await writeFile(schemaPath, JSON.stringify(getAnalysisOutputSchema(), null, 2), "utf8")
    await runCommand(
      "codex",
      [
        "exec",
        "--skip-git-repo-check",
        "--sandbox",
        "read-only",
        "--ask-for-approval",
        "never",
        "--color",
        "never",
        "--output-schema",
        schemaPath,
        "--output-last-message",
        outputPath,
        "-",
      ],
      prompt,
    )

    const output = await readFile(outputPath, "utf8")
    return normalizeAnalysisOutput(JSON.parse(output))
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
}
