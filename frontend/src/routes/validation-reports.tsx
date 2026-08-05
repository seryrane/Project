import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { AppShell } from '#/components/portal/AppShell'
import { Modal } from '#/components/portal/Modal'
import { useToast } from '#/components/portal/toast'
import { validationReports } from '#/data/validationReports'
import type { ValidationReport } from '#/data/validationReports'

export const Route = createFileRoute('/validation-reports')({ component: ValidationReportsPage })

function ValidationReportsPage() {
  const toast = useToast()
  const navigate = useNavigate()
  const [detail, setDetail] = useState<ValidationReport | null>(null)
  const [published, setPublished] = useState<Record<string, boolean>>({})

  const stats = [
    { label: '전체 리포트', value: `${validationReports.length}건`, sub: `발행 ${validationReports.filter((r) => r.status === '발행').length}건` },
    { label: '이번 주 생성', value: '3건', sub: '자동 1 + 수동 2' },
    { label: '최다 오류 유형', value: 'NULL_VALUE', sub: '누적 55건', cls: 'text-danger-ink' },
    {
      label: '임시저장',
      value: `${validationReports.filter((r) => r.status === '임시저장' && !published[r.id]).length}건`,
      sub: '발행 대기 중',
      cls: 'text-review-ink',
    },
  ]

  return (
    <AppShell active="reports" title="검증 리포트">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">검증 리포트</h1>
          <p className="mt-1 text-[13px] text-ink-subtle">검증 결과 기반 리포트 생성 및 조회 (Mock 데이터)</p>
        </div>
        <button
          type="button"
          onClick={() => toast('리포트 생성 — 기간·엔진을 골라 생성합니다 (본개발에서 연결)')}
          className="h-9 rounded-lg bg-gradient-to-r from-primary to-accent2 px-4 text-[13px] font-semibold text-white shadow-[0_2px_10px_var(--color-glow)] transition-opacity hover:opacity-90"
        >
          + 리포트 생성
        </button>
      </div>

      <div className="anim-fade-up mt-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-hairline bg-surface px-5 py-4">
            <div className={`truncate text-xl font-semibold tabular-nums ${s.cls ?? 'text-ink'}`}>{s.value}</div>
            <div className="mt-0.5 text-xs text-ink-subtle">
              {s.label} · {s.sub}
            </div>
          </div>
        ))}
      </div>

      <ol className="mt-5 space-y-3">
        {validationReports.map((r, i) => {
          const status = published[r.id] ? '발행' : r.status
          return (
            <li key={r.id} style={{ animationDelay: `${i * 60}ms` }} className="anim-fade-up">
              <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-hairline bg-surface p-5">
                <button type="button" onClick={() => setDetail(r)} className="min-w-0 flex-1 text-left">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-[15px] font-semibold text-ink hover:text-primary">{r.title}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        status === '발행' ? 'bg-deployed-bg text-deployed-ink' : 'bg-review-bg text-review-ink'
                      }`}
                    >
                      {status}
                    </span>
                  </span>
                  <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-subtle">
                    <span>엔진: <b className="text-ink-muted">{r.engine}</b></span>
                    <span>기간: {r.period}</span>
                    <span>생성: {r.createdAt} · {r.createdBy}</span>
                  </span>
                  <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    <span className="text-ink-subtle">실행 <b className="tabular-nums text-ink">{r.runs}회</b></span>
                    <span className="text-danger-ink">오류 <b className="tabular-nums">{r.errors}건</b></span>
                    <span className="text-review-ink">경고 <b className="tabular-nums">{r.warnings}건</b></span>
                    {r.types.map((t) => (
                      <span key={t.label} className="rounded-full bg-chip px-2 py-0.5 font-mono text-[10px] text-ink-muted">
                        {t.label}: {t.count}
                      </span>
                    ))}
                  </span>
                </button>
                <span className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDetail(r)}
                    className="h-9 rounded-lg border border-hairline bg-chip px-3.5 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
                  >
                    보기
                  </button>
                  {status === '임시저장' && (
                    <button
                      type="button"
                      onClick={() => {
                        setPublished((m) => ({ ...m, [r.id]: true }))
                        toast(`${r.title} 을 발행했습니다 — 공지·구독자에게 전달됩니다`)
                      }}
                      className="h-9 rounded-lg bg-gradient-to-r from-primary to-accent2 px-3.5 text-[13px] font-semibold text-white shadow-[0_2px_10px_var(--color-glow)] transition-opacity hover:opacity-90"
                    >
                      발행
                    </button>
                  )}
                </span>
              </div>
            </li>
          )
        })}
      </ol>

      {detail && (
        <Modal title={detail.title} onClose={() => setDetail(null)} wide>
          <dl className="grid grid-cols-2 gap-3 text-[13px] pc:grid-cols-3">
            {[
              { k: '대상 엔진', v: detail.engine },
              { k: '조회 기간', v: detail.period },
              { k: '생성자', v: detail.createdBy },
              { k: '생성일시', v: detail.createdAt },
              { k: '상태', v: published[detail.id] ? '발행' : detail.status },
              { k: '실행 횟수', v: `${detail.runs}회` },
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
              <div className="mt-0.5 text-xs text-danger-ink/80">총 오류</div>
            </div>
            <div className="rounded-xl border border-review-ink/25 bg-review-bg px-4 py-3.5 text-center">
              <div className="text-2xl font-semibold tabular-nums text-review-ink">{detail.warnings}</div>
              <div className="mt-0.5 text-xs text-review-ink/80">총 경고</div>
            </div>
            <div className="rounded-xl border border-deployed-ink/25 bg-deployed-bg px-4 py-3.5 text-center">
              <div className="text-2xl font-semibold tabular-nums text-deployed-ink">{detail.passRate}%</div>
              <div className="mt-0.5 text-xs text-deployed-ink/80">통과율</div>
            </div>
          </div>

          <div className="mt-4">
            <div className="text-xs font-medium text-ink-subtle">주요 오류 유형 요약</div>
            <div className="mt-1.5 overflow-x-auto rounded-xl border border-hairline">
              <table className="w-full min-w-[420px] border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-hairline bg-canvas/60 text-left text-xs text-ink-subtle">
                    <th className="px-3 py-2 font-medium">순위</th>
                    <th className="px-3 py-2 font-medium">오류 유형</th>
                    <th className="px-3 py-2 text-right font-medium">건수</th>
                    <th className="px-3 py-2 text-right font-medium">비율</th>
                    <th className="px-3 py-2 font-medium">조치</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.types.map((t, idx) => {
                    const total = detail.types.reduce((a, x) => a + x.count, 0)
                    return (
                      <tr key={t.label} className="border-b border-hairline/60 last:border-0">
                        <td className="px-3 py-2.5 font-mono text-xs text-ink-subtle">{idx + 1}</td>
                        <td className="px-3 py-2.5">
                          <code className="rounded bg-chip px-1.5 py-0.5 font-mono text-xs text-ink">{t.label}</code>
                        </td>
                        <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-danger-ink">{t.count}건</td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-ink-muted">
                          {Math.round((t.count / total) * 100)}%
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="rounded-full bg-review-bg px-2 py-0.5 text-[11px] font-semibold text-review-ink">
                            조치 필요
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setDetail(null)
                navigate({ to: '/validation-results' })
              }}
              className="mr-auto h-9 rounded-lg border border-hairline bg-chip px-3.5 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
            >
              실행 상세는 검증 결과 조회 →
            </button>
            <button
              type="button"
              onClick={() => toast('인쇄 — 본개발에서 연결됩니다')}
              className="h-9 rounded-lg border border-hairline bg-chip px-3.5 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
            >
              🖨 인쇄
            </button>
            <button
              type="button"
              onClick={() => toast('PDF 다운로드 — 본개발에서 연결됩니다')}
              className="h-9 rounded-lg border border-hairline bg-chip px-3.5 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
            >
              ⬇ PDF 다운로드
            </button>
          </div>
        </Modal>
      )}
    </AppShell>
  )
}
