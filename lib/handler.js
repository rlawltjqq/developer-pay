'use strict';
/**
 * /api/v1 공유 핸들러 — server.js(로컬)와 api/v1/[...slug].js(Vercel)에서 함께 사용.
 * handle(method, pathname, query, body) → data (성공) | throw HttpError (실패)
 */
const path = require('node:path');
const fs = require('node:fs');
const { JOBS, TECH_STACKS, EXPERIENCE, COUNTRIES, GEAR_CATALOG, SOURCES, USD_KRW } = require('./data');
const { calcTakeHome } = require('./tax');
const store = require('./store');

const BASE_WEIGHT = 100; // 참조 데이터(공개 리포트)에 부여하는 가상 표본 가중치
const VOTE_WEIGHT = 5;    // 장비 점수 = HN 언급수 + 투표 × VOTE_WEIGHT
const SIGMA = 0.35;       // 연봉 로그정규 분포 가정의 표준편차

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

// 빌드 시점에 수집된 장비 HN 언급량(베이스라인). KV 캐시가 없을 때 사용.
function baselinePopularity() {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, 'gear-popularity.json'), 'utf8'));
  } catch { return {}; }
}

// ── 집계 헬퍼 ──────────────────────────────────────────────
async function jobRankings() {
  const { sum, count } = await store.jobAgg();
  return JOBS
    .map((j, idx) => {
      const id = idx + 1;
      const uCount = count[id] || 0;
      const uSum = sum[id] || 0;
      const avg = Math.round((j.salary * BASE_WEIGHT + uSum) / (BASE_WEIGHT + uCount));
      return { id, slug: j.slug, name: j.name, icon: j.icon, base_salary: j.salary,
               avg_salary: avg, user_count: uCount, tech: j.tech, gear: j.gear };
    })
    .sort((a, b) => b.avg_salary - a.avg_salary)
    .map((j, i) => ({ rank: i + 1, ...j }));
}

async function experienceCurve() {
  const { sum, count } = await store.expAgg();
  return EXPERIENCE.map((e) => {
    const uCount = count[e.years] || 0;
    const uSum = sum[e.years] || 0;
    return {
      years: e.years,
      avg_salary: Math.round((e.salary * BASE_WEIGHT + uSum) / (BASE_WEIGHT + uCount)),
      user_count: uCount,
      approx: e.approx,
    };
  });
}

async function gearRanking(type) {
  const cached = await store.hnCounts();
  const mentions = cached || baselinePopularity();
  const votes = await store.votes();
  const fetchedAt = (await store.hnFetchedAt()) || null;
  const list = GEAR_CATALOG
    .filter((g) => !type || g.type === type)
    .map((g) => {
      const m = Number(mentions[g.id] ?? 0);
      const v = Number(votes[g.id] ?? 0);
      return { ...g, mentions_hn: m, votes: v, score: m + v * VOTE_WEIGHT };
    })
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .map((g, i) => ({
      rank: i + 1, id: g.id, type: g.type, name: g.name, brand: g.brand,
      detail: g.detail, price_manwon: g.price, query: g.query,
      mentions_hn: g.mentions_hn, votes: g.votes, score: g.score,
    }));
  return { method: `점수 = Hacker News 언급 글 수(실측) + 투표 × ${VOTE_WEIGHT}`, fetched_at: fetchedAt, source: useMode(), items: list };
}

function useMode() { return store.mode === 'kv' ? 'Vercel KV(공유 영속)' : '인메모리(로컬/임시)'; }
const fmtNum = (n) => Number(n).toLocaleString('ko-KR');

