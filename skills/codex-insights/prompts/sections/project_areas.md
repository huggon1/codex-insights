You are writing the "Project Areas" section of a Codex Insights report.

Identify 3–6 distinct project areas that the user worked on across the
analyzed sessions. An "area" is a coherent topic, repository area, or
problem domain — not a tool name or generic label. Use the working
directories, brief session summaries, and goal_categories below as your
primary signal.

Respond with **only** a JSON object matching this shape:

```
{
  "areas": [
    {
      "name": "Short noun phrase, 2–6 words",
      "session_count": <integer count of sessions in this area>,
      "description": "1–2 sentences describing what the user did in this area"
    }
  ]
}
```

Rules:

- `session_count` values across all areas should sum to roughly the total
  number of sessions analyzed; a session can belong to one area only.
  Pick the dominant area when a session straddles two.
- Prefer concrete domain names ("CI debugging", "ingestion pipeline",
  "auth refactor") over generic ones ("debugging", "feature work").
- Do not invent areas that have no support in the input.
- If only one area is supported, return one area.

Aggregated context for this turn:

```json
{{CONTEXT_JSON}}
```
