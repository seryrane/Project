/** 검증 결과 조회 mock — 배치·실시간 검증 실행과 오류 상세. */

export type Severity = '높음' | '중간' | '낮음'
export type RunStatus = '오류' | '재처리 중' | '해결' | '통과'

export interface ErrorSample {
  row: number
  field: string
  value: string
  message: string
}

export interface ValidationRun {
  id: string
  at: string
  mode: '배치' | '실시간'
  specId: string
  specName: string
  rule: string
  errorType: string
  severity: Severity
  total: number
  errors: number
  status: RunStatus
  samples: Array<ErrorSample>
}

export const validationRuns: Array<ValidationRun> = [
  {
    id: 'RUN-20260805-014',
    at: '2026.08.05 06:00',
    mode: '배치',
    specId: 'SP-001',
    specName: 'VN7 엔진 사양서',
    rule: 'R-101 필수값 검사',
    errorType: '필수값 누락',
    severity: '높음',
    total: 128400,
    errors: 342,
    status: '오류',
    samples: [
      { row: 1204, field: '항목코드', value: '(빈 값)', message: '필수 항목이 비어 있습니다' },
      { row: 5817, field: '항목명(한)', value: '(빈 값)', message: '필수 항목이 비어 있습니다' },
      { row: 9033, field: '대분류', value: '(빈 값)', message: '필수 분류 코드가 없습니다' },
    ],
  },
  {
    id: 'RUN-20260805-013',
    at: '2026.08.05 06:00',
    mode: '배치',
    specId: 'SP-002',
    specName: '전기차 배터리 규격서',
    rule: 'R-204 형식 검사',
    errorType: '형식 오류',
    severity: '중간',
    total: 96200,
    errors: 218,
    status: '재처리 중',
    samples: [
      { row: 311, field: '항목코드', value: 'ab-12', message: '형식 불일치 — ^[A-Z]{2}\\d{4}$ 를 만족해야 합니다' },
      { row: 2790, field: '최대길이', value: '-30', message: '음수는 허용되지 않습니다' },
    ],
  },
  {
    id: 'RUN-20260805-012',
    at: '2026.08.05 06:00',
    mode: '배치',
    specId: 'SP-003',
    specName: '자율주행 센서 통합 규격',
    rule: 'R-301 사전 대조',
    errorType: '오탈자',
    severity: '낮음',
    total: 88100,
    errors: 164,
    status: '오류',
    samples: [
      { row: 77, field: '항목명(영)', value: 'Snesor Range', message: '사전 미등록 표기 — Sensor Range 로 추정' },
    ],
  },
  {
    id: 'RUN-20260804-096',
    at: '2026.08.04 21:30',
    mode: '실시간',
    specId: 'SP-002',
    specName: '전기차 배터리 규격서',
    rule: 'R-210 값 범위',
    errorType: '범위 초과',
    severity: '중간',
    total: 5400,
    errors: 97,
    status: '해결',
    samples: [
      { row: 88, field: '최대 충전 전력', value: '512 kW', message: '허용 범위(0~400)를 벗어났습니다' },
    ],
  },
  {
    id: 'RUN-20260804-095',
    at: '2026.08.04 18:00',
    mode: '배치',
    specId: 'SP-004',
    specName: '차체 구조 안전 기준서',
    rule: 'R-110 중복 검사',
    errorType: '중복',
    severity: '낮음',
    total: 40200,
    errors: 41,
    status: '해결',
    samples: [
      { row: 1502, field: '항목코드', value: 'BD0007', message: '동일 코드가 2회 이상 등장합니다' },
    ],
  },
  {
    id: 'RUN-20260804-094',
    at: '2026.08.04 06:00',
    mode: '배치',
    specId: 'SP-001',
    specName: 'VN7 엔진 사양서',
    rule: 'R-101 필수값 검사',
    errorType: '—',
    severity: '낮음',
    total: 127900,
    errors: 0,
    status: '통과',
    samples: [],
  },
]

/** 일별 오류/경고 추이 (최근 7일) — 시계열은 선으로 그린다 */
export const dailyErrorTrend = {
  errors: [
    { date: '07.30', value: 51 },
    { date: '07.31', value: 44 },
    { date: '08.01', value: 62 },
    { date: '08.02', value: 38 },
    { date: '08.03', value: 47 },
    { date: '08.04', value: 55 },
    { date: '08.05', value: 41 },
  ],
  warnings: [
    { date: '07.30', value: 88 },
    { date: '07.31', value: 76 },
    { date: '08.01', value: 95 },
    { date: '08.02', value: 71 },
    { date: '08.03', value: 82 },
    { date: '08.04', value: 90 },
    { date: '08.05', value: 79 },
  ],
}

/** 오류 유형 분포 — 구성비는 막대로 (fill 토큰은 CVD 검증 통과값) */
export const errorTypeDistribution = [
  { label: 'NULL_VALUE', value: 342, fill: 'var(--color-fill-draft)' },
  { label: 'FORMAT_ERROR', value: 218, fill: 'var(--color-fill-review)' },
  { label: 'INVALID_VALUE', value: 164, fill: 'var(--color-fill-pending)' },
  { label: 'RANGE_ERROR', value: 138, fill: 'var(--color-fill-deployed)' },
]

export const SEVERITY_CLS: Record<Severity, string> = {
  높음: 'bg-danger-bg text-danger-ink',
  중간: 'bg-review-bg text-review-ink',
  낮음: 'bg-draft-bg text-draft-ink',
}

export const RUN_STATUS_CLS: Record<RunStatus, string> = {
  오류: 'bg-danger-bg text-danger-ink',
  '재처리 중': 'bg-review-bg text-review-ink',
  해결: 'bg-deployed-bg text-deployed-ink',
  통과: 'bg-deployed-bg text-deployed-ink',
}
