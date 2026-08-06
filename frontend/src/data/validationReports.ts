/** 검증 리포트 mock — 검증 결과 기반 리포트 생성·발행. */

export interface ValidationReport {
  id: string
  title: string
  status: '발행' | '임시저장'
  engine: string
  period: string
  createdAt: string
  createdBy: string
  runs: number
  errors: number
  warnings: number
  passRate: number
  types: Array<{ label: string; count: number }>
}

export const validationReports: Array<ValidationReport> = [
  {
    id: 'RPT-2026-0805',
    title: '2026년 8월 5일 일간 검증 리포트',
    status: '발행',
    engine: 'NULL 값 검증 엔진',
    period: '2026.08.05',
    createdAt: '2026.08.05 06:20',
    createdBy: '시스템(자동)',
    runs: 1,
    errors: 17,
    warnings: 34,
    passRate: 99,
    types: [
      { label: 'NULL_VALUE', count: 17 },
      { label: 'EMPTY_VALUE', count: 34 },
    ],
  },
  {
    id: 'RPT-2026-W31',
    title: '2026년 7월 5주차 주간 종합 리포트 (7/28~8/3)',
    status: '발행',
    engine: '전체',
    period: '2026.07.28 ~ 2026.08.03',
    createdAt: '2026.08.04 10:00',
    createdBy: '김현대',
    runs: 6,
    errors: 45,
    warnings: 44,
    passRate: 99,
    types: [
      { label: 'NULL_VALUE', count: 30 },
      { label: 'FORMAT_ERROR', count: 11 },
      { label: 'RANGE_ERROR', count: 4 },
    ],
  },
  {
    id: 'RPT-2026-0803',
    title: '수동 검증 임시 리포트 (8/3)',
    status: '임시저장',
    engine: 'NULL 값 검증 엔진',
    period: '2026.08.03',
    createdAt: '2026.08.03 15:00',
    createdBy: '김현대',
    runs: 1,
    errors: 8,
    warnings: 4,
    passRate: 99,
    types: [{ label: 'NULL_VALUE', count: 8 }],
  },
]
