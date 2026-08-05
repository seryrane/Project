import type { TrendPoint } from '#/components/portal/charts'

/** ICDAP KPI 시안용 결정적 mock — 2026년 1~8월 (8월은 진행 중 = 예상) */

export const kpiMonthlyActual: Array<TrendPoint> = [
  { date: '1월', value: 84 },
  { date: '2월', value: 87 },
  { date: '3월', value: 90 },
  { date: '4월', value: 88 },
  { date: '5월', value: 93 },
  { date: '6월', value: 95 },
  { date: '7월', value: 97 },
  { date: '8월', value: 92 },
]

export const kpiMonthlyTarget: Array<TrendPoint> = kpiMonthlyActual.map((d, i) => ({
  date: d.date,
  value: 85 + i * 1.5,
}))

// 조직별 KPI 달성률 (%) — 100 이 목표선
export const orgAttainment = [
  { name: '인포테인먼트개발센터', value: 112, prev: 104 },
  { name: '차량SW플랫폼실', value: 105, prev: 107 },
  { name: 'IVI서비스팀', value: 98, prev: 91 },
  { name: '데이터플랫폼팀', value: 94, prev: 96 },
  { name: '커넥티비티팀', value: 87, prev: 82 },
  { name: '검증기술팀', value: 81, prev: 88 },
]

// 미달 KPI — 0 을 평온함으로 읽지 않는다: 미달은 목록으로 이름을 부른다 (규약 §10)
export const underperforming = [
  { name: 'IVI 기능 사용률', org: '커넥티비티팀', attainment: 78, owner: '박선우' },
  { name: '검증 자동화 커버리지', org: '검증기술팀', attainment: 81, owner: '한지민' },
  { name: '다국어 적용률', org: 'IVI서비스팀', attainment: 88, owner: '오세훈' },
  { name: '데이터 정합성 지표', org: '데이터플랫폼팀', attainment: 94, owner: '류현진' },
]

export const analyticsSparks = {
  attainment: [86, 87, 89, 88, 90, 91, 93, 92, 94, 93, 95, 96, 95, 92],
  mau: [182, 185, 190, 188, 195, 198, 204, 201, 206, 210, 208, 212, 214, 214],
}
