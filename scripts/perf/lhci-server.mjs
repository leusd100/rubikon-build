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
//
//   node scripts/perf/lhci-server.mjs --port 4174 --http2
//
// --http2 answers over HTTP/2 with a throwaway self-signed certificate, as Nightly does. Cloudflare multiplexes; over
// HTTP/1.1 Lighthouse's model queues all ~76 requests on six connections. And it counts every request started before the
// observed paint as blocking LCP, which at ~250 ms on loopback is nearly all of them. /angary stood at LCP 6.2 s and 69
// against production's 2.3 s and 92 (PSI, 31.10.2026), and a 49 KB low-priority image starting just before or after that
// paint moved it 450 ms across the 6.1 s budget: 12 of the 13 nights to 31.10 were red on that. The same build over HTTP/2:
// LCP 4.5 s, 81, runs within 42 ms. The two give different numbers, so never compare across them.
import { execFileSync, spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createServer, request } from 'node:http';
import { createSecureServer } from 'node:http2';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { constants, createBrotliCompress, createGzip } from 'node:zlib';

const argPort = process.argv.indexOf('--port');
const port = Number(argPort > -1 ? process.argv[argPort + 1] : process.env.LHCI_PORT || 4174);
const useHttp2 = process.argv.includes('--http2');
const upstreamPort = port + 1000;
const COMPRESSIBLE = /^(text\/|application\/(javascript|json|manifest\+json|xml)|image\/svg\+xml)/;
// Connection-specific headers are invalid in HTTP/2, and the pseudo-headers (`:path` …) do not exist in HTTP/1.1
const NOT_FORWARDED = /^(:.*|connection|keep-alive|proxy-connection|transfer-encoding|upgrade|http2-settings)$/;
const forwardable = (headers) => Object.fromEntries(Object.entries(headers).filter(([name]) => !NOT_FORWARDED.test(name)));

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

/** A key and certificate for this run only: RSA, as LibreSSL's EC keys fail the TLS handshake. Nothing is kept. */
function throwawayCertificate() {
  const dir = mkdtempSync(join(tmpdir(), 'lhci-server-'));
  const [keyFile, certFile] = [join(dir, 'key.pem'), join(dir, 'cert.pem')];
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', '/CN=127.0.0.1',
    '-addext', 'subjectAltName=IP:127.0.0.1', '-keyout', keyFile, '-out', certFile], { stdio: 'ignore' });
  const certificate = { key: readFileSync(keyFile), cert: readFileSync(certFile) };
  rmSync(dir, { recursive: true });
  return certificate;
}

function startProxy() {
  const handler = (req, res) => {
    const forwarded = forwardable(req.headers);
    forwarded.host = req.headers.host ?? req.headers[':authority'];
    const forward = request({ host: '127.0.0.1', port: upstreamPort, method: req.method, path: req.url, headers: forwarded }, (up) => {
      const headers = forwardable(up.headers);
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
  };
  const server = useHttp2 ? createSecureServer({ ...throwawayCertificate(), allowHTTP1: true }, handler) : createServer(handler);
  server.listen(port, '127.0.0.1', () => {
    console.log(`Production server running on ${useHttp2 ? 'https' : 'http'}://127.0.0.1:${port} (compressing proxy for vinext start on ${upstreamPort})`);
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
