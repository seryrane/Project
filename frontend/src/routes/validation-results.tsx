import { useMemo, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { AppShell } from '#/components/portal/AppShell'
import { Drawer } from '#/components/portal/Drawer'
import { ChartCard, StatusStackBar, TrendLineChart } from '#/components/portal/charts'
import { useToast } from '#/components/portal/toast'
import { useI18n } from '#/lib/i18n'
import {
  RUN_STATUS_CLS,
  SEVERITY_CLS,
  dailyErrorTrend,
  errorTypeDistribution,
  validationRuns,
} from '#/data/validationResults'
import type { ValidationRun } from '#/data/validationResults'

export const Route = createFileRoute('/validation-results')({ component: ValidationResultsPage })

const STATUS_FILTERS = ['전체', '오류', '재처리 중', '해결', '통과'] as const

function ValidationResultsPage() {
  const { t } = useI18n()
  const toast = useToast()
  const navigate = useNavigate()
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>('전체')
  const [query, setQuery] = useState('')
  const [detail, setDetail] = useState<ValidationRun | null>(null)
  // 프로토타입: 재검증 실행은 화면 상태로만 시늉한다
  const [requeued, setRequeued] = useState<Record<string, boolean>>({})

  const rows = useMemo(
    () =>
      validationRuns.filter((r) => {
        const st = requeued[r.id] ? '재처리 중' : r.status
        const okStatus = status === '전체' || st === status
        const q = query.trim()
        const okQuery = q === '' || `${r.id} ${r.specName} ${r.rule} ${r.errorType}`.includes(q)
        return okStatus && okQuery
      }),
    [status, query, requeued],
  )

  const totals = {
    processed: validationRuns.reduce((a, r) => a + r.total, 0),
    errors: validationRuns.reduce((a, r) => a + r.errors, 0),
    open: validationRuns.filter((r) => (requeued[r.id] ? '재처리 중' : r.status) === '오류').length,
    requeue: validationRuns.filter((r) => (requeued[r.id] ? '재처리 중' : r.status) === '재처리 중').length,
  }
  const successRate = ((1 - totals.errors / totals.processed) * 100).toFixed(2)

  const stats = [
    { label: '기간 검증 처리', value: totals.processed.toLocaleString() },
    { label: '성공률', value: `${successRate}%`, cls: 'text-deployed-ink' },
    { label: '미해결 오류 실행', value: totals.open, cls: 'text-danger-ink' },
    { label: '재처리 대기', value: totals.requeue, cls: 'text-review-ink' },
  ]

  return (
    <AppShell active="results" title="검증 결과 조회">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('nav.results', '검증 결과 조회')}</h1>
          <p className="mt-1 text-[13px] text-ink-subtle">
            {t(
              'page.validation-results.subtitle',
              '배치·실시간 검증 실행과 오류 상세 (Mock 데이터) · 마지막 배치 오늘 06:00',
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => toast('Excel 리포트 내보내기 — 본개발에서 연결됩니다')}
          className="h-9 rounded-lg border border-hairline bg-surface px-3.5 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
        >
          {t('results.exportExcel', 'Excel 내보내기')}
        </button>
      </div>

      <div className="anim-fade-up mt-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card-spotlight rounded-2xl border border-hairline bg-surface px-5 py-4">
            <div className={`text-2xl font-semibold tabular-nums ${s.cls ?? 'text-ink'}`}>{s.value}</div>
            <div className="mt-0.5 text-xs text-ink-subtle">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <ChartCard
          title="일별 오류 · 경고 추이"
          subtitle="최근 7일 · 단위: 건"
          className="anim-fade-up [animation-delay:80ms] xl:col-span-2"
        >
          <TrendLineChart
            data={dailyErrorTrend.errors}
            compare={dailyErrorTrend.warnings}
            unit="건"
            labels={{ main: '오류', compare: '경고' }}
          />
        </ChartCard>
        <ChartCard
          title="오류 유형 분포"
          subtitle="최근 30일 누적"
          className="anim-fade-up [animation-delay:140ms]"
        >
          <StatusStackBar data={errorTypeDistribution} />
        </ChartCard>
      </div>

      <div className="mt-5 flex flex-col gap-3 pc:flex-row pc:items-center">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((s) => {
            const on = status === s
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                  on
                    ? 'border-primary/50 bg-primary/15 text-primary'
                    : 'border-hairline bg-surface text-ink-muted hover:border-primary/30 hover:text-ink'
                }`}
              >
                {/* '전체'만 UI 어휘 — 나머지는 데이터 상태값이라 번역하지 않는다 */}
                {s === '전체' ? t('common.all', '전체') : s}
              </button>
            )
          })}
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('results.searchPlaceholder', '실행 ID, 사양서, Rule 검색...')}
          className="h-10 rounded-lg border border-hairline bg-surface px-3 text-[13px] outline-none placeholder:text-ink-subtle focus:border-primary/60 pc:ml-auto pc:w-64"
        />
      </div>

      <div className="anim-fade-up mt-4 overflow-x-auto card-spotlight rounded-2xl border border-hairline bg-surface">
        <table className="w-full min-w-[900px] border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-hairline bg-canvas/60 text-left text-xs text-ink-subtle">
              <th className="px-4 py-2.5 font-medium">실행</th>
              <th className="px-4 py-2.5 font-medium">일시</th>
              <th className="px-4 py-2.5 font-medium">사양서</th>
              <th className="px-4 py-2.5 font-medium">Rule</th>
              <th className="px-4 py-2.5 font-medium">오류 유형</th>
              <th className="px-4 py-2.5 font-medium">심각도</th>
              <th className="px-4 py-2.5 text-right font-medium">대상</th>
              <th className="px-4 py-2.5 text-right font-medium">오류</th>
              <th className="px-4 py-2.5 font-medium">상태</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const st = requeued[r.id] ? '재처리 중' : r.status
              return (
                <tr
                  key={r.id}
                  onClick={() => setDetail(r)}
                  className="cursor-pointer border-b border-hairline/60 transition-colors last:border-0 hover:bg-chip"
                >
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="font-mono text-xs text-ink-muted">{r.id}</span>
                    <span className="ml-1.5 rounded-full bg-chip px-1.5 py-0.5 text-[10px] text-ink-subtle">
                      {r.mode}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs tabular-nums text-ink-subtle">
                    {r.at}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-ink">{r.specName}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-muted">{r.rule}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-muted">{r.errorType}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${SEVERITY_CLS[r.severity]}`}>
                      {r.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs tabular-nums text-ink-muted">
                    {r.total.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-mono text-xs font-semibold tabular-nums ${r.errors > 0 ? 'text-danger-ink' : 'text-ink-subtle'}`}>
                      {r.errors.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${RUN_STATUS_CLS[st]}`}>
                      {st}
                    </span>
                  </td>
                </tr>
              )
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-sm text-ink-subtle">
                  조건에 맞는 실행이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 오류 상세 — 어느 행·어느 필드가 왜 걸렸는지 + 다음 행동(재검증·사양서) */}
      {detail && (
        <Drawer title={`검증 상세 — ${detail.id}`} onClose={() => setDetail(null)}>
          {(close) => {
            const st = requeued[detail.id] ? '재처리 중' : detail.status
            return (
              <div className="flex h-full flex-col">
                <div className="flex-1 space-y-4">
                  <div className="rounded-xl border border-hairline bg-canvas/50 px-4 py-3 text-[13px]">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${RUN_STATUS_CLS[st]}`}>
                        {st}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${SEVERITY_CLS[detail.severity]}`}>
                        {detail.severity}
                      </span>
                      <span className="text-xs text-ink-subtle">{detail.at} · {detail.mode}</span>
                    </div>
                    <div className="mt-2 font-medium text-ink">{detail.rule}</div>
                    <div className="mt-0.5 text-xs text-ink-muted">
                      {detail.errorType} · 대상 <b className="tabular-nums">{detail.total.toLocaleString()}</b>건 중 오류{' '}
                      <b className="tabular-nums text-danger-ink">{detail.errors.toLocaleString()}</b>건
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      close()
                      navigate({ to: '/specs/$specId', params: { specId: detail.specId } })
                    }}
                    className="flex w-full items-center justify-between rounded-xl border border-hairline px-4 py-3 text-left text-[13px] transition-colors hover:border-primary/40 hover:bg-chip"
                  >
                    <span className="font-medium text-ink">{detail.specName}</span>
                    <span className="text-xs text-primary">{t('results.openSpec', '사양서 열기 →')}</span>
                  </button>

                  <div>
                    <div className="text-xs font-medium text-ink-subtle">
                      오류 샘플 {detail.samples.length > 0 && `(${detail.samples.length}건 표시)`}
                    </div>
                    {detail.samples.length > 0 ? (
                      <ol className="mt-1.5 space-y-2">
                        {detail.samples.map((s2) => (
                          <li key={s2.row} className="rounded-xl border border-hairline bg-canvas/40 px-3.5 py-2.5 text-[13px]">
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span className="font-mono text-ink-subtle">행 {s2.row.toLocaleString()}</span>
                              <span className="rounded-md bg-chip px-1.5 py-0.5 font-medium text-ink-muted">{s2.field}</span>
                              <span className="rounded bg-danger-bg px-1.5 py-0.5 font-mono text-[11px] text-danger-ink">
                                {s2.value}
                              </span>
                            </div>
                            <div className="mt-1 text-xs text-ink-muted">{s2.message}</div>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      // 없는 것과 못 불러온 것은 다르다 — 통과라 샘플이 없다고 적는다 (규약 §3)
                      <p className="mt-1.5 text-xs text-ink-subtle">오류가 없어 샘플이 없습니다 (통과).</p>
                    )}
                  </div>
                </div>

                <div className="mt-5 flex justify-end gap-2 border-t border-hairline pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      close()
                      navigate({ to: '/validation-engine' })
                    }}
                    className="h-9 rounded-lg border border-hairline bg-chip px-3.5 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
                  >
                    {t('results.viewRule', 'Rule 보기 →')}
                  </button>
                  <button
                    type="button"
                    disabled={st !== '오류'}
                    onClick={() => {
                      setRequeued((m) => ({ ...m, [detail.id]: true }))
                      close()
                      toast(`${detail.id} 재검증을 큐에 넣었습니다 — 완료되면 알림으로 알려 드립니다`)
                    }}
                    className="h-9 rounded-lg bg-gradient-to-r from-primary to-accent2 px-4 text-[13px] font-semibold text-white shadow-[0_2px_10px_var(--color-glow)] transition-opacity hover:opacity-90 disabled:opacity-40"
                  >
                    {t('results.revalidate', '재검증 실행')}
                  </button>
                </div>
              </div>
            )
          }}
        </Drawer>
      )}
    </AppShell>
  )
}
