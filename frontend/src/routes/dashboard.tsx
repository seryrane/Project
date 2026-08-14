import { useEffect, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { AppShell } from '#/components/portal/AppShell'
import { Avatar } from '#/components/portal/Avatar'
import { ListFoot } from '#/components/portal/ListFoot'
import { layoutSpring, m } from '#/components/portal/motion'
import { WidgetSkeleton } from '#/components/portal/Skeleton'
import { apiGet, apiSend } from '#/lib/api'
import { useI18n } from '#/lib/i18n'
import {
  ActivityHeatmap,
  ChartCard,
  DonutChart,
  ErrorBarChart,
  StatTile,
  StatusStackBar,
  TrendLineChart,
} from '#/components/portal/charts'
import {
  approvalQueue,
  errorTypes,
  heatmapDays,
  kpiSparks,
  memberRoles,
  pipelines,
  recentActivity,
  serverResources,
  statusDistribution,
  validationSeries,
} from '#/data/dashboard'
import type { ActivityKind, ServerHealth } from '#/data/dashboard'
import { notices } from '#/data/community'
import {
  ROLE_PRESETS,
  WIDGET_META,
  loadLayout,
  saveLayout,
} from '#/data/dashboardLayout'
import type { WidgetId, WidgetSize, WidgetSlot } from '#/data/dashboardLayout'

export const Route = createFileRoute('/dashboard')({ component: DashboardPage })

const RANGES = [
  { key: 7, label: '최근 7일' },
  { key: 30, label: '최근 30일' },
  { key: 90, label: '최근 90일' },
]

function compactSum(kValues: Array<number>): string {
  const total = kValues.reduce((a, v) => a + v, 0) * 1000
  return total >= 1_000_000 ? `${(total / 1_000_000).toFixed(1)}M` : `${Math.round(total / 1000)}K`
}

/* 활동 종류별 아이콘 — 같은 뜻은 같은 그림 하나로 (규약 §12) */
const ACTIVITY_ICON: Record<ActivityKind, { path: React.ReactNode; cls: string }> = {
  approve: {
    path: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M8.5 12.2l2.4 2.4 4.6-5.2" />
      </>
    ),
    cls: 'bg-pending-bg text-pending-ink',
  },
  review: {
    path: <path d="M4 5.5h16v10.5H9.5L4 20z" />,
    cls: 'bg-review-bg text-review-ink',
  },
  validate: {
    path: (
      <>
        <rect x="7" y="7" width="10" height="10" rx="2" />
        <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" />
      </>
    ),
    cls: 'bg-draft-bg text-draft-ink',
  },
  deploy: {
    path: (
      <>
        <path d="M12 19V6" />
        <path d="M6.5 11.5L12 6l5.5 5.5" />
        <path d="M5 20.5h14" />
      </>
    ),
    cls: 'bg-deployed-bg text-deployed-ink',
  },
}

