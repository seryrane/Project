import { useMemo, useState } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'

import { AppShell } from '#/components/portal/AppShell'
import { ChipSelect } from '#/components/portal/Chips'
import { Drawer } from '#/components/portal/Drawer'
import { CtaButton, simulate } from '#/components/portal/Skeleton'
import { useToast } from '#/components/portal/toast'
import { KPI_AREAS, METRIC_STATUS_CLS, kpiMetrics } from '#/data/kpi'
import type { KpiMetric } from '#/data/kpi'
import { apiSend } from '#/lib/api'
import { useI18n } from '#/lib/i18n'
import { orNone, pickOne } from '#/lib/urlState'

const ALL_AREA = '전체'

/** 보고 있는 상태는 주소에 둔다 (lib/urlState.ts) */
interface KpiSearch {
  area?: string
}

export const Route = createFileRoute('/kpi-metrics')({
  component: KpiMetricsPage,
  validateSearch: (search: Record<string, unknown>): KpiSearch => ({
    area: pickOne(search.area, KPI_AREAS),
  }),
})

/**
 * 지표 관리 (FR-070) — 지표 정의서가 정본이다: 정의·산식·원천 테이블·갱신 주기.
 * 산식은 현업 승인 절차를 거친다(AC②) — 그래서 승인 상태가 정본 칸이다.
 * ⚠ 지표 목록·산식은 OPN-008 확정에 종속 — 미승인 지표는 대시보드에 안 올라간다.
 */
