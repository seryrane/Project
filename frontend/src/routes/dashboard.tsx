import { useState } from 'react'
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

function DashboardPage() {
  const [range, setRange] = useState(30)
  const navigate = useNavigate()
  const goSpecs = () => navigate({ to: '/specs' })

  const slice = validationSeries.slice(-range)
  const prevSlice = validationSeries.slice(-range * 2, -range)
  const sum = slice.reduce((a, d) => a + d.value, 0)
  const prevSum = prevSlice.reduce((a, d) => a + d.value, 0)
  const deltaPct = prevSum > 0 ? ((sum - prevSum) / prevSum) * 100 : 0
  const rangeLabel = RANGES.find((r) => r.key === range)?.label

  return (
    <AppShell active="dashboard" title="대시보드">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">대시보드</h1>
          <p className="mt-1 text-[13px] text-ink-subtle">
            IDMS 사양 관리 · 검증 현황 요약 (Mock 데이터) · 마지막 집계 오늘 06:00
          </p>
        </div>
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
      </div>

      <div className="anim-fade-up mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="총 사양서"
          value="128"
          delta="+6"
          deltaGood
          spark={kpiSparks.specs}
          caption="최근 14일 추이"
        />
        <StatTile
          label="승인 대기"
          value="7"
          delta="+2"
          deltaGood={false}
          spark={kpiSparks.pending}
          caption="최근 14일 추이"
        />
        <StatTile
          label="검증 성공률"
          value="96.8%"
          delta="+1.2%p"
          deltaGood
          spark={kpiSparks.successRate}
          caption="최근 14일 추이"
        />
        <StatTile
          label="기간 검증 처리"
          value={compactSum(slice.map((d) => d.value))}
          delta={`${deltaPct >= 0 ? '+' : ''}${deltaPct.toFixed(1)}%`}
          deltaGood={deltaPct >= 0}
          spark={kpiSparks.processed}
          caption="vs 이전 동일 기간"
        />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <ChartCard
          title="일별 검증 처리량"
          subtitle={`${rangeLabel} · 단위: 천 건 · 점선은 이전 동일 기간`}
          action={{ label: '검증 결과' }}
          className="anim-fade-up [animation-delay:80ms] xl:col-span-2"
        >
          <TrendLineChart data={slice} compare={prevSlice.length === slice.length ? prevSlice : undefined} />
        </ChartCard>

        <ChartCard
          title="사양서 상태 분포"
          subtitle="전체 128건 기준"
          action={{ label: '사양서 관리', onClick: goSpecs }}
          className="anim-fade-up [animation-delay:140ms]"
        >
          <StatusStackBar data={statusDistribution} />
        </ChartCard>

        <ChartCard
          title="검증 실행 히트맵"
          subtitle="최근 25주 · 일별 처리량 (짙을수록 많음)"
          action={{ label: '검증 리포트' }}
          className="anim-fade-up [animation-delay:200ms] xl:col-span-2"
        >
          <ActivityHeatmap days={heatmapDays} />
        </ChartCard>

        <ChartCard
          title="승인 대기 큐"
          subtitle={`${approvalQueue.length}건이 결재를 기다립니다`}
          action={{ label: '승인 관리' }}
          className="anim-fade-up [animation-delay:260ms]"
        >
          <ol className="space-y-1.5">
            {approvalQueue.map((q) => (
              <li key={q.id}>
                <button
                  type="button"
                  onClick={goSpecs}
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

        <ChartCard
          title="오류 유형별 검출 건수"
          subtitle={`${rangeLabel} 누적 · 증감은 이전 동일 기간 대비`}
          action={{ label: '검증 결과' }}
          className="anim-fade-up [animation-delay:320ms] xl:col-span-2"
        >
          <ErrorBarChart data={errorTypes} />
        </ChartCard>

        <ChartCard
          title="최근 활동"
          action={{ label: '전체 보기' }}
          className="anim-fade-up [animation-delay:380ms]"
        >
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
      </div>
    </AppShell>
  )
}