function ActivityIcon({ kind }: { kind: ActivityKind }) {
  const icon = ACTIVITY_ICON[kind]
  return (
    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${icon.cls}`}>
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        {icon.path}
      </svg>
    </span>
  )
}

/* 리소스 게이지 — 색은 임계값이 정한다 (<70 정상 · 70~84 주의 · 85+ 위험) */
function Meter({ label, pct }: { label: string; pct: number }) {
  const color =
    pct >= 85 ? 'var(--color-danger-ink)' : pct >= 70 ? 'var(--color-review-ink)' : 'var(--color-fill-deployed)'
  return (
    <span className="flex min-w-0 flex-1 items-center gap-1.5 text-[10px] text-ink-subtle">
      {label}
      <span className="h-1 min-w-6 flex-1 overflow-hidden rounded-full bg-chip">
        <span className="block h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </span>
      <span className="w-7 text-right tabular-nums text-ink-muted">{pct}%</span>
    </span>
  )
}

const HEALTH_CLS: Record<ServerHealth, string> = {
  HEALTHY: 'bg-deployed-bg text-deployed-ink',
  WARNING: 'bg-review-bg text-review-ink',
  ERROR: 'bg-danger-bg text-danger-ink',
}

const SPAN: Record<WidgetSize, string> = {
  1: '',
  2: 'xl:col-span-2',
  3: 'xl:col-span-3',
}
const SIZE_LABEL: Record<WidgetSize, string> = { 1: '1칸', 2: '2칸', 3: '전체' }

/**
 * 사양서 상태 카드의 **한마디** (dataviz hero number — ChartCard 주석의 처방).
 *
 * ⚠⚠ 이 카드는 몸통이 도넛 하나뿐이라 `justify-between` 이 가를 자식이 없었다 —
 * 격자가 옆 카드(2칸 선 그래프)에 키를 맞추는 동안 **밑이 270px 빈 흰 면**으로 남았다
 * (2026-08-14 사용자 지적 "도넛 차트 공백 문제"). 2026-08-13 에 /analytics 에만
 * 들어간 처방을 여기에도 들인다: 결론은 위, 그림은 바닥, 남는 자리는 그 사이가 먹는다.
 *
 * ⚠ 숫자는 코드가 센다 — 62·79·128 을 손으로 적으면 mock 이 바뀔 때 카드가 거짓말을 한다.
 * 라벨('배포 완료')은 데이터의 정본 키다(사전은 표시만 옮긴다).
 */
const DEPLOYED = '배포 완료'
const statusTotal = statusDistribution.reduce((s, d) => s + d.value, 0)
const statusPrevTotal = statusDistribution.reduce((s, d) => s + d.prev, 0)
const deployedNow = statusDistribution.find((d) => d.label === DEPLOYED)?.value ?? 0
const deployedPrev = statusDistribution.find((d) => d.label === DEPLOYED)?.prev ?? 0
const deployedPct = statusTotal ? Math.round((deployedNow / statusTotal) * 100) : 0
const deployedPctPrev = statusPrevTotal ? Math.round((deployedPrev / statusPrevTotal) * 100) : 0
const deployedDelta = deployedPct - deployedPctPrev

function DashboardPage() {
  const { t, tf } = useI18n()
  const [range, setRange] = useState(30)
  const navigate = useNavigate()
  const goSpecs = () => navigate({ to: '/specs' })
  const goResults = () => navigate({ to: '/validation-results' })
  const goReports = () => navigate({ to: '/validation-reports' })
  const goApprovals = () => navigate({ to: '/approvals' })
  const openSpec = (id: string) => navigate({ to: '/specs', search: { open: id } })

  // 위젯 배치 — 처음엔 관리자 프리셋, 이후엔 저장된 내 배치 (즉시 저장)
  const [layout, setLayout] = useState<Array<WidgetSlot>>(ROLE_PRESETS[0].layout)
  const [editing, setEditing] = useState(false)
  // 드래그 이동(데스크톱) — 좁은 화면·키보드는 ◀▶ 버튼이 같은 일을 한다
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [dropIdx, setDropIdx] = useState<number | null>(null)
  /**
   * 첫 진입 스켈레톤 (규약 §3) — 위젯 데이터가 "집계에서 오는" 화면이라 자리를 먼저
   * 보여 준다. ⚠ mock 이라 세션당 한 번만 시연한다 — 본개발에서는 실제 조회 상태로 교체.
   * SSR 과 첫 클라이언트 렌더는 항상 스켈레톤(수화 불일치 방지), 재방문은 즉시 걷힌다.
   */
  const [booted, setBooted] = useState(false)
  useEffect(() => {
    setLayout(loadLayout())
    // 배치 정본은 계정 단위(서버) — 브라우저 저장은 다른 PC 에서 초기화된다.
    // 서버가 없으면 localStorage 그대로 (관문 lib/api.ts 의 시연 모드)
    void apiGet<{ layout: Array<WidgetSlot> | null }>('/me/dashboard-layout').then((res) => {
      const server = res?.layout
      if (server && server.length > 0) {
        setLayout(server.filter((s) => s.id in WIDGET_META && [1, 2, 3].includes(s.size)))
      }
    })
    if (sessionStorage.getItem('dashboard.booted') === '1') {
      setBooted(true)
      return
    }
    const timer = setTimeout(() => {
      sessionStorage.setItem('dashboard.booted', '1')
      setBooted(true)
    }, 850)
    return () => clearTimeout(timer)
  }, [])
  const apply = (next: Array<WidgetSlot>) => {
    setLayout(next)
    saveLayout(next)
    // 즉시 저장 — 서버(계정 단위)에도. 실패해도 로컬 저장이 남는다
    void apiSend('PUT', '/me/dashboard-layout', { layout: next })
  }

  const move = (idx: number, dir: -1 | 1) => {
    const next = [...layout]
    const to = idx + dir
    if (to < 0 || to >= next.length) return
    ;[next[idx], next[to]] = [next[to], next[idx]]
    apply(next)
  }
  const resize = (idx: number) => {
    const next = layout.map((s, i) =>
      i === idx ? { ...s, size: (s.size === 3 ? 1 : s.size + 1) as WidgetSize } : s,
    )
    apply(next)
  }
  const hide = (idx: number) => apply(layout.filter((_, i) => i !== idx))
  const show = (id: WidgetId) => apply([...layout, { id, size: 1 }])

  const hiddenWidgets = (Object.keys(WIDGET_META) as Array<WidgetId>).filter(
    (id) => !layout.some((s) => s.id === id),
  )

  const slice = validationSeries.slice(-range)
  const prevSlice = validationSeries.slice(-range * 2, -range)
  const sum = slice.reduce((a, d) => a + d.value, 0)
  const prevSum = prevSlice.reduce((a, d) => a + d.value, 0)
  const deltaPct = prevSum > 0 ? ((sum - prevSum) / prevSum) * 100 : 0
  const rangeLabel = t(`dash.range.${range}`, RANGES.find((r) => r.key === range)?.label ?? '')

  // 오류 유형도 기간을 따른다 — 30일 기준값을 기간 비율로 편 결정적 mock
  const scaledErrors = errorTypes.map((e) => ({
    ...e,
    value: Math.round((e.value * range) / 30),
    prev: Math.round((e.prev * range) / 30),
  }))

  const widgetBody: Record<WidgetId, React.ReactNode> = {
    kpi: (
      // 칸이 정한다 (위 @container): 1칸(≈530)이면 2열, 전체 칸(≈1600)이면 4열.
      // 예전 `sm:grid-cols-2 xl:grid-cols-4` 는 1칸으로 줄여 놔도 4열을 고집했다
      <div className="grid grid-cols-1 gap-5 @sm:grid-cols-2 @3xl:grid-cols-4">
        <StatTile
          label={t('dash.stat.totalSpecs', '총 사양서')}
          value="128"
          delta="+6"
          deltaGood
          spark={kpiSparks.specs}
        />
        <StatTile
          label={t('dash.stat.pending', '승인 대기')}
          value="7"
          delta="+2"
          deltaGood={false}
          spark={kpiSparks.pending}
        />
        <StatTile
          label={t('dash.stat.successRate', '검증 성공률')}
          value="96.8%"
          delta="+1.2%p"
          deltaGood
          spark={kpiSparks.successRate}
        />
        <StatTile
          label={t('dash.stat.periodProcessed', '기간 검증 처리')}
          value={compactSum(slice.map((d) => d.value))}
          delta={`${deltaPct >= 0 ? '+' : ''}${deltaPct.toFixed(1)}%`}
          deltaGood={deltaPct >= 0}
          spark={kpiSparks.processed}
          caption={t('dash.caption.vsPrev', 'vs 이전 동일 기간')}
        />
      </div>
    ),
    trend: (
      <ChartCard
        title={t('widget.trend', '일별 검증 처리량')}
        subtitle={tf(
          'dash.trend.subtitle',
          { range: rangeLabel },
          '{range} · 단위: 천 건 · 점선은 이전 동일 기간',
        )}
        action={{ label: t('dash.action.results'), onClick: goResults }}
      >
        <TrendLineChart data={slice} compare={prevSlice.length === slice.length ? prevSlice : undefined} />
      </ChartCard>
    ),
    status: (
      <ChartCard
        title={t('widget.status', '사양서 상태 분포')}
        subtitle={tf('dash.status.subtitle', { total: statusTotal }, '전체 {total}건 기준')}
        action={{ label: t('nav.specs'), onClick: goSpecs }}
        hero={{
          value: String(deployedPct),
          unit: '%',
          delta: `${deployedDelta > 0 ? '+' : ''}${deployedDelta}%p`,
          deltaGood: deployedDelta >= 0,
          note: tf('dash.status.hero', { n: deployedNow }, '배포 완료 {n}건 · 이전 동일 기간 대비'),
        }}
      >
        {/* ⚠ 누적 막대 → **도넛** (2026-08-13). 79/24/18/7 은 한 조각이 확실히 커서
            "대부분 배포 완료"가 한눈에 읽힌다 — dataviz 가 도넛을 허용하는 조건
            ("part-to-whole at a glance only, ≤6 segments")에 맞는 자리다.
            ⚠ 값이 비슷한 데이터에는 쓰지 않는다 — 각도는 길이보다 견주기 어렵다.
            그래서 범례가 값과 비율을 함께 말한다(각도로 못 읽는 것을 글이 맡는다). */}
        {/* ⚠ 범례 라벨은 **표시만** 옮긴다 — 값(정본 키)은 그대로 둔다(i18n-dict-work 의
            specStatus 절). EN 으로 바꿔도 범례만 한국어로 남던 자리였다. */}
        <DonutChart
          data={statusDistribution.map(({ label, value, fill }) => ({
            label: t(`specStatus.${label}`, label),
            value,
            fill,
          }))}
          centerLabel={t('dash.status.center', '전체 사양서')}
        />
      </ChartCard>
    ),
    heatmap: (
      <ChartCard
        title={t('widget.heatmap', '검증 실행 히트맵')}
        subtitle={t('dash.heatmap.subtitle', '최근 25주 · 일별 처리량 (짙을수록 많음)')}
        action={{ label: t('nav.reports'), onClick: goReports }}
      >
        <ActivityHeatmap days={heatmapDays} />
      </ChartCard>
    ),
    queue: (
      <ChartCard
        title={t('widget.queue', '승인 대기 큐')}
        subtitle={tf('dash.queue.subtitle', { n: approvalQueue.length }, '{n}건이 결재를 기다립니다')}
        action={{ label: t('nav.approvals'), onClick: goApprovals }}
      >
        <ol className="space-y-1.5">
          {approvalQueue.map((q) => (
            <li key={q.id}>
              <button
                type="button"
                onClick={() => openSpec(q.id)}
                className="grid w-full grid-cols-[1fr_auto] items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors hover:bg-chip"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[13px] text-ink">{q.name}</span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-subtle">
                    <span className="font-mono">{q.id}</span>
                    {/* ⚠ 버전은 **상태가 아니라 식별자**다 — 포인트 색을 주면 목록마다
                        v2.3·v1.5·v3.1 이 전부 튀어 정작 봐야 할 것(이름·경과일)을 덮는다.
                        DESIGN.md Rules 1: 퍼플 액센트는 화면당 1~2곳(주요 CTA·활성 메뉴).
                        이름표 태그는 **테두리만, 무색**이 정본이다(규약 §5 상태 칩 vs 이름표) */}
                    <span className="rounded-full border border-hairline px-1.5 font-mono">{q.version}</span>
                    {q.owner}
                  </span>
                </span>
                {/* ⚠ **하나의 양에 두 색조를 쓰지 않는다** (DESIGN.md 차트 규칙과 같은 이유).
                    경과일은 1일이든 3일이든 같은 양인데 보라↔빨강으로 갈려 있어서, 화면에
                    색이 두 갈래로 늘고 "무엇이 급한가"는 오히려 흐려졌다.
                    **기준(3일)을 넘긴 것만 색을 얻고 나머지는 중립으로 물러선다** —
                    급한 것 하나가 진짜로 튀어 보인다. 판단은 숫자가 이미 하고 있다. */}
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
                    q.waitingDays >= 3 ? 'bg-danger-bg text-danger-ink' : 'bg-chip text-ink-muted'
                  }`}
                >
                  {tf('dash.queue.waitingDays', { n: q.waitingDays }, '{n}일 경과')}
                </span>
              </button>
            </li>
          ))}
        </ol>
      </ChartCard>
    ),
    errors: (
      <ChartCard
        title={t('widget.errors', '오류 유형별 검출 건수')}
        subtitle={tf(
          'dash.errors.subtitle',
          { range: rangeLabel },
          '{range} 누적 · 증감은 이전 동일 기간 대비',
        )}
        action={{ label: t('dash.action.results'), onClick: goResults }}
      >
        <ErrorBarChart data={scaledErrors} />
      </ChartCard>
    ),
    system: (
      <ChartCard
        title={t('widget.system', '시스템 현황')}
        subtitle={t('dash.system.subtitle', '서버 리소스 · 30초마다 갱신 (Mock)')}
        action={{ label: t('nav.alerts') }}
      >
        {/* 서버 한 줄에 게이지 3개 + 배지가 들어간다 — 칸이 넉넉할 때만 2열 (위 @container) */}
        <div className="grid grid-cols-1 gap-x-6 gap-y-2.5 @3xl:grid-cols-2">
          {serverResources.map((s) => (
            <div key={s.name} className="flex items-center gap-3">
              <span className="w-16 shrink-0 font-mono text-xs font-semibold text-ink">{s.name}</span>
              <Meter label="CPU" pct={s.cpu} />
              <Meter label="MEM" pct={s.mem} />
              <Meter label="DISK" pct={s.disk} />
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${HEALTH_CLS[s.health]}`}>
                {s.health}
              </span>
            </div>
          ))}
        </div>
      </ChartCard>
    ),
    pipeline: (
      <ChartCard
        title={t('widget.pipeline', '데이터 파이프라인')}
        subtitle={t('dash.pipeline.subtitle', 'CDO 수신 · 마트 적재 배치')}
        action={{ label: t('dash.action.results'), onClick: goResults }}
      >
        <ol className="space-y-2">
          {pipelines.map((p) => (
            <li key={p.name} className="flex items-center gap-2.5 text-[13px]">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${
                  p.status === '성공'
                    ? 'bg-deployed-bg text-deployed-ink'
                    : p.status === '실행중'
                      ? 'bg-draft-bg text-draft-ink'
                      : 'bg-danger-bg text-danger-ink'
                }`}
              >
                {p.status === '성공' ? '✓' : p.status === '실행중' ? '↻' : '✕'}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-ink">{p.name}</span>
                <span className="block text-xs tabular-nums text-ink-subtle">
                  {t('dash.pipeline.lastLabel', '마지막')}: {p.last}
                  {p.duration ? ` (${p.duration})` : ''}
                </span>
              </span>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                  p.status === '성공'
                    ? 'bg-deployed-bg text-deployed-ink'
                    : p.status === '실행중'
                      ? 'bg-draft-bg text-draft-ink'
                      : 'bg-danger-bg text-danger-ink'
                }`}
              >
                {p.status}
              </span>
            </li>
          ))}
        </ol>
      </ChartCard>
    ),
    members: (
      <ChartCard
        title={t('widget.members', '권한별 회원 분포')}
        subtitle={t('dash.members.subtitle', '전체 66명 기준')}
        action={{ label: t('nav.members'), onClick: () => navigate({ to: '/members' }) }}
      >
        <StatusStackBar data={memberRoles} />
      </ChartCard>
    ),
    notice: (
      <ChartCard
        title={t('widget.notice', '최근 공지')}
        subtitle={t('dash.notice.subtitle', '고정 공지 우선')}
        action={{ label: t('nav.notice'), onClick: () => navigate({ to: '/notice' }) }}
      >
        <ol className="space-y-2.5">
          {[...notices.filter((n) => n.pinned), ...notices.filter((n) => !n.pinned)]
            .slice(0, 3)
            .map((n) => (
              <li key={n.id} className="flex items-start gap-2 text-[13px]">
                <span
                  className={`mt-0.5 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                    n.pinned ? 'bg-primary/15 text-primary' : 'bg-chip text-ink-subtle'
                  }`}
                >
                  {n.pinned ? t('dash.notice.pinnedBadge', '고정') : n.category}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-ink">{n.title}</span>
                  <span className="block text-xs tabular-nums text-ink-subtle">{n.date}</span>
                </span>
              </li>
            ))}
        </ol>
        {/* ⚠ 카드가 `slice(0, 3)` 으로 자르는 순간 조용히 거짓말을 한다 — 6건 중 3건만
            보여 주면서 아무 표시가 없었다(2026-08-13 실측). 위젯은 쪽을 나누지 않고
            **전체로 가는 길**을 발에 둔다 (규약 §9). */}
        <ListFoot
          total={notices.length}
          shown={Math.min(3, notices.length)}
          more={{ label: t('dash.action.viewAll', '전체 보기'), onClick: () => navigate({ to: '/notice' }) }}
        />
      </ChartCard>
    ),
    activity: (
      <ChartCard title={t('widget.activity', '최근 활동')} action={{ label: t('dash.action.viewAll') }}>
        <ol className="space-y-3.5">
          {recentActivity.map((a) => (
            <li key={a.text} className="flex items-start gap-2.5 text-[13px]">
              <ActivityIcon kind={a.kind} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-ink">{a.text}</span>
                <span className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-subtle">
                  <Avatar name={a.author} size={16} />
                  {a.author} · {a.time}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </ChartCard>
    ),
  }

  return (
    <AppShell active="dashboard" title={t('dash.title')}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('dash.title')}</h1>
          <p className="mt-1 text-[13px] text-ink-subtle">{t('dash.subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* 기간 칩 — 영문이 길어져도 내용 따라 늘고, 줄이 부족하면 wrap (규약 §4-5) */}
          <div className="flex w-fit flex-wrap gap-1 rounded-lg border border-hairline bg-surface p-1 text-[13px]">
            {RANGES.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => setRange(r.key)}
                className={`rounded-md px-3 py-1.5 transition-colors ${
                  range === r.key
                    ? 'bg-gradient-to-r from-primary to-accent2 font-semibold text-white shadow-[0_2px_10px_var(--color-glow)]'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                {t(`dash.range.${r.key}`, r.label)}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className={`h-[38px] rounded-lg border px-3.5 text-[13px] font-medium transition-colors ${
              editing
                ? 'border-primary/50 bg-primary/15 text-primary'
                : 'border-hairline bg-surface text-ink-muted hover:text-ink'
            }`}
          >
            {editing ? t('dash.done') : t('dash.editWidgets')}
          </button>
        </div>
      </div>

      {editing && (
        <div className="anim-fade-in mt-4 rounded-xl border border-primary/30 bg-primary/6 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] font-medium text-ink">{t('dash.presetHeading', '역할 추천 프리셋')}</span>
            {ROLE_PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => apply(p.layout)}
                title={t(`dash.presetDesc.${p.key}`, p.desc)}
                className="rounded-full border border-hairline bg-surface px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:border-primary/40 hover:text-ink"
              >
                {t(`dash.preset.${p.key}`, p.label)}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-subtle">
            {t(
              'dash.presetHint1',
              '프리셋은 역할의 기능(RBAC)에서 파생된 추천 구성입니다 — 역할에 기능이 더해지거나 빠지면 프리셋도 따라 바뀝니다. 적용 후 카드를',
            )}{' '}
            <b>{t('dash.presetHint.drag', '끌어다 놓거나')}</b>{' '}
            {t(
              'dash.presetHint2',
              '◀ ▶(위치)·칸수(크기)· ✕(숨김)으로 자유롭게 고치세요. 바꾸는 즉시 저장됩니다.',
            )}
          </p>
          {hiddenWidgets.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-ink-subtle">{t('dash.hiddenWidgetsLabel', '숨긴 위젯:')}</span>
              {hiddenWidgets.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => show(id)}
                  className="rounded-full border border-dashed border-hairline px-2.5 py-1 text-ink-muted transition-colors hover:border-primary/40 hover:text-ink"
                >
                  + {t(`widget.${id}`, WIDGET_META[id].title)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 첫 진입: 위젯 자리 그대로 스켈레톤(안은 셔머·겉은 보더 빔) — 걷히면 스프링 등장 */}
      {!booted && (
        <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
          {layout.map((slot) => (
            <div key={slot.id} className={SPAN[slot.size]}>
              <WidgetSkeleton tall={slot.size > 1} />
            </div>
          ))}
        </div>
      )}

      {booted && (
      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
        {layout.map((slot, idx) => (
          /* layout 스프링 — 드래그·화살표·크기 변경으로 자리가 바뀌면 미끄러져 이동한다.
             ⚠ CSS anim-fade-up 을 여기 쓰면 안 된다 — fill:both 가 transform 을 고정해
             motion 의 layout 이동(transform 기반)을 죽인다(.card-hover 때 실증한 함정) */
          <m.div
            key={slot.id}
            layout
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              layout: layoutSpring,
              opacity: { duration: 0.35, delay: Math.min(idx, 6) * 0.06 },
              y: { ...layoutSpring, delay: Math.min(idx, 6) * 0.06 },
            }}
            draggable={editing}
            onDragStart={() => setDragIdx(idx)}
            onDragEnd={() => {
              setDragIdx(null)
              setDropIdx(null)
            }}
            onDragOver={(e) => {
              if (dragIdx == null) return
              e.preventDefault()
              setDropIdx(idx)
            }}
            onDrop={(e) => {
              e.preventDefault()
              if (dragIdx == null || dragIdx === idx) return
              const next = [...layout]
              const [moved] = next.splice(dragIdx, 1)
              next.splice(idx, 0, moved)
              apply(next)
              setDragIdx(null)
              setDropIdx(null)
            }}
            /* ⚠⚠ `@container` — **위젯 안은 뷰포트가 아니라 자기 칸 폭을 본다.**
               이 화면의 칸은 사람이 바꾼다(1칸·2칸·전체). 뷰포트 브레이크포인트(sm:·xl:)로
               접으면 1920 에서 1칸(≈530px)짜리 위젯이 "넓은 화면"인 줄 알고 4열로 펴져
               글자가 짓눌린다 — 뷰포트로는 영영 못 맞추는 부류다.
               안쪽은 @lg:·@3xl: 같은 컨테이너 변형으로 쓴다 (2026-08-11 시범 채택). */
            className={`relative @container ${SPAN[slot.size]} ${
              editing ? 'cursor-grab rounded-2xl ring-2 active:cursor-grabbing' : ''
            } ${
              editing
                ? dropIdx === idx && dragIdx !== idx
                  ? 'ring-primary'
                  : 'ring-primary/35'
                : ''
            } ${dragIdx === idx ? 'opacity-50' : ''}`}
          >
            {editing && (
              <div className="absolute -top-3 right-3 z-10 flex items-center gap-1 rounded-full border border-hairline bg-raised px-1.5 py-1 shadow-lg">
                <button
                  type="button"
                  aria-label={t('dash.aria.moveEarlier', '앞으로')}
                  onClick={() => move(idx, -1)}
                  disabled={idx === 0}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-chip hover:text-ink disabled:opacity-30"
                >
                  ◀
                </button>
                <button
                  type="button"
                  aria-label={t('dash.aria.moveLater', '뒤로')}
                  onClick={() => move(idx, 1)}
                  disabled={idx === layout.length - 1}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-chip hover:text-ink disabled:opacity-30"
                >
                  ▶
                </button>
                <button
                  type="button"
                  onClick={() => resize(idx)}
                  title={t('dash.resizeTitle', '크기 바꾸기')}
                  className="rounded-full px-2 py-0.5 text-xs font-semibold text-ink-muted transition-colors hover:bg-chip hover:text-ink"
                >
                  {t(`dash.size.${slot.size}`, SIZE_LABEL[slot.size])}
                </button>
                <button
                  type="button"
                  aria-label={t('dash.aria.hide', '숨기기')}
                  onClick={() => hide(idx)}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-danger-bg hover:text-danger-ink"
                >
                  ✕
                </button>
              </div>
            )}
            {widgetBody[slot.id]}
          </m.div>
        ))}
      </div>
      )}
    </AppShell>
  )
}
