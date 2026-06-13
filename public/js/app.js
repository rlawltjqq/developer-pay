'use strict';
/* DevPay 프론트엔드 — /api/v1 REST API만 소비한다(모바일 앱과 동일한 계약). */

const API = '/api/v1';
const fmt = (n) => Number(n).toLocaleString('ko-KR');

async function api(path, opts) {
  const res = await fetch(API + path, opts);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || '요청 실패');
  return json.data;
}

/* ---------- 탭 ---------- */
document.getElementById('tabs').addEventListener('click', (e) => {
  const btn = e.target.closest('.tab');
  if (!btn) return;
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t === btn));
  document.querySelectorAll('.panel').forEach((p) =>
    p.classList.toggle('active', p.id === 'panel-' + btn.dataset.tab));
  loaders[btn.dataset.tab]?.();
});

/* ---------- 직군 랭킹 ---------- */
async function loadJobs() {
  const jobs = await api('/jobs');
  const max = jobs[0].avg_salary;
  document.getElementById('job-list').innerHTML = jobs.map((j) => `
    <div class="rank-item expandable" style="--w:${(j.avg_salary / max * 100).toFixed(1)}%">
      <div class="bar"></div>
      <div class="rank-num r${j.rank}">${j.rank}</div>
      <div>
        <div class="rank-name">${j.icon} ${j.name} <span class="caret">▾</span></div>
        <div class="rank-sub">${j.tech.slice(0, 3).join(' · ')}${j.user_count > 0 ? ` · 제출 ${j.user_count}건 반영` : ''}</div>
      </div>
      <div class="rank-value">${fmt(j.avg_salary)}<small> 만원</small></div>
      <div class="rank-detail">
        <div class="detail-row"><span class="detail-label">🛠️ 주요 기술</span>
          ${j.tech.map((t) => `<span class="chip static small">${t}</span>`).join('')}</div>
        <div class="detail-row"><span class="detail-label">🎒 많이 쓰는 장비</span>
          ${j.gear.map((g) => `<span class="chip static small">${g}</span>`).join('')}</div>
      </div>
    </div>`).join('');
  // 행 클릭 → 기술/장비 상세 펼치기
  document.querySelectorAll('#job-list .expandable').forEach((el) =>
    el.addEventListener('click', () => el.classList.toggle('open')));
  // 폼 셀렉트 채우기 (최초 1회)
  for (const selId of ['sub-job', 'pct-job']) {
    const sel = document.getElementById(selId);
    if (sel.options.length <= 1) {
      jobs.slice().sort((a, b) => a.name.localeCompare(b.name, 'ko')).forEach((j) => {
        const o = document.createElement('option');
        o.value = j.id; o.textContent = `${j.icon} ${j.name}`;
        sel.appendChild(o);
      });
    }
  }
}

/* ---------- 기술스택별 ---------- */
async function loadTech() {
  const rows = await api('/tech');
  const max = rows[0].salary;
  document.getElementById('tech-list').innerHTML = rows.map((t) => `
    <div class="rank-item" style="--w:${(t.salary / max * 100).toFixed(1)}%">
      <div class="bar"></div>
      <div class="rank-num r${t.rank}">${t.rank}</div>
      <div>
        <div class="rank-name">${t.name}</div>
        <div class="rank-sub">${t.field}</div>
      </div>
      <div class="rank-value">${fmt(t.salary)}<small> 만원</small></div>
    </div>`).join('');
}

/* ---------- 연차별 ---------- */
let expChart;
async function loadExp() {
  const rows = await api('/experience');
  document.getElementById('exp-list').innerHTML = rows.map((r) =>
    `<span class="chip static">${r.years === 0 ? '신입' : r.years + '년차'}${r.years === 10 ? '+' : ''} · ${fmt(r.avg_salary)}만</span>`
  ).join('');
  const ctx = document.getElementById('exp-chart');
  expChart?.destroy();
  expChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: rows.map((r) => (r.years === 0 ? '신입' : r.years + (r.years === 10 ? '년+' : '년'))),
      datasets: [{
        label: '평균 연봉 (만원)',
        data: rows.map((r) => r.avg_salary),
        borderColor: '#58a6ff',
        backgroundColor: '#58a6ff22',
        fill: true,
        tension: 0.35,
        pointBackgroundColor: '#58a6ff',
      }],
    },
    options: {
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#8b949e' } } },
      scales: {
        x: { ticks: { color: '#8b949e' }, grid: { color: '#2d333b55' } },
        y: { ticks: { color: '#8b949e', callback: (v) => fmt(v) }, grid: { color: '#2d333b55' } },
      },
    },
  });
}

