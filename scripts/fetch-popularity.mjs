/**
 * 빌드 시점에 Hacker News(Algolia)에서 장비별 언급 글 수를 수집해
 * lib/gear-popularity.json 으로 저장한다. 배포 직후부터 실측 데이터가 보이도록 하기 위함.
 * 네트워크 실패 시 기존 파일을 그대로 유지하고 빌드를 통과시킨다.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataPath = join(__dirname, '..', 'lib', 'data.js');
const outPath = join(__dirname, '..', 'lib', 'gear-popularity.json');

// data.js에서 GEAR_CATALOG의 {id, query}만 가볍게 추출 (정규식 파싱)
const src = readFileSync(dataPath, 'utf8');
const block = src.slice(src.indexOf('const GEAR_CATALOG'), src.indexOf('const SOURCES'));
const items = [...block.matchAll(/id:\s*(\d+)[\s\S]*?query:\s*'([^']+)'/g)].map((m) => ({ id: Number(m[1]), query: m[2] }));

async function hn(query) {
  const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(`"${query}"`)}&hitsPerPage=0`;
  const res = await fetch(url, { headers: { 'User-Agent': 'devpay-popularity/1.0' } });
  if (!res.ok) throw new Error(`HN ${res.status}`);
  return (await res.json()).nbHits;
}

const out = {};
let ok = 0;
for (const it of items) {
  try { out[it.id] = await hn(it.query); ok++; }
  catch (e) { console.error(`[build] ${it.query} 실패: ${e.message}`); }
  await new Promise((r) => setTimeout(r, 120));
}

if (ok > 0) {
  writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n');
  console.log(`[build] 장비 HN 언급량 ${ok}/${items.length}건 수집 → lib/gear-popularity.json`);
} else {
  console.warn('[build] HN 수집 실패 — 기존 lib/gear-popularity.json 유지');
}