// HN Algolia에서 장비별 언급 글 수 수집 → KV 캐시에 저장. (cron/refresh에서 호출)
async function refreshPopularity() {
  const out = {};
  let ok = 0, failed = 0;
  for (const g of GEAR_CATALOG) {
    try {
      const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(`"${g.query}"`)}&hitsPerPage=0`;
      const res = await fetch(url, { headers: { 'User-Agent': 'devpay-popularity/1.0' } });
      if (!res.ok) throw new Error(`HN ${res.status}`);
      out[g.id] = (await res.json()).nbHits;
      ok++;
    } catch { failed++; }
    await new Promise((r) => setTimeout(r, 120));
  }
  if (ok > 0) await store.setHnCounts(out);
  return { refreshed: ok, failed };
}

// 표준정규 CDF (Abramowitz & Stegun 근사)
function normCdf(z) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-z * z / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}

// ── 라우트 ─────────────────────────────────────────────────
const routes = {
  'GET /meta': async () => ({
    service: 'DevPay API', version: 'v1',
    storage: useMode(),
    currency_note: `해외 연봉은 USD, 국내는 만원. 환산 환율 ${USD_KRW}원/USD 고정.`,
    sources: SOURCES,
    disclaimer: '연봉·기술스택 수치는 점핏 2025 리포트 등 공개 자료의 실제 값입니다. 연차 곡선의 일부 구간은 실제 앵커(신입·6년·10년) 사이를 보간한 값이며, 사용자 제출이 누적되면 함께 반영됩니다.',
  }),
  'GET /jobs': () => jobRankings(),
  'GET /tech': async () => TECH_STACKS
    .slice().sort((a, b) => b.salary - a.salary)
    .map((t, i) => ({ rank: i + 1, ...t })),
  'GET /experience': () => experienceCurve(),
  'GET /stack-roi': (q) => {
    const from = TECH_STACKS.find((t) => t.name.toLowerCase() === String(q.get('from') || '').toLowerCase());
    const to = TECH_STACKS.find((t) => t.name.toLowerCase() === String(q.get('to') || '').toLowerCase());
    if (!from || !to) throw new HttpError(400, 'from·to에 유효한 기술스택 이름이 필요합니다. (목록은 /tech 참고)');
    const diff = to.salary - from.salary;
    return {
      from: { name: from.name, salary: from.salary, field: from.field },
      to: { name: to.name, salary: to.salary, field: to.field },
      diff_manwon: diff,
      diff_percent: Math.round((diff / from.salary) * 1000) / 10,
      monthly_diff_manwon: Math.round(diff / 12 * 10) / 10,
      message: diff > 0
        ? `${to.name}로 옮기면 평균 연 ${fmtNum(diff)}만원 더 받습니다 📈`
        : diff < 0
        ? `${to.name}는 평균 연 ${fmtNum(-diff)}만원 더 낮습니다 📉`
        : '두 스택의 평균 연봉이 같습니다',
    };
  },
  'GET /countries': async (q) => {
    const rows = COUNTRIES.slice().sort((a, b) => b.median_usd - a.median_usd).map((c, i) => ({
      rank: i + 1, name: c.name, flag: c.flag, median_usd: c.median_usd,
      median_krw_manwon: Math.round(c.median_usd * USD_KRW / 10000),
    }));
    const salary = Number(q.get('salary'));
    if (salary > 0) {
      const myUsd = Math.round(salary * 10000 / USD_KRW);
      let nearest = rows[0];
      for (const c of rows) if (Math.abs(c.median_usd - myUsd) < Math.abs(nearest.median_usd - myUsd)) nearest = c;
      return { countries: rows, me: { salary_manwon: salary, salary_usd: myUsd, nearest_country: nearest } };
    }
    return { countries: rows };
  },
  'GET /salaries/recent': async () => {
    const rows = await store.recent();
    return rows.map((r) => {
      const job = JOBS[Number(r.job_id) - 1];
      return { job: job ? job.name : '?', icon: job ? job.icon : '❓',
               years: Number(r.years), salary: Number(r.salary), created_at: r.at };
    });
  },
  'POST /salaries': async (q, body) => {
    const jobId = Number(body.job_id);
    const years = Number(body.years);
    const salary = Number(body.salary);
    if (!JOBS[jobId - 1]) throw new HttpError(400, '존재하지 않는 직군입니다.');
    if (!Number.isInteger(years) || years < 0 || years > 40) throw new HttpError(400, '경력은 0~40년 사이여야 합니다.');
    if (!Number.isFinite(salary) || salary < 1000 || salary > 100000) throw new HttpError(400, '연봉은 1,000~100,000만원 사이로 입력해주세요.');
    await store.addSubmission(jobId, Math.min(years, 10), Math.round(salary));
    return { message: '제출 완료! 랭킹에 즉시 반영됩니다.', storage: useMode() };
  },
  'GET /percentile': async (q) => {
    const salary = Number(q.get('salary'));
    if (!(salary > 0)) throw new HttpError(400, 'salary 쿼리 파라미터가 필요합니다(만원 단위).');
    const jobId = Number(q.get('job_id'));
    const years = q.get('years') !== null ? Math.min(Number(q.get('years')), 10) : null;
    const jobs = await jobRankings();
    const job = jobs.find((j) => j.id === jobId) || null;
    const exp = years !== null ? (await experienceCurve()).find((e) => e.years === years) || null : null;
    let median;
    if (job && exp) median = Math.sqrt(job.avg_salary * exp.avg_salary);
    else if (job) median = job.avg_salary;
    else if (exp) median = exp.avg_salary;
    else median = jobs.reduce((s, j) => s + j.avg_salary, 0) / jobs.length;
    const p = normCdf(Math.log(salary / median) / SIGMA);
    const topPct = Math.max(0.1, Math.round((1 - p) * 1000) / 10);
    return {
      salary_manwon: salary, baseline_median: Math.round(median),
      percentile: Math.round(p * 1000) / 10, top_percent: topPct,
      per_hour_krw: Math.round(salary * 10000 / 12 / 209),
      per_minute_krw: Math.round(salary * 10000 / 209 / 60 / 12),
      message: topPct <= 10 ? '상위권입니다! 🎉' : topPct <= 40 ? '평균 이상이에요 👍'
        : topPct <= 60 ? '딱 평균 구간입니다' : '협상 카드를 준비해볼까요? 💪',
    };
  },
  'GET /distribution': async (q) => {
    const BUCKET = 500; // 만원
    const bucketOf = (s) => Math.floor(s / BUCKET) * BUCKET;
    // 베이스: 점핏 2025 직무·기술스택 평균(실데이터)
    const base = [...JOBS.map((j) => j.salary), ...TECH_STACKS.map((t) => t.salary)];
    const counts = {};
    for (const s of base) counts[bucketOf(s)] = (counts[bucketOf(s)] || 0) + 1;
    // 사용자 제출 분포 합산
    const sub = await store.distribution();
    let subTotal = 0;
    for (const [b, c] of Object.entries(sub)) { counts[b] = (counts[b] || 0) + Number(c); subTotal += Number(c); }
    const keys = Object.keys(counts).map(Number);
    const lo = Math.min(...keys), hi = Math.max(...keys);
    const buckets = [];
    for (let b = lo; b <= hi; b += BUCKET) buckets.push({ from: b, to: b + BUCKET - 1, count: counts[b] || 0 });
    const result = {
      bucket_size: BUCKET, total: base.length + subTotal,
      base_count: base.length, submission_count: subTotal, buckets,
      note: '점핏 2025 직무·기술스택 평균 + 사용자 제출 연봉을 합친 분포',
    };
    const salary = Number(q.get('salary'));
    if (salary > 0) {
      const all = base.slice();
      for (const [b, c] of Object.entries(sub)) for (let i = 0; i < Number(c); i++) all.push(Number(b) + BUCKET / 2);
      const below = all.filter((v) => v <= salary).length;
      result.me = { salary, bucket: bucketOf(salary), percentile: Math.round(below / all.length * 1000) / 10 };
    }
    return result;
  },
  'GET /take-home': (q) => {
    const salary = Number(q.get('salary'));
    if (!(salary > 0)) throw new HttpError(400, 'salary 쿼리 파라미터가 필요합니다(만원 단위).');
    if (salary < 1000 || salary > 1000000) throw new HttpError(400, '연봉은 1,000~1,000,000만원 범위로 입력해주세요.');
    const dependents = Math.max(0, Math.min(10, Number(q.get('dependents')) || 0));
    const nontax = q.get('nontax') !== null ? Math.max(0, Number(q.get('nontax'))) : undefined;
    return calcTakeHome(salary, dependents, nontax);
  },
  'GET /gear': (q) => gearRanking(q.get('type') === 'keyboard' || q.get('type') === 'mouse' ? q.get('type') : null),
  'POST /gear/:id/vote': async (q, body, params) => {
    const g = GEAR_CATALOG.find((x) => x.id === Number(params.id));
    if (!g) throw new HttpError(404, '존재하지 않는 장비입니다.');
    const votes = await store.addVote(g.id);
    return { id: g.id, name: g.name, votes };
  },
  // Vercel Cron(GET) 및 수동 갱신용
  'GET /gear/refresh': async () => ({ message: 'HN 언급량 갱신 완료', ...(await refreshPopularity()) }),
  'POST /gear/refresh': async () => ({ message: 'HN 언급량 갱신 완료', ...(await refreshPopularity()) }),
};

async function handle(method, pathname, query, body) {
  const rel = pathname.split('/').filter(Boolean).slice(2); // /api/v1/... 이후
  for (const [key, fn] of Object.entries(routes)) {
    const [m, pat] = key.split(' ');
    if (m !== method) continue;
    const pp = pat.split('/').filter(Boolean);
    if (pp.length !== rel.length) continue;
    const params = {};
    let match = true;
    for (let i = 0; i < pp.length; i++) {
      if (pp[i].startsWith(':')) params[pp[i].slice(1)] = rel[i];
      else if (pp[i] !== rel[i]) { match = false; break; }
    }
    if (match) return fn(query, body, params);
  }
  throw new HttpError(404, '없는 API 경로입니다.');
}

module.exports = { handle, HttpError, refreshPopularity };
