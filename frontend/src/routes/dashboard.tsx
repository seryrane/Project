import { useEffect, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { AppShell } from '#/components/portal/AppShell'
import { Avatar } from '#/components/portal/Avatar'
import {
  ActivityHeatmap,
  ChartCard,
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
  recentActivity,
  statusDistribution,
  validationSeries,
} from '#/data/dashboard'
import type { ActivityKind } from '#/data/dashboard'
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

const SPAN: Record<WidgetSize, string> = {
  1: '',
  2: 'xl:col-span-2',
  3: 'xl:col-span-3',
}
const SIZE_LABEL: Record<WidgetSize, string> = { 1: '1칸', 2: '2칸', 3: '전체' }

function DashboardPage() {
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
  useEffect(() => {
    setLayout(loadLayout())
  }, [])
  const apply = (next: Array<WidgetSlot>) => {
    setLayout(next)
    saveLayout(next)
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
  const rangeLabel = RANGES.find((r) => r.key === range)?.label

  // 오류 유형도 기간을 따른다 — 30일 기준값을 기간 비율로 편 결정적 mock
  const scaledErrors = errorTypes.map((e) => ({
    ...e,
    value: Math.round((e.value * range) / 30),
    prev: Math.round((e.prev * range) / 30),
  }))

  const widgetBody: Record<WidgetId, React.ReactNode> = {
    kpi: (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="총 사양서" value="128" delta="+6" deltaGood spark={kpiSparks.specs} caption="최근 14일 추이" />
        <StatTile label="승인 대기" value="7" delta="+2" deltaGood={false} spark={kpiSparks.pending} caption="최근 14일 추이" />
        <StatTile label="검증 성공률" value="96.8%" delta="+1.2%p" deltaGood spark={kpiSparks.successRate} caption="최근 14일 추이" />
        <StatTile
          label="기간 검증 처리"
          value={compactSum(slice.map((d) => d.value))}
          delta={`${deltaPct >= 0 ? '+' : ''}${deltaPct.toFixed(1)}%`}
          deltaGood={deltaPct >= 0}
          spark={kpiSparks.processed}
          caption="vs 이전 동일 기간"
        />
      </div>
    ),
    trend: (
      <ChartCard
        title="일별 검증 처리량"
        subtitle={`${rangeLabel} · 단위: 천 건 · 점선은 이전 동일 기간`}
        action={{ label: '검증 결과', onClick: goResults }}
      >
        <TrendLineChart data={slice} compare={prevSlice.length === slice.length ? prevSlice : undefined} />
      </ChartCard>
    ),
    status: (
      <ChartCard title="사양서 상태 분포" subtitle="전체 128건 기준" action={{ label: '사양서 관리', onClick: goSpecs }}>
        <StatusStackBar data={statusDistribution} />
      </ChartCard>
    ),
    heatmap: (
      <ChartCard
        title="검증 실행 히트맵"
        subtitle="최근 25주 · 일별 처리량 (짙을수록 많음)"
        action={{ label: '검증 리포트', onClick: goReports }}
      >
        <ActivityHeatmap days={heatmapDays} />
      </ChartCard>
    ),
    queue: (
      <ChartCard
        title="승인 대기 큐"
        subtitle={`${approvalQueue.length}건이 결재를 기다립니다`}
        action={{ label: '승인 관리', onClick: goApprovals }}
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
                    <span className="rounded-full bg-primary/12 px-1.5 font-mono text-primary">{q.version}</span>
                    {q.owner}
                  </span>
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
                    q.waitingDays >= 3 ? 'bg-danger-bg text-danger-ink' : 'bg-pending-bg text-pending-ink'
                  }`}
                >
                  {q.waitingDays}일 경과
                </span>
              </button>
            </li>
          ))}
        </ol>
      </ChartCard>
    ),
    errors: (
      <ChartCard
        title="오류 유형별 검출 건수"
        subtitle={`${rangeLabel} 누적 · 증감은 이전 동일 기간 대비`}
        action={{ label: '검증 결과', onClick: goResults }}
      >
        <ErrorBarChart data={scaledErrors} />
      </ChartCard>
    ),
    activity: (
      <ChartCard title="최근 활동" action={{ label: '전체 보기' }}>
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
    <AppShell active="dashboard" title="대시보드">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">대시보드</h1>
          <p className="mt-1 text-[13px] text-ink-subtle">
            IDMS 사양 관리 · 검증 현황 요약 (Mock 데이터) · 마지막 집계 오늘 06:00
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex w-fit gap-1 rounded-lg border border-hairline bg-surface p-1 text-[13px]">
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
                {r.label}
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
            {editing ? '완료' : '위젯 편집'}
          </button>
        </div>
      </div>

      {editing && (
        <div className="anim-fade-in mt-4 rounded-xl border border-primary/30 bg-primary/6 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] font-medium text-ink">역할 추천 프리셋</span>
            {ROLE_PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => apply(p.layout)}
                title={p.desc}
                className="rounded-full border border-hairline bg-surface px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:border-primary/40 hover:text-ink"
              >
                {p.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-subtle">
            프리셋은 역할의 기능(RBAC)에서 파생된 추천 구성입니다 — 역할에 기능이 더해지거나
            빠지면 프리셋도 따라 바뀝니다. 적용 후 카드를 <b>끌어다 놓거나</b> ◀ ▶(위치)·칸수(크기)·
            ✕(숨김)으로 자유롭게 고치세요. 바꾸는 즉시 저장됩니다.
          </p>
          {hiddenWidgets.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-ink-subtle">숨긴 위젯:</span>
              {hiddenWidgets.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => show(id)}
                  className="rounded-full border border-dashed border-hairline px-2.5 py-1 text-ink-muted transition-colors hover:border-primary/40 hover:text-ink"
                >
                  + {WIDGET_META[id].title}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
        {layout.map((slot, idx) => (
          <div
            key={slot.id}
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
            className={`anim-fade-up relative ${SPAN[slot.size]} ${
              editing ? 'cursor-grab rounded-2xl ring-2 active:cursor-grabbing' : ''
            } ${
              editing
                ? dropIdx === idx && dragIdx !== idx
                  ? 'ring-primary'
                  : 'ring-primary/35'
                : ''
            } ${dragIdx === idx ? 'opacity-50' : ''}`}
            style={{ animationDelay: `${Math.min(idx, 6) * 60}ms` }}
          >
            {editing && (
              <div className="absolute -top-3 right-3 z-10 flex items-center gap-1 rounded-full border border-hairline bg-raised px-1.5 py-1 shadow-lg">
                <button
                  type="button"
                  aria-label="앞으로"
                  onClick={() => move(idx, -1)}
                  disabled={idx === 0}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-chip hover:text-ink disabled:opacity-30"
                >
                  ◀
                </button>
                <button
                  type="button"
                  aria-label="뒤로"
                  onClick={() => move(idx, 1)}
                  disabled={idx === layout.length - 1}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-chip hover:text-ink disabled:opacity-30"
                >
                  ▶
                </button>
                <button
                  type="button"
                  onClick={() => resize(idx)}
                  title="크기 바꾸기"
                  className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-ink-muted transition-colors hover:bg-chip hover:text-ink"
                >
                  {SIZE_LABEL[slot.size]}
                </button>
                <button
                  type="button"
                  aria-label="숨기기"
                  onClick={() => hide(idx)}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-danger-bg hover:text-danger-ink"
                >
                  ✕
                </button>
              </div>
            )}
            {widgetBody[slot.id]}
          </div>
        ))}
      </div>
    </AppShell>
  )
}