/* ---------- 국가 비교 ---------- */
async function loadWorld(salary) {
  const q = salary ? `?salary=${salary}` : '';
  const data = await api('/countries' + q);
  const rows = data.countries || data;
  const max = rows[0].median_usd;
  const nearest = data.me?.nearest_country?.name;
  document.getElementById('country-list').innerHTML = rows.map((c) => `
    <div class="rank-item" style="--w:${(c.median_usd / max * 100).toFixed(1)}%">
      <div class="bar"></div>
      <div class="rank-num r${c.rank}">${c.rank}</div>
      <div>
        <div class="rank-name">${c.flag} ${c.name} ${nearest === c.name ? ' ← 내 연봉 수준 🧭' : ''}</div>
        <div class="rank-sub">약 ${fmt(c.median_krw_manwon)}만원/년</div>
      </div>
      <div class="rank-value">$${fmt(c.median_usd)}<small>/yr</small></div>
    </div>`).join('');
  if (data.me) {
    const box = document.getElementById('world-result');
    box.hidden = false;
    box.className = 'callout ok';
    box.innerHTML = `내 연봉 <b>${fmt(data.me.salary_manwon)}만원</b> ≈ <b>$${fmt(data.me.salary_usd)}</b> — <b>${data.me.nearest_country.flag} ${data.me.nearest_country.name}</b> 개발자 중앙값과 가장 비슷해요.`;
  }
}
document.getElementById('world-btn').addEventListener('click', () => {
  const v = Number(document.getElementById('world-salary').value);
  if (v > 0) loadWorld(v);
});

/* ---------- 내 연봉 위치 ---------- */
document.getElementById('pct-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const salary = document.getElementById('pct-salary').value;
  const jobId = document.getElementById('pct-job').value;
  const years = document.getElementById('pct-years').value;
  const q = new URLSearchParams({ salary });
  if (jobId) q.set('job_id', jobId);
  if (years !== '') q.set('years', years);
  try {
    const d = await api('/percentile?' + q);
    document.getElementById('pct-result').hidden = false;
    document.getElementById('gauge-marker').style.setProperty('--pos', d.percentile + '%');
    document.getElementById('pct-top').textContent = `상위 ${d.top_percent}%`;
    document.getElementById('pct-msg').textContent = d.message;
    document.getElementById('pct-median').textContent = fmt(d.baseline_median) + '만원';
    document.getElementById('pct-hour').textContent = fmt(d.per_hour_krw) + '원';
    document.getElementById('pct-minute').textContent = fmt(d.per_minute_krw) + '원';
  } catch (err) { alert(err.message); }
});

/* ---------- 실수령액 계산기 ---------- */
document.getElementById('net-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const q = new URLSearchParams({
    salary: document.getElementById('net-salary').value,
    dependents: document.getElementById('net-deps').value || 0,
    nontax: document.getElementById('net-nontax').value || 0,
  });
  try {
    const d = await api('/take-home?' + q);
    document.getElementById('net-result').hidden = false;
    document.getElementById('net-monthly').textContent = fmt(d.net_monthly) + '원';
    document.getElementById('net-annual').textContent = `연 실수령 약 ${fmt(d.net_annual_manwon)}만원`;
    document.getElementById('net-gross').textContent = fmt(d.monthly_gross) + '원';
    document.getElementById('net-deduct').textContent = fmt(d.total_deduction_monthly) + '원';
    document.getElementById('net-rate').textContent = `공제율 ${d.deduction_rate}%`;
    const max = Math.max(...d.breakdown.map((b) => b.amount), 1);
    document.getElementById('net-breakdown').innerHTML = d.breakdown.map((b) => `
      <div class="rank-item" style="--w:${(b.amount / max * 100).toFixed(1)}%">
        <div class="bar"></div>
        <div class="rank-num">·</div>
        <div><div class="rank-name">${b.label}</div><div class="rank-sub">${b.rate}</div></div>
        <div class="rank-value">${fmt(b.amount)}<small> 원</small></div>
      </div>`).join('');
    document.getElementById('net-note').textContent = '※ ' + d.note;
  } catch (err) { alert(err.message); }
});

