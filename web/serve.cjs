/**
 * Zoop Web Local Server
 * Serves the built frontend from web/dist with SPA fallback, prerendered route handling,
 * and /api reverse-proxying to Zoop Cloud on 127.0.0.1:8080.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.env.PORT || '5173', 10);
const HOST = process.env.HOST || '127.0.0.1';
const DIST_DIR = path.resolve(__dirname, 'dist');
const CLOUD_API_TARGET = process.env.ZOOP_CLOUD_URL || 'http://127.0.0.1:8080';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.ico': 'image/x-icon',
};

function proxyRequest(req, res, targetUrl) {
  const target = new URL(targetUrl);
  const options = {
    hostname: target.hostname,
    port: target.port || 80,
    path: req.url.replace(/^\/api/, ''),
    method: req.method,
    headers: {
      ...req.headers,
      host: `${target.hostname}:${target.port || 80}`,
    },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Bad Gateway: Zoop Cloud backend not reachable on :8080' }));
  });

  req.pipe(proxyReq, { end: true });
}

const server = http.createServer((req, res) => {
  // 1. API proxying
  if (req.url.startsWith('/api/') || req.url === '/api') {
    return proxyRequest(req, res, CLOUD_API_TARGET);
  }

  // 2. Static file resolution
  let urlPath = req.url.split('?')[0].split('#')[0];
  let filePath = path.join(DIST_DIR, urlPath);

  // If path is a directory, look for index.html inside
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  } else if (!fs.existsSync(filePath) && !path.extname(filePath)) {
    // Check if a pre-rendered folder/index.html or .html exists
    const subIndex = path.join(filePath, 'index.html');
    if (fs.existsSync(subIndex)) {
      filePath = subIndex;
    } else if (fs.existsSync(filePath + '.html')) {
      filePath = filePath + '.html';
    } else {
      // SPA fallback
      filePath = path.join(DIST_DIR, 'index.html');
    }
  } else if (!fs.existsSync(filePath)) {
    // Unknown asset, fallback to SPA index.html
    filePath = path.join(DIST_DIR, 'index.html');
  }

  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      return res.end('Internal Server Error');
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
    });
    res.end(data);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`\n  ➜  Zoop Web Server running at: http://${HOST}:${PORT}/`);
  console.log(`  ➜  Legal Privacy:              http://${HOST}:${PORT}/privacy`);
  console.log(`  ➜  Legal Terms:                http://${HOST}:${PORT}/terms`);
  console.log(`  ➜  Web Console:                http://${HOST}:${PORT}/app`);
  console.log(`  ➜  Cloud API Proxy:            /api -> ${CLOUD_API_TARGET}\n`);
});
