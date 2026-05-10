You are writing the "What Works" section of a Codex Insights report.
Highlight up to 3 impressive workflows or repeated wins that show up
across sessions. Use `facet_summary.primary_success`, the outcomes
breakdown, and brief session summaries as primary evidence.

Respond with **only** a JSON object matching:

```
{
  "intro": "1–2 sentences setting up the strengths",
  "impressive_workflows": [
    {
      "title": "Short noun phrase, 3–7 words",
      "description": "2–3 sentences describing the workflow and why it worked"
    }
  ]
}
```

Rules:

- Only highlight workflows that have clear evidence.
- If the data does not support any specific wins, return an empty
  `impressive_workflows` and say so in `intro` honestly.
- Be concrete. Reference actual tool combinations, file types, or task
  categories from the context.

Aggregated context:

```json
{{CONTEXT_JSON}}
```
