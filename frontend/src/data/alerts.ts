/** 시스템 알림 mock 정본 — 서버 자원 리포팅 · 알림 이력 · 알림 규칙.
 *
 * ⚠ 서버 현재값은 대시보드(data/dashboard.ts)의 serverResources 를 그대로 재사용한다 —
 *   두 화면이 같은 서버를 다른 숫자로 말하면 안 된다(규약 §10 "같은 이름의 숫자는 한 곳에서 센다").
 * ⚠ 임계값(70 주의 · 85 위험)도 routes/dashboard.tsx 의 Meter 와 반드시 같은 숫자를 쓴다.
 *   Meter 는 그 파일 안의 비공개 함수라 가져올 수 없어 숫자만 그대로 옮겨 적는다 — 이 상수를
 *   고치면 dashboard.tsx 의 Meter 도 같이 고쳐야 두 화면이 같은 말을 한다.
 * 목데이터는 결정적이다 — Math.random 을 쓰지 않는다(새로고침마다 숫자가 바뀌면 아무도 안 믿는다).
 */
import type { TrendPoint } from '#/components/portal/charts'

import { serverResources } from './dashboard'
import type { ServerHealth } from './dashboard'

export type { ServerHealth }

export const THRESHOLD_WARN = 70
export const THRESHOLD_DANGER = 85

// 서버 역할 — 대시보드 mock 에는 없는 정보라 여기서만 붙인다. 키는 dashboard.ts 의 서버
// 이름과 반드시 같아야 같은 서버를 가리킨다(어긋나면 "이 화면 서버 6대, 저 화면 5대"가 된다).
const SERVER_ROLE: Record<string, string> = {
  'WEB-01': '웹 서버',
  'WEB-02': '웹 서버',
  'WAS-01': 'WAS',
  'WAS-02': 'WAS',
  'DB-01': 'DB',
  'DB-02': 'DB',
}

/* ── 결정적 추이 생성 ─────────────────────────────────────────────
   서버 이름+지표 문자열을 시드로 늘 같은 파형을 만들고, 마지막 점은 반드시 "지금" 값과
   맞춘다 — 게이지(현재값)와 스파크라인(추이) 끝이 다른 숫자를 말하면 같은 화면이 자기
   말을 뒤집는다. */
const TREND_POINTS = 14
function seed(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 97
  return h
}
function trendValues(name: string, metric: string, current: number): Array<number> {
  const sd = seed(`${name}.${metric}`)
  const amp = 3 + (sd % 6)
  const arr = Array.from({ length: TREND_POINTS }, (_, i) =>
    Math.max(2, Math.min(99, Math.round(current + Math.sin((i + sd) / 2.3) * amp - (TREND_POINTS - 1 - i) * 0.2))),
  )
  arr[TREND_POINTS - 1] = current
  return arr
}
// 다른 mock 화면과 같은 "오늘" 기준(2026.08.05)의 14일 전 ~ 오늘 날짜 라벨
const TREND_END = new Date('2026-08-05T00:00:00Z')
const TREND_DATES = Array.from({ length: TREND_POINTS }, (_, i) => {
  const d = new Date(TREND_END.getTime() - (TREND_POINTS - 1 - i) * 86_400_000)
  return `${String(d.getUTCMonth() + 1).padStart(2, '0')}.${String(d.getUTCDate()).padStart(2, '0')}`
})
function trendPoints(name: string, metric: 'cpu' | 'mem' | 'disk', current: number): Array<TrendPoint> {
  return trendValues(name, metric, current).map((value, i) => ({ date: TREND_DATES[i], value }))
}

export interface ServerCard {
  name: string
  role: string
  health: ServerHealth
  cpu: number
  mem: number
  disk: number
  cpuTrend: Array<TrendPoint>
  memTrend: Array<TrendPoint>
  diskTrend: Array<TrendPoint>
}

/** 서버 카드 정본 — dashboard.ts 의 현재값을 그대로 물려받고, 추이·역할만 여기서 더한다. */
export const alertServers: Array<ServerCard> = serverResources.map((s) => ({
  name: s.name,
  role: SERVER_ROLE[s.name] ?? '—',
  health: s.health,
  cpu: s.cpu,
  mem: s.mem,
  disk: s.disk,
  cpuTrend: trendPoints(s.name, 'cpu', s.cpu),
  memTrend: trendPoints(s.name, 'mem', s.mem),
  diskTrend: trendPoints(s.name, 'disk', s.disk),
}))

/* ── 알림 이력 ────────────────────────────────────────────────── */
export type AlertSeverity = '위험' | '주의' | '정보'
export type AlertStatus = '미해결' | '해결'
export type AlertMetric = 'cpu' | 'mem' | 'disk'

