function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function getSectionData(section) {
  return section?.status === "ok" ? section.data : null
}

function renderParagraph(value) {
  const text = String(value ?? "").trim()
  return text ? `<p>${escapeHtml(text)}</p>` : ""
}

function renderCountBars(title, counts, color = "#2563eb") {
  const entries = Object.entries(counts ?? {})
  const max = entries.reduce((value, [, count]) => Math.max(value, Number(count) || 0), 0)
  const rows = entries.length === 0
    ? '<p class="empty">None</p>'
    : entries.map(([name, count]) => {
      const width = max > 0 ? Math.max(4, Math.round((Number(count) / max) * 100)) : 0
      return `
        <div class="bar-row">
          <div class="bar-label">${escapeHtml(name)}</div>
          <div class="bar-track"><div class="bar-fill" style="width: ${width}%; background: ${color};"></div></div>
          <div class="bar-value">${escapeHtml(count)}</div>
        </div>
      `
    }).join("")

  return `
    <section class="chart-card">
      <h3>${escapeHtml(title)}</h3>
      ${rows}
    </section>
  `
}

function renderCopyablePrompt(prompt) {
  if (!prompt) {
    return ""
  }

  return `
    <div class="copyable">
      <div class="copy-label">Paste into Codex</div>
      <div class="copy-row">
        <code>${escapeHtml(prompt)}</code>
        <button type="button" class="copy-btn">Copy</button>
      </div>
    </div>
  `
}

function renderAtAGlance(section) {
  const data = getSectionData(section)
  if (!data) {
    return '<section id="at-a-glance" class="panel muted">At-a-glance synthesis was not generated.</section>'
  }

  const items = [
    ["What's working", data.whats_working, "what-works"],
    ["What's hindering you", data.whats_hindering, "friction"],
    ["Quick wins", data.quick_wins, "suggestions"],
    ["Ambitious workflows", data.ambitious_workflows, "horizon"],
  ]

  return `
    <section id="at-a-glance" class="at-a-glance">
      <h2>At a Glance</h2>
      <div class="glance-grid">
        ${items.map(([title, body, link]) => `
          <article class="glance-card">
            <h3>${escapeHtml(title)}</h3>
            <p>${escapeHtml(body)}</p>
            <a href="#${link}">See more</a>
          </article>
        `).join("")}
      </div>
    </section>
  `
}

function renderProjectAreas(section) {
  const data = getSectionData(section)
  const areas = Array.isArray(data?.areas) ? data.areas : []
  if (areas.length === 0) {
    return '<section id="project-areas"><h2>Project Areas</h2><p class="muted">No project areas were identified.</p></section>'
  }

  return `
    <section id="project-areas">
      <h2>Project Areas</h2>
      <div class="card-list">
        ${areas.map((area) => `
          <article class="card">
            <div class="card-header">
              <h3>${escapeHtml(area.name)}</h3>
              <span>${escapeHtml(area.session_count)} sessions</span>
            </div>
            <p>${escapeHtml(area.description)}</p>
          </article>
        `).join("")}
      </div>
    </section>
  `
}

function renderWhatWorks(section) {
  const data = getSectionData(section)
  const workflows = Array.isArray(data?.impressive_workflows) ? data.impressive_workflows : []
  return `
    <section id="what-works">
      <h2>What Works</h2>
      ${renderParagraph(data?.intro) || '<p class="muted">What-works narrative was not generated.</p>'}
      <div class="card-list success">
        ${workflows.map((workflow) => `
          <article class="card">
            <h3>${escapeHtml(workflow.title)}</h3>
            <p>${escapeHtml(workflow.description)}</p>
          </article>
        `).join("")}
      </div>
    </section>
  `
}

function renderFriction(section) {
  const data = getSectionData(section)
  const categories = Array.isArray(data?.categories) ? data.categories : []
  return `
    <section id="friction">
      <h2>Friction Analysis</h2>
      ${renderParagraph(data?.intro) || '<p class="muted">Friction analysis was not generated.</p>'}
      <div class="card-list friction">
        ${categories.map((category) => `
          <article class="card">
            <h3>${escapeHtml(category.category)}</h3>
            <p>${escapeHtml(category.description)}</p>
            ${Array.isArray(category.examples) && category.examples.length > 0
              ? `<ul>${category.examples.map((example) => `<li>${escapeHtml(example)}</li>`).join("")}</ul>`
              : ""}
          </article>
        `).join("")}
      </div>
    </section>
  `
}

function renderInteractionStyle(section) {
  const data = getSectionData(section)
  if (!data) {
    return '<section id="interaction-style"><h2>Interaction Style</h2><p class="muted">Interaction style narrative was not generated.</p></section>'
  }

  return `
    <section id="interaction-style">
      <h2>Interaction Style</h2>
      <article class="narrative-card">
        ${renderParagraph(data.narrative)}
        ${data.key_pattern ? `<div class="key-insight"><strong>Key pattern:</strong> ${escapeHtml(data.key_pattern)}</div>` : ""}
      </article>
    </section>
  `
}

