'use strict';
/**
 * 로컬 개발 서버 (node server.js → http://localhost:3000).
 * Vercel 프로덕션에서는 api/v1/[...slug].js 서버리스 함수가 같은 핸들러를 사용한다.
 * KV 환경변수가 없으면 인메모리 저장소로 동작한다(데이터는 프로세스 수명 동안만 유지).
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { handle } = require('./lib/handler');

const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
};

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (c) => { raw += c; if (raw.length > 1e5) { req.destroy(); reject(new Error('payload too large')); } });
    req.on('end', () => { if (!raw) return resolve({}); try { resolve(JSON.parse(raw)); } catch { reject(Object.assign(new Error('잘못된 JSON 본문입니다.'), { status: 400 })); } });
    req.on('error', reject);
  });
}

function serveStatic(res, pathname) {
  const file = path.join(PUBLIC, path.normalize(pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(PUBLIC) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('404 Not Found');
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (url.pathname.startsWith('/api/')) {
      if (req.method === 'OPTIONS') return sendJson(res, 204, {});
      const body = req.method === 'POST' ? await readBody(req) : {};
      const data = await handle(req.method, url.pathname, url.searchParams, body);
      return sendJson(res, 200, { ok: true, data });
    }
    return serveStatic(res, url.pathname);
  } catch (e) {
    return sendJson(res, e.status || 500, { ok: false, error: e.message });
  }
}).listen(PORT, () => {
  console.log(`DevPay 로컬 서버 → http://localhost:${PORT}`);
  console.log(`저장소 모드: ${require('./lib/store').mode === 'kv' ? 'Vercel KV' : '인메모리(로컬)'}`);
});
