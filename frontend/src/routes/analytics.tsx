import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { AppShell } from '#/components/portal/AppShell'
import { ChartCard, StatTile, TrendLineChart } from '#/components/portal/charts'
import {
  analyticsSparks,
  kpiMonthlyActual,
  kpiMonthlyTarget,
  orgAttainment,
  underperforming,
} from '#/data/analytics'

export const Route = createFileRoute('/analytics')({ component: AnalyticsPage })

/** 조직별 달성률 — 100% 목표선을 함께 그린다. 숫자는 우측 정렬 + tabular-nums */
function AttainmentBars() {
  const [hover, setHover] = useState<number | null>(null)
  const max = 120 // 축 상한 — 100% 목표선이 안쪽에 서도록
  return (
    <div className="space-y-1.5">
      {orgAttainment.map((o, i) => {
        const met = o.value >= 100
        const delta = o.value - o.prev
        return (
          <div
            key={o.name}
            className="grid min-h-6 grid-cols-[150px_1fr_auto] items-center gap-3 py-0.5"
            onPointerEnter={() => setHover(i)}
            onPointerLeave={() => setHover(null)}
          >
            <span className="truncate text-xs text-ink-muted">{o.name}</span>
            <span className="relative flex items-center">
              <span className="relative h-4 w-full overflow-hidden rounded-[4px] bg-chip">
                <span
                  className="absolute inset-y-0 left-0 rounded-r-[4px] transition-opacity"
                  style={{
                    width: `${(o.value / max) * 100}%`,
                    backgroundColor: met ? 'var(--color-fill-deployed)' : 'var(--color-fill-pending)',
                    opacity: hover == null || hover === i ? 1 : 0.45,
                  }}
                />
                {/* 100% 목표선 */}
                <span
                  className="absolute inset-y-0 w-px bg-ink-subtle"
                  style={{ left: `${(100 / max) * 100}%` }}
                />
              </span>
            </span>
            <span className="flex items-center gap-2">
              <span className="w-11 text-right text-xs font-semibold tabular-nums text-ink">{o.value}%</span>
              <span
                className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${
                  delta >= 0 ? 'bg-deployed-bg text-deployed-ink' : 'bg-danger-bg text-danger-ink'
                }`}
              >
                {delta >= 0 ? '▲' : '▼'}
                {Math.abs(delta)}%p
              </span>
            </span>
          </div>
        )
      })}
      <p className="pt-1 text-[11px] text-ink-subtle">세로선 = 목표(100%) · 증감은 전월 대비</p>
    </div>
  )
}

function AnalyticsPage() {
  return (
    <AppShell active="analytics" title="통계 & 분석">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">통계 & 분석</h1>
          <p className="mt-1 text-[13px] text-ink-subtle">
            ICDAP KPI 시안 (Mock 데이터) · 범위: 전사 · 마지막 집계 오늘 06:00
          </p>
        </div>
      </div>

      <div className="anim-fade-up mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="전사 KPI 달성률"
          value="92.4%"
          delta="+3.1%p"
          deltaGood
          spark={analyticsSparks.attainment}
          caption="8월은 진행 중 (예상)"
        />
        <StatTile label="목표 달성 조직" value="9 / 14" delta="+2" deltaGood caption="달성률 100% 이상" />
        <StatTile label="미달 KPI" value="4건" delta="-2" deltaGood caption="전월 6건 → 4건" />
        <StatTile
          label="IVI MAU"
          value="214K"
          delta="+8.2%"
          deltaGood
          spark={analyticsSparks.mau}
          caption="최근 14일 추이"
        />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <ChartCard
          title="월별 KPI 달성률 — 목표 vs 실적"
          subtitle="2026년 · 단위: % · 8월은 진행 중이라 예상치다"
          action={{ label: 'KPI 관리' }}
          className="anim-fade-up [animation-delay:80ms] xl:col-span-2"
        >
          <TrendLineChart
            data={kpiMonthlyActual}
            compare={kpiMonthlyTarget}
            unit="%"
            labels={{ main: '실적', compare: '목표' }}
          />
        </ChartCard>

        <ChartCard
          title="미달 KPI"
          subtitle="달성률 100% 미만 — 이름을 부른다"
          action={{ label: 'KPI 상세' }}
          className="anim-fade-up [animation-delay:140ms]"
        >
          <ol className="space-y-1.5">
            {underperforming.map((k) => (
              <li
                key={k.name}
                className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-chip"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[13px] text-ink">{k.name}</span>
                  <span className="mt-0.5 block text-xs text-ink-subtle">
                    {k.org} · {k.owner}
                  </span>
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
                    k.attainment < 85 ? 'bg-danger-bg text-danger-ink' : 'bg-review-bg text-review-ink'
                  }`}
                >
                  {k.attainment}%
                </span>
              </li>
            ))}
          </ol>
        </ChartCard>

        <ChartCard
          title="조직별 KPI 달성률"
          subtitle="이번 달 기준 · 초록 = 목표 달성"
          action={{ label: '조직 KPI' }}
          className="anim-fade-up [animation-delay:200ms] xl:col-span-3"
        >
          <AttainmentBars />
        </ChartCard>
      </div>
    </AppShell>
  )
}
