You are writing the "Interaction Style" section of a Codex Insights
report. Describe how this user collaborates with Codex.

Use the totals, tool counts, message_hour_histogram, user_interruptions,
session_types breakdown, and brief session summaries as evidence. Do
not speculate beyond what the data supports.

Respond with **only** a JSON object matching:

```
{
  "narrative": "3–5 sentences describing the user's working style",
  "key_pattern": "One sentence naming the single most distinctive habit"
}
```

Calibration:

- Be specific. "User runs short, focused sessions, mostly during early
  UTC hours" is better than "User works efficiently".
- Tie observations to evidence (e.g. "67% of tool calls go through
  exec_command", "sessions average 4 minutes").
- If evidence is thin, say so honestly in `narrative`.

Aggregated context:

```json
{{CONTEXT_JSON}}
```
