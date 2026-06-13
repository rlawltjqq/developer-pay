'use strict';
/**
 * 실제 공개 데이터 (참조용, 읽기 전용).
 * 모든 수치는 아래 출처에서 보도된 실제 값이다. 보간/추정한 값은 그 사실을 주석에 명시한다.
 *
 * 출처:
 *  - 점핏(사람인) 2025 개발자 연봉 리포트 — 2025년 점핏·사람인으로 이직한 개발자 1만여 명 데이터
 *    https://jumpit.saramin.co.kr/report/2025/salary  (전자신문/ZDNet 보도로 수치 교차확인)
 *  - 그룹바이/링커리어 2025 연차별 평균연봉
 *  - Stack Overflow Developer Survey 2025 (work/salary)
 *  - Hacker News(Algolia) 실시간 언급량 — 장비 인기도 (lib/store + scripts/fetch-popularity)
 */

// 직무별 평균 연봉 (만원/년). 점핏 2025 리포트 직무 카테고리 — 보도로 확인된 실제 수치.
const JOBS = [
  { slug: 'blockchain', name: '블록체인',            icon: '⛓️', salary: 6225,
    tech: ['Solidity', 'Rust', 'Go', 'Ethereum/EVM', 'Web3.js'],
    gear: ['하드웨어 월렛(Ledger)', '고성능 워크스테이션', '멀티 모니터'] },
  { slug: 'dev-pm', name: '개발 PM',                 icon: '📋', salary: 5993,
    tech: ['Jira', 'Notion', 'Figma', 'SQL', '로드맵/간트 도구'],
    gear: ['듀얼 모니터', '노이즈캔슬링 헤드셋', '웹캠'] },
  { slug: 'embedded', name: 'HW/임베디드',            icon: '🔌', salary: 5255,
    tech: ['C', 'C++', 'RTOS(FreeRTOS)', 'ARM Cortex', 'UART/I2C/SPI'],
    gear: ['오실로스코프', '로직 애널라이저', 'JTAG/ST-Link 디버거', '납땜 스테이션'] },
  { slug: 'dba', name: 'DBA',                        icon: '🗄️', salary: 5201,
    tech: ['SQL', 'Oracle', 'PostgreSQL', 'MySQL', '쿼리 튜닝'],
    gear: ['울트라와이드 모니터', '무접점 키보드'] },
  { slug: 'ai-ml', name: 'AI/머신러닝',               icon: '🤖', salary: 5183,
    tech: ['Python', 'PyTorch', 'TensorFlow', 'Keras', 'CUDA'],
    gear: ['GPU 워크스테이션(RTX)', '클라우드 GPU 인스턴스', '대용량 RAM'] },
  { slug: 'sw-solution', name: 'SW/솔루션',           icon: '🧩', salary: 5133,
    tech: ['Java', 'C#', '.NET', 'Spring', 'SQL'],
    gear: ['듀얼 모니터', '기계식 키보드'] },
  { slug: 'sw-dev', name: '소프트웨어 개발',          icon: '💾', salary: 5118,
    tech: ['Java', 'Python', 'JavaScript', 'C++', 'Git'],
    gear: ['듀얼 모니터', '무접점/기계식 키보드', '버티컬 마우스'] },
  { slug: 'vr-ar-3d', name: 'VR/AR/3D',              icon: '🥽', salary: 5116,
    tech: ['Unity', 'Unreal Engine', 'C++', 'C#', 'Shader/HLSL'],
    gear: ['VR 헤드셋', '고성능 GPU 데스크탑', '모션 트래커'] },
  { slug: 'devops', name: 'DevOps/시스템 엔지니어',   icon: '⚙️', salary: 5099,
    tech: ['Kubernetes', 'Docker', 'Terraform', 'AWS/GCP', 'Linux'],
    gear: ['멀티 모니터', 'HHKB/무접점 키보드(터미널)', '홈랩 서버'] },
  { slug: 'hw-dev', name: '하드웨어 개발',            icon: '🔧', salary: 4976,
    tech: ['Verilog/VHDL', 'PCB 설계', 'C', '회로 이론'],
    gear: ['오실로스코프', '멀티미터', '인두기', 'EDA 워크스테이션'] },
  { slug: 'ios', name: 'iOS',                        icon: '🍎', salary: 4973,
    tech: ['Swift', 'SwiftUI', 'Xcode', 'Objective-C', 'Combine'],
    gear: ['MacBook Pro', 'Magic Trackpad', '테스트용 아이폰/아이패드'] },
];

