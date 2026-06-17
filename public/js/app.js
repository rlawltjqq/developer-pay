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

/* ---------- 스택 ROI ---------- */
let roiStacksLoaded = false;
async function loadRoi() {
  if (roiStacksLoaded) return;
  const rows = await api('/tech');
  const opts = rows.map((t) => `<option value="${t.name}">${t.name} (${fmt(t.salary)}만)</option>`).join('');
  const from = document.getElementById('roi-from');
  const to = document.getElementById('roi-to');
  from.innerHTML = opts;
  to.innerHTML = opts;
  to.selectedIndex = Math.min(1, rows.length - 1); // 기본값을 서로 다르게
  roiStacksLoaded = true;
}
document.getElementById('roi-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const from = document.getElementById('roi-from').value;
  const to = document.getElementById('roi-to').value;
  try {
    const d = await api(`/stack-roi?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
    document.getElementById('roi-result').hidden = false;
    const sign = d.diff_manwon > 0 ? '+' : '';
    const el = document.getElementById('roi-diff');
    el.textContent = `${sign}${fmt(d.diff_manwon)}만원`;
    el.style.color = d.diff_manwon > 0 ? 'var(--accent-2)' : d.diff_manwon < 0 ? 'var(--danger)' : 'var(--text)';
    document.getElementById('roi-msg').textContent = `${sign}${d.diff_percent}%`;
    document.getElementById('roi-from-label').textContent = `${d.from.name} (${d.from.field})`;
    document.getElementById('roi-from-val').textContent = fmt(d.from.salary) + '만원';
    document.getElementById('roi-to-label').textContent = `${d.to.name} (${d.to.field})`;
    document.getElementById('roi-to-val').textContent = fmt(d.to.salary) + '만원';
    document.getElementById('roi-monthly').textContent = `${sign}${d.monthly_diff_manwon}만원`;
  } catch (err) { alert(err.message); }
});

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

/* ---------- 연봉 분포 ---------- */
let distChart;
async function loadDist(salary) {
  const q = salary ? `?salary=${salary}` : '';
  const d = await api('/distribution' + q);
  const myBucket = d.me ? d.me.bucket : null;
  const labels = d.buckets.map((b) => `${(b.from / 1000).toFixed(1)}~${((b.to + 1) / 1000).toFixed(1)}천`);
  const colors = d.buckets.map((b) => (b.from === myBucket ? '#e3b341' : '#58a6ff'));
  document.getElementById('dist-meta').textContent =
    `총 ${fmt(d.total)}개 데이터 (기준 평균 ${d.base_count} + 사용자 제출 ${d.submission_count}) · ${d.note}`;
  if (d.me) {
    const box = document.getElementById('dist-result');
    box.hidden = false; box.className = 'callout ok';
    box.innerHTML = `내 연봉 <b>${fmt(d.me.salary)}만원</b>은 이 분포에서 <b>상위 ${(100 - d.me.percentile).toFixed(1)}%</b> (하위 ${d.me.percentile}%) 위치입니다.`;
  }
  const ctx = document.getElementById('dist-chart');
  distChart?.destroy();
  distChart = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ label: '데이터 수', data: d.buckets.map((b) => b.count), backgroundColor: colors }] },
    options: {
      maintainAspectRatio: false,
      plugins: { legend: { display: false },
        tooltip: { callbacks: { title: (i) => labels[i[0].dataIndex] + '만원' } } },
      scales: {
        x: { ticks: { color: '#8b949e', maxRotation: 60, minRotation: 45 }, grid: { display: false } },
        y: { ticks: { color: '#8b949e', precision: 0 }, grid: { color: '#2d333b55' } },
      },
    },
  });
}
document.getElementById('dist-btn').addEventListener('click', () => {
  const v = Number(document.getElementById('dist-salary').value);
  loadDist(v > 0 ? v : undefined);
});

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
    // 공유 카드용 컨텍스트 저장 + 버튼 초기화
    const jobSel = document.getElementById('pct-job');
    lastPct = {
      ...d,
      job: jobId ? jobSel.options[jobSel.selectedIndex].text.replace(/^[^\s]+\s/, '') : '전체',
      years: years === '' ? null : Number(years),
    };
    resetShareUI();
  } catch (err) { alert(err.message); }
});

/* ---------- 결과 공유 카드 (클라이언트에서 SVG→PNG 생성) ---------- */
let lastPct = null;
let shareBlobUrl = null;
const SHARE_W = 1200, SHARE_H = 630;

function resetShareUI() {
  for (const id of ['share-native-btn', 'share-dl-btn', 'share-copy-btn', 'share-preview']) {
    document.getElementById(id).hidden = true;
  }
  document.getElementById('share-card-btn').hidden = false;
}

function buildCardSVG(d) {
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const sub = `${esc(d.job)}${d.years !== null ? ` · ${d.years === 0 ? '신입' : d.years + '년차'}` : ''} · 연봉 ${fmt(d.salary_manwon)}만원`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SHARE_W}" height="${SHARE_H}" viewBox="0 0 ${SHARE_W} ${SHARE_H}">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#0d1117"/><stop offset="1" stop-color="#161b22"/></linearGradient></defs>
  <rect width="${SHARE_W}" height="${SHARE_H}" fill="url(#bg)"/>
  <rect x="40" y="40" width="${SHARE_W - 80}" height="${SHARE_H - 80}" rx="28" fill="#161b22" stroke="#2d333b" stroke-width="2"/>
  <text x="90" y="135" font-family="sans-serif" font-size="44" font-weight="800" fill="#58a6ff">💸 DevPay</text>
  <text x="90" y="185" font-family="sans-serif" font-size="28" fill="#8b949e">개발자 연봉 위치</text>
  <text x="600" y="345" text-anchor="middle" font-family="sans-serif" font-size="130" font-weight="800" fill="#e3b341">상위 ${d.top_percent}%</text>
  <text x="600" y="415" text-anchor="middle" font-family="sans-serif" font-size="36" fill="#e6edf3">${sub}</text>
  <text x="600" y="475" text-anchor="middle" font-family="sans-serif" font-size="30" fill="#3fb950">${esc(d.message)}</text>
  <text x="600" y="545" text-anchor="middle" font-family="sans-serif" font-size="26" fill="#8b949e">시급 ${fmt(d.per_hour_krw)}원 · 기준 중앙값 ${fmt(d.baseline_median)}만원</text>
  <text x="${SHARE_W - 90}" y="565" text-anchor="end" font-family="sans-serif" font-size="24" fill="#58a6ff">developer-pay.vercel.app</text>
</svg>`;
}

function svgToPngBlob(svg) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = SHARE_W; canvas.height = SHARE_H;
      canvas.getContext('2d').drawImage(img, 0, 0);
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG 생성 실패'))), 'image/png');
    };
    img.onerror = () => reject(new Error('카드 렌더 실패'));
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
}

