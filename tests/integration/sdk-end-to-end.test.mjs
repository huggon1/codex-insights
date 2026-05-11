import test from "node:test"
import assert from "node:assert/strict"
import { mkdtemp, readFile, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { createFixtureSessions } from "../fixture-data.mjs"

const execFileAsync = promisify(execFile)
const REPO_ROOT = "/home/duu/code/codex-insights"

const E2E_ENABLED = process.env.CODEX_INSIGHTS_E2E === "1"

test("real SDK end-to-end report generation", { skip: !E2E_ENABLED }, async () => {
  // The integration check exists to prove the codex SDK path actually
  // returns valid section JSON for real fixture data. It is opt-in
  // behind CODEX_INSIGHTS_E2E because it needs a working codex CLI
  // and network access.
  const { root } = await createFixtureSessions()
  const tempDir = await mkdtemp(join(tmpdir(), "codex-insights-e2e-"))
  const cacheDir = join(tempDir, "cache")
  const reportPath = join(tempDir, "report.md")

  await execFileAsync(
    "node",
    [
      "skills/codex-insights/scripts/build-report.mjs",
      "--root",
      root,
      "--cache-dir",
      cacheDir,
      "--output-file",
      reportPath,
    ],
    { cwd: REPO_ROOT, env: { ...process.env } },
  )

  const report = await readFile(reportPath, "utf8")

  for (const heading of [
    "## At a Glance",
    "## Project Areas",
    "## What Works",
    "## Friction Analysis",
    "## Interaction Style",
    "## Suggestions",
    "## On The Horizon",
    "## Fun Ending",
    "## Stats",
  ]) {
    assert.match(report, new RegExp(`^${heading}$`, "m"), `report missing ${heading}`)
  }

  // Run again — facet cache should now be a full hit so no LLM facet
  // calls happen on the second invocation. Sections still re-run.
  const second = await execFileAsync(
    "node",
    [
      "skills/codex-insights/scripts/build-report.mjs",
      "--root",
      root,
      "--cache-dir",
      cacheDir,
      "--output-file",
      join(tempDir, "report-2.md"),
    ],
    { cwd: REPO_ROOT, env: { ...process.env } },
  )

  assert.equal(typeof second.stdout, "string")

  const secondReport = await readFile(join(tempDir, "report-2.md"), "utf8")
  assert.match(secondReport, /Facet cache hits: \d+/)
  assert.match(secondReport, /Facet LLM calls: 0/)

  // Mutate one fixture session and confirm the cache invalidates only
  // for that session on the next run.
  const fixture = await readFile(
    join(root, "2026", "05", "10", "rollout-fixture-1.jsonl"),
    "utf8",
  )
  await writeFile(
    join(root, "2026", "05", "10", "rollout-fixture-1.jsonl"),
    `${fixture}{"timestamp":"2026-05-10T02:13:34.000Z","type":"event_msg","payload":{"type":"user_message","message":"One more question — anything else?","images":[],"local_images":[],"text_elements":[]}}\n`,
    "utf8",
  )

  await execFileAsync(
    "node",
    [
      "skills/codex-insights/scripts/build-report.mjs",
      "--root",
      root,
      "--cache-dir",
      cacheDir,
      "--output-file",
      join(tempDir, "report-3.md"),
    ],
    { cwd: REPO_ROOT, env: { ...process.env } },
  )

  const thirdReport = await readFile(join(tempDir, "report-3.md"), "utf8")
  assert.match(thirdReport, /Facet LLM calls: 1/)
})
