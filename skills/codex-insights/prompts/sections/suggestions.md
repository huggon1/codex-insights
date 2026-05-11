You are writing the "Suggestions" section of a Codex Insights report.
Recommend small, concrete improvements that would help this user get
better Codex results based on the aggregated evidence.

Respond with **only** a JSON object matching:

```
{
  "agents_md_additions": [
    {
      "title": "Short noun phrase",
      "instruction": "A copyable AGENTS.md-style instruction",
      "evidence": "Specific evidence from the context"
    }
  ],
  "features_to_try": [
    {
      "title": "Short noun phrase",
      "why": "Why this would help based on observed usage",
      "how_to_try": "Concrete next action"
    }
  ],
  "usage_patterns": [
    {
      "pattern": "Observed pattern",
      "recommendation": "Specific adjustment or reinforcement"
    }
  ]
}
```

Rules:

- Be Codex-native. Use AGENTS.md, Codex skills, local scripts, tests,
  repo workflow, and prompt habits where relevant.
- Do not mention Claude.md, Anthropic-only product names, or
  Claude-specific features.
- Ground every suggestion in `CONTEXT_JSON`. If evidence is thin,
  return fewer items rather than generic advice.
- `agents_md_additions` should only include instructions that would
  plausibly reduce repeated friction or reinforce repeated preferences.
- Prefer 2-4 total high-signal suggestions across all arrays over long
  lists.

Aggregated context:

```json
{{CONTEXT_JSON}}
```

