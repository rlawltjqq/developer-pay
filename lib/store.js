'use strict';
/**
 * 동적 데이터 저장소 추상화.
 *  - 프로덕션(Vercel): Vercel KV / Upstash Redis (REST). 서버리스 인스턴스 간 공유·영속.
 *  - 로컬/미설정: 인메모리 폴백 (프로세스 수명 동안만 유지).
 * 환경변수 KV_REST_API_URL/TOKEN(=Vercel KV) 또는 UPSTASH_REDIS_REST_URL/TOKEN 가 있으면 Redis 사용.
 *
 * 키 구조:
 *  agg:job:sum / agg:job:count   (hash, field=jobId)   직무별 제출 합계·건수
 *  agg:exp:sum / agg:exp:count   (hash, field=years)   연차별 제출 합계·건수
 *  recent                        (list, JSON)          최근 제출 피드(최대 20)
 *  gear:votes                    (hash, field=gearId)  장비 투표 수
 *  gear:hn                       (string, JSON)        장비 HN 언급량 캐시 {id:count}
 *  gear:hn:at                    (string)              HN 캐시 갱신 시각(ISO)
 */

const URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
const useRedis = Boolean(URL && TOKEN);

let redis = null;
async function client() {
  if (!useRedis) return null;
  if (redis) return redis;
  const { Redis } = await import('@upstash/redis');
  redis = new Redis({ url: URL, token: TOKEN });
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
  const r = await client();
  if (r) return r.hincrby(key, field, n);
  const m = h(key); const v = (m.get(String(field)) || 0) + n; m.set(String(field), v); return v;
}
async function hgetall(key) {
  const r = await client();
  if (r) return toNumMap(await r.hgetall(key));
  return toNumMap(Object.fromEntries(h(key)));
}
async function lpushTrim(key, value, keep) {
  const r = await client();
  if (r) { await r.lpush(key, value); await r.ltrim(key, 0, keep - 1); return; }
  const l = mem.list.get(key) || []; l.unshift(value); mem.list.set(key, l.slice(0, keep));
}
async function lrange(key, n) {
  const r = await client();
  if (r) return r.lrange(key, 0, n - 1);
  return (mem.list.get(key) || []).slice(0, n);
}
async function setStr(key, value) {
  const r = await client();
  if (r) return r.set(key, value);
  mem.str.set(key, value);
}
async function getStr(key) {
  const r = await client();
  if (r) return r.get(key);
  return mem.str.has(key) ? mem.str.get(key) : null;
}

// Upstash는 객체를 자동 JSON 직렬화/역직렬화하므로 문자열/객체 모두 안전하게 처리
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
    return (await lrange('recent', 20)).map(asObject).filter(Boolean);
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
