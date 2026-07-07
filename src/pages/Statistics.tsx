import { useMemo, useState } from "react";
import { MODEL_COSTS, USAGE_RECORDS, estimateCost } from "../data/statistics";

const ALL = "All";

export function Statistics() {
  const [model, setModel] = useState(ALL);
  const [user, setUser] = useState(ALL);
  const [template, setTemplate] = useState(ALL);

  const models = [ALL, ...new Set(USAGE_RECORDS.map((r) => r.model))];
  const users = [ALL, ...new Set(USAGE_RECORDS.map((r) => r.user))];
  const templates = [ALL, ...new Set(USAGE_RECORDS.map((r) => r.template))];

  const filtered = useMemo(
    () =>
      USAGE_RECORDS.filter(
        (record) =>
          (model === ALL || record.model === model) &&
          (user === ALL || record.user === user) &&
          (template === ALL || record.template === template),
      ),
    [model, user, template],
  );

  const totalInput = filtered.reduce((sum, record) => sum + record.inputTokens, 0);
  const totalOutput = filtered.reduce((sum, record) => sum + record.outputTokens, 0);
  const totalCost = filtered.reduce((sum, record) => sum + estimateCost(record), 0);
  const maxTokens = Math.max(
    ...filtered.map((record) => record.inputTokens + record.outputTokens),
    1,
  );
  const maxCost = Math.max(...filtered.map((record) => estimateCost(record)), 0.01);

  return (
    <div className="statistics-page">
      <header className="page-header">
        <h1 className="page-title">Statistics</h1>
        <p className="page-subtitle">
          Monitor token usage and estimated model costs across users and templates.
        </p>
      </header>

      <section className="stats-filters panel" aria-label="Statistics filters">
        <label className="field">
          <span>Model</span>
          <select value={model} onChange={(e) => setModel(e.target.value)}>
            {models.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>User who generated</span>
          <select value={user} onChange={(e) => setUser(e.target.value)}>
            {users.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Template</span>
          <select value={template} onChange={(e) => setTemplate(e.target.value)}>
            {templates.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="stats-summary-grid">
        <article className="metric-card">
          <span className="metric-value">{(totalInput / 1000).toFixed(1)}k</span>
          <span className="metric-label">Input tokens</span>
        </article>
        <article className="metric-card">
          <span className="metric-value">{(totalOutput / 1000).toFixed(1)}k</span>
          <span className="metric-label">Output tokens</span>
        </article>
        <article className="metric-card">
          <span className="metric-value">${totalCost.toFixed(2)}</span>
          <span className="metric-label">Estimated cost</span>
        </article>
      </section>

      <div className="stats-panels">
        <section className="panel stats-chart-panel">
          <h2 className="section-title">Token usage</h2>
          <div className="stats-bar-chart">
            {filtered.map((record) => {
              const inputPct = (record.inputTokens / maxTokens) * 100;
              const outputPct = (record.outputTokens / maxTokens) * 100;
              return (
                <div key={record.id} className="stats-row">
                  <span className="stats-row-label">{record.date}</span>
                  <div className="stats-stacked-track">
                    <span className="stats-input-bar" style={{ width: `${inputPct}%` }} />
                    <span className="stats-output-bar" style={{ width: `${outputPct}%` }} />
                  </div>
                  <span className="stats-row-value">
                    {((record.inputTokens + record.outputTokens) / 1000).toFixed(0)}k
                  </span>
                </div>
              );
            })}
          </div>
          <div className="stats-legend">
            <span><i className="stats-dot stats-dot--input" /> Input tokens</span>
            <span><i className="stats-dot stats-dot--output" /> Output tokens</span>
          </div>
        </section>

        <section className="panel stats-chart-panel">
          <h2 className="section-title">Cost</h2>
          <div className="stats-cost-chart">
            {filtered.map((record) => {
              const cost = estimateCost(record);
              return (
                <div key={record.id} className="stats-cost-row">
                  <span>{record.date}</span>
                  <div className="stats-cost-track">
                    <span
                      className="stats-cost-fill"
                      style={{ width: `${(cost / maxCost) * 100}%` }}
                    />
                  </div>
                  <strong>${cost.toFixed(2)}</strong>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <section className="panel model-costs-panel">
        <h2 className="section-title">Model cost reference</h2>
        <div className="model-cost-grid">
          {MODEL_COSTS.map((cost) => (
            <article key={cost.model} className="model-cost-card">
              <h3>{cost.model}</h3>
              <p>Input: ${cost.inputPer1M.toFixed(2)} / 1M tokens</p>
              <p>Output: ${cost.outputPer1M.toFixed(2)} / 1M tokens</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