function renderSuggestions(section) {
  const data = getSectionData(section)
  if (!data) {
    return '<section id="suggestions"><h2>Suggestions</h2><p class="muted">Suggestions were not generated.</p></section>'
  }

  const agentsAdditions = Array.isArray(data.agents_md_additions) ? data.agents_md_additions : []
  const features = Array.isArray(data.features_to_try) ? data.features_to_try : []
  const patterns = Array.isArray(data.usage_patterns) ? data.usage_patterns : []

  return `
    <section id="suggestions">
      <h2>Suggestions</h2>
      <div class="suggestion-grid">
        <article class="suggestion-column">
          <h3>AGENTS.md Additions</h3>
          ${agentsAdditions.length === 0 ? '<p class="muted">No AGENTS.md additions identified.</p>' : agentsAdditions.map((item) => `
            <div class="mini-card">
              <h4>${escapeHtml(item.title)}</h4>
              <p>${escapeHtml(item.instruction)}</p>
              <small>Evidence: ${escapeHtml(item.evidence)}</small>
            </div>
          `).join("")}
        </article>
        <article class="suggestion-column">
          <h3>Features or Workflows to Try</h3>
          ${features.length === 0 ? '<p class="muted">No feature suggestions identified.</p>' : features.map((item) => `
            <div class="mini-card">
              <h4>${escapeHtml(item.title)}</h4>
              <p>${escapeHtml(item.why)}</p>
              <small>Try: ${escapeHtml(item.how_to_try)}</small>
            </div>
          `).join("")}
        </article>
        <article class="suggestion-column">
          <h3>Usage Patterns</h3>
          ${patterns.length === 0 ? '<p class="muted">No usage pattern suggestions identified.</p>' : patterns.map((item) => `
            <div class="mini-card">
              <h4>${escapeHtml(item.pattern)}</h4>
              <p>${escapeHtml(item.recommendation)}</p>
            </div>
          `).join("")}
        </article>
      </div>
    </section>
  `
}

function renderOnTheHorizon(section) {
  const data = getSectionData(section)
  const opportunities = Array.isArray(data?.opportunities) ? data.opportunities : []
  return `
    <section id="horizon">
      <h2>On The Horizon</h2>
      ${renderParagraph(data?.intro) || '<p class="muted">On-the-horizon opportunities were not generated.</p>'}
      <div class="card-list horizon">
        ${opportunities.map((item) => `
          <article class="card">
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(item.whats_possible)}</p>
            <p><strong>Getting started:</strong> ${escapeHtml(item.how_to_try)}</p>
            ${renderCopyablePrompt(item.copyable_prompt)}
          </article>
        `).join("")}
      </div>
    </section>
  `
}

function renderFunEnding(section) {
  const data = getSectionData(section)
  if (!data) {
    return '<section id="fun-ending" class="fun-ending"><p class="muted">Fun ending was not generated.</p></section>'
  }

  return `
    <section id="fun-ending" class="fun-ending">
      <h2>${escapeHtml(data.headline)}</h2>
      <p>${escapeHtml(data.detail)}</p>
    </section>
  `
}

function renderStats(reportData) {
  const statCards = [
    ["Sessions", reportData.session_count],
    ["Narrative Sessions", reportData.analysis_session_count ?? reportData.session_count],
    ["User Messages", reportData.total_user_messages],
    ["Tool Calls", reportData.total_tool_calls],
    ["Tool Failures", reportData.total_tool_failures],
    ["Total Tokens", reportData.total_tokens],
  ]

  return `
    <section id="stats">
      <h2>Stats</h2>
      <div class="stats-grid">
        ${statCards.map(([label, value]) => `
          <article class="stat-card">
            <div class="stat-value">${escapeHtml(value ?? 0)}</div>
            <div class="stat-label">${escapeHtml(label)}</div>
          </article>
        `).join("")}
      </div>
      <div class="chart-grid">
        ${renderCountBars("Tool Usage", reportData.tool_counts, "#0891b2")}
        ${renderCountBars("Tool Errors", reportData.tool_error_categories, "#dc2626")}
        ${renderCountBars("Working Directories", reportData.cwd_counts, "#2563eb")}
        ${renderCountBars("Model Providers", reportData.model_provider_counts, "#8b5cf6")}
      </div>
      <article class="quality-card">
        <h3>Session Quality Signals</h3>
        <ul>
          <li>Trivial sessions filtered from narrative analysis: ${escapeHtml(reportData.filtered_session_count ?? 0)}</li>
          <li>Abandoned sessions flagged: ${escapeHtml(reportData.abandoned_session_count ?? 0)}</li>
          <li>Retry-like groups flagged: ${escapeHtml(reportData.likely_retry_group_count ?? 0)}</li>
          <li>Overlap events: ${escapeHtml(reportData.multi_session_overlap?.overlap_events ?? 0)}</li>
        </ul>
      </article>
    </section>
  `
}

