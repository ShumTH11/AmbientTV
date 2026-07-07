/**
 * AmbientTV — production static server + API/media reverse proxy.
 *
 * Zero dependencies. Serves the built `dist/` (SPA, React Router-less hashless
 * routing via index.html fallback) and proxies `/api/*` and `/media/*` to the
 * Node backend. Works without Docker.
 *
 *   PORT=4173 BACKEND_URL=http://localhost:3000 node server.mjs
 */
import http from 'node:http';
import zlib from 'node:zlib';
import { existsSync, statSync, createReadStream } from 'node:fs';
import { join, resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const DIST = join(__dirname, 'dist');
const PORT = Number(process.env.PORT || 4173);
const BACKEND = process.env.BACKEND_URL || 'http://localhost:3000';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json',
  '.vtt': 'text/vtt; charset=utf-8',
};

const COMPRESSIBLE = new Set(['.html', '.js', '.mjs', '.css', '.json', '.svg', '.map', '.vtt']);

function sendFile(filePath, res, req) {
  const ext = extname(filePath).toLowerCase();
  const acceptsGzip = !!req?.headers['accept-encoding']?.includes('gzip');
  const compress = acceptsGzip && COMPRESSIBLE.has(ext);
  const headers = {
    'content-type': MIME[ext] || 'application/octet-stream',
    'cache-control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
  };
  if (compress) {
    headers['content-encoding'] = 'gzip';
    headers['vary'] = 'Accept-Encoding';
  }
  res.writeHead(200, headers);
  const stream = createReadStream(filePath);
  if (compress) stream.pipe(zlib.createGzip()).pipe(res);
  else stream.pipe(res);
}

function serveStatic(req, res) {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const safe = pathname === '/' ? '/index.html' : pathname;
  const resolved = resolve(DIST, '.' + safe);

  // Guard against path traversal: anything resolving outside dist → SPA fallback.
  const filePath =
    resolved.startsWith(DIST + sep) || resolved === DIST
      ? resolved
      : join(DIST, 'index.html');

  const finalPath =
    existsSync(filePath) && statSync(filePath).isFile()
      ? filePath
      : join(DIST, 'index.html'); // SPA fallback for client routes

  sendFile(finalPath, res, req);
}

function proxy(req, res) {
  const target = new URL(req.url, BACKEND);
  const options = {
    method: req.method,
    headers: { ...req.headers, host: target.host },
  };
  const p = http.request(target, options, (pres) => {
    res.writeHead(pres.statusCode, pres.headers);
    pres.pipe(res);
  });
  p.on('error', () => {
    res.writeHead(502, { 'content-type': 'application/json; charset=utf-8' });
    res.end(
      JSON.stringify({ error: 'backend_unreachable', backend: BACKEND })
    );
  });
  req.pipe(p);
}

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, static: DIST, backend: BACKEND }));
    return;
  }
  if (req.url.startsWith('/api') || req.url.startsWith('/media')) {
    return proxy(req, res);
  }
  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`AmbientTV web → http://localhost:${PORT}`);
  console.log(`  static: ${DIST}`);
  console.log(`  proxy : ${BACKEND}  (/api, /media)`);
});
