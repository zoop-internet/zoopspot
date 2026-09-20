#!/usr/bin/env node
/**
 * Live Edge Monitoring & Synthetic Probe Script for Zoop Web
 * Usage: node scripts/monitor-edge.mjs [target_url]
 * Default target: https://zoopnetwork.pages.dev
 */

const TARGET = process.argv[2] || process.env.TARGET_HOST || 'https://zoopnetwork.pages.dev';

console.log(`─── Probing Zoop Edge at ${TARGET} ───\n`);

let errors = 0;
function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    errors++;
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

async function probe() {
  try {
    // 1. Root & Security Headers
    console.log('1. Checking Root & Security Headers...');
    const rootRes = await fetch(`${TARGET}/`, { redirect: 'manual' });
    assert(rootRes.status === 200, `Root returns HTTP 200 (got ${rootRes.status})`);
    
    const hsts = rootRes.headers.get('strict-transport-security');
    assert(hsts && hsts.includes('max-age=63072000'), `HSTS header active: ${hsts}`);

    const csp = rootRes.headers.get('content-security-policy');
    assert(csp && csp.includes("base-uri 'self'") && csp.includes("object-src 'none'") && csp.includes('upgrade-insecure-requests'), 'CSP contains base-uri, object-src, and upgrade-insecure-requests');

    const coop = rootRes.headers.get('cross-origin-opener-policy');
    assert(coop === 'same-origin', `COOP is same-origin (got ${coop})`);

    const corp = rootRes.headers.get('cross-origin-resource-policy');
    assert(corp === 'same-origin', `CORP is same-origin (got ${corp})`);

    const perm = rootRes.headers.get('permissions-policy');
    assert(perm && perm.includes('payment=()') && perm.includes('usb=()'), `Permissions-Policy restricts payment and usb: ${perm}`);

    const xcto = rootRes.headers.get('x-content-type-options');
    assert(xcto === 'nosniff', `X-Content-Type-Options is nosniff (got ${xcto})`);

    const xfo = rootRes.headers.get('x-frame-options');
    assert(xfo === 'DENY', `X-Frame-Options is DENY (got ${xfo})`);

    // 2. Canonical Marketing & Docs Routes
    console.log('\n2. Checking Canonical Prerendered Routes...');
    const routesToCheck = [
      '/how-it-works',
      '/products',
      '/downloads',
      '/pricing',
      '/security',
      '/privacy',
      '/terms',
      '/docs',
      '/docs/quickstart',
      '/blog',
      '/blog/why-peer-to-peer-is-the-future',
    ];

    for (const route of routesToCheck) {
      const res = await fetch(`${TARGET}${route}`, { redirect: 'manual' });
      assert(res.status === 200, `Route ${route} returns HTTP 200 (got ${res.status})`);
      const ct = res.headers.get('content-type') || '';
      assert(ct.includes('text/html'), `Route ${route} returns text/html (got ${ct})`);
    }

    // 3. HTTP 301 Redirects
    console.log('\n3. Checking 301 Permanent Redirects...');
    const redirects = [
      { from: '/architecture', to: '/how-it-works' },
      { from: '/security.txt', to: '/.well-known/security.txt' },
      { from: '/login', to: '/auth?tab=signin' },
    ];

    for (const { from, to } of redirects) {
      const res = await fetch(`${TARGET}${from}`, { redirect: 'manual' });
      assert(res.status === 301, `Route ${from} returns HTTP 301 (got ${res.status})`);
      const loc = res.headers.get('location') || '';
      assert(loc.includes(to), `Route ${from} redirects to ${to} (got ${loc})`);
    }

    // 4. RFC 9116 security.txt
    console.log('\n4. Checking RFC 9116 security.txt...');
    const secRes = await fetch(`${TARGET}/.well-known/security.txt`, { redirect: 'manual' });
    assert(secRes.status === 200, `/.well-known/security.txt returns HTTP 200 (got ${secRes.status})`);
    const secText = await secRes.text();
    assert(secText.includes('Contact: mailto:security@zoopinternet.app'), 'security.txt contains official security contact');
    assert(secText.includes('Expires:'), 'security.txt contains Expires directive');
    assert(secText.includes('Canonical: https://zoopinternet.app/.well-known/security.txt'), 'security.txt contains Canonical directive');

    // 5. True 404 (Soft-404 Prevention)
    console.log('\n5. Checking Soft-404 Prevention...');
    const notFoundRes = await fetch(`${TARGET}/synthetic-test-non-existent-route-404`, { redirect: 'manual' });
    assert(notFoundRes.status === 404, `Unmatched route returns HTTP 404 (got ${notFoundRes.status})`);
    const notFoundText = await notFoundRes.text();
    assert(notFoundText.includes('404'), '404 response body contains 404 indicator');

    // 6. Robots, Sitemap & AI Discovery
    console.log('\n6. Checking Robots, Sitemap & AI Discovery...');
    const robotsRes = await fetch(`${TARGET}/robots.txt`);
    assert(robotsRes.status === 200, `robots.txt returns HTTP 200 (got ${robotsRes.status})`);
    const robotsText = await robotsRes.text();
    assert(robotsText.includes('Disallow: /app/'), 'robots.txt disallows /app/');
    assert(robotsText.includes('Sitemap:'), 'robots.txt references sitemap.xml');

    const sitemapRes = await fetch(`${TARGET}/sitemap.xml`);
    assert(sitemapRes.status === 200, `sitemap.xml returns HTTP 200 (got ${sitemapRes.status})`);
    const sitemapText = await sitemapRes.text();
    assert(!sitemapText.includes('zoop.network'), 'sitemap.xml does NOT contain legacy zoop.network');

    const llmsRes = await fetch(`${TARGET}/llms.txt`);
    assert(llmsRes.status === 200, `llms.txt returns HTTP 200 (got ${llmsRes.status})`);

  } catch (err) {
    console.error(`💥 Unexpected error during probe: ${err.message}`);
    errors++;
  }

  console.log(`\n─── Synthetic Edge Probe Finished with ${errors} error(s) ───`);
  if (errors > 0) {
    process.exit(1);
  } else {
    console.log('🌟 ALL LIVE EDGE PROBES PASSED SUCCESSFULLY!\n');
  }
}

probe();
