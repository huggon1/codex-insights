You are writing the "Friction Analysis" section of a Codex Insights
report. Identify up to 3 categories of friction that show up across
sessions. Use `facet_summary.friction_counts`, `tool_error_categories`,
and the brief session summaries as primary evidence.

Respond with **only** a JSON object matching:

```
{
  "intro": "1–2 sentences setting up the friction landscape",
  "categories": [
    {
      "category": "Short noun phrase",
      "description": "2–3 sentences explaining what goes wrong and why",
      "examples": ["Specific concrete example from a session", ...]
    }
  ]
}
```

Rules:

- Only list a category if it has clear evidence (count ≥ 1 in friction
  counts or a tool error category, or a session summary mentions it).
- If there is no meaningful friction, return an empty `categories`
  array and say so in `intro`.
- Each example should reference a concrete behaviour or session
  identifier; do not invent examples.
- Prefer 2 well-supported categories over 3 weak ones.

Aggregated context:

```json
{{CONTEXT_JSON}}
```
