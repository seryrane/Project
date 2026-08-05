import type { TrendPoint } from '#/components/portal/charts'

// Deterministic mock series: daily validation volume (unit: K rows/day),
// 90 days ending 2026-08-04.
const END = new Date('2026-08-04T00:00:00Z')

export const validationSeries: Array<TrendPoint> = Array.from({ length: 90 }, (_, idx) => {
  const i = 89 - idx
  const d = new Date(END.getTime() - i * 86_400_000)
  const weekly = Math.sin(((i % 7) / 7) * Math.PI * 2) * 9
  const seasonal = Math.sin(i / 11) * 14
  const trend = (89 - i) * 0.32
  const value = Math.round(96 + weekly + seasonal + trend)
  return {
    date: `${String(d.getUTCMonth() + 1).padStart(2, '0')}.${String(d.getUTCDate()).padStart(2, '0')}`,
    value,
  }
})

export const errorTypes = [
  { label: '필수값 누락', value: 342 },
  { label: '형식 오류', value: 218 },
  { label: '오탈자', value: 164 },
  { label: '범위 초과', value: 97 },
  { label: '중복', value: 41 },
]

// Fill colors are theme tokens validated (CVD + contrast) against each theme's surface.
export const statusDistribution = [
  { label: '초안', value: 18, fill: 'var(--color-fill-draft)' },
  { label: '검토 중', value: 24, fill: 'var(--color-fill-review)' },
  { label: '승인 대기', value: 7, fill: 'var(--color-fill-pending)' },
  { label: '배포 완료', value: 79, fill: 'var(--color-fill-deployed)' },
]

export const recentActivity = [
  { text: 'VN7 엔진 사양서 v2.3 승인 요청', author: '김민준', time: '10분 전' },
  { text: '전기차 배터리 규격서 v1.5 검토 의견 등록', author: '이서연', time: '42분 전' },
  { text: '배치 검증 완료 — 오류 12건 검출', author: '시스템', time: '1시간 전' },
  { text: '자율주행 센서 통합 규격 v3.1 배포 완료', author: '박준혁', time: '3시간 전' },
  { text: '검증 Rule 세트 v18 반영 (신규 4건)', author: '최수진', time: '어제' },
]