/* ---------- 연봉 제출 ---------- */
document.getElementById('submit-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const box = document.getElementById('submit-result');
  try {
    const d = await api('/salaries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job_id: Number(document.getElementById('sub-job').value),
        years: Number(document.getElementById('sub-years').value),
        salary: Number(document.getElementById('sub-salary').value),
      }),
    });
    box.hidden = false; box.className = 'callout ok'; box.textContent = '✅ ' + d.message;
    e.target.reset();
    loadRecent();
  } catch (err) {
    box.hidden = false; box.className = 'callout err'; box.textContent = '⚠️ ' + err.message;
  }
});

async function loadRecent() {
  const rows = await api('/salaries/recent');
  document.getElementById('recent-list').innerHTML = rows.length === 0
    ? '<div class="feed-empty">아직 제출된 연봉이 없어요. 첫 번째 주인공이 되어보세요!</div>'
    : rows.map((r) => `
      <div class="feed-item">
        <span>${r.icon} ${r.job} · ${r.years === 0 ? '신입' : r.years + '년차'} · <b>${fmt(r.salary)}만원</b></span>
        <span class="when">${r.created_at.replace('T', ' ').slice(0, 16)} UTC</span>
      </div>`).join('');
}

/* ---------- 장비 랭킹 ---------- */
let gearType = 'keyboard';
const votedKey = 'devpay_voted';
const voted = new Set(JSON.parse(localStorage.getItem(votedKey) || '[]'));

document.querySelectorAll('[data-gear]').forEach((chip) =>
  chip.addEventListener('click', () => {
    gearType = chip.dataset.gear;
    document.querySelectorAll('[data-gear]').forEach((c) => c.classList.toggle('active', c === chip));
    loadGear();
  }));

async function loadGear() {
  const data = await api('/gear?type=' + gearType);
  const rows = data.items;
  const max = rows[0]?.score || 1;
  document.getElementById('gear-method').textContent = data.method
    + (data.fetched_at ? ` · 마지막 수집 ${data.fetched_at.slice(0, 16)} UTC` : ' · 첫 수집 진행 중…');
  document.getElementById('gear-list').innerHTML = rows.map((g) => `
    <div class="rank-item" style="--w:${(g.score / max * 100).toFixed(1)}%">
      <div class="bar"></div>
      <div class="rank-num r${g.rank}">${g.rank}</div>
      <div>
        <div class="rank-name">${g.name} <span class="rank-sub">· ${g.brand}</span></div>
        <div class="rank-sub">${g.detail} · 약 ${g.price_manwon}만원 ·
          ${g.mentions_hn === null ? 'HN 언급 수집 중…' : `📰 HN 언급 ${fmt(g.mentions_hn)}회`}<span class="rank-sub"> ("${g.query}" 검색 기준)</span></div>
      </div>
      <button class="vote-btn ${voted.has(g.id) ? 'voted' : ''}" data-id="${g.id}" ${voted.has(g.id) ? 'disabled' : ''}>
        👍 ${fmt(g.votes)}
      </button>
    </div>`).join('');
}

document.getElementById('gear-list').addEventListener('click', async (e) => {
  const btn = e.target.closest('.vote-btn');
  if (!btn || voted.has(Number(btn.dataset.id))) return;
  const d = await api(`/gear/${btn.dataset.id}/vote`, { method: 'POST' });
  voted.add(d.id);
  localStorage.setItem(votedKey, JSON.stringify([...voted]));
  loadGear();
});

/* ---------- 초기 로드 ---------- */
const loaders = {
  jobs: loadJobs,
  tech: loadTech,
  exp: loadExp,
  world: () => loadWorld(),
  submit: loadRecent,
  gear: loadGear,
  me: () => {},
};
loadJobs();
