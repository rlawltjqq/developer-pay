'use strict';
/**
 * 연봉 → 월 실수령액(세후) 추정. 2025년 기준 실제 요율·세율 사용.
 *
 * 4대보험 (근로자 본인부담, 월 보수월액 기준):
 *   국민연금 4.5% (기준소득월액 하한 39만 / 상한 617만)
 *   건강보험 3.545% (요율 7.09%의 1/2)
 *   장기요양 = 건강보험료 × 12.95%
 *   고용보험 0.9%
 * 소득세: 연말정산 방식(근로소득공제 → 인적·연금·보험료 공제 → 누진세율 → 근로소득세액공제) 추정.
 *   지방소득세 = 소득세 × 10%.
 *
 * ⚠ 부양가족·각종 세액공제(연금저축·의료비·기부금 등)는 단순화했으므로 실제와 차이날 수 있다.
 * 월 원천징수(간이세액)와도 다소 다르며, 연말정산 결정세액 기준의 근사값이다.
 */

const RATES = {
  pension: 0.045, pensionMin: 390000, pensionMax: 6170000,
  health: 0.03545, ltc: 0.1295, employment: 0.009,
};
const NON_TAX_DEFAULT = 200000; // 월 비과세(식대 등) 기본값

// 근로소득공제 (총급여 = 비과세 제외 연 급여)
function workIncomeDeduction(g) {
  if (g <= 5_000_000) return g * 0.7;
  if (g <= 15_000_000) return 3_500_000 + (g - 5_000_000) * 0.4;
  if (g <= 45_000_000) return 7_500_000 + (g - 15_000_000) * 0.15;
  if (g <= 100_000_000) return 12_000_000 + (g - 45_000_000) * 0.05;
  return 14_750_000 + (g - 100_000_000) * 0.02;
}

// 종합소득세 누진세율: [과세표준 상한, 세율, 누진공제]
const BRACKETS = [
  [14_000_000, 0.06, 0],
  [50_000_000, 0.15, 1_260_000],
  [88_000_000, 0.24, 5_760_000],
  [150_000_000, 0.35, 15_440_000],
  [300_000_000, 0.38, 19_940_000],
  [500_000_000, 0.40, 25_940_000],
  [1_000_000_000, 0.42, 35_940_000],
  [Infinity, 0.45, 65_940_000],
];
function progressiveTax(base) {
  for (const [cap, rate, ded] of BRACKETS) if (base <= cap) return Math.max(0, base * rate - ded);
  return 0;
}

// 근로소득세액공제 (산출세액 기준, 총급여별 한도 점감)
function earnedTaxCredit(calcTax, g) {
  const credit = calcTax <= 1_300_000 ? calcTax * 0.55 : 715_000 + (calcTax - 1_300_000) * 0.3;
  let limit;
  if (g <= 33_000_000) limit = 740_000;
  else if (g <= 70_000_000) limit = Math.max(660_000, 740_000 - (g - 33_000_000) * 0.008);
  else if (g <= 120_000_000) limit = Math.max(500_000, 660_000 - (g - 70_000_000) * 0.5);
  else limit = Math.max(200_000, 500_000 - (g - 120_000_000) * 0.5);
  return Math.min(credit, limit);
}

const r = Math.round;

function calcTakeHome(annualSalaryManwon, dependents = 0, monthlyNonTax = NON_TAX_DEFAULT) {
  const annual = annualSalaryManwon * 10000;
  const monthlyGross = annual / 12;
  const taxableMonthly = Math.max(0, monthlyGross - monthlyNonTax); // 보수월액(과세)

  // 4대보험 (월)
  const pensionBase = Math.min(Math.max(taxableMonthly, RATES.pensionMin), RATES.pensionMax);
  const pension = r(pensionBase * RATES.pension);
  const health = r(taxableMonthly * RATES.health);
  const ltc = r(health * RATES.ltc);
  const employment = r(taxableMonthly * RATES.employment);
  const insuranceMonthly = pension + health + ltc + employment;

  // 소득세 (연 기준 → 월 환산)
  const grossTaxableAnnual = taxableMonthly * 12;
  const wid = workIncomeDeduction(grossTaxableAnnual);
  const personalDeduction = 1_500_000 * (1 + dependents); // 본인 + 부양가족
  const insuranceAnnual = insuranceMonthly * 12;
  const taxBase = Math.max(0, grossTaxableAnnual - wid - personalDeduction - insuranceAnnual);
  const calcTax = progressiveTax(taxBase);
  const credit = earnedTaxCredit(calcTax, grossTaxableAnnual);
  const incomeTaxAnnual = Math.max(0, calcTax - credit);
  const localTaxAnnual = incomeTaxAnnual * 0.1;
  const incomeTax = r(incomeTaxAnnual / 12);
  const localTax = r(localTaxAnnual / 12);

  const totalDeduction = insuranceMonthly + incomeTax + localTax;
  const netMonthly = r(monthlyGross - totalDeduction);
  const netAnnual = netMonthly * 12;

  return {
    annual_salary_manwon: annualSalaryManwon,
    dependents, monthly_non_tax: monthlyNonTax,
    monthly_gross: r(monthlyGross),
    net_monthly: netMonthly,
    net_annual: netAnnual,
    net_annual_manwon: Math.round(netAnnual / 10000),
    total_deduction_monthly: totalDeduction,
    deduction_rate: Math.round((totalDeduction / monthlyGross) * 1000) / 10,
    breakdown: [
      { label: '국민연금', amount: pension, rate: '4.5%' },
      { label: '건강보험', amount: health, rate: '3.545%' },
      { label: '장기요양', amount: ltc, rate: '건강×12.95%' },
      { label: '고용보험', amount: employment, rate: '0.9%' },
      { label: '소득세', amount: incomeTax, rate: '누진' },
      { label: '지방소득세', amount: localTax, rate: '소득세×10%' },
    ],
    note: '2025년 요율 기준 추정. 부양가족·세액공제 항목에 따라 실제 연말정산 결과와 차이날 수 있습니다.',
  };
}

module.exports = { calcTakeHome };
