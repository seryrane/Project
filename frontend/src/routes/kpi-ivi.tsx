import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { AppShell } from '#/components/portal/AppShell'
import { ChartCard, StatTile, TrendLineChart } from '#/components/portal/charts'
import { useToast } from '#/components/portal/toast'
import { iviTrend } from '#/data/kpi'

export const Route = createFileRoute('/kpi-ivi')({ component: KpiIviPage })

/**
 * 인포 IVI KPI (FR-075) — **Tableau 임베딩 뷰와 자체 UI 표출을 병행 제공**한다(AC①).
 * 임베딩은 Connected App/Trusted Ticket 기반 SSO 인증(FR: Tableau 연동)이 확정돼야
 * 실제로 붙는다 — 그 전까지 자리와 전환 구조를 정확히 만들어 둔다.
 * 지표별 표출 방식(임베딩 vs 자체)은 설계서에 정의·승인된다(AC②).
 */
function KpiIviPage() {
  const toast = useToast()
  const [mode, setMode] = useState<'tableau' | 'native'>('tableau')

  const trendData = iviTrend.days.map((d, i) => ({ date: d, value: iviTrend.appLaunch[i] }))

  return (
    <AppShell active="kpi-ivi" title="인포 IVI KPI">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">인포 IVI KPI</h1>
          <p className="mt-1 text-[13px] text-ink-subtle">
            IVI 지표 — Tableau 임베딩과 자체 UI 를 병행 제공 (FR-075)
          </p>
        </div>
        {/* 표출 방식 전환 — 1차는 임베딩으로 빠르게, 2차부터 웹 전환(전환 전략) */}
        <div className="flex overflow-hidden rounded-lg border border-hairline">
          {(
            [
              { key: 'tableau', label: 'Tableau 임베딩' },
              { key: 'native', label: '자체 UI' },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              aria-pressed={mode === t.key}
              onClick={() => setMode(t.key)}
              className={`h-9 px-3.5 text-[13px] font-medium transition-colors ${
                mode === t.key ? 'bg-primary/15 text-primary' : 'text-ink-muted hover:bg-chip hover:text-ink'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {mode === 'tableau' ? (
        /* 임베딩 자리 — SSO 토큰 연계(이중 로그인 차단)가 확정돼야 실물이 붙는다 */
        <section className="anim-fade-up card-spotlight mt-5 rounded-2xl border border-hairline bg-surface">
          <div className="flex items-center justify-between border-b border-hairline bg-canvas/50 px-5 py-3.5">
            <h2 className="text-sm font-semibold text-ink">IVI KPI 워크북 (Tableau)</h2>
            <span className="text-[11px] text-ink-subtle">Embedding API · Connected App SSO</span>
          </div>
          <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 p-8 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/12 text-primary">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
                <rect x="3" y="4" width="18" height="14" rx="2" />
                <path d="M3 9h18M8 21h8M12 18v3" />
              </svg>
            </span>
            <p className="text-[15px] font-semibold text-ink">Tableau 임베딩 자리</p>
            <p className="max-w-md text-[13px] leading-relaxed text-ink-subtle">
              Connected App(Trusted Ticket) 기반 SSO 토큰 연계가 확정되면 이 자리에 IVI KPI
              워크북이 이중 로그인 없이 표시됩니다. 임베딩 파라미터(차종·기간)는 상단 필터와
              연동됩니다.
            </p>
            <button
              type="button"
              onClick={() => toast('Tableau 연동은 SSO 방식(Connected App/Trusted Ticket) 확정 후 연결됩니다')}
              className="mt-1 h-9 rounded-lg border border-hairline bg-chip px-4 text-[13px] font-medium text-ink-muted transition-colors hover:border-primary/40 hover:text-ink"
            >
              연동 상태 확인
            </button>
          </div>
        </section>
      ) : (
        /* 자체 UI — 마트 집계 기반. 2차 오픈부터 웹 전환의 종착점 */
        <>
          <div className="mt-5 grid grid-cols-2 gap-3 pc:grid-cols-4">
            <StatTile label="앱 일 실행 수" value="1,062" delta="+6.4%" deltaGood spark={iviTrend.appLaunch} caption="최근 7일" />
            <StatTile label="OTA 업데이트 완료율" value="95.1%" delta="+0.5%p" deltaGood spark={iviTrend.otaRate} caption="최근 7일" />
            <StatTile label="음성 명령 성공률" value="88.7%" delta="+1.1%p" deltaGood caption="일 1회 집계" />
            <StatTile label="내비 연동 오류" value="34건" delta="-12건" deltaGood caption="어제 기준" />
          </div>
          <div className="anim-fade-up mt-5 [animation-delay:80ms]">
            <ChartCard title="IVI 앱 일 실행 추이" subtitle="mart_ivi_usage · 일 1회 배치 (FR-072)">
              <TrendLineChart data={trendData} unit="회" labels={{ main: '최근 7일', compare: '이전' }} />
            </ChartCard>
          </div>
        </>
      )}
    </AppShell>
  )
}
