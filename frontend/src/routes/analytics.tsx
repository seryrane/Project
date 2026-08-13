import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { AppShell } from '#/components/portal/AppShell'
import {
  ChartCard,
  GroupedBarChart,
  MultiLineChart,
  StatTile,
  TimeHeatmap,
  TrendLineChart,
} from '#/components/portal/charts'
import {
  analyticsSparks,
  approvalTimeHeat,
  kpiMonthlyActual,
  kpiMonthlyTarget,
  monthlyDeploys,
  orgAttainment,
  qualityMetrics,
  todayPerformance,
  underperforming,
  weeklyApprovals,
} from '#/data/analytics'
import { useI18n } from '#/lib/i18n'

export const Route = createFileRoute('/analytics')({ component: AnalyticsPage })

/** 조직별 달성률 — 100% 목표선을 함께 그린다. 숫자는 우측 정렬 + tabular-nums */
function AttainmentBars() {
  const { t } = useI18n()
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
                    // ⚠ 미달을 **다른 색조**로 칠하지 않는다 — 하나의 양(달성률)에 두 색을
                    //   쓰면 화면이 무지개가 되고(2026-08-11 사용자 지적: "막대 색이 촌스럽다"),
                    //   판단은 이미 목표선·숫자·증감 칩 세 곳이 하고 있다.
                    //   달성만 색을 얻고 미달은 중립으로 물러선다.
                    backgroundColor: met ? 'var(--color-fill-deployed)' : 'var(--color-fill-draft)',
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
                className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold tabular-nums ${
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
      <p className="pt-1 text-xs text-ink-subtle">
        {t('analytics.attainment.caption', '세로선 = 목표(100%) · 증감은 전월 대비')}
      </p>
    </div>
  )
}

