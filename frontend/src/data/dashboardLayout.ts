/**
 * 대시보드 위젯 배치 — 판단은 이 한 곳에서 한다.
 *
 * RBAC 파생 구조: 위젯은 자기가 요구하는 기능 키를 선언하고, 역할은 가진 기능
 * 목록을 선언한다. 프리셋은 그 교집합에서 **파생**된다 — 역할에 기능이 붙거나
 * 떨어지면 프리셋도 따라 바뀐다(위젯 목록을 역할마다 손으로 적지 않는다).
 *
 * ⚠ 지금 ROLE_DEFS.features 는 정적 mock 이다 — 본개발에서 `GET /api/me/features`
 * (서버 RBAC) 응답으로 갈아끼우면 이 파일의 파생 로직은 그대로 산다.
 */

export type WidgetId =
  | 'kpi'
  | 'trend'
  | 'status'
  | 'heatmap'
  | 'queue'
  | 'errors'
  | 'activity'
  | 'system'
  | 'pipeline'
  | 'members'
  | 'notice'

export type WidgetSize = 1 | 2 | 3

export interface WidgetSlot {
  id: WidgetId
  size: WidgetSize
}

/** 위젯이 요구하는 기능 키 — 서버 RBAC 기능 코드와 1:1 로 맞춘다 */
export const WIDGET_META: Record<
  WidgetId,
  { title: string; feature: string; defaultSize: WidgetSize }
> = {
  kpi: { title: 'KPI 요약', feature: 'dashboard.read', defaultSize: 3 },
  trend: { title: '일별 검증 처리량', feature: 'validation.stats', defaultSize: 2 },
  status: { title: '사양서 상태 분포', feature: 'spec.read', defaultSize: 1 },
  heatmap: { title: '검증 실행 히트맵', feature: 'validation.history', defaultSize: 2 },
  queue: { title: '결재 대기 큐', feature: 'approval.read', defaultSize: 1 },
  errors: { title: '오류 유형별 검출', feature: 'validation.errors', defaultSize: 2 },
  activity: { title: '최근 활동', feature: 'activity.read', defaultSize: 1 },
  system: { title: '시스템 현황', feature: 'monitoring.read', defaultSize: 2 },
  pipeline: { title: '데이터 파이프라인', feature: 'pipeline.read', defaultSize: 1 },
  members: { title: '권한별 회원 분포', feature: 'member.read', defaultSize: 1 },
  // 커뮤니티는 최소 메뉴 — 아래 모든 역할이 이 기능을 가져 전 프리셋에 파생 편입된다
  notice: { title: '최근 공지', feature: 'community.read', defaultSize: 1 },
}

/** 파생 순서의 정본 — 역할과 무관하게 같은 위젯은 같은 자리 감각을 유지한다 */
const CANONICAL_ORDER: Array<WidgetId> = [
  'kpi',
  'trend',
  'status',
  'heatmap',
  'queue',
  'errors',
  'activity',
  'system',
  'pipeline',
  'members',
  'notice',
]

interface RoleDef {
  key: string
  label: string
  desc: string
  /** 이 역할이 가진 기능 (⚠ mock — 본개발에서 서버 RBAC 로 교체) */
  features: Array<string>
  /** 이 역할이 특히 크게 봐야 하는 기능 — 파생 시 앞으로 오고 한 단계 커진다 */
  emphasis: Array<string>
}

const ROLE_DEFS: Array<RoleDef> = [
  {
    key: 'admin',
    label: '시스템 관리자',
    desc: '전체 현황을 넓게',
    features: [
      'dashboard.read',
      'validation.stats',
      'spec.read',
      'validation.history',
      'approval.read',
      'validation.errors',
      'activity.read',
      'monitoring.read',
      'pipeline.read',
      'member.read',
      'community.read',
    ],
    emphasis: [],
  },
  {
    key: 'approver',
    label: '결재 담당',
    desc: '기다리는 결재부터',
    features: ['dashboard.read', 'approval.read', 'spec.read', 'activity.read', 'validation.stats', 'community.read'],
    emphasis: ['approval.read'],
  },
  {
    key: 'engineer',
    label: '검증 엔지니어',
    desc: '처리량·오류 중심',
    features: [
      'dashboard.read',
      'validation.stats',
      'validation.errors',
      'validation.history',
      'monitoring.read',
      'pipeline.read',
      'community.read',
    ],
    emphasis: ['validation.stats', 'validation.history'],
  },
  {
    key: 'viewer',
    label: '경영 뷰어',
    desc: '요약만 간결하게',
    features: ['dashboard.read', 'validation.stats', 'spec.read', 'activity.read', 'community.read'],
    emphasis: [],
  },
]

/** 역할 정의 → 추천 배치. 규칙은 셋뿐이다:
 *  ①가진 기능의 위젯만 ②강조 기능은 kpi 다음으로 + 한 단계 확대 ③나머지는 정본 순서 */
function buildPreset(role: RoleDef): Array<WidgetSlot> {
  const owned = CANONICAL_ORDER.filter((id) => role.features.includes(WIDGET_META[id].feature))
  const emphasized = owned.filter(
    (id) => id !== 'kpi' && role.emphasis.includes(WIDGET_META[id].feature),
  )
  const rest = owned.filter((id) => id !== 'kpi' && !emphasized.includes(id))
  const ordered = [...(owned.includes('kpi') ? ['kpi' as WidgetId] : []), ...emphasized, ...rest]
  return ordered.map((id) => ({
    id,
    size: emphasized.includes(id)
      ? (Math.min(3, WIDGET_META[id].defaultSize + 1) as WidgetSize)
      : WIDGET_META[id].defaultSize,
  }))
}

export interface RolePreset {
  key: string
  label: string
  desc: string
  layout: Array<WidgetSlot>
}

export const ROLE_PRESETS: Array<RolePreset> = ROLE_DEFS.map((r) => ({
  key: r.key,
  label: r.label,
  desc: r.desc,
  layout: buildPreset(r),
}))

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
