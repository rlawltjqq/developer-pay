'use strict';
/**
 * 동적 데이터 저장소 추상화.
 *  - 프로덕션(Vercel): Upstash Redis (REDIS_URL, rediss:// TCP) — 서버리스 인스턴스 간 공유·영속.
 *  - 로컬/미설정: 인메모리 폴백 (프로세스 수명 동안만 유지).
 * Upstash 마켓플레이스 통합은 REDIS_URL(또는 KV_URL)을 주입한다. 접두사가 달라도 자동 감지.
 *
 * 키 구조:
 *  agg:job:sum / agg:job:count   (hash, field=jobId)   직무별 제출 합계·건수
 *  agg:exp:sum / agg:exp:count   (hash, field=years)   연차별 제출 합계·건수
 *  recent                        (list, JSON)          최근 제출 피드(최대 20)
 *  gear:votes                    (hash, field=gearId)  장비 투표 수
 *  gear:hn                       (string, JSON)        장비 HN 언급량 캐시 {id:count}
 *  gear:hn:at                    (string)              HN 캐시 갱신 시각(ISO)
 */

function pickEnv(...res) {
  for (const re of res) {
    const key = Object.keys(process.env).find((k) => re.test(k) && process.env[k]);
    if (key) return process.env[key];
  }
  return '';
}
// rediss:// TCP 연결 문자열. Upstash 통합이 접두사와 무관하게 주입하는 값을 자동 감지.
const REDIS_URL = pickEnv(/^REDIS_URL$/, /^KV_URL$/, /^UPSTASH_REDIS_URL$/, /REDIS_URL$/);
const useRedis = Boolean(REDIS_URL);

let redis = null;
function getClient() {
  if (!useRedis) return null;
  if (redis) return redis;
  const Redis = require('ioredis');
  redis = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: false,
    // 서버리스: 연결 지연 시 무한 대기 방지
    connectTimeout: 8000,
  });
  redis.on('error', (e) => console.error('[redis]', e.message));
  return redis;
}

// ---- 인메모리 폴백 ----
const mem = { hash: new Map(), list: new Map(), str: new Map() };
const h = (k) => (mem.hash.get(k) || mem.hash.set(k, new Map()).get(k));

const toNumMap = (obj) => {
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) out[k] = Number(v) || 0;
  return out;
};

async function hincrby(key, field, n) {
  const r = getClient();
  if (r) return r.hincrby(key, String(field), n);
  const m = h(key); const v = (m.get(String(field)) || 0) + n; m.set(String(field), v); return v;
}
async function hgetall(key) {
  const r = getClient();
  if (r) return toNumMap(await r.hgetall(key));
  return toNumMap(Object.fromEntries(h(key)));
}
async function lpushTrim(key, value, keep) {
  const r = getClient();
  if (r) { await r.lpush(key, JSON.stringify(value)); await r.ltrim(key, 0, keep - 1); return; }
  const l = mem.list.get(key) || []; l.unshift(value); mem.list.set(key, l.slice(0, keep));
}
async function lrange(key, n) {
  const r = getClient();
  if (r) return (await r.lrange(key, 0, n - 1)).map((s) => { try { return JSON.parse(s); } catch { return null; } }).filter(Boolean);
  return (mem.list.get(key) || []).slice(0, n);
}
async function setStr(key, value) {
  const r = getClient();
  if (r) return r.set(key, value);
  mem.str.set(key, value);
}
async function getStr(key) {
  const r = getClient();
  if (r) return r.get(key);
  return mem.str.has(key) ? mem.str.get(key) : null;
}

function asObject(v) {
  if (v == null) return null;
  if (typeof v === 'object') return v;
  try { return JSON.parse(v); } catch { return null; }
}

module.exports = {
  mode: useRedis ? 'kv' : 'memory',

  async addSubmission(jobId, years, salary) {
    await hincrby('agg:job:sum', jobId, salary);
    await hincrby('agg:job:count', jobId, 1);
    await hincrby('agg:exp:sum', years, salary);
    await hincrby('agg:exp:count', years, 1);
    await lpushTrim('recent', { job_id: jobId, years, salary, at: new Date().toISOString() }, 20);
  },
  async jobAgg() {
    return { sum: await hgetall('agg:job:sum'), count: await hgetall('agg:job:count') };
  },
  async expAgg() {
    return { sum: await hgetall('agg:exp:sum'), count: await hgetall('agg:exp:count') };
  },
  async recent() {
    return lrange('recent', 20);
  },
  async votes() {
    return hgetall('gear:votes');
  },
  async addVote(gearId) {
    return hincrby('gear:votes', gearId, 1);
  },
  async hnCounts() {
    return asObject(await getStr('gear:hn'));
  },
  async setHnCounts(map) {
    await setStr('gear:hn', JSON.stringify(map));
    await setStr('gear:hn:at', new Date().toISOString());
  },
  async hnFetchedAt() {
    return getStr('gear:hn:at');
  },
};