function AnalyticsPage() {
  const { t } = useI18n()
  return (
    <AppShell active="analytics" title={t('analytics.title', '통계 & 분석')}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('nav.analytics', '센터 KPI 대시보드')}</h1>
          <p className="mt-1 text-[13px] text-ink-subtle">
            {t(
              'page.analytics.subtitle',
              'ICDAP KPI 시안 (Mock 데이터) · 범위: 전사 · 마지막 집계 오늘 06:00',
            )}
          </p>
        </div>
      </div>

      <div className="anim-fade-up mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label={t('analytics.stat.attainment', '전사 KPI 달성률')}
          value="92.4%"
          delta="+3.1%p"
          deltaGood
          spark={analyticsSparks.attainment}
          caption={t('analytics.stat.attainmentCaption', '8월은 진행 중 (예상)')}
        />
        <StatTile
          label={t('analytics.stat.orgsMet', '목표 달성 조직')}
          value="9 / 14"
          delta="+2"
          deltaGood
          caption={t('analytics.stat.orgsMetCaption', '달성률 100% 이상')}
        />
        <StatTile
          label={t('analytics.stat.underKpi', '미달 KPI')}
          value="4건"
          delta="-2"
          deltaGood
          caption={t('analytics.stat.underKpiCaption', '전월 6건 → 4건')}
        />
        <StatTile
          label={t('analytics.stat.iviMau', 'IVI MAU')}
          value="214K"
          delta="+8.2%"
          deltaGood
          spark={analyticsSparks.mau}
          caption={t('analytics.caption.trend14', '최근 14일 추이')}
        />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <ChartCard
          title={t('analytics.chart.monthlyAttain.title', '월별 KPI 달성률 — 목표 vs 실적')}
          subtitle={t('analytics.chart.monthlyAttain.subtitle', '2026년 · 단위: % · 8월은 진행 중이라 예상치다')}
          action={{ label: t('analytics.action.kpi') }}
          className="anim-fade-up [animation-delay:80ms] xl:col-span-2"
        >
          <TrendLineChart
            data={kpiMonthlyActual}
            compare={kpiMonthlyTarget}
            unit="%"
            labels={{ main: t('analytics.legend.actual', '실적'), compare: t('analytics.legend.target', '목표') }}
          />
        </ChartCard>

        <ChartCard
          title={t('analytics.stat.underKpi', '미달 KPI')}
          subtitle={t('analytics.chart.underKpi.subtitle', '달성률 100% 미만 — 이름을 부른다')}
          action={{ label: t('analytics.action.kpiDetail') }}
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
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
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
          title={t('analytics.chart.orgAttain.title', '조직별 KPI 달성률')}
          subtitle={t('analytics.chart.orgAttain.subtitle', '이번 달 기준 · 초록 = 목표 달성')}
          action={{ label: t('analytics.action.orgKpi') }}
          className="anim-fade-up [animation-delay:200ms] xl:col-span-3"
        >
          <AttainmentBars />
        </ChartCard>

        {/* ---- 운영 통계 (IDMS 운영 현황) ---- */}
        <ChartCard
          title={t('analytics.chart.weeklyApprovals.title', '주차별 승인 처리 현황')}
          subtitle={t('analytics.chart.weeklyApprovals.subtitle', '최근 5주 · 단위: 건')}
          className="anim-fade-up [animation-delay:260ms] xl:col-span-2"
        >
          {/* ⚠ 선이 아니라 **묶은 막대**다 (2026-08-13 사용자 지적: "너무 단순하고 공백도 많고").
              5주 × 3계열은 읽는 사람의 일이 "흐름 보기"가 아니라 **주마다 셋을 견주기**다 —
              선으로 그리면 점이 다섯뿐이라 큰 도화지에 짧은 선 몇 가닥만 남는다.
              dataviz 규칙 "Tell distinct series apart → grouped bar". */}
          <GroupedBarChart
            unit="건"
            series={[
              { name: t('analytics.legend.requested', '요청'), color: 'var(--color-series-1)', data: weeklyApprovals.요청 },
              { name: t('analytics.legend.approved', '승인'), color: 'var(--color-series-3)', data: weeklyApprovals.승인 },
              { name: t('analytics.legend.rejected', '반려'), color: 'var(--color-series-2)', data: weeklyApprovals.반려 },
            ]}
          />
        </ChartCard>

        <ChartCard
          title={t('analytics.chart.specQuality.title', '사양서 품질 지표')}
          subtitle={t('analytics.chart.specQuality.subtitle', '6개 축 · 100점 만점')}
          className="anim-fade-up [animation-delay:320ms]"
        >
          <div className="space-y-2">
            {qualityMetrics.map((q) => (
              <div key={q.label} className="grid grid-cols-[110px_1fr_auto] items-center gap-3">
                <span className="truncate text-xs text-ink-muted">{q.label}</span>
                <span className="h-2 overflow-hidden rounded-full bg-chip">
                  <span
                    className="block h-full rounded-full"
                    style={{
                      width: `${q.value}%`,
                      // 위 조직별 막대와 같은 규칙 — 기준을 넘긴 것만 색을 얻는다
                      backgroundColor: q.value >= 85 ? 'var(--color-fill-deployed)' : 'var(--color-fill-draft)',
                    }}
                  />
                </span>
                <span className="w-8 text-right text-xs font-semibold tabular-nums text-ink">{q.value}</span>
              </div>
            ))}
            <p className="pt-1 text-xs text-ink-subtle">
              {t('analytics.chart.specQuality.caption', '초록 = 85점 이상 · 보라 = 개선 여지')}
            </p>
          </div>
        </ChartCard>

        <ChartCard
          title={t('analytics.chart.todayPerf.title', '오늘 시스템 성능')}
          subtitle={t('analytics.chart.todayPerf.subtitle', '응답시간 (ms) · 08~15시')}
          className="anim-fade-up [animation-delay:380ms] xl:col-span-2"
        >
          <MultiLineChart
            unit="ms"
            series={[
              { name: t('analytics.legend.apiServer', 'API 서버'), color: 'var(--color-series-1)', data: todayPerformance.api },
              { name: t('analytics.legend.db', 'DB'), color: 'var(--color-series-2)', data: todayPerformance.db },
              { name: t('analytics.legend.storage', '파일 스토리지'), color: 'var(--color-series-3)', data: todayPerformance.storage },
            ]}
          />
        </ChartCard>

        <ChartCard
          title={t('analytics.chart.monthlyDeploys.title', '월별 배포 이력')}
          subtitle={t('analytics.chart.monthlyDeploys.subtitle', '최근 5개월 · 단위: 회')}
          className="anim-fade-up [animation-delay:440ms]"
        >
          {/* 5개월 × 3계열 — 위 주차별과 같은 이유로 막대다(달마다 셋을 견준다) */}
          <GroupedBarChart
            unit="회"
            series={[
              { name: t('analytics.legend.prod', '운영 배포'), color: 'var(--color-series-1)', data: monthlyDeploys.운영 },
              { name: t('analytics.legend.staging', '스테이징'), color: 'var(--color-series-3)', data: monthlyDeploys.스테이징 },
              { name: t('analytics.legend.rollback', '롤백'), color: 'var(--color-series-2)', data: monthlyDeploys.롤백 },
            ]}
          />
        </ChartCard>

        <ChartCard
          title={t('analytics.chart.approvalHeat.title', '요일별 승인 처리 시간 분포')}
          subtitle={t('analytics.chart.approvalHeat.subtitle', '최근 4주 평균 · 짙을수록 많음')}
          className="anim-fade-up [animation-delay:500ms] xl:col-span-3"
        >
          <TimeHeatmap
            rows={approvalTimeHeat.rows}
            cols={approvalTimeHeat.cols}
            values={approvalTimeHeat.values}
          />
        </ChartCard>
      </div>
    </AppShell>
  )
}
