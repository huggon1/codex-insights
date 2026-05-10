You are analyzing a single Codex coding session transcript and producing
structured facets that describe the underlying goal, outcome, friction
patterns, and primary success of the session.

Respond with **only** a JSON object that matches the provided schema.
No prose, no code fences, no explanation.

## Field guidance

- `underlying_goal`: one sentence describing what the user was actually
  trying to accomplish in this session, in their own framing. Avoid
  Codex-internal terminology; describe the goal as a software engineer
  would describe it to a colleague.
- `goal_category`: pick the single best category. Use
  `warmup_minimal` only when the session has barely any substantive
  exchange (e.g. a one-line ping). Use `understand_codebase` when the
  user is mostly reading or asking explanatory questions.
- `outcome`: judge against the user's stated goal, not Codex's effort.
  `unclear_from_transcript` is the right answer when the transcript
  ends without resolution.
- `session_type`:
  - `single_task` — one cohesive task, one round of execution.
  - `multi_task` — several distinct tasks in one session.
  - `iterative_refinement` — repeated tweak/retry on the same artifact.
  - `exploration` — user is mostly reading or asking questions.
  - `quick_question` — a single short Q&A.
- `friction_counts`: count friction signals you can clearly observe.
  Use 0 freely; do not invent friction. Definitions:
  - `misunderstood_request`: agent acted on the wrong reading of the ask.
  - `wrong_approach`: agent chose a strategy that did not fit the goal.
  - `buggy_code`: produced or applied code that obviously fails or has
    an evident defect.
  - `user_rejected_action`: user explicitly told the agent to stop or
    undo something it did.
  - `excessive_changes`: agent made far more changes than the user asked
    for.
  - `user_stopped_early`: user abandoned the session before the goal
    looked complete.
  - `wrong_file_or_location`: agent edited or examined the wrong file
    or path.
  - `slow_or_verbose`: agent's responses were noticeably longwinded or
    repetitive in a way that frustrated progress.
  - `tool_failed`: a tool invocation returned an error that affected
    progress.
  - `user_unclear`: user's prompt was ambiguous and that ambiguity drove
    follow-up clarification.
  - `external_issue`: blocker outside Codex (network, missing files,
    missing credentials).
- `primary_success`: pick the single label that best describes the
  most valuable thing this session accomplished. Use `none` when the
  session did not produce a clear win.
- `brief_summary`: 2–4 sentences. State what the user wanted, what
  Codex did, and how it ended. Do not editorialize.

## Calibration

- Be concrete. Reference specific files, commands, or behaviors when
  they appear in the transcript.
- Prefer `unclear_from_transcript` and 0-counts over guesses.
- Do not invent details that are not in the transcript.

## Session metadata

- session_id: {{SESSION_ID}}
- cwd: {{CWD}}
- model_provider: {{MODEL_PROVIDER}}
- duration_seconds: {{DURATION_SECONDS}}
- user_messages: {{USER_MESSAGE_COUNT}}
- assistant_messages: {{ASSISTANT_MESSAGE_COUNT}}
- tool_calls: {{TOOL_CALL_COUNT}}
- tool_failures: {{TOOL_FAILURE_COUNT}}

## Transcript

{{TRANSCRIPT}}
