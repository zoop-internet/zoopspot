import React, { useState, useEffect } from 'react';
import { Ico } from '../components/Icons';
import { Icons } from '../components/iconConstants';
import { BLOG_POSTS } from '../data/blogData';

interface BlogPageProps {
  currentPath: string;
  handleNav: (path: string) => void;
}

export const BlogPage: React.FC<BlogPageProps> = ({ currentPath, handleNav }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [currentPath]);

  // Extract slug if currentPath is /blog/:slug
  const slugMatch = currentPath.match(/^\/blog\/([a-z0-9-]+)$/i);
  const activeSlug = slugMatch ? slugMatch[1] : null;
  const activePost = activeSlug ? BLOG_POSTS.find(p => p.slug === activeSlug) : null;

  const categories = ['All', 'Philosophy & Vision', 'Guides & Sharing', 'Speed & Freedom'];

  const filteredPosts = selectedCategory === 'All'
    ? BLOG_POSTS
    : BLOG_POSTS.filter(p => p.category === selectedCategory);

  const handleCopyShare = (slug: string) => {
    const url = `https://zoopinternet.app/blog/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2500);
  };

  // ─── Single Article Reader View ──────────────────────────────────────────
  if (activePost) {
    return (
      <div className="lp-page-wrapper" style={{ maxWidth: 840 }}>
        <div style={{ marginBottom: 24 }}>
          <a
            href="/blog"
            className="lp-btn-secondary"
            onClick={(e) => { e.preventDefault(); handleNav('/blog'); }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}
          >
            ← Back to all stories
          </a>
        </div>

        <article>
          <header style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '4px 10px', borderRadius: 999, background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.28)', color: '#38bdf8' }}>
                {activePost.category}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>·</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{activePost.readTime}</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>·</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{activePost.date}</span>
            </div>

            <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.6rem)', fontWeight: 900, lineHeight: 1.25, color: 'var(--ink)', marginBottom: 16 }}>
              {activePost.title}
            </h1>

            <p style={{ fontSize: '1.15rem', color: 'var(--ink-secondary)', lineHeight: 1.6, margin: '0 0 24px' }}>
              {activePost.subtitle}
            </p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, padding: '16px 0', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: '50%', background: activePost.author.avatarBg, color: '#020904', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.9rem' }}>
                  {activePost.author.avatarInitials}
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: '0.95rem' }}>{activePost.author.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{activePost.author.role}</div>
                </div>
              </div>

              <button
                type="button"
                className="lp-btn-secondary"
                onClick={() => handleCopyShare(activePost.slug)}
                style={{ fontSize: '0.8rem', padding: '6px 14px' }}
                aria-label="Share article"
              >
                {copiedSlug === activePost.slug ? '✓ Link copied' : '🔗 Share article'}
              </button>
            </div>
          </header>

          <div style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 36, border: '1px solid var(--line)', background: 'rgba(0,0,0,0.4)' }}>
            <img
              src={activePost.coverImage}
              alt={activePost.title}
              width={1280}
              height={720}
              style={{ width: '100%', height: 'auto', display: 'block', maxHeight: 440, objectFit: 'cover' }}
              loading="eager"
            />
          </div>

          <div className="blog-article-content" style={{ fontSize: '1.05rem', lineHeight: 1.8, color: 'var(--ink-secondary)' }}>
            {activePost.blocks.map((block, idx) => {
              if (block.type === 'heading') {
                return (
                  <h2 key={idx} style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--ink)', marginTop: 36, marginBottom: 16 }}>
                    {block.text}
                  </h2>
                );
              }
              if (block.type === 'quote') {
                return (
                  <blockquote key={idx} style={{ margin: '28px 0', padding: '16px 24px', borderLeft: '4px solid #38bdf8', background: 'rgba(56,189,248,0.06)', borderRadius: '0 12px 12px 0', fontStyle: 'italic', fontSize: '1.15rem', color: 'var(--ink)' }}>
                    "{block.text}"
                  </blockquote>
                );
              }
              if (block.type === 'callout') {
                return (
                  <div key={idx} style={{ margin: '28px 0', padding: '20px 24px', borderRadius: 12, background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.28)', color: 'var(--ink)' }}>
                    <strong style={{ color: '#34d399', display: 'block', marginBottom: 6 }}>Open Source &amp; Community</strong>
                    {block.text}
                  </div>
                );
              }
              if (block.type === 'list' && block.items) {
                return (
                  <ul key={idx} style={{ margin: '20px 0', paddingLeft: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {block.items.map((item, itemIdx) => (
                      <li key={itemIdx} style={{ color: 'var(--ink-secondary)' }}>
                        {item}
                      </li>
                    ))}
                  </ul>
                );
              }
              return (
                <p key={idx} style={{ marginBottom: 20 }}>
                  {block.text}
                </p>
              );
            })}
          </div>

          <div style={{ marginTop: 48, padding: 32, borderRadius: 16, background: 'linear-gradient(135deg, rgba(56,189,248,0.1), rgba(52,211,153,0.08))', border: '1px solid rgba(8,242,255,0.28)', textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--ink)', marginBottom: 8 }}>
              Try direct device sharing today.
            </h3>
            <p style={{ color: 'var(--ink-secondary)', maxWidth: 500, margin: '0 auto 20px', fontSize: '0.95rem' }}>
              No VPN bottlenecks, no subscriptions for personal devices, 100% open source.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href="/downloads" className="lp-btn-primary large" onClick={(e) => { e.preventDefault(); handleNav('/downloads'); }}>
                <Ico d={Icons.download} size={18} />
                Get Zoop Free
              </a>
              <a href="/how-it-works" className="lp-btn-secondary large" onClick={(e) => { e.preventDefault(); handleNav('/how-it-works'); }}>
                See how it works →
              </a>
            </div>
          </div>
        </article>
      </div>
    );
  }

  // ─── Blog Index View ─────────────────────────────────────────────────────
  const featuredPost = filteredPosts[0];
  const remainingPosts = filteredPosts.slice(1);

  return (
    <div className="lp-page-wrapper">
      <div className="lp-page-header">
        <p className="lp-eyebrow">Stories, Guides &amp; Insights</p>
        <h1>The Zoop Blog</h1>
        <p>
          Thoughts on peer-to-peer freedom, travel connectivity, and how to get the fastest, most private internet on earth.
        </p>
      </div>

      {/* Category Filter Pills */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 36 }} role="tablist" aria-label="Filter blog posts by category">
        {categories.map(cat => (
          <button
            key={cat}
            type="button"
            className={`lp-btn-secondary ${selectedCategory === cat ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat)}
            style={{
              borderRadius: 999,
              padding: '6px 16px',
              fontSize: '0.8rem',
              fontWeight: 700,
              background: selectedCategory === cat ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.03)',
              color: selectedCategory === cat ? '#38bdf8' : 'var(--muted)',
              border: `1px solid ${selectedCategory === cat ? 'rgba(56,189,248,0.4)' : 'var(--line)'}`,
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Featured Article Card */}
      {featuredPost && (
        <div style={{ marginBottom: 48 }}>
          <a
            href={`/blog/${featuredPost.slug}`}
            onClick={(e) => { e.preventDefault(); handleNav(`/blog/${featuredPost.slug}`); }}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: 28,
              background: 'var(--surface-card)',
              border: '1px solid var(--line)',
              borderRadius: 16,
              overflow: 'hidden',
              textDecoration: 'none',
              transition: 'transform 0.2s ease, border-color 0.2s ease',
            }}
            className="blog-featured-card"
          >
            <div style={{ height: '100%', minHeight: 280, overflow: 'hidden' }}>
              <img
                src={featuredPost.coverImage}
                alt={featuredPost.title}
                width={1280}
                height={720}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                loading="lazy"
              />
            </div>
            <div style={{ padding: '28px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 14 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '3px 8px', borderRadius: 999, background: 'rgba(56,189,248,0.12)', color: '#38bdf8' }}>
                  {featuredPost.category}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{featuredPost.readTime}</span>
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--ink)', lineHeight: 1.3, margin: 0 }}>
                {featuredPost.title}
              </h2>
              <p style={{ fontSize: '0.9rem', color: 'var(--ink-secondary)', lineHeight: 1.6, margin: 0 }}>
                {featuredPost.excerpt}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: featuredPost.author.avatarBg, color: '#020904', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.75rem' }}>
                  {featuredPost.author.avatarInitials}
                </div>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink)' }}>{featuredPost.author.name}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>· {featuredPost.date}</span>
              </div>
            </div>
          </a>
        </div>
      )}

      {/* Grid of Remaining Articles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
        {remainingPosts.map(post => (
          <a
            key={post.slug}
            href={`/blog/${post.slug}`}
            onClick={(e) => { e.preventDefault(); handleNav(`/blog/${post.slug}`); }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--surface-card)',
              border: '1px solid var(--line)',
              borderRadius: 14,
              overflow: 'hidden',
              textDecoration: 'none',
              transition: 'transform 0.2s ease, border-color 0.2s ease',
            }}
            className="blog-card"
          >
            <div style={{ height: 180, overflow: 'hidden' }}>
              <img
                src={post.coverImage}
                alt={post.title}
                width={640}
                height={360}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                loading="lazy"
              />
            </div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', flex: 1, gap: 12 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: 'rgba(56,189,248,0.12)', color: '#38bdf8' }}>
                  {post.category}
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{post.readTime}</span>
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--ink)', lineHeight: 1.35, margin: 0 }}>
                {post.title}
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--ink-secondary)', lineHeight: 1.5, margin: 0, flex: 1 }}>
                {post.excerpt}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: post.author.avatarBg, color: '#020904', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.7rem' }}>
                  {post.author.avatarInitials}
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--ink)' }}>{post.author.name}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>· {post.date}</span>
              </div>
            </div>
          </a>
        ))}
      </div>

      <div style={{ marginTop: 64, textAlign: 'center' }}>
        <a href="/" className="lp-btn-secondary" onClick={(e) => { e.preventDefault(); handleNav('/'); }}>
          ← Back to Overview
        </a>
      </div>
    </div>
  );
};
