/**
 * 대시보드 위젯 배치 — 판단은 이 한 곳에서 한다.
 * 역할 프리셋은 "추천 구성"이다: 적용은 사람이 누르고, 이후 자유롭게 고친다.
 * (역할이 늘면 프리셋을 여기 더한다 — 화면 코드는 안 바뀐다)
 */

export type WidgetId =
  | 'kpi'
  | 'trend'
  | 'status'
  | 'heatmap'
  | 'queue'
  | 'errors'
  | 'activity'

export type WidgetSize = 1 | 2 | 3

export interface WidgetSlot {
  id: WidgetId
  size: WidgetSize
}

export const WIDGET_META: Record<WidgetId, { title: string }> = {
  kpi: { title: 'KPI 요약' },
  trend: { title: '일별 검증 처리량' },
  status: { title: '사양서 상태 분포' },
  heatmap: { title: '검증 실행 히트맵' },
  queue: { title: '승인 대기 큐' },
  errors: { title: '오류 유형별 검출' },
  activity: { title: '최근 활동' },
}

export interface RolePreset {
  key: string
  label: string
  desc: string
  layout: Array<WidgetSlot>
}

export const ROLE_PRESETS: Array<RolePreset> = [
  {
    key: 'admin',
    label: '시스템 관리자',
    desc: '전체 현황을 넓게',
    layout: [
      { id: 'kpi', size: 3 },
      { id: 'trend', size: 2 },
      { id: 'status', size: 1 },
      { id: 'heatmap', size: 2 },
      { id: 'queue', size: 1 },
      { id: 'errors', size: 2 },
      { id: 'activity', size: 1 },
    ],
  },
  {
    key: 'approver',
    label: '결재 담당',
    desc: '기다리는 결재부터',
    layout: [
      { id: 'kpi', size: 3 },
      { id: 'queue', size: 2 },
      { id: 'status', size: 1 },
      { id: 'activity', size: 1 },
      { id: 'trend', size: 2 },
    ],
  },
  {
    key: 'engineer',
    label: '검증 엔지니어',
    desc: '처리량·오류 중심',
    layout: [
      { id: 'kpi', size: 3 },
      { id: 'trend', size: 2 },
      { id: 'errors', size: 1 },
      { id: 'heatmap', size: 3 },
    ],
  },
  {
    key: 'viewer',
    label: '경영 뷰어',
    desc: '요약만 간결하게',
    layout: [
      { id: 'kpi', size: 3 },
      { id: 'trend', size: 3 },
      { id: 'status', size: 1 },
      { id: 'activity', size: 1 },
    ],
  },
]

export const DEFAULT_LAYOUT = ROLE_PRESETS[0].layout

const STORAGE_KEY = 'dashboard.layout.v1'

export function loadLayout(): Array<WidgetSlot> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_LAYOUT
    const parsed = JSON.parse(raw) as Array<WidgetSlot>
    // 저장본에 모르는 위젯이 있으면 버리고, 새 위젯이 생겼으면 그대로 둔다(추가는 편집에서)
    const valid = parsed.filter((s) => s.id in WIDGET_META && [1, 2, 3].includes(s.size))
    return valid.length > 0 ? valid : DEFAULT_LAYOUT
  } catch {
    return DEFAULT_LAYOUT
  }
}

/** 표를 채우는 화면은 즉시 저장 — 잃을 것이 없으면 물을 것도 없다 (규약 §10) */
export function saveLayout(layout: Array<WidgetSlot>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(layout))
}