export interface AlertEvent {
  id: string
  /** 'YYYY.MM.DD HH:mm' — parseAlertAt 으로 정렬·기간 계산에 쓴다 */
  at: string
  severity: AlertSeverity
  serverName: string
  /** 알림 본문 — 데이터 값이라 번역하지 않는다(규약 §4-4) */
  message: string
  /** 자원 임계값 알림이면 있다 — 조치 안내가 이 값으로 갈린다. 정보성 알림은 없음 */
  metric?: AlertMetric
  status: AlertStatus
  resolvedAt: string | null
  /** 그 시점 자원 값 — 상세 서랍에서 "그때 뭘 보고 있었나"를 보여준다 */
  snapshot: { cpu: number; mem: number; disk: number }
}

/** 'YYYY.MM.DD HH:mm' → epoch ms. mock 은 고정 날짜라 로컬 시간대로 충분하다. */
export function parseAlertAt(s: string): number {
  const [d, t] = s.split(' ')
  const [y, mo, da] = d.split('.').map(Number)
  const [h, mi] = t.split(':').map(Number)
  return new Date(y, mo - 1, da, h, mi).getTime()
}

// 화면의 "지금" — 다른 mock 화면과 같은 기준일(2026.08.05)의 늦은 시각으로 고정한다.
export const ALERTS_NOW = parseAlertAt('2026.08.05 10:00')

export const alertEvents: Array<AlertEvent> = [
  {
    id: 'AL-0119',
    at: '2026.08.05 09:52',
    severity: '위험',
    serverName: 'DB-01',
    message: '메모리 사용률 87% — 위험 임계값(85%) 초과',
    metric: 'mem',
    status: '미해결',
    resolvedAt: null,
    snapshot: { cpu: 33, mem: 87, disk: 79 },
  },
  {
    id: 'AL-0118',
    at: '2026.08.05 08:40',
    severity: '주의',
    serverName: 'WAS-01',
    message: '메모리 사용률 76% — 주의 임계값(70%) 초과',
    metric: 'mem',
    status: '미해결',
    resolvedAt: null,
    snapshot: { cpu: 65, mem: 76, disk: 55 },
  },
  {
    id: 'AL-0117',
    at: '2026.08.05 08:05',
    severity: '주의',
    serverName: 'DB-01',
    message: '디스크 사용률 78% — 주의 임계값(70%) 초과',
    metric: 'disk',
    status: '미해결',
    resolvedAt: null,
    snapshot: { cpu: 32, mem: 83, disk: 78 },
  },
  {
    id: 'AL-0116',
    at: '2026.08.05 06:00',
    severity: '정보',
    serverName: 'WEB-01',
    message: '정기 재기동 완료',
    status: '해결',
    resolvedAt: '2026.08.05 06:02',
    snapshot: { cpu: 40, mem: 55, disk: 71 },
  },
  {
    id: 'AL-0115',
    at: '2026.08.05 02:15',
    severity: '위험',
    serverName: 'DB-01',
    message: '디스크 사용률 91% — 위험 임계값(85%) 초과',
    metric: 'disk',
    status: '해결',
    resolvedAt: '2026.08.05 04:40',
    snapshot: { cpu: 35, mem: 80, disk: 91 },
  },
  {
    id: 'AL-0114',
    at: '2026.08.04 23:10',
    severity: '주의',
    serverName: 'WAS-02',
    message: '메모리 사용률 73% — 주의 임계값(70%) 초과',
    metric: 'mem',
    status: '해결',
    resolvedAt: '2026.08.05 00:05',
    snapshot: { cpu: 60, mem: 73, disk: 52 },
  },
  {
    id: 'AL-0113',
    at: '2026.08.04 21:30',
    severity: '주의',
    serverName: 'DB-02',
    message: '메모리 사용률 82% — 주의 임계값(70%) 초과',
    metric: 'mem',
    status: '미해결',
    resolvedAt: null,
    snapshot: { cpu: 29, mem: 82, disk: 75 },
  },
  {
    id: 'AL-0112',
    at: '2026.08.04 18:45',
    severity: '정보',
    serverName: 'WEB-02',
    message: '배포로 인한 정상 재기동',
    status: '해결',
    resolvedAt: '2026.08.04 18:47',
    snapshot: { cpu: 37, mem: 53, disk: 68 },
  },
  {
    id: 'AL-0111',
    at: '2026.08.04 15:20',
    severity: '위험',
    serverName: 'WAS-01',
    message: 'CPU 사용률 89% — 위험 임계값(85%) 초과',
    metric: 'cpu',
    status: '해결',
    resolvedAt: '2026.08.04 16:05',
    snapshot: { cpu: 89, mem: 78, disk: 56 },
  },
  {
    id: 'AL-0110',
    at: '2026.08.04 09:00',
    severity: '주의',
    serverName: 'WEB-01',
    message: '디스크 사용률 72% — 주의 임계값(70%) 초과',
    metric: 'disk',
    status: '해결',
    resolvedAt: '2026.08.04 13:30',
    snapshot: { cpu: 44, mem: 57, disk: 72 },
  },
  {
    id: 'AL-0109',
    at: '2026.08.03 22:40',
    severity: '위험',
    serverName: 'DB-02',
    message: '메모리 사용률 88% — 위험 임계값(85%) 초과',
    metric: 'mem',
    status: '해결',
    resolvedAt: '2026.08.04 01:10',
    snapshot: { cpu: 30, mem: 88, disk: 74 },
  },
  {
    id: 'AL-0108',
    at: '2026.08.03 14:05',
    severity: '정보',
    serverName: 'DB-01',
    message: '야간 백업 배치 시작',
    status: '해결',
    resolvedAt: '2026.08.03 14:06',
    snapshot: { cpu: 28, mem: 79, disk: 70 },
  },
  {
    id: 'AL-0107',
    at: '2026.08.03 11:20',
    severity: '주의',
    serverName: 'WAS-01',
    message: 'CPU 사용률 74% — 주의 임계값(70%) 초과',
    metric: 'cpu',
    status: '해결',
    resolvedAt: '2026.08.03 12:00',
    snapshot: { cpu: 74, mem: 75, disk: 54 },
  },
  {
    id: 'AL-0106',
    at: '2026.08.02 19:50',
    severity: '위험',
    serverName: 'WEB-02',
    message: '디스크 사용률 90% — 위험 임계값(85%) 초과',
    metric: 'disk',
    status: '해결',
    resolvedAt: '2026.08.02 22:15',
    snapshot: { cpu: 39, mem: 52, disk: 90 },
  },
  {
    id: 'AL-0105',
    at: '2026.08.02 08:30',
    severity: '주의',
    serverName: 'DB-02',
    message: '디스크 사용률 77% — 주의 임계값(70%) 초과',
    metric: 'disk',
    status: '해결',
    resolvedAt: '2026.08.02 10:00',
    snapshot: { cpu: 27, mem: 80, disk: 77 },
  },
  {
    id: 'AL-0104',
    at: '2026.08.01 20:00',
    severity: '정보',
    serverName: 'WAS-02',
    message: '검증 Rule 세트 v18 반영 재기동',
    status: '해결',
    resolvedAt: '2026.08.01 20:03',
    snapshot: { cpu: 58, mem: 70, disk: 51 },
  },
  {
    id: 'AL-0103',
    at: '2026.08.01 07:15',
    severity: '주의',
    serverName: 'WEB-01',
    message: '메모리 사용률 71% — 주의 임계값(70%) 초과',
    metric: 'mem',
    status: '해결',
    resolvedAt: '2026.08.01 09:40',
    snapshot: { cpu: 41, mem: 71, disk: 70 },
  },
  {
    id: 'AL-0102',
    at: '2026.07.31 16:40',
    severity: '위험',
    serverName: 'DB-01',
    message: '메모리 사용률 86% — 위험 임계값(85%) 초과',
    metric: 'mem',
    status: '해결',
    resolvedAt: '2026.07.31 19:20',
    snapshot: { cpu: 33, mem: 86, disk: 76 },
  },
  {
    id: 'AL-0101',
    at: '2026.07.30 10:00',
    severity: '정보',
    serverName: 'WEB-02',
    message: '분기 정기 점검 완료',
    status: '해결',
    resolvedAt: '2026.07.30 12:30',
    snapshot: { cpu: 36, mem: 50, disk: 65 },
  },
]