// 기술스택/언어별 평균 연봉 (만원/년). 점핏 2025 리포트 — 보도로 확인된 실제 수치.
// 사용자의 "기술도(임베디드 C언어 등)" 요청에 대응하는 실측 데이터.
const TECH_STACKS = [
  { name: 'C++',          field: '백엔드/임베디드', salary: 5748 },
  { name: 'Keras',        field: 'AI/머신러닝',     salary: 5623 },
  { name: 'TensorFlow',   field: 'AI/머신러닝',     salary: 5581 },
  { name: 'PHP',          field: '백엔드',          salary: 5339 },
  { name: 'PyTorch',      field: 'AI/머신러닝',     salary: 5175 },
  { name: 'Python',       field: '백엔드/AI',       salary: 5078 },
  { name: 'Node.js',      field: '백엔드',          salary: 5070 },
  { name: 'Java',         field: '백엔드',          salary: 5005 },
  { name: 'Django',       field: '백엔드',          salary: 4790 },
  { name: 'Spring Boot',  field: '백엔드',          salary: 4739 },
];

// 연차별 평균 연봉 (만원/년).
// 앵커(★)는 그룹바이/링커리어 2025 실제 수치: 신입 3243, 6년 5139, 10년 6214.
// 그 사이 값은 앵커 기반 선형 보간(approx:true)이다.
const EXPERIENCE = [
  { years: 0,  salary: 3243, approx: false }, // ★ 신입
  { years: 1,  salary: 3559, approx: true },
  { years: 2,  salary: 3875, approx: true },
  { years: 3,  salary: 4191, approx: true },
  { years: 4,  salary: 4507, approx: true },
  { years: 5,  salary: 4823, approx: true },
  { years: 6,  salary: 5139, approx: false }, // ★ 6년차
  { years: 7,  salary: 5408, approx: true },
  { years: 8,  salary: 5677, approx: true },
  { years: 9,  salary: 5946, approx: true },
  { years: 10, salary: 6214, approx: false }, // ★ 10년차+
];

// 국가별 개발자 연봉 중앙값 (USD/년). Stack Overflow Developer Survey 2025 및 공개 비교 자료 기준.
const COUNTRIES = [
  { name: '미국',       flag: '🇺🇸', median_usd: 133080 },
  { name: '스위스',     flag: '🇨🇭', median_usd: 130000 },
  { name: '이스라엘',   flag: '🇮🇱', median_usd: 115000 },
  { name: '덴마크',     flag: '🇩🇰', median_usd: 100000 },
  { name: '캐나다',     flag: '🇨🇦', median_usd: 95000 },
  { name: '호주',       flag: '🇦🇺', median_usd: 92000 },
  { name: '영국',       flag: '🇬🇧', median_usd: 88000 },
  { name: '독일',       flag: '🇩🇪', median_usd: 80000 },
  { name: '네덜란드',   flag: '🇳🇱', median_usd: 78000 },
  { name: '싱가포르',   flag: '🇸🇬', median_usd: 75000 },
  { name: '일본',       flag: '🇯🇵', median_usd: 62000 },
  { name: '대한민국',   flag: '🇰🇷', median_usd: 38000 },
];

