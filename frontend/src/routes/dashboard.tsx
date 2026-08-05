import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { AppShell } from '#/components/portal/AppShell'
import { Avatar } from '#/components/portal/Avatar'
import {
  ChartCard,
  ErrorBarChart,
  StatTile,
  StatusStackBar,
  TrendLineChart,
} from '#/components/portal/charts'
import {
  errorTypes,
  recentActivity,
  statusDistribution,
  validationSeries,
} from '#/data/dashboard'

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

function DashboardPage() {
  const [range, setRange] = useState(30)

  const slice = validationSeries.slice(-range)
  const prevSlice = validationSeries.slice(-range * 2, -range)
  const sum = slice.reduce((a, d) => a + d.value, 0)
  const prevSum = prevSlice.reduce((a, d) => a + d.value, 0)
  const deltaPct = prevSum > 0 ? ((sum - prevSum) / prevSum) * 100 : 0

  return (
    <AppShell active="dashboard" title="대시보드">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">대시보드</h1>
          <p className="mt-1 text-[13px] text-ink-subtle">
            IDMS 사양 관리 · 검증 현황 요약 (Mock 데이터)
          </p>
        </div>
      </div>

      <div className="mt-6 flex gap-1 rounded-lg border border-hairline bg-surface p-1 text-[13px] w-fit">
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

      <div className="anim-fade-up mt-5 grid grid-cols-2 gap-5 xl:grid-cols-4">
        <StatTile label="총 사양서" value="128" delta="+6" deltaGood caption="vs 지난 30일" />
        <StatTile label="승인 대기" value="7" delta="+2" deltaGood={false} caption="vs 지난 30일" />
        <StatTile
          label="검증 성공률"
          value="96.8%"
          delta="+1.2%p"
          deltaGood
          caption="vs 지난 30일"
        />
        <StatTile
          label="기간 검증 처리"
          value={compactSum(slice.map((d) => d.value))}
          delta={`${deltaPct >= 0 ? '+' : ''}${deltaPct.toFixed(1)}%`}
          deltaGood={deltaPct >= 0}
          caption="vs 이전 기간"
        />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <ChartCard
          title="일별 검증 처리량"
          subtitle={`${RANGES.find((r) => r.key === range)?.label} · 단위: 천 건`}
          className="anim-fade-up [animation-delay:80ms] xl:col-span-2"
        >
          <TrendLineChart data={slice} />
        </ChartCard>

        <ChartCard title="사양서 상태 분포" subtitle="전체 128건 기준" className="anim-fade-up [animation-delay:140ms]">
          <StatusStackBar data={statusDistribution} />
        </ChartCard>

        <ChartCard
          title="오류 유형별 검출 건수"
          subtitle={`${RANGES.find((r) => r.key === range)?.label} 누적`}
          className="anim-fade-up [animation-delay:200ms] xl:col-span-2"
        >
          <ErrorBarChart data={errorTypes} />
        </ChartCard>

        <ChartCard title="최근 활동" className="anim-fade-up [animation-delay:260ms]">
          <ol className="space-y-3">
            {recentActivity.map((a) => (
              <li key={a.text} className="flex items-start gap-2.5 text-[13px]">
                <Avatar name={a.author} size={22} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-ink">{a.text}</span>
                  <span className="mt-0.5 block text-xs text-ink-subtle">
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