function renderSessionSnapshots(sessions) {
  const entries = Array.isArray(sessions) ? sessions : []
  return `
    <section id="sessions">
      <h2>Session Snapshots</h2>
      <div class="session-list">
        ${entries.length === 0 ? '<p class="muted">No sessions found.</p>' : entries.map((session) => `
          <article class="session-card">
            <h3>${escapeHtml(session.session_id)}</h3>
            <div class="session-meta">
              <span>${escapeHtml(session.started_at ?? "unknown")}</span>
              <span>${escapeHtml(session.cwd ?? "unknown")}</span>
              <span>${escapeHtml(session.model_provider ?? "unknown")}</span>
            </div>
            ${session.first_user_message ? `<p><strong>First user:</strong> ${escapeHtml(session.first_user_message)}</p>` : ""}
            ${session.last_assistant_message ? `<p><strong>Last assistant:</strong> ${escapeHtml(session.last_assistant_message)}</p>` : ""}
            <small>Warnings: ${escapeHtml(session.warning_count)} · Tool failures: ${escapeHtml(session.tool_failure_count)}</small>
          </article>
        `).join("")}
      </div>
    </section>
  `
}

function renderSectionErrors(sections) {
  const errors = Object.entries(sections ?? {})
    .filter(([, section]) => section?.status === "error")
    .map(([name, section]) => `<li><code>${escapeHtml(name)}</code>: ${escapeHtml(section.error)}</li>`)

  if (errors.length === 0) {
    return ""
  }

  return `
    <section id="section-notes" class="warning-panel">
      <h2>Section Generation Notes</h2>
      <ul>${errors.join("")}</ul>
    </section>
  `
}

function renderRunMetadata(analysis) {
  if (!analysis?.cache_stats) {
    return ""
  }

  return `
    <section id="metadata">
      <h2>Run Metadata</h2>
      <ul class="metadata-list">
        <li>Facet cache hits: ${escapeHtml(analysis.cache_stats.hits)}</li>
        <li>Facet LLM calls: ${escapeHtml(analysis.cache_stats.llm_calls)}</li>
        ${analysis.usage ? `<li>Total input tokens: ${escapeHtml(analysis.usage.input_tokens ?? 0)}</li><li>Total output tokens: ${escapeHtml(analysis.usage.output_tokens ?? 0)}</li>` : ""}
      </ul>
    </section>
  `
}

