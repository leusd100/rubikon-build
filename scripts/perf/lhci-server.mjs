// The production build as Lighthouse CI should see it: `vinext start` behind a compressing proxy.
//
//   node scripts/perf/lhci-server.mjs --port 4174
//
// `vinext start` compresses HTML but serves /_next/static JS and CSS uncompressed, while Cloudflare serves them with
// brotli. Measured on /angary (Lighthouse 12.6, mobile): the same build scored 61 with LCP 7.7 s and 1.11 MB through
// `vinext start` and 79 with LCP 3.9 s and 0.53 MB in production — the nightly budgets were failing on that gap, not on
// the site. So this starts `vinext start` on port + 1000 and answers on --port, compressing whatever the upstream left
// uncompressed (brotli when accepted, else gzip). Nothing else changes: same status, headers and bytes.
// Prints "Production server running" only once the proxy is listening (lighthouserc.cjs waits for that line).
import { spawn } from 'node:child_process';
import { createServer, request } from 'node:http';
import { join } from 'node:path';
import { constants, createBrotliCompress, createGzip } from 'node:zlib';

const argPort = process.argv.indexOf('--port');
const port = Number(argPort > -1 ? process.argv[argPort + 1] : process.env.LHCI_PORT || 4174);
const upstreamPort = port + 1000;
const COMPRESSIBLE = /^(text\/|application\/(javascript|json|manifest\+json|xml)|image\/svg\+xml)/;

const upstream = spawn(join(process.cwd(), 'node_modules', '.bin', 'vinext'), ['start', '--hostname', '127.0.0.1', '--port', String(upstreamPort)], {
  stdio: ['ignore', 'pipe', 'inherit'],
});
upstream.on('exit', (code) => process.exit(code ?? 1));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => upstream.kill(signal));

function encodingFor(acceptEncoding = '') {
  if (/\bbr\b/.test(acceptEncoding)) return 'br';
  if (/\bgzip\b/.test(acceptEncoding)) return 'gzip';
  return null;
}

function startProxy() {
  createServer((req, res) => {
    const forward = request({ host: '127.0.0.1', port: upstreamPort, method: req.method, path: req.url, headers: req.headers }, (up) => {
      const headers = { ...up.headers };
      const type = String(headers['content-type'] || '');
      const encoding = encodingFor(req.headers['accept-encoding']);
      const compress = encoding && !headers['content-encoding'] && COMPRESSIBLE.test(type)
        && req.method !== 'HEAD' && up.statusCode !== 204 && up.statusCode !== 304;

      if (!compress) {
        res.writeHead(up.statusCode ?? 502, headers);
        up.pipe(res);
        return;
      }
      delete headers['content-length'];
      headers['content-encoding'] = encoding;
      headers.vary = headers.vary ? `${headers.vary}, Accept-Encoding` : 'Accept-Encoding';
      res.writeHead(up.statusCode ?? 200, headers);
      const encoder = encoding === 'br'
        ? createBrotliCompress({ params: { [constants.BROTLI_PARAM_QUALITY]: 5 } })
        : createGzip({ level: 6 });
      up.pipe(encoder).pipe(res);
    });
    forward.on('error', () => {
      if (!res.headersSent) res.writeHead(502);
      res.end();
    });
    req.pipe(forward);
  }).listen(port, '127.0.0.1', () => {
    console.log(`Production server running on http://127.0.0.1:${port} (compressing proxy for vinext start on ${upstreamPort})`);
  });
}

// The upstream announces itself with the same words LHCI waits for, so its output is only watched, never echoed.
let started = false;
upstream.stdout.on('data', (chunk) => {
  if (!started && /Production server running/.test(String(chunk))) {
    started = true;
    startProxy();
  }
});
