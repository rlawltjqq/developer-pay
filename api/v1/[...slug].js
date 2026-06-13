'use strict';
/**
 * Vercel 서버리스 함수 — /api/v1/* 전체를 처리하는 catch-all.
 * 로컬 server.js와 동일한 lib/handler.js를 사용한다.
 */
const { handle } = require('../../lib/handler');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    let body = {};
    if (req.method === 'POST') {
      body = req.body && typeof req.body === 'object' ? req.body
        : (typeof req.body === 'string' && req.body ? JSON.parse(req.body) : {});
    }
    const data = await handle(req.method, url.pathname, url.searchParams, body);
    res.status(200).json({ ok: true, data });
  } catch (e) {
    res.status(e.status || 500).json({ ok: false, error: e.message });
  }
};