const CSS = `
  * { box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body { margin: 0; background: #f8fafc; color: #263241; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.6; }
  .container { width: min(1040px, calc(100% - 32px)); margin: 0 auto; padding: 48px 0 72px; }
  header { margin-bottom: 28px; }
  h1 { margin: 0 0 8px; color: #0f172a; font-size: clamp(32px, 5vw, 56px); letter-spacing: -0.04em; line-height: 0.95; }
  h2 { margin: 48px 0 16px; color: #0f172a; font-size: 24px; letter-spacing: -0.02em; }
  h3 { margin: 0 0 8px; color: #0f172a; font-size: 16px; }
  p { margin: 0 0 12px; }
  a { color: #2563eb; text-decoration: none; }
  code { white-space: pre-wrap; word-break: break-word; }
  .subtitle { color: #64748b; font-size: 15px; }
  .toc { display: flex; flex-wrap: wrap; gap: 8px; margin: 24px 0 32px; padding: 14px; background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; position: sticky; top: 12px; z-index: 2; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.05); }
  .toc a { padding: 7px 11px; border-radius: 999px; background: #f1f5f9; color: #475569; font-size: 12px; font-weight: 600; }
  .toc a:hover { background: #dbeafe; color: #1d4ed8; }
  .at-a-glance { padding: 22px; background: linear-gradient(135deg, #fff7ed 0%, #fef3c7 100%); border: 1px solid #f59e0b; border-radius: 20px; box-shadow: 0 18px 45px rgba(180, 83, 9, 0.10); }
  .at-a-glance h2 { margin-top: 0; color: #92400e; }
  .glance-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
  .glance-card { padding: 16px; background: rgba(255,255,255,0.62); border: 1px solid rgba(245, 158, 11, 0.35); border-radius: 14px; }
  .glance-card h3 { color: #92400e; }
  .card-list, .session-list { display: grid; gap: 14px; }
  .card, .narrative-card, .session-card, .quality-card, .chart-card, .suggestion-column { padding: 18px; background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.04); }
  .card-header { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; }
  .card-header span, small, .muted { color: #64748b; }
  .success .card { background: #f0fdf4; border-color: #bbf7d0; }
  .friction .card { background: #fef2f2; border-color: #fecaca; }
  .horizon .card { background: linear-gradient(135deg, #faf5ff 0%, #eff6ff 100%); border-color: #c4b5fd; }
  .key-insight { margin-top: 12px; padding: 12px 14px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; color: #166534; }
  .suggestion-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
  .mini-card { margin-top: 12px; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; }
  .mini-card h4 { margin: 0 0 6px; color: #0f172a; }
  .copyable { margin-top: 14px; padding-top: 14px; border-top: 1px solid #e2e8f0; }
  .copy-label { margin-bottom: 6px; color: #64748b; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
  .copy-row { display: flex; align-items: flex-start; gap: 8px; }
  .copy-row code { flex: 1; padding: 10px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; color: #334155; font-size: 12px; }
  .copy-btn { border: 0; border-radius: 10px; padding: 9px 12px; background: #2563eb; color: white; cursor: pointer; font-weight: 700; }
  .stats-grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 12px; margin-bottom: 18px; }
  .stat-card { padding: 16px; background: #0f172a; color: #fff; border-radius: 16px; }
  .stat-value { font-size: 24px; font-weight: 800; line-height: 1; }
  .stat-label { margin-top: 6px; color: #cbd5e1; font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
  .chart-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
  .bar-row { display: grid; grid-template-columns: minmax(96px, 160px) 1fr 44px; gap: 10px; align-items: center; margin: 8px 0; }
  .bar-label { overflow: hidden; color: #475569; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
  .bar-track { height: 8px; background: #e2e8f0; border-radius: 999px; overflow: hidden; }
  .bar-fill { height: 100%; border-radius: 999px; }
  .bar-value { color: #64748b; font-size: 12px; font-weight: 700; text-align: right; }
  .session-meta { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; color: #64748b; font-size: 12px; }
  .session-meta span { padding: 3px 8px; background: #f1f5f9; border-radius: 999px; }
  .fun-ending { margin-top: 48px; padding: 28px; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 1px solid #fbbf24; border-radius: 20px; text-align: center; }
  .fun-ending h2 { margin: 0 0 8px; color: #78350f; }
  .warning-panel { padding: 18px; background: #fff7ed; border: 1px solid #fdba74; border-radius: 16px; }
  .metadata-list { padding-left: 20px; color: #475569; }
  @media (max-width: 860px) { .glance-grid, .suggestion-grid, .chart-grid { grid-template-columns: 1fr; } .stats-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .toc { position: static; } }
`

const JS = `
  document.querySelectorAll('.copy-btn').forEach((button) => {
    button.addEventListener('click', async () => {
      const code = button.parentElement?.querySelector('code');
      if (!code) return;
      await navigator.clipboard.writeText(code.textContent || '');
      const original = button.textContent;
      button.textContent = 'Copied';
      setTimeout(() => { button.textContent = original; }, 1600);
    });
  });
`

export function renderHtmlReport({ reportData, analysis }) {
  const startDate = reportData.date_range?.started_at ?? "unknown"
  const endDate = reportData.date_range?.ended_at ?? "unknown"
  const sections = analysis?.sections ?? {}

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Codex Insights Report</title>
  <style>${CSS}</style>
</head>
<body>
  <main class="container">
    <header>
      <h1>Codex Insights Report</h1>
      <p class="subtitle">Generated at ${escapeHtml(reportData.generated_at)} · ${escapeHtml(reportData.session_count)} sessions · ${escapeHtml(startDate)} to ${escapeHtml(endDate)}</p>
    </header>
    <nav class="toc" aria-label="Report sections">
      <a href="#at-a-glance">At a Glance</a>
      <a href="#project-areas">Project Areas</a>
      <a href="#what-works">What Works</a>
      <a href="#friction">Friction</a>
      <a href="#interaction-style">Interaction Style</a>
      <a href="#suggestions">Suggestions</a>
      <a href="#horizon">On The Horizon</a>
      <a href="#stats">Stats</a>
      <a href="#sessions">Sessions</a>
    </nav>
    ${renderAtAGlance(sections.at_a_glance)}
    ${renderProjectAreas(sections.project_areas)}
    ${renderWhatWorks(sections.what_works)}
    ${renderFriction(sections.friction_analysis)}
    ${renderInteractionStyle(sections.interaction_style)}
    ${renderSuggestions(sections.suggestions)}
    ${renderOnTheHorizon(sections.on_the_horizon)}
    ${renderFunEnding(sections.fun_ending)}
    ${renderStats(reportData)}
    ${renderSessionSnapshots(reportData.sessions)}
    ${renderSectionErrors(sections)}
    ${renderRunMetadata(analysis)}
  </main>
  <script>${JS}</script>
</body>
</html>`
}

