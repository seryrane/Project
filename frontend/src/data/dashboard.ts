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
  // ⚠ 타일 숫자가 정본(사양서 4건·결재 대기 4건)에서 오도록 바꾸며 추이도 그 크기로
  //   맞췄다 — 120 언저리 추이 밑에 4가 서 있으면 스파크가 다른 숫자 이야기를 한다
  specs: [3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4], // 총 사양서: 최근 1건 등록
  pending: [2, 3, 3, 2, 4, 3, 3, 5, 4, 3, 4, 5, 4, 4], // 결재 대기: 출렁임
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

// ⚠⚠ 사양서 상태 분포는 여기 없다 — **specStore.specStatusDistribution(목록)** 이 센다.
//   18/24/7/79(합 128)로 손으로 적혀 있던 동안 사양서 관리는 4건이었다 — 같은 이름의
//   숫자가 화면마다 달랐다(규약 §10, 2026-08-18). 손 mock 을 되살리지 말 것.
//
// ⚠⚠ 승인 대기 큐도 여기 없다 — **approvals.ts 의 approvalRequests** 가 정본이다.
//   예전 mock 은 SP-001~004 네 장을 상태와 무관하게 "결재 대기"로 세웠다 — 배포 완료인
//   SP-003 까지 기다린다고 말하는 카드였다. 결재 대기는 결재함이 센다.

/** 서버 리소스 현황 — 모니터링은 웹 내부 통합이 요구사항이다 (컨텍스트 §2) */
export type ServerHealth = 'HEALTHY' | 'WARNING' | 'ERROR'

export const serverResources: Array<{
  name: string
  health: ServerHealth
  cpu: number
  mem: number
  disk: number
}> = [
  { name: 'WEB-01', health: 'HEALTHY', cpu: 42, mem: 58, disk: 71 },
  { name: 'WEB-02', health: 'HEALTHY', cpu: 38, mem: 54, disk: 69 },
  { name: 'WAS-01', health: 'WARNING', cpu: 67, mem: 76, disk: 55 },
  { name: 'WAS-02', health: 'HEALTHY', cpu: 59, mem: 72, disk: 53 },
  { name: 'DB-01', health: 'WARNING', cpu: 31, mem: 84, disk: 78 },
  { name: 'DB-02', health: 'HEALTHY', cpu: 28, mem: 81, disk: 76 },
]

/** 데이터 파이프라인(배치) 현황 — CDO 수신·마트 적재 */
export const pipelines: Array<{
  name: string
  status: '성공' | '실행중' | '실패'
  last: string
  duration: string | null
}> = [
  { name: 'CDO 수집 배치 (Kafka)', status: '성공', last: '오늘 02:00', duration: '48m 12s' },
  { name: 'L1 마트 전처리 배치', status: '성공', last: '오늘 03:00', duration: '32m 05s' },
  { name: 'L3 마트 분석 배치 (주간)', status: '성공', last: '08.04 04:00', duration: '1h 22m' },
  { name: '검증 결과 집계 배치', status: '실행중', last: '지금', duration: null },
  { name: 'KPI 집계 배치', status: '실패', last: '오늘 05:10', duration: '2m 41s' },
]

// ⚠ 권한별 회원 분포도 여기 없다 — **members.ts 의 gradeDistribution(명단)** 이 센다.
//   2/5/18/41(합 66명) 손 mock 이 회원 관리(10명)와 다른 조직을 말하고 있었다.

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