function KpiMetricsPage() {
  const { t, tf } = useI18n()
  const toast = useToast()
  const { area = ALL_AREA } = Route.useSearch()
  const navigate = useNavigate()
  const setArea = (v: string) =>
    void navigate({ to: '/kpi-metrics', search: { area: orNone(v, ALL_AREA) } })
  const [detail, setDetail] = useState<KpiMetric | null>(null)

  const rows = useMemo(
    () => kpiMetrics.filter((m) => area === ALL_AREA || m.area === area),
    [area],
  )
  const approved = kpiMetrics.filter((m) => m.status === '승인').length
  const allLabel = t('common.all')

  return (
    <AppShell active="kpi-metrics" title={t('nav.kpi-metrics', '지표 관리')}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('nav.kpi-metrics', '지표 관리')}</h1>
          <p className="mt-1 text-[13px] text-ink-subtle">
            {tf(
              'page.kpi-metrics.subtitle',
              { approved, total: kpiMetrics.length },
              '센터 KPI 지표 정의서 — 산식·원천·주기 (FR-070) · 승인 {approved}/{total}',
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => toast(t('kpi-metrics.toast.addDisabled', '지표 추가는 OPN-008(지표 목록·산식) 확정 후 열립니다'))}
          className="h-9 rounded-lg border border-hairline bg-chip px-4 text-[13px] font-medium text-ink-muted transition-colors hover:border-primary/40 hover:text-ink"
        >
          + {t('kpi-metrics.addMetric')}
        </button>
      </div>

      <div className="mt-5">
        {/* 영역 이름은 데이터 어휘라 그대로 — "전체" 칩만 언어를 입힌다. 내부 값은
            한국어 원문으로 고정해 필터 비교·언어 전환에 안전하다 (규약 §4-4) */}
        <ChipSelect
          options={[allLabel, ...KPI_AREAS]}
          value={area === ALL_AREA ? allLabel : area}
          onChange={(v) => setArea(v === allLabel ? ALL_AREA : v)}
        />
      </div>

      {/* 시트성 표 — 산식·원천을 나란히 비교하는 화면이라 카드로 펴지 않는다 */}
      <section className="anim-fade-up card-spotlight mt-4 rounded-2xl border border-hairline bg-surface">
        <div className="flex items-center justify-between surface-head px-5 py-3.5">
          <h2 className="text-sm font-semibold text-ink">{tf('kpi-metrics.sectionTitle', { n: rows.length })}</h2>
          <span className="text-[11px] text-ink-subtle">
            {t('kpi-metrics.sectionHint', '행을 누르면 정의 상세 · 미승인 지표는 대시보드 비표출')}
          </span>
        </div>
        <div className="table-scroll">
          <table className="w-full min-w-[760px] border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-hairline bg-canvas/60 text-left text-xs text-ink-subtle">
                <th className="px-4 py-2.5 font-medium">{t('kpi-metrics.th.metric', '지표')}</th>
                <th className="px-3 py-2.5 font-medium">{t('kpi-metrics.th.area', '영역')}</th>
                <th className="px-3 py-2.5 font-medium">{t('kpi-metrics.th.formula', '산식')}</th>
                <th className="px-3 py-2.5 font-medium">{t('kpi-metrics.th.sourceTable', '원천 테이블')}</th>
                <th className="px-3 py-2.5 font-medium">{t('kpi-metrics.th.cycle', '주기')}</th>
                <th className="px-3 py-2.5 font-medium">{t('kpi-metrics.th.owner', '담당')}</th>
                <th className="px-3 py-2.5 font-medium">{t('kpi-metrics.th.approval', '승인')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr
                  key={m.id}
                  onClick={() => setDetail(m)}
                  className="cursor-pointer border-b border-hairline/60 transition-colors last:border-0 hover:bg-chip"
                >
                  <td className="px-4 py-2.5">
                    <span className="block font-medium text-ink">{m.name}</span>
                    <span className="block font-mono text-[10px] text-ink-subtle">{m.id}</span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    <span className="rounded-full border border-hairline px-1.5 py-0.5 text-[10px] text-ink-muted">
                      {m.area}
                    </span>
                  </td>
                  <td className="max-w-56 truncate px-3 py-2.5 font-mono text-[11px] text-ink-muted">
                    {m.formula}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[11px] text-ink-subtle">
                    {m.sourceTable}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs text-ink-muted">{m.cycle}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs text-ink-muted">{m.owner}</td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${METRIC_STATUS_CLS[m.status]}`}>
                      {m.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 정의 상세 — 목록을 훑으며 보는 상세라 서랍 (규약 §1) */}
      {detail && (
        <Drawer
          title={tf('kpi-metrics.detailTitle', { name: detail.name })}
          onClose={() => setDetail(null)}
          /* 발은 관문 슬롯으로 (규약 §7) — 몸 안에서 `flex h-full flex-col` 로 바닥에
             붙이던 것은 내용이 길어지면 같이 밀려 올라갔다 */
          footer={(close) => (
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={close}
                className="h-9 rounded-lg border border-hairline bg-chip px-4 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
              >
                {t('common.close')}
              </button>
              {detail.status === '검토 중' && (
                <CtaButton
                  busyLabel={t('kpi-metrics.submitting')}
                  onAction={async () => {
                    const ok = await apiSend('POST', '/submissions', {
                      kind: 'kpi-metric-approval',
                      payload: { metricId: detail.id, name: detail.name },
                    })
                    if (!ok) await simulate()
                    close()
                    toast(tf('kpi-metrics.toast.submitted', { name: detail.name }))
                  }}
                >
                  {t('kpi-metrics.submitApproval')}
                </CtaButton>
              )}
            </div>
          )}
        >
          {() => (
            <div>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-hairline px-2 py-0.5 text-[10px] text-ink-muted">
                    {detail.area}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${METRIC_STATUS_CLS[detail.status]}`}>
                    {detail.status}
                  </span>
                  <span className="ml-auto font-mono text-[11px] text-ink-subtle">{detail.id}</span>
                </div>
                <p className="text-[13px] leading-relaxed text-ink-muted">{detail.desc}</p>
                {(
                  [
                    [t('kpi-metrics.th.formula', '산식'), detail.formula, true],
                    [t('kpi-metrics.th.sourceTable', '원천 테이블'), detail.sourceTable, true],
                    [t('kpi-metrics.label.cycle', '갱신 주기'), detail.cycle, false],
                    [t('kpi-metrics.th.owner', '담당'), detail.owner, false],
                  ] as const
                ).map(([label, value, mono]) => (
                  <div key={label} className="rounded-xl border border-hairline/70 bg-canvas/40 px-3.5 py-2.5">
                    {/* 값 위의 이름표 — 정본은 styles.css `.section-label` (덮개마다 손대중 금지) */}
                    <span className="section-label block">{label}</span>
                    <span className={`mt-0.5 block text-[13px] text-ink ${mono ? 'font-mono text-xs' : ''}`}>
                      {value}
                    </span>
                  </div>
                ))}
                {/* 사양서–KPI 연계 (상호 참조 조회) — 두 프로젝트가 만나는 지점 */}
                {detail.linkedSpec && (
                  <Link
                    to="/specs"
                    search={{ open: detail.linkedSpec }}
                    className="card-hover flex items-center justify-between rounded-xl border border-primary/30 bg-primary/6 px-3.5 py-3 text-[13px]"
                  >
                    <span>
                      <b className="block font-semibold text-ink">
                        {tf('kpi-metrics.linkedSpec', { id: detail.linkedSpec })}
                      </b>
                      <span className="block text-[11px] text-ink-subtle">
                        {t('kpi-metrics.linkedSpecDesc', '이 지표의 원천 필드를 정의하는 IDMS 사양서로 이동')}
                      </span>
                    </span>
                    <span aria-hidden className="text-primary">→</span>
                  </Link>
                )}
                {detail.status !== '승인' && (
                  <p className="rounded-xl border border-hairline bg-canvas/50 px-3.5 py-2.5 text-[11px] leading-relaxed text-ink-subtle">
                    {t(
                      'kpi-metrics.notApprovedNotice',
                      '미승인 지표는 대시보드에 표출되지 않습니다 — 산식 확정 후 현업 승인 절차를 거칩니다 (FR-070 AC②).',
                    )}
                  </p>
                )}
              </div>
            </div>
          )}
        </Drawer>
      )}
    </AppShell>
  )
}
