import { mkdtemp, mkdir, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

const FIXTURE_ONE = `{"timestamp":"2026-05-10T02:13:28.005Z","type":"session_meta","payload":{"id":"session-fixture-1","timestamp":"2026-05-10T02:13:28.005Z","cwd":"/workspace/demo","originator":"codex-tui","cli_version":"0.130.0","source":"cli","thread_source":"user","model_provider":"openai"}}
{"timestamp":"2026-05-10T02:13:28.006Z","type":"event_msg","payload":{"type":"task_started","turn_id":"turn-1","started_at":1778379208}}
{"timestamp":"2026-05-10T02:13:29.000Z","type":"event_msg","payload":{"type":"user_message","message":"Analyze this repository and summarize the main risks.","images":[],"local_images":[],"text_elements":[]}}
{"timestamp":"2026-05-10T02:13:30.000Z","type":"response_item","payload":{"type":"message","role":"assistant","content":[{"type":"output_text","text":"I will inspect the repository and summarize the main risks."}],"phase":"commentary"}}
{"timestamp":"2026-05-10T02:13:31.000Z","type":"response_item","payload":{"type":"function_call","name":"exec_command","arguments":"{\\"cmd\\":\\"rg --files\\"}","call_id":"call-1"}}
{"timestamp":"2026-05-10T02:13:31.500Z","type":"response_item","payload":{"type":"function_call_output","call_id":"call-1","output":"Chunk ID: abc\\nWall time: 0.01 seconds\\nProcess exited with code 0\\nOutput:\\nREADME.md\\nsrc/index.js\\n"}}
{"timestamp":"2026-05-10T02:13:32.000Z","type":"event_msg","payload":{"type":"agent_message","message":"Repository scan complete.","phase":"commentary","memory_citation":null}}
{"timestamp":"2026-05-10T02:13:33.000Z","type":"response_item","payload":{"type":"message","role":"assistant","content":[{"type":"output_text","text":"The main risks are missing tests and unclear ownership."}],"phase":"final_answer"}}
`

const FIXTURE_TWO = `{"timestamp":"2026-05-11T09:00:00.000Z","type":"session_meta","payload":{"id":"session-fixture-2","timestamp":"2026-05-11T09:00:00.000Z","cwd":"/workspace/another-project","originator":"codex-tui","cli_version":"0.130.0","source":"cli","thread_source":"user","model_provider":"openai"}}
{"timestamp":"2026-05-11T09:00:01.000Z","type":"event_msg","payload":{"type":"user_message","message":"Open the latest task and inspect the pending TODOs.","images":[],"local_images":[],"text_elements":[]}}
{"timestamp":"2026-05-11T09:00:02.000Z","type":"response_item","payload":{"type":"reasoning","summary":[],"content":null}}
{"timestamp":"2026-05-11T09:00:03.000Z","type":"response_item","payload":{"type":"function_call","name":"exec_command","arguments":"{\\"cmd\\":\\"sed -n '1,120p' TODO.md\\"}","call_id":"call-2"}}
{"timestamp":"2026-05-11T09:00:03.500Z","type":"response_item","payload":{"type":"function_call_output","call_id":"call-2","output":"Chunk ID: def\\nWall time: 0.02 seconds\\nProcess exited with code 1\\nOutput:\\nsed: TODO.md: No such file or directory\\n"}}
{"timestamp":"2026-05-11T09:00:04.000Z","type":"mystery_record","payload":{"flag":true}}
{"timestamp":"2026-05-11T09:00:05.000Z","type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-2","last_agent_message":"Done"}}
`

const FIXTURE_THREE = `{"timestamp":"bad-timestamp","type":"session_meta","payload":{"id":"session-fixture-3","timestamp":"bad-timestamp","cwd":"/workspace/warning-lab","originator":"codex-tui","cli_version":"0.130.0","source":"cli","thread_source":"user","model_provider":"openai"}}
{"timestamp":"also-bad","type":"event_msg","payload":{"type":"task_started","turn_id":"turn-3","started_at":1778400000}}
{"timestamp":"still-bad","type":"event_msg","payload":{"type":"user_message","message":"Review the unsupported events and tell me what still needs parser coverage.","images":[],"local_images":[],"text_elements":[]}}
{"timestamp":"not-a-date","type":"response_item","payload":{"type":"message","role":"assistant","content":[{"type":"output_text","text":"I will focus on the parser gaps and warning patterns."}],"phase":"commentary"}}
{"timestamp":"2026-05-12T10:00:05.000Z","type":"response_item","payload":{"type":"image_generation_call","result":"ignored"}}
`

const FIXTURE_FOUR = `{"timestamp":"2026-05-13T07:30:00.000Z","type":"session_meta","payload":{"id":"session-fixture-4","timestamp":"2026-05-13T07:30:00.000Z","cwd":"/workspace/metrics-lab","originator":"codex-tui","cli_version":"0.130.0","source":"cli","thread_source":"user","model_provider":"openai"}}
{"timestamp":"2026-05-13T07:30:01.000Z","type":"event_msg","payload":{"type":"task_started","turn_id":"turn-4","started_at":1778484601}}
{"timestamp":"2026-05-13T07:30:02.000Z","type":"event_msg","payload":{"type":"user_message","message":"Inspect the build logs and summarize the repeated failures.","images":[],"local_images":[],"text_elements":[]}}
{"timestamp":"2026-05-13T07:30:03.000Z","type":"response_item","payload":{"type":"message","role":"assistant","content":[{"type":"output_text","text":"I will inspect the logs and identify recurring failures."}],"phase":"commentary"}}
{"timestamp":"2026-05-13T07:30:04.000Z","type":"response_item","payload":{"type":"function_call","name":"exec_command","arguments":"{\\"cmd\\":\\"rg -n \\\\\\"FAIL\\\\\\" build.log\\"}","call_id":"call-4a"}}
{"timestamp":"2026-05-13T07:30:04.500Z","type":"response_item","payload":{"type":"function_call_output","call_id":"call-4a","output":"Chunk ID: ghi\\nWall time: 0.01 seconds\\nProcess exited with code 0\\nOutput:\\n14: FAIL test-alpha\\n72: FAIL test-beta\\n"}}
{"timestamp":"2026-05-13T07:30:05.000Z","type":"response_item","payload":{"type":"function_call","name":"exec_command","arguments":"{\\"cmd\\":\\"npm test -- --runInBand\\"}","call_id":"call-4b"}}
{"timestamp":"2026-05-13T07:30:06.000Z","type":"response_item","payload":{"type":"function_call_output","call_id":"call-4b","output":"Chunk ID: jkl\\nWall time: 2.00 seconds\\nProcess exited with code 1\\nOutput:\\nFAIL test-gamma\\n"}}
{"timestamp":"2026-05-13T07:30:07.000Z","type":"event_msg","payload":{"type":"agent_message","message":"The failures cluster around the same integration test family.","phase":"commentary","memory_citation":null}}
{"timestamp":"2026-05-13T07:30:08.000Z","type":"event_msg","payload":{"type":"user_message","message":"Suggest the next debugging steps.","images":[],"local_images":[],"text_elements":[]}}
{"timestamp":"2026-05-13T07:30:09.000Z","type":"response_item","payload":{"type":"message","role":"assistant","content":[{"type":"output_text","text":"The next steps are to isolate shared fixtures, rerun the failing suite, and compare recent setup changes."}],"phase":"final_answer"}}
{"timestamp":"2026-05-13T07:30:10.000Z","type":"event_msg","payload":{"type":"task_complete","turn_id":"turn-4","last_agent_message":"Done"}}
`

export async function createFixtureSessions() {
  const root = await mkdtemp(join(tmpdir(), "codex-insights-fixtures-"))
  const firstDir = join(root, "2026", "05", "10")
  const secondDir = join(root, "2026", "05", "11")
  const thirdDir = join(root, "2026", "05", "12")
  const fourthDir = join(root, "2026", "05", "13")

  await mkdir(firstDir, { recursive: true })
  await mkdir(secondDir, { recursive: true })
  await mkdir(thirdDir, { recursive: true })
  await mkdir(fourthDir, { recursive: true })

  const firstFile = join(firstDir, "rollout-fixture-1.jsonl")
  const secondFile = join(secondDir, "rollout-fixture-2.jsonl")
  const thirdFile = join(thirdDir, "rollout-fixture-3.jsonl")
  const fourthFile = join(fourthDir, "rollout-fixture-4.jsonl")

  await writeFile(firstFile, FIXTURE_ONE, "utf8")
  await writeFile(secondFile, FIXTURE_TWO, "utf8")
  await writeFile(thirdFile, FIXTURE_THREE, "utf8")
  await writeFile(fourthFile, FIXTURE_FOUR, "utf8")

  return {
    root,
    firstFile,
    secondFile,
    thirdFile,
    fourthFile,
    files: [firstFile, secondFile, thirdFile, fourthFile],
  }
}
