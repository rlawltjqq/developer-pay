# 💸 DevPay — 개발자 연봉을 한눈에

직군별·**기술스택별**·연차별·국가별 개발자 연봉 랭킹과 개발자 장비(키보드/마우스) 인기 순위를 보여주는 웹사이트.
Vercel 서버리스 함수 + Vercel KV로 동작하며, 웹과 모바일 앱이 동일한 `/api/v1` REST API를 사용합니다.

## 데이터는 전부 실제 데이터

| 영역 | 출처 | 비고 |
|---|---|---|
| 직무별 연봉 | [점핏 2025 개발자 연봉 리포트](https://jumpit.saramin.co.kr/report/2025/salary) | 점핏·사람인 이직자 1만여 명 데이터. 보도로 교차확인 |
| 기술스택·언어별 연봉 | 점핏 2025 리포트 | C++ 5,748 / Keras 5,623 … 실제 수치 |
| 연차별 연봉 | 그룹바이·링커리어 2025 | 앵커(신입 3,243·6년 5,139·10년 6,214)는 실제값, 사이 구간은 보간(응답에 `approx` 표기) |
| 국가별 중앙값 | [Stack Overflow Developer Survey 2025](https://survey.stackoverflow.co/2025/work/) | USD 중앙값 |
| 장비 인기도 | [Hacker News(Algolia) API](https://hn.algolia.com/api) | 제품별 언급 글 수를 **실시간 집계** + 사용자 투표 |

사용자가 연봉을 제출하면 해당 직무·연차 평균에 가중 합산되어 랭킹에 즉시 반영됩니다.

## 실행 (로컬)

```bash
npm install
npm start          # → http://localhost:3000  (KV 없으면 인메모리로 동작)
```

KV 환경변수(`KV_REST_API_URL`/`KV_REST_API_TOKEN`)가 있으면 자동으로 Vercel KV를 사용하고,
없으면 인메모리 저장소로 폴백합니다(제출/투표가 프로세스 종료 시 사라짐 — 로컬 개발용).

## 기능

| 탭 | 설명 |
|---|---|
| 🏆 직군 랭킹 | 직무별 평균 연봉. 행 클릭 시 **주요 기술 스택**(임베디드 → C/C++/RTOS)과 **많이 쓰는 장비**(오실로스코프·JTAG 디버거 등) 표시 |
| 💻 기술스택 | 언어·프레임워크별 평균 연봉 (C++, Python, TensorFlow …) |
| 📈 연차별 | 신입~10년차+ 평균 연봉 곡선 |
| 📊 연봉 분포 | 직무·기술스택 평균 + 사용자 제출을 합친 히스토그램, 내 연봉 위치 표시 |
| 🌍 국가 비교 | 국가별 중앙값 + "내 연봉은 어느 나라 수준?" 매칭 |
| 🎯 내 연봉 위치 | 직군·연차 기준 상위 몇 %인지 게이지 + 시급/분급 환산. **결과를 이미지 카드(PNG)로 만들어 저장·공유** (클라이언트 SVG→PNG, 의존성 없음) |
| 💰 실수령액 | 세전 연봉 → 4대보험·소득세 공제 → 월 실수령액 (2025 요율) |
| ✍️ 연봉 입력 | 익명 제출 → 랭킹 즉시 반영 |
| ⌨️ 장비 랭킹 | HN 언급량 + 투표 기반 키보드·마우스 순위 |

## REST API (v1) — 앱 연동용

성공 `{ "ok": true, "data": ... }` / 실패 `{ "ok": false, "error": "메시지" }`. CORS 허용.

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/v1/meta` | 출처·환율·저장소 모드 |
| GET | `/api/v1/jobs` | 직무별 연봉 + `tech`·`gear` 배열 |
| GET | `/api/v1/tech` | 기술스택·언어별 연봉 |
| GET | `/api/v1/experience` | 연차별 평균 (`approx` 포함) |
| GET | `/api/v1/distribution?salary=` | 연봉 분포 히스토그램(버킷) + 내 위치 |
| GET | `/api/v1/countries?salary=5000` | 국가별 중앙값 + 내 위치 매칭 |
| POST | `/api/v1/salaries` | 연봉 제출 — `{ "job_id": 11, "years": 3, "salary": 5200 }` |
| GET | `/api/v1/salaries/recent` | 최근 제출 20건 |
| GET | `/api/v1/percentile?salary=&job_id=&years=` | 백분위 + 시급/분급 |
| GET | `/api/v1/take-home?salary=&dependents=&nontax=` | 연봉 실수령액(세후) — 4대보험·소득세 공제 내역 |
| GET | `/api/v1/gear?type=keyboard\|mouse` | 장비 랭킹 (HN 언급 + 투표) |
| POST | `/api/v1/gear/:id/vote` | 장비 투표 |
| GET | `/api/v1/gear/refresh` | HN 언급량 재수집 (Vercel Cron이 매일 호출) |

## 구조

```
api/v1/[...slug].js   # Vercel 서버리스 함수 (catch-all) — lib/handler 사용
server.js             # 로컬 개발 서버 — 같은 lib/handler 사용
lib/data.js           # 실제 참조 데이터 (직무·기술스택·국가·장비 + 출처)
lib/store.js          # 저장소 추상화 (Vercel KV ↔ 인메모리 폴백)
lib/handler.js        # /api/v1 라우팅 + 집계·백분위·HN 수집 로직
lib/gear-popularity.json  # 장비 HN 언급량 베이스라인 (빌드 시 갱신)
scripts/fetch-popularity.mjs  # 빌드타임 HN 수집
public/               # 프론트엔드 (정적, API만 소비)
vercel.json           # 함수·정적·Cron 설정
```

## 배포 (Vercel)

1. 이 저장소를 Vercel 프로젝트로 임포트 (또는 `vercel`).
2. **Storage → KV(Upstash) 생성 후 프로젝트에 연결** → `KV_REST_API_URL`/`KV_REST_API_TOKEN` 자동 주입.
3. 배포. KV 연결 전에도 실제 참조 데이터(연봉·기술·국가·장비)는 정상 표시되며, KV 연결 후 제출·투표가 공유·영속됩니다.
4. `vercel.json`의 Cron이 매일 03:00(UTC) HN 언급량을 갱신합니다.

### 백분위 계산

연봉 분포를 로그정규(σ=0.35)로 가정하고, 선택한 직무 평균과 연차 평균의 기하평균을 중앙값으로 사용해 표준정규 CDF로 백분위를 근사합니다.
