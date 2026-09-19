import React, { useState, useEffect, useRef } from 'react';
import {
  DOCS_SECTIONS,
  DOCS_FLAT,
  CURATED_MD,
  QUICKSTART_MD,
  extractToc,
  mdToHtml,
} from '../data/docsData';

interface DocsViewProps {
  initialId?: string;
  onNavigateHome: () => void;
}

export const DocsView: React.FC<DocsViewProps> = ({ initialId, onNavigateHome }) => {
  const [activeId, setActiveId] = useState<string>(() => {
    const fromHash = window.location.hash.replace(/^#/, '');
    const fromPath = window.location.pathname.split('/').pop();
    const cand = initialId || fromHash || (fromPath && DOCS_FLAT.some(d => d.id === fromPath) ? fromPath : '');
    return cand && DOCS_FLAT.some(d => d.id === cand) ? cand : DOCS_FLAT[0]?.id || 'quickstart';
  });
  const [search, setSearch] = useState('');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [md, setMd] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [toc, setToc] = useState<Array<{ level: number; title: string; id: string }>>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const active = DOCS_FLAT.find(d => d.id === activeId) || DOCS_FLAT[0];
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    window.history.replaceState({}, '', activeId === 'quickstart' ? '/docs' : `/docs/${activeId}`);
  }, [activeId]);

  useEffect(() => {
    if (!active) return;
    const curated = (CURATED_MD as Record<string, string>)[activeId] || (active.file === 'README' ? QUICKSTART_MD : undefined);
    if (curated) {
      setMd(curated);
      setToc(extractToc(curated));
      setLoading(false);
      setErr(null);
      return;
    }
    setLoading(true);
    setErr(null);
    fetch(`/docs/${active.file}.md`)
      .then(r => r.ok ? r.text() : Promise.reject(new Error(`${r.status}`)))
      .then(t => {
        setMd(t);
        setToc(extractToc(t));
      })
      .catch(() => setErr('Failed to load doc. Try GitHub.'))
      .finally(() => setLoading(false));
  }, [active, activeId]);

  // copy delegation + cmd+K
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('.docs-copy')) {
        const btn = t.closest('.docs-copy') as HTMLElement;
        const data = btn.getAttribute('data-copy');
        if (data) {
          navigator.clipboard.writeText(decodeURIComponent(data));
          setCopied(data.slice(0, 20));
          setTimeout(() => setCopied(null), 1200);
          btn.textContent = 'Copied!';
          setTimeout(() => btn.textContent = 'Copy', 1200);
        }
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener('click', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  const filteredSections = DOCS_SECTIONS.map(s => ({
    ...s,
    items: s.items.filter(it =>
      !search ||
      it.title.toLowerCase().includes(search.toLowerCase()) ||
      it.desc.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter(s => s.items.length > 0);

  const activeIdx = DOCS_FLAT.findIndex(d => d.id === activeId);

  return (
    <div className="docs-layout">
      <aside className="docs-sidebar" aria-label="Docs navigation">
        <div className="docs-sidebar-head">
          <div className="docs-brand-mini">
            <img src="/zoopicon-32.webp" alt="" aria-hidden="true" width={18} height={18} />
            <span>Zoop</span>
            <span className="docs-ver">v0.1.0-alpha</span>
          </div>
          <div className="docs-search-wrap">
            <input
              ref={searchRef}
              className="docs-search"
              placeholder="Search docs…  ⌘K"
              aria-label="Search docs"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button
            type="button"
            className="docs-mobile-toggle"
            onClick={() => setMobileNavOpen(prev => !prev)}
            aria-expanded={mobileNavOpen}
            aria-label="Toggle documentation topics navigation"
          >
            <span>Topic: {active?.title || 'Guides'}</span>
            <span>{mobileNavOpen ? '▲' : '▼'}</span>
          </button>
        </div>
        <nav className={`docs-nav ${mobileNavOpen ? 'mobile-open' : ''}`}>
          {filteredSections.length === 0 ? (
            <div className="docs-empty-state">
              <strong>No guides found</strong>
              <span>No documentation matches "{search}"</span>
              <div style={{ marginTop: 12 }}>
                <button
                  type="button"
                  className="lp-btn-secondary"
                  onClick={() => setSearch('')}
                  style={{ minHeight: 34, padding: '0 12px', fontSize: '0.75rem' }}
                >
                  Clear search
                </button>
              </div>
            </div>
          ) : (
            filteredSections.map(sec => (
              <div key={sec.label} className="docs-sec">
                <div className="docs-sec-label">{sec.label}</div>
                {sec.items.map(it => (
                  <button
                    key={it.id}
                    className={`docs-item ${activeId === it.id ? 'active' : ''}`}
                    onClick={() => {
                      setActiveId(it.id);
                      setMobileNavOpen(false);
                    }}
                    aria-current={activeId === it.id ? 'page' : undefined}
                  >
                    <span className="docs-item-title">{it.title}</span>
                    <span className="docs-item-desc">{it.desc}</span>
                  </button>
                ))}
              </div>
            ))
          )}
        </nav>
        <div className="docs-sidebar-foot">
          <a href="https://github.com/zoop-internet/zoop" target="_blank" rel="noreferrer">GitHub →</a>
          <span>·</span>
          <a href="/llms.txt">llms.txt</a>
          <span>·</span>
          <a href="/llms-full.txt">full</a>
          <span>·</span>
          <a href="/" onClick={(e) => { e.preventDefault(); onNavigateHome(); }} style={{ cursor: 'pointer' }}>Home</a>
        </div>
      </aside>
      <section className="docs-main" aria-live="polite">
        <div className="docs-llms-banner" role="note">
          <span style={{ fontWeight: 800 }}>Documentation Index</span> — Fetch the complete index at <a href="/llms.txt">/llms.txt</a> · <a href="/llms-full.txt">full</a> · Use before exploring further.
        </div>
        <div className="docs-tabs" role="tablist" aria-label="Docs sections">
          {DOCS_SECTIONS.map(sec => {
            const isActive = sec.items.some(i => i.id === activeId);
            return (
              <button
                key={sec.label}
                role="tab"
                aria-selected={isActive}
                className={`docs-tab ${isActive ? 'active' : ''}`}
                onClick={() => setActiveId(sec.items[0].id)}
              >
                {sec.label}
              </button>
            );
          })}
        </div>
        <div className="docs-breadcrumb" aria-label="Breadcrumb">
          <a href="/" onClick={(e) => { e.preventDefault(); onNavigateHome(); }} style={{ cursor: 'pointer', color: '#0284c7' }}>Home</a>
          <span style={{ color: '#d4d4d4' }}>›</span>
          <a href="/docs" onClick={(e) => { e.preventDefault(); setActiveId('quickstart'); }} style={{ cursor: 'pointer', color: '#0284c7' }}>Docs</a>
          <span>›</span> {active?.title}
          <span className="docs-breadcrumb-ver">MIT</span>
        </div>
        <div className="docs-toolbar">
          <h1>{active?.title}</h1>
          <div className="docs-toolbar-actions">
            <a href={`https://github.com/zoop-internet/zoop/blob/main/docs/${active?.file}.md`} target="_blank" rel="noreferrer" className="docs-gh-link">Edit on GitHub</a>
            <button
              className="docs-copy-page"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                setCopied('link');
                setTimeout(() => setCopied(null), 1200);
              }}
            >
              {copied === 'link' ? 'Copied!' : 'Copy link'}
            </button>
          </div>
        </div>
        <p className="docs-desc">{active?.desc} — <a href={`https://github.com/zoop-internet/zoop/blob/main/docs/${active?.file}.md`} target="_blank" rel="noreferrer" style={{ color: '#0284c7' }}>source</a> · <a href="/llms.txt" style={{ color: '#0284c7' }}>llms.txt</a></p>
        <div className="docs-meta-bar">
          <span>Last updated Aug 28, 2026</span>
          <span>·</span>
          <a
            onClick={() => {
              navigator.clipboard.writeText(md);
              setCopied('md');
              setTimeout(() => setCopied(null), 1200);
            }}
            style={{ cursor: 'pointer' }}
          >
            {copied === 'md' ? 'Copied!' : 'Copy as Markdown'}
          </a>
          <span>·</span>
          <a href={active?.file === 'README' ? 'https://github.com/zoop-internet/zoop#quick-start' : `/docs/${active?.file}.md`} target="_blank" rel="noreferrer">View as Markdown</a>
          <span>·</span>
          <a href="https://developers.cloudflare.com/agent-setup/" target="_blank" rel="noreferrer">Agent setup</a>
        </div>
        {loading && <div className="docs-loading"><span className="spinner" style={{ width: 16, height: 16, display: 'inline-block' }} /> Loading {active?.file}.md…</div>}
        {err && <div className="docs-error" role="alert">{err} — <a href={`https://github.com/zoop-internet/zoop/blob/main/docs/${active?.file}.md`} target="_blank" rel="noreferrer">Open on GitHub</a></div>}
        {!loading && !err && (
          <div className="docs-prose-wrap">
            <article className="docs-article" dangerouslySetInnerHTML={{ __html: mdToHtml(md) }} />
            <aside className="docs-toc" aria-label="On this page">
              <div className="docs-toc-title">On this page</div>
              {toc.length === 0 ? <span style={{ color: '#5a5a5c', fontSize: '0.75rem' }}>No headings</span> : toc.map(h => (
                <a
                  key={h.id}
                  href={`#${h.id}`}
                  className={`docs-toc-item lvl-${h.level}`}
                  onClick={e => {
                    e.preventDefault();
                    document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    history.replaceState({}, '', `#${h.id}`);
                  }}
                >
                  {h.title}
                </a>
              ))}
              <div className="docs-toc-foot">
                <a href={`https://github.com/zoop-internet/zoop/blob/main/docs/${active?.file}.md`} target="_blank" rel="noreferrer">Edit this page</a>
                <span>·</span>
                <a href="https://github.com/zoop-internet/zoop/issues" target="_blank" rel="noreferrer">Ask AI</a>
              </div>
            </aside>
          </div>
        )}
        {!loading && !err && (
          <div className="docs-helpful">
            <span>Was this helpful?</span>
            <button className={copied === 'yes' ? 'active' : ''} onClick={() => { setCopied('yes'); setTimeout(() => setCopied(null), 2000); }}>Yes</button>
            <button className={copied === 'no' ? 'active' : ''} onClick={() => { setCopied('no'); setTimeout(() => setCopied(null), 4000); }}>No</button>
            {copied === 'yes' && <span style={{ color: '#0284c7' }}>Thanks!</span>}
            {copied === 'no' && <span>Thanks — <a href="https://github.com/zoop-internet/zoop/issues" target="_blank" rel="noreferrer" style={{ color: '#0284c7' }}>open issue</a></span>}
          </div>
        )}
        <div className="docs-footer-nav">
          <button
            className="lp-btn-secondary"
            onClick={() => {
              if (activeIdx > 0) setActiveId(DOCS_FLAT[activeIdx - 1].id);
              window.scrollTo(0, 0);
            }}
            disabled={activeIdx === 0}
          >
            ← {activeIdx > 0 ? DOCS_FLAT[activeIdx - 1].title : 'Prev'}
          </button>
          <button
            className="lp-btn-primary"
            onClick={() => {
              if (activeIdx < DOCS_FLAT.length - 1) setActiveId(DOCS_FLAT[activeIdx + 1].id);
              window.scrollTo(0, 0);
            }}
            disabled={activeIdx === DOCS_FLAT.length - 1}
          >
            {activeIdx < DOCS_FLAT.length - 1 ? DOCS_FLAT[activeIdx + 1].title : 'Next'} →
          </button>
        </div>
      </section>
    </div>
  );
};
