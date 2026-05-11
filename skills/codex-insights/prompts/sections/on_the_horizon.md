You are writing the "On The Horizon" section of a Codex Insights report.
Identify higher-leverage opportunities the user could try next based on
their current session patterns, strengths, friction, and project areas.

Respond with **only** a JSON object matching:

```
{
  "intro": "1-2 sentences framing the opportunity landscape",
  "opportunities": [
    {
      "title": "Short noun phrase",
      "whats_possible": "2-3 sentences describing the higher-leverage workflow",
      "how_to_try": "Concrete first step",
      "copyable_prompt": "A concise prompt the user could paste into Codex"
    }
  ]
}
```

Rules:

- Recommend opportunities that build on observed behavior; do not pitch
  unrelated capabilities.
- Use Codex-native workflows: planning prompts, repo-local scripts,
  tests, skills, AGENTS.md conventions, and iterative implementation
  loops.
- `copyable_prompt` must be directly usable and must not reference
  unavailable tools or private product features.
- If evidence is thin, return one conservative opportunity and say so in
  `intro`.
- Prefer 1-3 opportunities.

Aggregated context:

```json
{{CONTEXT_JSON}}
```

