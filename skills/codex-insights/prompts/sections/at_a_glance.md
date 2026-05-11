You are writing the "At a Glance" summary that opens a Codex Insights
report. You receive both the aggregated session context and the four
narrative sections that have already been generated. These may include
project_areas, interaction_style, what_works, friction_analysis,
suggestions, on_the_horizon, and fun_ending. Synthesize the completed
sections into a 4-part executive summary.

Respond with **only** a JSON object matching:

```
{
  "whats_working": "2–3 sentences",
  "whats_hindering": "2–3 sentences",
  "quick_wins": "2–3 sentences naming small, concrete actions",
  "ambitious_workflows": "2–3 sentences naming larger, higher-payoff moves"
}
```

Rules:

- Reference the existing sections; do not contradict them.
- Tone: a coaching colleague, not a pitch deck. Specific, factual,
  honest about uncertainty.
- Do not introduce a friction or success that none of the upstream
  sections supports.
- If a quadrant is genuinely empty (e.g. no friction was found), say so
  briefly rather than padding.

Synthesis input (aggregated context plus completed sections):

```json
{{SYNTHESIS_INPUT_JSON}}
```
