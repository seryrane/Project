import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { AppShell } from '#/components/portal/AppShell'
import { ChartCard, StatTile, TrendLineChart } from '#/components/portal/charts'
import { Modal } from '#/components/portal/Modal'
import { CtaButton } from '#/components/portal/Skeleton'
import { TableauEmbed } from '#/components/portal/TableauEmbed'
import { useToast } from '#/components/portal/toast'
import { iviTrend } from '#/data/kpi'
import { apiSend, useApi } from '#/lib/api'
import { useI18n } from '#/lib/i18n'

export const Route = createFileRoute('/kpi-ivi')({ component: KpiIviPage })

interface EmbedItem {
  id: string
  title: string
  url: string
  area: string
}

/**
 * 인포 IVI KPI (FR-075) — **Tableau 임베딩 뷰와 자체 UI 표출을 병행 제공**한다(AC①).
 * 1차 오픈 전략: 임베딩으로 빠르게 → 2차부터 웹(자체 UI) 전환.
 * 워크북은 관리자가 URL 로 등록한다(코드 배포 없이 편입 — 회의록: "임베드 링크
 * 따서 아이프레임으로"). ⚠ SSO 확정 전에는 공개/티켓 링크만 표출된다.
 */
function KpiIviPage() {
  const { t, tf } = useI18n()
  const toast = useToast()
  const [mode, setMode] = useState<'tableau' | 'native'>('tableau')
  const [current, setCurrent] = useState(0)
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newUrl, setNewUrl] = useState('')

  // 워크북 등록부 정본은 서버 — 서버가 없으면 빈 목록(등록 안내가 뜬다)
  const { data: workbooks, reload } = useApi<Array<EmbedItem>>('/embeds', [])

  const urlHint =
    newUrl !== '' && !newUrl.startsWith('https://')
      ? t('kpi-ivi.urlHint', '워크북 주소는 https 로 시작해야 합니다')
      : ''
  const active: EmbedItem | undefined =
    workbooks.length > 0 ? workbooks[Math.min(current, workbooks.length - 1)] : undefined

  const trendData = iviTrend.days.map((d, i) => ({ date: d, value: iviTrend.appLaunch[i] }))

  return (
    <AppShell active="kpi-ivi" title={t('nav.kpi-ivi', '인포 IVI KPI')}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('nav.kpi-ivi', '인포 IVI KPI')}</h1>
          <p className="mt-1 text-[13px] text-ink-subtle">
            {t(
              'page.kpi-ivi.subtitle',
              'IVI 지표 — Tableau 임베딩과 자체 UI 를 병행 제공 (FR-075) · SSO 연계 전에는 공개·티켓 링크만 표출됩니다',
            )}
          </p>
        </div>
        {/* 표출 방식 전환 — 1차는 임베딩으로 빠르게, 2차부터 웹 전환(전환 전략) */}
        <div className="flex overflow-hidden rounded-lg border border-hairline">
          {(
            [
              { key: 'tableau', label: 'Tableau 임베딩' },
              { key: 'native', label: '자체 UI' },
            ] as const
          ).map((tb) => (
            <button
              key={tb.key}
              type="button"
              aria-pressed={mode === tb.key}
              onClick={() => setMode(tb.key)}
              className={`h-9 px-3.5 text-[13px] font-medium transition-colors ${
                mode === tb.key ? 'bg-primary/15 text-primary' : 'text-ink-muted hover:bg-chip hover:text-ink'
              }`}
            >
              {t(`kpi-ivi.mode.${tb.key}`, tb.label)}
            </button>
          ))}
        </div>
      </div>

      {mode === 'tableau' ? (
        <section className="anim-fade-up card-spotlight mt-5 rounded-2xl border border-hairline bg-surface">
          <div className="flex flex-wrap items-center gap-2 surface-head px-5 py-3">
            {/* 워크북 탭 — 등록된 것만. 등록은 관리자(코드 배포 없이 편입) */}
            <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto">
              {workbooks.map((w, i) => (
                <button
                  key={w.id}
                  type="button"
                  aria-pressed={i === current}
                  onClick={() => setCurrent(i)}
                  className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-all active:scale-95 ${
                    i === current
                      ? 'border-primary/50 bg-primary/15 text-primary'
                      : 'border-hairline text-ink-muted hover:border-primary/30 hover:text-ink'
                  }`}
                >
                  {i === current ? '✓ ' : ''}
                  {w.title}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="h-8 shrink-0 rounded-lg border border-hairline bg-chip px-3 text-xs font-medium text-ink-muted transition-colors hover:border-primary/40 hover:text-ink"
            >
              + {t('kpi-ivi.addWorkbook')}
            </button>
          </div>

          <div className="p-4">
            {active ? (
              <TableauEmbed url={active.url} title={active.title} />
            ) : (
              /* 빈 자리에 이유를 적는다 (규약 17절) — 아직 없음 ≠ 고장 */
              <div className="flex min-h-[320px] flex-col items-center justify-center gap-2 text-center">
                <p className="text-base font-semibold text-ink">{t('kpi-ivi.empty.title', '등록된 워크북이 없습니다')}</p>
                <p className="max-w-md text-[13px] leading-relaxed text-ink-subtle">
                  {tf(
                    'kpi-ivi.empty.desc',
                    { addLabel: t('kpi-ivi.addWorkbook') },
                    '[+ {addLabel}]으로 Tableau 임베드 링크를 등록하면 이 자리에 바로 표시됩니다. 등록 권한이 없다면 KPI 담당자에게 요청하세요.',
                  )}
                </p>
              </div>
            )}
          </div>
          {active && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-hairline px-5 py-2.5">
              <span className="truncate font-mono text-[10px] text-ink-subtle">{active.url}</span>
              <button
                type="button"
                onClick={() => {
                  const next = workbooks.filter((w) => w.id !== active.id)
                  void apiSend('PUT', '/embeds', { items: next }).then(() => reload())
                  setCurrent(0)
                  toast(tf('kpi-ivi.toast.removed', { title: active.title }))
                }}
                className="shrink-0 text-xs text-ink-subtle transition-colors hover:text-danger-ink"
              >
                {t('kpi-ivi.removeWorkbook')}
              </button>
            </div>
          )}
        </section>
      ) : (
        /* 자체 UI — 마트 집계 기반. 2차 오픈부터 웹 전환의 종착점 */
        <>
          <div className="mt-5 grid grid-cols-2 gap-3 pc:grid-cols-4">
            <StatTile
              label={t('kpi-ivi.stat.appLaunch', '앱 일 실행 수')}
              value="1,062"
              delta="+6.4%"
              deltaGood
              spark={iviTrend.appLaunch}
              caption={t('kpi-ivi.caption.last7d', '최근 7일')}
            />
            <StatTile
              label={t('kpi-ivi.stat.otaRate', 'OTA 업데이트 완료율')}
              value="95.1%"
              delta="+0.5%p"
              deltaGood
              spark={iviTrend.otaRate}
              caption={t('kpi-ivi.caption.last7d', '최근 7일')}
            />
            <StatTile
              label={t('kpi-ivi.stat.voiceSuccess', '음성 명령 성공률')}
              value="88.7%"
              delta="+1.1%p"
              deltaGood
              caption={t('kpi-ivi.caption.dailyOnce', '일 1회 집계')}
            />
            <StatTile
              label={t('kpi-ivi.stat.naviError', '내비 연동 오류')}
              value="34건"
              delta="-12건"
              deltaGood
              caption={t('kpi-ivi.caption.yesterday', '어제 기준')}
            />
          </div>
          <div className="anim-fade-up mt-5 [animation-delay:80ms]">
            <ChartCard
              title={t('kpi-ivi.chart.title', 'IVI 앱 일 실행 추이')}
              subtitle={t('kpi-ivi.chart.subtitle', 'mart_ivi_usage · 일 1회 배치 (FR-072)')}
            >
              <TrendLineChart
                data={trendData}
                unit="회"
                labels={{ main: t('kpi-ivi.caption.last7d', '최근 7일'), compare: t('kpi-ivi.legend.prev', '이전') }}
              />
            </ChartCard>
          </div>
        </>
      )}

      {/* 워크북 등록 — 짧게 적고 닫는 일이라 모달 */}
      {adding && (
        <Modal
          title={t('kpi-ivi.modal.title', 'Tableau 워크북 등록')}
          onClose={() => setAdding(false)}
          footer={
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAdding(false)}
                className="h-9 rounded-lg border border-hairline bg-chip px-4 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
              >
                {t('common.cancel')}
              </button>
              <CtaButton
                disabled={newTitle.trim() === '' || !newUrl.startsWith('https://')}
                busyLabel={t('kpi-ivi.registering')}
                onAction={async () => {
                  const next = [
                    ...workbooks,
                    { id: `E-${workbooks.length + 10}`, title: newTitle.trim(), url: newUrl.trim(), area: 'IVI' },
                  ]
                  await apiSend('PUT', '/embeds', { items: next })
                  reload()
                  setAdding(false)
                  setNewTitle('')
                  setNewUrl('')
                  setCurrent(next.length - 1)
                  toast(t('kpi-ivi.toast.registered', '워크북을 등록했습니다 — 바로 표시됩니다'))
                }}
              >
                {t('kpi-ivi.register')}
              </CtaButton>
            </div>
          }
        >
          <p className="text-[13px] leading-relaxed text-ink-muted">
            {t(
              'kpi-ivi.modal.desc',
              'Tableau 의 [공유 → 임베드 링크]를 붙여넣으세요. SSO 연계 전에는 공개(Tableau Public)·티켓 링크만 표시됩니다.',
            )}
          </p>
          <label className="mt-3 block">
            <span className="text-xs font-medium text-ink-subtle">
              {t('kpi-ivi.label.title', '표시 이름')} <b className="text-danger-ink">*</b>
            </span>
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder={t('kpi-ivi.titlePlaceholder')}
              className="mt-1 h-10 w-full rounded-lg border border-hairline bg-canvas/60 px-3 text-[13px] outline-none focus:border-primary/60"
            />
          </label>
          <label className="mt-3 block">
            <span className="text-xs font-medium text-ink-subtle">
              {t('kpi-ivi.label.url', '임베드 URL')} <b className="text-danger-ink">*</b>
            </span>
            <input
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://public.tableau.com/views/..."
              className={`mt-1 h-10 w-full rounded-lg border bg-canvas/60 px-3 font-mono text-xs outline-none focus:border-primary/60 ${
                urlHint ? 'border-danger-ink/50' : 'border-hairline'
              }`}
            />
            {urlHint && <span className="mt-1 block text-xs text-danger-ink">{urlHint}</span>}
          </label>
        </Modal>
      )}
    </AppShell>
  )
}
