import { useMemo, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { AppShell } from '#/components/portal/AppShell'
import { DataTable } from '#/components/portal/DataTable'
import { ListFoot } from '#/components/portal/ListFoot'
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
import { recordAudit } from '#/data/auditStore'
import { buildXlsx } from '#/lib/xlsxWrite'
import type { ValidationRun } from '#/data/validationResults'

export const Route = createFileRoute('/validation-results')({ component: ValidationResultsPage })

const STATUS_FILTERS = ['전체', '오류', '재처리 중', '해결', '통과'] as const

/* 증감 칩 — charts.tsx StatTile 의 DeltaChip 과 같은 모양. 관문(components/**) 은 고칠 수
   없고 비공개 함수라 가져올 수도 없어, 라우트 안에 같은 모양을 그대로 옮겨 쓴다 (규약 §10) */
function DeltaChip({ delta, good }: { delta: string; good: boolean }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold tabular-nums ${
        good ? 'bg-deployed-bg text-deployed-ink' : 'bg-danger-bg text-danger-ink'
      }`}
    >
      <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden>
        {delta.startsWith('-') ? (
          <path d="M1 2.5h6L4 6.5z" fill="currentColor" />
        ) : (
          <path d="M1 5.5h6L4 1.5z" fill="currentColor" />
        )}
      </svg>
      {delta}
    </span>
  )
}

function ValidationResultsPage() {
  const { t, tf } = useI18n()
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
  const successRate = (1 - totals.errors / totals.processed) * 100

  // 전일 배치 스냅샷 — 실 이력이 없는 프로토타입이라 라우트 안 결정적 상수로 둔다
  // (난수 금지, 규약 §10). "기간 검증 처리"는 처리량(볼륨)이라 늘고 주는 방향에 좋고 나쁨이
  // 없어 증감을 빼고 면(①)만 적용한다.
  const PREV_BATCH = { successRate: 99.71, open: 3, requeue: 0 }
  const fmtDelta = (n: number, unit = '') => `${n >= 0 ? '+' : ''}${n}${unit}`
  const successDelta = successRate - PREV_BATCH.successRate
  const openDelta = totals.open - PREV_BATCH.open
  const requeueDelta = totals.requeue - PREV_BATCH.requeue
  const deltaCaption = t('results.delta.caption', '전일 배치 대비')

  const stats = [
    { label: t('results.stat.processed', '기간 검증 처리'), value: totals.processed.toLocaleString() },
    {
      label: t('results.stat.successRate', '성공률'),
      value: `${successRate.toFixed(2)}%`,
      cls: 'text-deployed-ink',
      // 성공률은 오르면 좋다
      delta: fmtDelta(Number(successDelta.toFixed(2)), '%p'),
      deltaGood: successDelta >= 0,
      caption: deltaCaption,
    },
    {
      label: t('results.stat.openErrors', '미해결 오류 실행'),
      value: totals.open,
      cls: 'text-danger-ink',
      // 미해결이 늘면 나쁘다
      delta: fmtDelta(openDelta),
      deltaGood: openDelta <= 0,
      caption: deltaCaption,
    },
    {
      label: t('results.stat.requeuePending', '재처리 대기'),
      value: totals.requeue,
      cls: 'text-review-ink',
      // 재처리 대기가 늘면 처리 속도가 못 따라간다는 뜻 — 나쁘다
      delta: fmtDelta(requeueDelta),
      deltaGood: requeueDelta <= 0,
      caption: deltaCaption,
    },
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
        {/* ⚠ 토스트만 띄우던 자리다. 지금 **보고 있는 그대로**(필터·검색이 걸린 rows) 내보낸다 —
            화면과 다른 것이 나가면 "어느 것이 맞나"를 사람이 대조해야 한다. */}
        <button
          type="button"
          onClick={() => {
            const cols = ['실행 ID', '시각', '모드', '사양서 ID', '사양서', 'Rule', '오류 유형', '심각도', '검사 건수', '오류 건수', '상태']
            const url = URL.createObjectURL(
              buildXlsx([
                {
                  name: '검증 결과',
                  rows: [
                    cols,
                    ...rows.map((r) => [
                      r.id,
                      r.at,
                      r.mode,
                      r.specId,
                      r.specName,
                      r.rule,
                      r.errorType,
                      r.severity,
                      String(r.total),
                      String(r.errors),
                      r.status,
                    ]),
                  ],
                  widths: [16, 18, 8, 10, 26, 24, 20, 8, 10, 10, 10],
                },
              ]),
            )
            const a = document.createElement('a')
            a.href = url
            a.download = '검증결과.xlsx'
            a.click()
            URL.revokeObjectURL(url)
            recordAudit({ action: '다운로드', target: `검증 결과 (${rows.length}건)`, reason: '검증 리포트 반출' })
            toast(tf('results.toast.exported', { n: rows.length }, '{n}건을 엑셀로 내보냈습니다'))
          }}
          className="h-9 rounded-lg border border-hairline bg-surface px-3.5 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
        >
          {t('results.exportExcel', 'Excel 내보내기')}
        </button>
      </div>

      <div className="anim-fade-up mt-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card-spotlight overflow-hidden rounded-2xl border border-hairline bg-surface">
            <div className="flex items-center justify-between gap-2 surface-head px-4 py-2">
              <span className="truncate text-xs text-ink-subtle">{s.label}</span>
              {s.delta && <DeltaChip delta={s.delta} good={s.deltaGood} />}
            </div>
            <div className="px-4 py-3.5">
              <div className={`text-2xl font-semibold tabular-nums ${s.cls ?? 'text-ink'}`}>{s.value}</div>
              {s.caption && <div className="mt-1 text-xs text-ink-subtle">{s.caption}</div>}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <ChartCard
          title={t('results.chart.trendTitle', '일별 오류 · 경고 추이')}
          subtitle={t('results.chart.trendSubtitle', '최근 7일 · 단위: 건')}
          className="anim-fade-up [animation-delay:80ms] xl:col-span-2"
        >
          <TrendLineChart
            data={dailyErrorTrend.errors}
            compare={dailyErrorTrend.warnings}
            unit={t('results.chart.unit', '건')}
            labels={{
              main: t('results.chart.errorLabel', '오류'),
              compare: t('results.chart.warningLabel', '경고'),
            }}
          />
        </ChartCard>
        <ChartCard
          title={t('results.chart.distTitle', '오류 유형 분포')}
          subtitle={t('results.chart.distSubtitle', '최근 30일 누적')}
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

      {/* ⚠ 예전에는 맨 `overflow-x-auto` 라 가장자리 그림자가 없었고(오른쪽에 열이 더
          있다는 신호가 없었다), 발까지 그 스크롤 상자 안에 들어 있어 가로로 굴리면
          세는 말이 함께 밀려 나갔다. 둘 다 관문이 진다 (규약 §8·§9). */}
      <div className="anim-fade-up card-spotlight mt-4 rounded-2xl border border-hairline bg-surface p-4">
        <DataTable
          rows={rows}
          rowKey={(r) => r.id}
          onRowClick={setDetail}
          minWidth={900}
          empty={{
            title: t('results.empty', '조건에 맞는 실행이 없습니다.'),
            hint: t('results.emptyHint', '상태 칩을 [전체]로 두거나 검색어를 지워 보세요'),
          }}
          columns={[
            {
              header: t('results.th.run', '실행'),
              cellClassName: 'whitespace-nowrap',
              cell: (r) => (
                <>
                  <span className="font-mono text-xs text-ink-muted">{r.id}</span>
                  <span className="ml-1.5 rounded-full bg-chip px-1.5 py-0.5 text-[10px] text-ink-subtle">{r.mode}</span>
                </>
              ),
            },
            {
              header: t('results.th.datetime', '일시'),
              cellClassName: 'whitespace-nowrap font-mono text-xs tabular-nums text-ink-subtle',
              cell: (r) => r.at,
            },
            {
              header: t('results.th.spec', '사양서'),
              cellClassName: 'whitespace-nowrap font-medium text-ink',
              cell: (r) => r.specName,
            },
            { header: 'Rule', cellClassName: 'whitespace-nowrap text-xs text-ink-muted', cell: (r) => r.rule },
            {
              header: t('results.th.errorType', '오류 유형'),
              cellClassName: 'whitespace-nowrap text-xs text-ink-muted',
              cell: (r) => r.errorType,
            },
            {
              header: t('results.th.severity', '심각도'),
              cell: (r) => (
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${SEVERITY_CLS[r.severity]}`}>
                  {r.severity}
                </span>
              ),
            },
            {
              header: t('results.th.target', '대상'),
              numeric: true,
              cellClassName: 'font-mono text-xs text-ink-muted',
              cell: (r) => r.total.toLocaleString(),
            },
            {
              header: t('results.th.errors', '오류'),
              numeric: true,
              cell: (r) => (
                <span
                  className={`font-mono text-xs font-semibold ${r.errors > 0 ? 'text-danger-ink' : 'text-ink-subtle'}`}
                >
                  {r.errors.toLocaleString()}
                </span>
              ),
            },
            {
              header: t('results.th.status', '상태'),
              cell: (r) => {
                const st = requeued[r.id] ? '재처리 중' : r.status
                return (
                  <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${RUN_STATUS_CLS[st]}`}>
                    {t(`validationStatus.${st}`, st)}
                  </span>
                )
              },
            },
          ]}
        />
        <ListFoot total={validationRuns.length} shown={rows.length} />
      </div>

      {/* 오류 상세 — 어느 행·어느 필드가 왜 걸렸는지 + 다음 행동(재검증·사양서) */}
      {detail && (
        <Drawer
          title={tf('results.detailDrawerTitle', { id: detail.id }, '검증 상세 — {id}')}
          onClose={() => setDetail(null)}
          /* 발은 관문 슬롯으로 (규약 §7) — 오류 샘플이 여러 줄이면 [재검증 실행]이
             스크롤 아래로 사라졌다. 다음 행동을 주는 버튼이 안 보이면 상세를 연 뜻이 없다 */
          footer={(close) => (
            <div className="flex justify-end gap-2">
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
                disabled={(requeued[detail.id] ? '재처리 중' : detail.status) !== '오류'}
                onClick={() => {
                  setRequeued((m) => ({ ...m, [detail.id]: true }))
                  close()
                  toast(
                    tf(
                      'results.toast.requeued',
                      { id: detail.id },
                      '{id} 재검증을 큐에 넣었습니다 — 완료되면 알림으로 알려 드립니다',
                    ),
                  )
                }}
                className="h-9 rounded-lg bg-gradient-to-r from-primary to-accent2 px-4 text-[13px] font-semibold text-white shadow-[0_2px_10px_var(--color-glow)] transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {t('results.revalidate', '재검증 실행')}
              </button>
            </div>
          )}
        >
          {() => {
            const st = requeued[detail.id] ? '재처리 중' : detail.status
            return (
              <div>
                <div className="space-y-4">
                  <div className="rounded-xl border border-hairline bg-canvas/50 px-4 py-3 text-[13px]">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${RUN_STATUS_CLS[st]}`}>
                        {t(`validationStatus.${st}`, st)}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${SEVERITY_CLS[detail.severity]}`}>
                        {detail.severity}
                      </span>
                      <span className="text-xs text-ink-subtle">{detail.at} · {detail.mode}</span>
                    </div>
                    <div className="mt-2 font-medium text-ink">{detail.rule}</div>
                    <div className="mt-0.5 text-xs text-ink-muted">
                      {detail.errorType} · {t('results.detail.target', '대상')}{' '}
                      <b className="tabular-nums">{detail.total.toLocaleString()}</b>
                      {t('results.detail.unit', '건')}
                      {t('results.detail.ofWhichErrors', ' 중 오류 ')}
                      <b className="tabular-nums text-danger-ink">{detail.errors.toLocaleString()}</b>
                      {t('results.detail.unit', '건')}
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
                      {t('results.label.errorSamples', '오류 샘플')}{' '}
                      {detail.samples.length > 0 &&
                        tf('results.samplesShown', { n: detail.samples.length }, '({n}건 표시)')}
                    </div>
                    {detail.samples.length > 0 ? (
                      <ol className="mt-1.5 space-y-2">
                        {detail.samples.map((s2) => (
                          <li key={s2.row} className="rounded-xl border border-hairline bg-canvas/40 px-3.5 py-2.5 text-[13px]">
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span className="font-mono text-ink-subtle">
                                {tf('results.rowLabel', { n: s2.row.toLocaleString() }, '행 {n}')}
                              </span>
                              <span className="rounded-md bg-chip px-1.5 py-0.5 font-medium text-ink-muted">{s2.field}</span>
                              <span className="rounded bg-danger-bg px-1.5 py-0.5 font-mono text-xs text-danger-ink">
                                {s2.value}
                              </span>
                            </div>
                            <div className="mt-1 text-xs text-ink-muted">{s2.message}</div>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      // 없는 것과 못 불러온 것은 다르다 — 통과라 샘플이 없다고 적는다 (규약 §3)
                      <p className="mt-1.5 text-xs text-ink-subtle">
                        {t('results.noSamplesPass', '오류가 없어 샘플이 없습니다 (통과).')}
                      </p>
                    )}
                  </div>
                </div>

              </div>
            )
          }}
        </Drawer>
      )}
    </AppShell>
  )
}
