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

/* 운영 통계 — 주차별 승인 처리 (요청/승인/반려), 계열 색은 CVD 검증 fill 토큰 */
export const weeklyApprovals = {
  요청: [
    { date: '7/1주', value: 9 },
    { date: '7/2주', value: 12 },
    { date: '7/3주', value: 8 },
    { date: '7/4주', value: 14 },
    { date: '8/1주', value: 11 },
  ],
  승인: [
    { date: '7/1주', value: 7 },
    { date: '7/2주', value: 10 },
    { date: '7/3주', value: 7 },
    { date: '7/4주', value: 12 },
    { date: '8/1주', value: 8 },
  ],
  반려: [
    { date: '7/1주', value: 1 },
    { date: '7/2주', value: 2 },
    { date: '7/3주', value: 1 },
    { date: '7/4주', value: 2 },
    { date: '8/1주', value: 1 },
  ],
}

/* 월별 배포 이력 (운영/스테이징/롤백) */
export const monthlyDeploys = {
  운영: [
    { date: '4월', value: 2 },
    { date: '5월', value: 3 },
    { date: '6월', value: 2 },
    { date: '7월', value: 4 },
    { date: '8월', value: 1 },
  ],
  스테이징: [
    { date: '4월', value: 5 },
    { date: '5월', value: 7 },
    { date: '6월', value: 4 },
    { date: '7월', value: 9 },
    { date: '8월', value: 3 },
  ],
  롤백: [
    { date: '4월', value: 0 },
    { date: '5월', value: 1 },
    { date: '6월', value: 0 },
    { date: '7월', value: 1 },
    { date: '8월', value: 0 },
  ],
}

/* 오늘 시스템 성능 — 응답시간 ms (API/DB/파일 스토리지) */
const hourly = (base: number, bump: number) =>
  ['08', '09', '10', '11', '12', '13', '14', '15'].map((h, i) => ({
    date: `${h}시`,
    value: Math.round(base + Math.sin((i / 7) * Math.PI) * bump),
  }))

export const todayPerformance = {
  api: hourly(150, 60),
  db: hourly(210, 160),
  storage: hourly(18, 6),
}

/* 요일별 승인 처리 시간 분포 (월~금 × 9~17시) — 결정적 mock */
export const approvalTimeHeat = {
  rows: ['월', '화', '수', '목', '금'],
  cols: ['9시', '10시', '11시', '12시', '13시', '14시', '15시', '16시', '17시'],
  values: [
    [6, 4, 7, 2, 3, 5, 6, 4, 8],
    [5, 6, 4, 1, 4, 6, 5, 7, 9],
    [2, 5, 3, 1, 3, 4, 6, 8, 10],
    [6, 5, 9, 2, 4, 5, 8, 9, 5],
    [4, 5, 6, 2, 3, 8, 9, 6, 3],
  ],
}

/* 사양서 품질 지표 — 레이더 대신 막대(축이 6개면 레이더는 읽기 어렵다) */
export const qualityMetrics = [
  { label: '완성도', value: 92 },
  { label: '승인률', value: 88 },
  { label: '배포주기 준수', value: 81 },
  { label: '버전관리', value: 95 },
  { label: '협업지수', value: 77 },
  { label: '품질점수', value: 86 },
]

export const analyticsSparks = {
  attainment: [86, 87, 89, 88, 90, 91, 93, 92, 94, 93, 95, 96, 95, 92],
  mau: [182, 185, 190, 188, 195, 198, 204, 201, 206, 210, 208, 212, 214, 214],
}
