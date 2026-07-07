import { useMemo, useState } from "react";
import { IconSearch } from "../components/Icons";
import { DOC_ARTICLES, QUICK_START_STEPS } from "../data/documentation";
import type { AppView } from "../data/session";

interface DocumentationProps {
  onNavigate: (view: AppView) => void;
}

export function Documentation({ onNavigate }: DocumentationProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return DOC_ARTICLES;
    return DOC_ARTICLES.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q) ||
        a.body.toLowerCase().includes(q),
    );
  }, [search]);

  return (
    <div className="docs-page">
      <header className="page-header">
        <h1 className="page-title">Documentation</h1>
        <p className="page-subtitle">Instructions for using the Copy studio portal</p>
      </header>

      <div className="docs-search">
        <IconSearch size={18} className="templates-search-icon" />
        <input
          type="search"
          className="templates-search-input"
          placeholder="Search documentation…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search documentation"
        />
      </div>

      <section className="docs-quickstart panel" aria-labelledby="quickstart-title">
        <h2 id="quickstart-title" className="docs-section-title">
          Quick start in 3 steps
        </h2>
        <ol className="docs-quickstart-steps">
          {QUICK_START_STEPS.map((step) => (
            <li key={step.step} className="docs-quickstart-step">
              <span className="docs-step-num">{step.step}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
                <button
                  type="button"
                  className="btn-link"
                  onClick={() => onNavigate(step.linkView)}
                >
                  {step.linkLabel} →
                </button>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="guides-title">
        <h2 id="guides-title" className="docs-section-title">
          Guides &amp; reference
        </h2>
        {filtered.length === 0 ? (
          <div className="templates-empty panel">
            <p>No documentation matches your search.</p>
          </div>
        ) : (
          <div className="docs-grid">
            {filtered.map((article) => (
              <article key={article.id} className="docs-card panel">
                <span className="docs-card-category">{article.category}</span>
                <h3 className="docs-card-title">{article.title}</h3>
                <p className="docs-card-summary">{article.summary}</p>
                <p className="docs-card-body">{article.body}</p>
                {article.linkView && (
                  <button
                    type="button"
                    className="btn-secondary docs-card-link"
                    onClick={() => onNavigate(article.linkView!)}
                  >
                    Go to feature
                  </button>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
