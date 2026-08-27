import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { AppShell } from '#/components/portal/AppShell'
import { Icon } from '#/components/portal/Icon'
import { ListFoot } from '#/components/portal/ListFoot'
import { Modal } from '#/components/portal/Modal'
import { useToast } from '#/components/portal/toast'
import { useI18n } from '#/lib/i18n'
import { validationReports } from '#/data/validationReports'
import type { ValidationReport } from '#/data/validationReports'

export const Route = createFileRoute('/validation-reports')({ component: ValidationReportsPage })

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

function ValidationReportsPage() {
  const { t, tf } = useI18n()
  const toast = useToast()
  const navigate = useNavigate()
  const [detail, setDetail] = useState<ValidationReport | null>(null)
  const [published, setPublished] = useState<Record<string, boolean>>({})

  const draftCount = validationReports.filter((r) => r.status === '임시저장' && !published[r.id]).length
  // 지난주 이 시각 스냅샷 — 실 이력이 없는 프로토타입이라 라우트 안 결정적 상수로 둔다
  // (난수 금지, 규약 §10). 임시저장이 늘면 나쁘다 — 발행되지 못한 채 쌓인다는 뜻.
  const PREV_WEEK_DRAFTS = 0
  const draftsDelta = draftCount - PREV_WEEK_DRAFTS
  const fmtDelta = (n: number) => `${n >= 0 ? '+' : ''}${n}`

  const stats = [
    {
      label: t('reports.stat.total', '전체 리포트'),
      value: tf('reports.countUnit', { n: validationReports.length }, '{n}건'),
      sub: tf(
        'reports.publishedUnit',
        { n: validationReports.filter((r) => r.status === '발행').length },
        '발행 {n}건',
      ),
      // 전체 리포트는 누적 총계라 전과 견줘도 뜻이 서지 않는다 — 면(①)만 적용
    },
    {
      label: t('reports.stat.createdThisWeek', '이번 주 생성'),
      value: tf('reports.countUnit', { n: 3 }, '{n}건'),
      sub: t('reports.autoManualSub', '자동 1 + 수동 2'),
      // 생성 건수는 늘고 주는 방향에 좋고 나쁨이 없다 — 증감 없음
    },
    {
      label: t('reports.stat.topErrorType', '최다 오류 유형'),
      value: 'NULL_VALUE',
      sub: tf('reports.cumulativeUnit', { n: 55 }, '누적 {n}건'),
      cls: 'text-danger-ink',
      // 유형 이름은 전과 견줄 수 있는 숫자가 아니다 — 증감 없음
    },
    {
      label: t('reports.stat.drafts', '임시저장'),
      value: tf('reports.countUnit', { n: draftCount }, '{n}건'),
      // 무엇과 견준 증감인지 보조설명에 함께 적는다 (규약 §10)
      sub: `${t('reports.publishPending', '발행 대기 중')} · ${t('reports.delta.caption', '지난주 대비')}`,
      cls: 'text-review-ink',
      delta: fmtDelta(draftsDelta),
      deltaGood: draftsDelta <= 0,
    },
  ]

  return (
    <AppShell active="reports" title="검증 리포트">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('nav.reports', '검증 리포트')}</h1>
          <p className="mt-1 text-[13px] text-ink-subtle">
            {t('page.validation-reports.subtitle', '검증 결과 기반 리포트 생성 및 조회 (Mock 데이터)')}
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            toast(t('reports.toast.create', '리포트 생성 — 기간·엔진을 골라 생성합니다 (본개발에서 연결)'))
          }
          className="h-9 rounded-lg bg-gradient-to-r from-primary to-accent2 px-4 text-[13px] font-semibold text-white shadow-[0_2px_10px_var(--color-glow)] transition-opacity hover:opacity-90"
        >
          {t('reports.create', '+ 리포트 생성')}
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
              <div className={`truncate text-xl font-semibold tabular-nums ${s.cls ?? 'text-ink'}`}>{s.value}</div>
              <div className="mt-1 text-xs text-ink-subtle">{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 목록을 **머리 있는 패널**로 감싼다 — 리포트 카드는 한 줄짜리라 그 자체를 머리·몸으로
          가를 것이 없다(가르면 카드가 통째로 회색이 된다). 대신 목록 전체가 하나의 물건이
          되게 머리를 세운다: 알림 이력·검증 결과와 같은 모양이다 (규약 §7·§9) */}
      {/* ⚠ **결이 옆 화면과 달랐다**(2026-08-18 사용자 지적): 승인 관리·배포 관리는 건마다
          자기 카드(머리 면 + 몸)인데 여기만 한 상자 안에 줄을 나열해서, 같은 부류의 목록
          셋이 서로 다른 물건처럼 보였다. 같은 일을 하는 화면은 같은 해부를 쓴다 (규약 §7). */}
      <ol className="mt-5 space-y-3">
        {validationReports.map((r, i) => {
          const status = published[r.id] ? '발행' : r.status
          return (
            <li key={r.id} style={{ animationDelay: `${i * 60}ms` }} className="anim-fade-up">
              <div className="card-hover card-spotlight overflow-hidden rounded-2xl border border-hairline bg-surface">
                {/* 머리 — 종류·ID·상태를 면+선으로 갈라 얹는다. 승인/배포 카드와 같은 해부 */}
                <div className="flex flex-wrap items-center gap-2 surface-head px-5 py-3">
                  <span className="rounded-full bg-chip px-2 py-0.5 text-xs font-semibold text-ink-muted">
                    {r.engine}
                  </span>
                  <span className="font-mono text-xs text-ink-subtle">{r.id}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      status === '발행' ? 'bg-deployed-bg text-deployed-ink' : 'bg-review-bg text-review-ink'
                    }`}
                  >
                    {status}
                  </span>
                  <span className="ml-auto text-xs text-ink-subtle">
                    {t('reports.label.created', '생성')}: {r.createdAt} · {r.createdBy}
                  </span>
                </div>
                {/* 몸 */}
                <div className="flex flex-wrap items-center gap-3 px-5 pb-5 pt-4">
                {/* basis — flex-wrap 줄에서 제목 블록이 짓눌리는 대신 액션이 다음 줄로 */}
                <button type="button" onClick={() => setDetail(r)} className="min-w-0 flex-1 basis-64 text-left">
                  <span className="block text-base font-semibold text-ink hover:text-primary">{r.title}</span>
                  <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-subtle">
                    <span>
                      {t('reports.label.period', '기간')}: {r.period}
                    </span>
                  </span>
                  <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    <span className="text-ink-subtle">
                      {t('reports.label.runs', '실행')}{' '}
                      <b className="tabular-nums text-ink">{tf('reports.timesUnit', { n: r.runs }, '{n}회')}</b>
                    </span>
                    <span className="text-danger-ink">
                      {t('reports.label.errors', '오류')}{' '}
                      <b className="tabular-nums">{tf('reports.casesUnit', { n: r.errors }, '{n}건')}</b>
                    </span>
                    <span className="text-review-ink">
                      {t('reports.label.warnings', '경고')}{' '}
                      <b className="tabular-nums">{tf('reports.casesUnit', { n: r.warnings }, '{n}건')}</b>
                    </span>
                    {r.types.map((ty) => (
                      <span key={ty.label} className="rounded-full bg-chip px-2 py-0.5 font-mono text-[10px] text-ink-muted">
                        {ty.label}: {ty.count}
                      </span>
                    ))}
                  </span>
                </button>
                <span className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDetail(r)}
                    className="h-9 rounded-lg border border-control bg-chip px-3.5 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
                  >
                    {t('reports.view', '보기')}
                  </button>
                  {status === '임시저장' && (
                    <button
                      type="button"
                      onClick={() => {
                        setPublished((m) => ({ ...m, [r.id]: true }))
                        toast(
                          tf(
                            'reports.toast.published',
                            { title: r.title },
                            '{title} 을 발행했습니다 — 공지·구독자에게 전달됩니다',
                          ),
                        )
                      }}
                      className="h-9 rounded-lg bg-gradient-to-r from-primary to-accent2 px-3.5 text-[13px] font-semibold text-white shadow-[0_2px_10px_var(--color-glow)] transition-opacity hover:opacity-90"
                    >
                      {t('reports.publish', '발행')}
                    </button>
                  )}
                </span>
                </div>
              </div>
            </li>
          )
        })}
      </ol>
      {/* 목록은 몇 건인지 말하고 끝난다 (규약 §9) — 상자 머리에 있던 "리포트 N건"이
          카드로 흩어지면서 셈이 사라졌다: 발이 그 말을 이어받는다 */}
      <ListFoot total={validationReports.length} shown={validationReports.length} />

      {detail && (
        <Modal
          title={detail.title}
          onClose={() => setDetail(null)}
          wide
          /* ⚠ 이 모달은 표까지 품어 몸이 길다 — 발이 몸 안에 있으면 인쇄·다운로드가
             스크롤 끝까지 내려가야 나온다 (규약 §7) */
          footer={
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setDetail(null)
                  navigate({ to: '/validation-results' })
                }}
                className="mr-auto h-9 rounded-lg border border-control bg-chip px-3.5 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
              >
                {t('reports.goResults', '실행 상세는 검증 결과 조회 →')}
              </button>
              <button
                type="button"
                onClick={() => toast(t('reports.toast.print', '인쇄 — 본개발에서 연결됩니다'))}
                className="h-9 rounded-lg border border-control bg-chip px-3.5 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
              >
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="print" />
                  {t('reports.print', '인쇄')}
                </span>
              </button>
              <button
                type="button"
                onClick={() => toast(t('reports.toast.pdfDownload', 'PDF 다운로드 — 본개발에서 연결됩니다'))}
                className="h-9 rounded-lg border border-control bg-chip px-3.5 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
              >
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="download" />
                  {t('reports.downloadPdf', 'PDF 다운로드')}
                </span>
              </button>
            </div>
          }
        >
          <dl className="grid grid-cols-2 gap-3 text-[13px] pc:grid-cols-3">
            {[
              { k: t('reports.dl.engine', '대상 엔진'), v: detail.engine },
              { k: t('reports.dl.period', '조회 기간'), v: detail.period },
              { k: t('reports.dl.createdBy', '생성자'), v: detail.createdBy },
              { k: t('reports.dl.createdAt', '생성일시'), v: detail.createdAt },
              { k: t('reports.dl.status', '상태'), v: published[detail.id] ? '발행' : detail.status },
              { k: t('reports.dl.runs', '실행 횟수'), v: tf('reports.timesUnit', { n: detail.runs }, '{n}회') },
            ].map((row) => (
              <div key={row.k} className="rounded-xl border border-hairline px-3.5 py-2.5">
                <dt className="text-xs text-ink-subtle">{row.k}</dt>
                <dd className="mt-0.5 font-medium tabular-nums text-ink">{row.v}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-danger-ink/25 bg-danger-bg px-4 py-3.5 text-center">
              <div className="text-2xl font-semibold tabular-nums text-danger-ink">{detail.errors}</div>
              <div className="mt-0.5 text-xs text-danger-ink/80">{t('reports.totalErrors', '총 오류')}</div>
            </div>
            <div className="rounded-xl border border-review-ink/25 bg-review-bg px-4 py-3.5 text-center">
              <div className="text-2xl font-semibold tabular-nums text-review-ink">{detail.warnings}</div>
              <div className="mt-0.5 text-xs text-review-ink/80">{t('reports.totalWarnings', '총 경고')}</div>
            </div>
            <div className="rounded-xl border border-deployed-ink/25 bg-deployed-bg px-4 py-3.5 text-center">
              <div className="text-2xl font-semibold tabular-nums text-deployed-ink">{detail.passRate}%</div>
              <div className="mt-0.5 text-xs text-deployed-ink/80">{t('reports.passRate', '통과율')}</div>
            </div>
          </div>

          <div className="mt-4">
            <div className="text-xs font-medium text-ink-subtle">
              {t('reports.errorSummaryTitle', '주요 오류 유형 요약')}
            </div>
            <div className="mt-1.5 overflow-x-auto rounded-xl border border-hairline">
              <table className="w-full min-w-[420px] border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-hairline bg-canvas/60 text-left text-xs text-ink-subtle">
                    <th className="px-3 py-2 font-medium">{t('reports.th.rank', '순위')}</th>
                    <th className="px-3 py-2 font-medium">{t('reports.th.errorType', '오류 유형')}</th>
                    <th className="px-3 py-2 text-right font-medium">{t('reports.th.count', '건수')}</th>
                    <th className="px-3 py-2 text-right font-medium">{t('reports.th.ratio', '비율')}</th>
                    <th className="px-3 py-2 font-medium">{t('reports.th.action', '조치')}</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.types.map((ty, idx) => {
                    const total = detail.types.reduce((a, x) => a + x.count, 0)
                    return (
                      <tr key={ty.label} className="border-b border-divider last:border-0">
                        <td className="px-3 py-2.5 font-mono text-xs text-ink-subtle">{idx + 1}</td>
                        <td className="px-3 py-2.5">
                          <code className="rounded bg-chip px-1.5 py-0.5 font-mono text-xs text-ink">{ty.label}</code>
                        </td>
                        <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-danger-ink">
                          {tf('reports.casesUnit', { n: ty.count }, '{n}건')}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-ink-muted">
                          {Math.round((ty.count / total) * 100)}%
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="rounded-full bg-review-bg px-2 py-0.5 text-xs font-semibold text-review-ink">
                            {t('reports.actionNeeded', '조치 필요')}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </Modal>
      )}
    </AppShell>
  )
}