// 개발자 장비 카탈로그. 인기도 점수는 votes(사용자 투표) + HN 언급량(query로 실시간 집계).
const GEAR_CATALOG = [
  { id: 1,  type: 'keyboard', name: 'HHKB Professional Hybrid Type-S', brand: 'PFU',       detail: '무접점(토프레) · 60%',            price: 40, query: 'HHKB' },
  { id: 2,  type: 'keyboard', name: 'Realforce R3',                    brand: 'Topre',     detail: '무접점 · 풀배열/텐키리스',        price: 35, query: 'Realforce' },
  { id: 3,  type: 'keyboard', name: 'MX Keys S',                       brand: 'Logitech',  detail: '팬터그래프 · 무선 멀티페어링',    price: 15, query: 'MX Keys' },
  { id: 4,  type: 'keyboard', name: 'Keychron K8 Pro',                 brand: 'Keychron',  detail: '기계식 · 핫스왑 · QMK/VIA',       price: 13, query: 'Keychron K8' },
  { id: 5,  type: 'keyboard', name: 'Leopold FC660C',                  brand: 'Leopold',   detail: '무접점 · 66키 컴팩트',            price: 28, query: 'FC660C' },
  { id: 6,  type: 'keyboard', name: 'Magic Keyboard',                  brand: 'Apple',     detail: '시저 · 맥 생태계 연동',           price: 19, query: 'Magic Keyboard' },
  { id: 7,  type: 'keyboard', name: 'NuPhy Air75 V2',                  brand: 'NuPhy',     detail: '로우프로파일 기계식 · 무선',      price: 18, query: 'NuPhy' },
  { id: 8,  type: 'keyboard', name: 'GK898B',                          brand: '한성컴퓨터', detail: '무접점 · 블루투스 · 가성비',      price: 13, query: 'GK898B' },
  { id: 9,  type: 'keyboard', name: 'Keychron Q1 Pro',                 brand: 'Keychron',  detail: '커스텀 기계식 · 알루미늄',        price: 25, query: 'Keychron Q1' },
  { id: 10, type: 'keyboard', name: 'VA87M',                           brand: 'Varmilo',   detail: '기계식 · 체리 스위치',            price: 16, query: 'Varmilo' },
  { id: 11, type: 'mouse',    name: 'MX Master 3S',                    brand: 'Logitech',  detail: '무소음 클릭 · 무한 스크롤 휠',    price: 14, query: 'MX Master' },
  { id: 12, type: 'mouse',    name: 'Magic Trackpad',                  brand: 'Apple',     detail: '멀티터치 제스처',                 price: 19, query: 'Magic Trackpad' },
  { id: 13, type: 'mouse',    name: 'MX Anywhere 3S',                  brand: 'Logitech',  detail: '컴팩트 · 휴대용',                 price: 11, query: 'MX Anywhere' },
  { id: 14, type: 'mouse',    name: 'ERGO M575',                       brand: 'Logitech',  detail: '트랙볼 · 손목 부담 절감',         price: 7,  query: 'Logitech M575' },
  { id: 15, type: 'mouse',    name: 'Magic Mouse',                     brand: 'Apple',     detail: '멀티터치 표면',                   price: 11, query: 'Magic Mouse' },
  { id: 16, type: 'mouse',    name: 'MX Vertical',                     brand: 'Logitech',  detail: '버티컬 · 손목 보호',              price: 12, query: 'MX Vertical' },
  { id: 17, type: 'mouse',    name: 'DeathAdder V3',                   brand: 'Razer',     detail: '초경량 · 게이밍 겸용',            price: 9,  query: 'DeathAdder' },
  { id: 18, type: 'mouse',    name: 'G Pro X Superlight 2',            brand: 'Logitech',  detail: '초경량 무선 · 게이밍 겸용',       price: 17, query: 'G Pro X Superlight' },
  { id: 19, type: 'mouse',    name: 'Lift',                            brand: 'Logitech',  detail: '버티컬 · 컴팩트',                 price: 9,  query: 'Logitech Lift' },
  { id: 20, type: 'mouse',    name: 'STORMX GTA40',                    brand: '제닉스',     detail: '게이밍 · 가성비',                 price: 4,  query: 'STORMX' },
];

const SOURCES = [
  { name: '점핏 2025 개발자 연봉 리포트', url: 'https://jumpit.saramin.co.kr/report/2025/salary' },
  { name: '전자신문 — 점핏 2025 연봉 리포트 보도', url: 'https://www.etnews.com/20251031000354' },
  { name: 'ZDNet Korea — 개발자 연봉 서열', url: 'https://zdnet.co.kr/view/?no=20251031165659' },
  { name: 'Stack Overflow Developer Survey 2025', url: 'https://survey.stackoverflow.co/2025/work/' },
  { name: 'Hacker News (Algolia) Search API — 장비 언급량', url: 'https://hn.algolia.com/api' },
];

const USD_KRW = 1380; // 환산용 고정 환율 (만원 ↔ USD)

module.exports = { JOBS, TECH_STACKS, EXPERIENCE, COUNTRIES, GEAR_CATALOG, SOURCES, USD_KRW };