/* ── 알림 규칙(관리자 편집) ───────────────────────────────────── */
export interface AlertRule {
  metric: AlertMetric
  label: string
  warn: number
  danger: number
}

/** 편집 가능한 기본값 — 값은 THRESHOLD_WARN/DANGER 와 같다(대시보드 Meter 기준과 일치). */
export const defaultAlertRules: Array<AlertRule> = [
  { metric: 'cpu', label: 'CPU', warn: THRESHOLD_WARN, danger: THRESHOLD_DANGER },
  { metric: 'mem', label: '메모리', warn: THRESHOLD_WARN, danger: THRESHOLD_DANGER },
  { metric: 'disk', label: '디스크', warn: THRESHOLD_WARN, danger: THRESHOLD_DANGER },
]

export type ChannelKey = 'inApp' | 'email' | 'webhook'

export interface AlertChannel {
  key: ChannelKey
  enabled: boolean
  /** 이메일 수신 그룹 · 웹훅 엔드포인트 — 데이터 값이라 번역하지 않는다 */
  target?: string
}

export const defaultAlertChannels: Array<AlertChannel> = [
  { key: 'inApp', enabled: true },
  { key: 'email', enabled: true, target: 'infra-alerts@hmg.com' },
  // 웹훅은 엔드포인트가 아직 없다 — 켜 놓아도 등록 전에는 오지 않는다는 것을 화면에서 말한다
  { key: 'webhook', enabled: false, target: '' },
]
