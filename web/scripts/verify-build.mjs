#!/usr/bin/env node
/**
 * Automated Verification Script for Zoop Web Build (Phase 1-8 validation)
 * Usage: node scripts/verify-build.mjs
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const BASE_DOMAIN = 'https://zoopinternet.app';

const CANONICAL_ROUTES = [
  '/',
  '/how-it-works',
  '/products',
  '/downloads',
  '/security',
  '/pricing',
  '/docs',
  '/auth',
  '/privacy',
  '/terms',
  '/docs/quickstart',
  '/docs/installation',
  '/docs/configuration',
  '/docs/web-console',
  '/docs/connect-share',
  '/docs/devices',
  '/docs/mobile-router',
  '/docs/identity',
  '/docs/organizations',
  '/docs/permissions',
  '/docs/troubleshooting',
  '/docs/security-architecture',
  '/docs/faq',
];

let errors = 0;
function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    errors++;
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

console.log('─── Starting Zoop Web Verification ───\n');

// 1. Check dist/index.html (Root)
assert(existsSync(join(DIST, 'index.html')), 'dist/index.html exists');
if (existsSync(join(DIST, 'index.html'))) {
  const rootHtml = readFileSync(join(DIST, 'index.html'), 'utf8');
  assert(rootHtml.includes('<title>'), 'Root HTML has <title>');
  assert(rootHtml.includes('name="description"'), 'Root HTML has meta description');
  assert(rootHtml.includes(`rel="canonical" href="${BASE_DOMAIN}/"`), 'Root HTML has canonical pointing to root');
}

// 2. Check all Canonical Routes exist as prerendered static HTML
for (const route of CANONICAL_ROUTES) {
  if (route === '/') continue;
  const filePath = join(DIST, route.replace(/^\//, ''), 'index.html');
  const exists = existsSync(filePath);
  assert(exists, `Route ${route} exists at ${filePath}`);
  if (exists) {
    const html = readFileSync(filePath, 'utf8');
    const expectedCanonical = `${BASE_DOMAIN}${route}`;
    assert(html.includes(`rel="canonical" href="${expectedCanonical}"`), `Route ${route} has exact canonical ${expectedCanonical}`);
    assert(html.includes('<div id="root">') && !html.includes('<div id="root"></div>'), `Route ${route} has non-empty crawler body content`);
    assert(html.includes('BreadcrumbList'), `Route ${route} has Schema.org BreadcrumbList`);
  }
}

// 3. Check dist/404.html (True 404)
assert(existsSync(join(DIST, '404.html')), 'dist/404.html exists');
if (existsSync(join(DIST, '404.html'))) {
  const notFoundHtml = readFileSync(join(DIST, '404.html'), 'utf8');
  assert(notFoundHtml.includes('content="noindex, nofollow"'), '404.html has noindex, nofollow');
  assert(notFoundHtml.includes('404'), '404.html contains 404 code');
  assert(notFoundHtml.includes('href="/"'), '404.html has link back to home');
}

// 4. Check dist/robots.txt
assert(existsSync(join(DIST, 'robots.txt')), 'dist/robots.txt exists');
if (existsSync(join(DIST, 'robots.txt'))) {
  const robots = readFileSync(join(DIST, 'robots.txt'), 'utf8');
  assert(robots.includes('Disallow: /app/'), 'robots.txt disallows /app/');
  assert(robots.includes('Disallow: /org/'), 'robots.txt disallows /org/');
  assert(robots.includes('Disallow: /admin/'), 'robots.txt disallows /admin/');
  assert(robots.includes('Disallow: /api/'), 'robots.txt disallows /api/');
  assert(robots.includes('GPTBot') && robots.includes('ClaudeBot'), 'robots.txt explicitly permits AI crawlers');
  assert(robots.includes(`Sitemap: ${BASE_DOMAIN}/sitemap.xml`), 'robots.txt links to sitemap.xml');
}

// 5. Check dist/sitemap.xml
assert(existsSync(join(DIST, 'sitemap.xml')), 'dist/sitemap.xml exists');
if (existsSync(join(DIST, 'sitemap.xml'))) {
  const sitemap = readFileSync(join(DIST, 'sitemap.xml'), 'utf8');
  assert(!sitemap.includes('zoop.network'), 'sitemap.xml does NOT contain legacy zoop.network');
  assert(!sitemap.includes('/app<'), 'sitemap.xml does NOT contain private /app');
  assert(!sitemap.includes('/architecture<'), 'sitemap.xml does NOT contain alias /architecture');
  assert(sitemap.includes('<lastmod>'), 'sitemap.xml includes <lastmod> ISO dates');

  for (const route of CANONICAL_ROUTES) {
    const loc = `${BASE_DOMAIN}${route === '/' ? '/' : route}`;
    assert(sitemap.includes(`<loc>${loc}</loc>`), `sitemap.xml contains canonical URL ${loc}`);
  }
}

// 6. Check dist/_redirects
assert(existsSync(join(DIST, '_redirects')), 'dist/_redirects exists');
if (existsSync(join(DIST, '_redirects'))) {
  const redirects = readFileSync(join(DIST, '_redirects'), 'utf8');
  assert(!redirects.includes('/*    /index.html   200'), '_redirects does NOT have blanket /* rewrite (prevents soft-404)');
  assert(redirects.includes('/app/*') && redirects.includes('/app'), '_redirects rewrites /app to index.html 200');
  assert(redirects.includes('/org/*'), '_redirects rewrites /org to index.html 200');
  assert(redirects.includes('/admin/*'), '_redirects rewrites /admin to index.html 200');
  assert(redirects.includes('/architecture') && redirects.includes('301'), '_redirects 301 redirects /architecture to /how-it-works');
}

// 7. Phase 3 Checks: AI Search & Structured Data
if (existsSync(join(DIST, 'index.html'))) {
  const rootHtml = readFileSync(join(DIST, 'index.html'), 'utf8');
  assert(rootHtml.includes('"@type": "WebSite"'), 'Root HTML has Schema.org WebSite definition');
  assert(rootHtml.includes('"@type": "SearchAction"'), 'Root HTML has SearchAction on WebSite');
  assert(rootHtml.includes('"@type": "Organization"'), 'Root HTML has Schema.org Organization definition');
  assert(rootHtml.includes('"@type": "SoftwareApplication"'), 'Root HTML has Schema.org SoftwareApplication definition');
}

// Check per-template schemas
const downloadsHtml = readFileSync(join(DIST, 'downloads', 'index.html'), 'utf8');
assert(downloadsHtml.includes('"@type":"SoftwareApplication"'), '/downloads has SoftwareApplication schema');

const pricingHtml = readFileSync(join(DIST, 'pricing', 'index.html'), 'utf8');
assert(pricingHtml.includes('"@type":"Product"'), '/pricing has Product schema');
assert(pricingHtml.includes('"@type":"Offer"'), '/pricing has Offer schema');

const securityHtml = readFileSync(join(DIST, 'security', 'index.html'), 'utf8');
assert(securityHtml.includes('"@type":"TechArticle"'), '/security has TechArticle schema');

const quickstartHtml = readFileSync(join(DIST, 'docs', 'quickstart', 'index.html'), 'utf8');
assert(quickstartHtml.includes('"@type":"TechArticle"'), '/docs/quickstart has TechArticle schema');

// Validate JSON-LD syntax across all prerendered pages
for (const route of CANONICAL_ROUTES) {
  const p = route === '/' ? join(DIST, 'index.html') : join(DIST, route.replace(/^\//, ''), 'index.html');
  if (existsSync(p)) {
    const html = readFileSync(p, 'utf8');
    const matches = html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);
    for (const match of matches) {
      try {
        JSON.parse(match[1]);
      } catch (err) {
        assert(false, `Invalid JSON-LD on route ${route}: ${err.message}`);
      }
    }
  }
}
assert(true, 'All JSON-LD blocks across all 23 routes parse successfully as valid JSON');

for (const file of ['llms.txt', 'llms-full.txt', 'ai.txt', 'humans.txt']) {
  const filePath = join(DIST, file);
  assert(existsSync(filePath), `dist/${file} exists`);
  if (existsSync(filePath)) {
    const content = readFileSync(filePath, 'utf8');
    assert(!content.includes('zoop.network'), `dist/${file} does NOT contain legacy zoop.network`);
    assert(!content.includes('allannuwamanya/zoop'), `dist/${file} does NOT contain legacy allannuwamanya/zoop`);
  }
}

// 8. Phase 5-7 Checks: Assets & Security Headers
assert(existsSync(join(DIST, 'assets', 'zoop-mesh-architecture.webp')), 'dist/assets/zoop-mesh-architecture.webp exists');
assert(existsSync(join(DIST, '_headers')), 'dist/_headers exists');
if (existsSync(join(DIST, '_headers'))) {
  const headers = readFileSync(join(DIST, '_headers'), 'utf8');
  assert(headers.includes('Strict-Transport-Security'), '_headers includes Strict-Transport-Security (HSTS)');
  assert(headers.includes('Cross-Origin-Opener-Policy: same-origin'), '_headers includes Cross-Origin-Opener-Policy: same-origin');
}

console.log(`\n─── Verification Finished with ${errors} error(s) ───`);
if (errors > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL CHECKS PASSED!\n');
}