document.getElementById('share-card-btn').addEventListener('click', async () => {
  if (!lastPct) return;
  try {
    const blob = await svgToPngBlob(buildCardSVG(lastPct));
    if (shareBlobUrl) URL.revokeObjectURL(shareBlobUrl);
    shareBlobUrl = URL.createObjectURL(blob);
    const preview = document.getElementById('share-preview');
    preview.src = shareBlobUrl; preview.hidden = false;
    document.getElementById('share-card-btn').hidden = true;
    document.getElementById('share-dl-btn').hidden = false;
    document.getElementById('share-copy-btn').hidden = false;
    // 파일 공유 지원 시 네이티브 공유 버튼 노출
    const file = new File([blob], 'devpay-result.png', { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      const btn = document.getElementById('share-native-btn');
      btn.hidden = false;
      btn.onclick = () => navigator.share({
        files: [file], title: 'DevPay 내 연봉 위치',
        text: `나는 개발자 연봉 상위 ${lastPct.top_percent}%! 내 위치도 확인해보세요`,
      }).catch(() => {});
    }
  } catch (err) { alert(err.message); }
});

document.getElementById('share-dl-btn').addEventListener('click', () => {
  if (!shareBlobUrl) return;
  const a = document.createElement('a');
  a.href = shareBlobUrl; a.download = 'devpay-result.png'; a.click();
});

document.getElementById('share-copy-btn').addEventListener('click', async () => {
  const btn = document.getElementById('share-copy-btn');
  try {
    await navigator.clipboard.writeText(location.origin);
    btn.textContent = '✓ 복사됨';
    setTimeout(() => (btn.textContent = '📋 링크 복사'), 1500);
  } catch { alert('링크 복사에 실패했어요: ' + location.origin); }
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
  roi: loadRoi,
  exp: loadExp,
  dist: () => loadDist(),
  world: () => loadWorld(),
  submit: loadRecent,
  gear: loadGear,
  me: () => {},
};
loadJobs();
