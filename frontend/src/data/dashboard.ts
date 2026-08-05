import type { TrendPoint } from '#/components/portal/charts'

// Deterministic mock series: daily validation volume (unit: K rows/day),
// 180 days ending 2026-08-04 — 90일 화면 + 90일 비교 기간까지 담는다.
const END = new Date('2026-08-04T00:00:00Z')
const DAYS = 180

export const validationSeries: Array<TrendPoint> = Array.from({ length: DAYS }, (_, idx) => {
  const i = DAYS - 1 - idx
  const d = new Date(END.getTime() - i * 86_400_000)
  const weekly = Math.sin(((i % 7) / 7) * Math.PI * 2) * 9
  const seasonal = Math.sin(i / 11) * 14
  const trend = (DAYS - 1 - i) * 0.18
  const value = Math.round(88 + weekly + seasonal + trend)
  return {
    date: `${String(d.getUTCMonth() + 1).padStart(2, '0')}.${String(d.getUTCDate()).padStart(2, '0')}`,
    value,
  }
})

// GitHub 잔디 스타일 히트맵용 — 최근 26주(182일)를 (주, 요일)로 편다.
// getUTCDay(): 0=일 … 6=토
export const heatmapDays = Array.from({ length: 175 }, (_, idx) => {
  const i = 174 - idx
  const d = new Date(END.getTime() - i * 86_400_000)
  const s = validationSeries[validationSeries.length - 1 - i]
  return {
    date: `${String(d.getUTCMonth() + 1).padStart(2, '0')}.${String(d.getUTCDate()).padStart(2, '0')}`,
    weekday: d.getUTCDay(),
    value: s.value,
  }
})

// KPI 스파크라인 (14일) — 타일 숫자와 같은 이야기를 하는 미니 추이
const sparkOf = (base: number, amp: number, slope: number) =>
  Array.from({ length: 14 }, (_, i) => base + Math.sin(i / 2.1) * amp + i * slope)

export const kpiSparks = {
  specs: sparkOf(120, 1.2, 0.55), // 총 사양서: 완만한 증가
  pending: [4, 5, 4, 6, 5, 7, 6, 5, 8, 7, 6, 8, 7, 7], // 승인 대기: 출렁임
  successRate: sparkOf(95.4, 0.5, 0.1), // 성공률: 소폭 개선
  processed: validationSeries.slice(-14).map((d) => d.value),
}

// 오류 유형 — prev 는 이전 동일 기간 값. 증감은 화면이 계산해 ▲▼ 로 적는다.
export const errorTypes = [
  { label: '필수값 누락', value: 342, prev: 301 },
  { label: '형식 오류', value: 218, prev: 246 },
  { label: '오탈자', value: 164, prev: 158 },
  { label: '범위 초과', value: 97, prev: 121 },
  { label: '중복', value: 41, prev: 38 },
]

// Fill colors are theme tokens validated (CVD + contrast) against each theme's surface.
export const statusDistribution = [
  { label: '초안', value: 18, fill: 'var(--color-fill-draft)' },
  { label: '검토 중', value: 24, fill: 'var(--color-fill-review)' },
  { label: '승인 대기', value: 7, fill: 'var(--color-fill-pending)' },
  { label: '배포 완료', value: 79, fill: 'var(--color-fill-deployed)' },
]

// 승인 대기 큐 — 대시보드는 "다음 행동"으로 끝난다 (규약 §10).
// id 는 사양서 mock(specs.ts)과 맞춰 둔다 — 누르면 그 상세가 실제로 열린다.
export const approvalQueue = [
  { id: 'SP-001', name: 'VN7 엔진 사양서', version: 'v2.3', owner: '김민준', waitingDays: 3 },
  { id: 'SP-002', name: '전기차 배터리 규격서', version: 'v1.5', owner: '이서연', waitingDays: 2 },
  { id: 'SP-003', name: '자율주행 센서 통합 규격', version: 'v3.1', owner: '박준혁', waitingDays: 1 },
  { id: 'SP-004', name: '차체 구조 안전 기준서', version: 'v4.0', owner: '최수진', waitingDays: 1 },
]

export type ActivityKind = 'approve' | 'review' | 'validate' | 'deploy'

export const recentActivity: Array<{
  kind: ActivityKind
  text: string
  author: string
  time: string
}> = [
  { kind: 'approve', text: 'VN7 엔진 사양서 v2.3 승인 요청', author: '김민준', time: '10분 전' },
  { kind: 'review', text: '전기차 배터리 규격서 v1.5 검토 의견 등록', author: '이서연', time: '42분 전' },
  { kind: 'validate', text: '배치 검증 완료 — 오류 12건 검출', author: '시스템', time: '1시간 전' },
  { kind: 'deploy', text: '자율주행 센서 통합 규격 v3.1 배포 완료', author: '박준혁', time: '3시간 전' },
  { kind: 'validate', text: '검증 Rule 세트 v18 반영 (신규 4건)', author: '최수진', time: '어제' },
]
