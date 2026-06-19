// 웹과 동일한 /api/v1 REST API를 소비한다. 배포 환경이 바뀌면 BASE_URL만 교체하면 된다.
export const BASE_URL = 'https://developer-pay.vercel.app/api/v1';

async function request(path, options) {
  const res = await fetch(BASE_URL + path, options);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || '요청 실패');
  return json.data;
}

export const apiGet = (path) => request(path);
export const apiPost = (path, body) =>
  request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });

// 천 단위 콤마 (Intl 미지원 환경 대비 수동 포맷)
export const fmt = (n) => String(Math.round(Number(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
