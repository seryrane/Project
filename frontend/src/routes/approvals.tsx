import { useMemo, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { AppShell } from '#/components/portal/AppShell'
import { Avatar } from '#/components/portal/Avatar'
import { Modal } from '#/components/portal/Modal'
import { useToast } from '#/components/portal/toast'
import { useI18n } from '#/lib/i18n'
import { KIND_CLS, approvalRequests, myRequests, processedRequests } from '#/data/approvals'
import type { ApprovalRequest } from '#/data/approvals'

export const Route = createFileRoute('/approvals')({ component: ApprovalsPage })

/** 결재 단계 점 — ● 지난 단계 · ◉ 현재 · ○ 남은 단계 */
function StepDots({ step }: { step: [number, number] }) {
  const { tf } = useI18n()
  const [cur, total] = step
  return (
    <span
      className="flex items-center gap-1"
      title={tf('approvals.stepTooltip', { cur, total }, '{cur}/{total} 단계')}
    >
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`h-2 w-2 rounded-full ${
            i + 1 < cur ? 'bg-primary' : i + 1 === cur ? 'bg-primary ring-2 ring-primary/30' : 'bg-chip-strong'
          }`}
        />
      ))}
      <span className="ml-1 text-[11px] tabular-nums text-ink-subtle">
        {cur}/{total}
      </span>
    </span>
  )
}

function KindChip({ kind }: { kind: keyof typeof KIND_CLS }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${KIND_CLS[kind]}`}>{kind}</span>
  )
}

function UrgentChip() {
  const { t } = useI18n()
  return (
    <span className="rounded-full bg-danger-bg px-2 py-0.5 text-[11px] font-semibold text-danger-ink">
      {t('approvals.urgent', '긴급')}
    </span>
  )
}

/* 증감 칩 — charts.tsx StatTile 의 DeltaChip 과 같은 모양. 관문(components/**) 은 고칠 수
   없고 비공개 함수라 가져올 수도 없어, 라우트 안에 같은 모양을 그대로 옮겨 쓴다 (규약 §10) */
function DeltaChip({ delta, good }: { delta: string; good: boolean }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${
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

type Tab = 'mine' | 'all' | 'requested' | 'done'

function ApprovalsPage() {
  const { t, tf } = useI18n()
  const toast = useToast()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('mine')
  const [query, setQuery] = useState('')
  // 프로토타입: 처리 결과는 화면 상태로만 든다
  const [decided, setDecided] = useState<Record<string, '승인' | '반려'>>({})
  const [detail, setDetail] = useState<ApprovalRequest | null>(null)
  const [opinion, setOpinion] = useState('')

  const pending = approvalRequests.filter((r) => !(r.id in decided))
  const matches = (text: string) => query.trim() === '' || text.includes(query.trim())

  const rows = useMemo(() => {
    const base = tab === 'mine' ? pending.filter((r) => r.myTurn) : pending
    return base.filter((r) => matches(`${r.title} ${r.id} ${r.requester}`))
  }, [tab, decided, query])

  const decide = (req: ApprovalRequest, action: '승인' | '반려') => {
    setDecided((d) => ({ ...d, [req.id]: action }))
    setDetail(null)
    setOpinion('')
    // 승인은 끝이 아니라 다음 단계의 시작이다 — 무엇이 이어지는지 함께 말한다
    if (action === '승인' && req.kind === '배포') {
      toast(
        tf(
          'approvals.toast.approvedDeploy',
          { title: req.title },
          '{title} 승인 완료 — 배포 관리에서 예정 시각에 실행됩니다',
        ),
      )
    } else if (action === '승인' && req.kind === '사양서') {
      toast(
        tf(
          'approvals.toast.approvedSpec',
          { title: req.title },
          '{title} 승인 완료 — 배포에 포함하려면 배포 관리에서 요청하세요',
        ),
      )
    } else {
      toast(
        tf(
          'approvals.toast.decided',
          { title: req.title, action: action === '승인' ? t('common.approve', '승인') : t('common.reject', '반려') },
          '{title} — {action} 처리했습니다',
        ),
      )
    }
  }

  const approvedCount =
    processedRequests.filter((p) => p.result === '승인').length +
    Object.values(decided).filter((v) => v === '승인').length
  const rejectedCount =
    processedRequests.filter((p) => p.result === '반려').length +
    Object.values(decided).filter((v) => v === '반려').length

  // 지난주 이 시각 스냅샷 — 실 이력이 없는 프로토타입이라 라우트 안 결정적 상수로 둔다
  // (난수 금지, 규약 §10). "전체 요청"은 누적 총계라 전과 견줘도 뜻이 서지 않아 증감을 빼고
  // 면(①)만 적용한다.
  const PREV_WEEK = { pending: 6, approved: 0, rejected: 0 }
  const fmtDelta = (n: number) => `${n >= 0 ? '+' : ''}${n}`
  const pendingDelta = pending.length - PREV_WEEK.pending
  const approvedDelta = approvedCount - PREV_WEEK.approved
  const rejectedDelta = rejectedCount - PREV_WEEK.rejected
  const deltaCaption = t('approvals.delta.caption', '지난주 대비')

  const stats = [
    { label: t('approvals.stat.total', '전체 요청'), value: approvalRequests.length + processedRequests.length },
    {
      label: t('approvals.stat.pending', '대기 중'),
      value: pending.length,
      cls: 'text-review-ink',
      // 대기 건이 늘면 나쁘다 — 결재 지연이 쌓인다는 뜻
      delta: fmtDelta(pendingDelta),
      deltaGood: pendingDelta <= 0,
      caption: deltaCaption,
    },
    {
      label: t('approvals.stat.approved', '승인 완료'),
      value: approvedCount,
      cls: 'text-deployed-ink',
      delta: fmtDelta(approvedDelta),
      deltaGood: approvedDelta >= 0,
      caption: deltaCaption,
    },
    {
      label: t('approvals.stat.rejected', '반려'),
      value: rejectedCount,
      cls: 'text-danger-ink',
      // 반려가 늘면 나쁘다
      delta: fmtDelta(rejectedDelta),
      deltaGood: rejectedDelta <= 0,
      caption: deltaCaption,
    },
  ]

  const TABS: Array<{ key: Tab; label: string; count?: number }> = [
    { key: 'mine', label: t('approvals.tab.mine', '내 차례'), count: pending.filter((r) => r.myTurn).length },
    { key: 'all', label: t('approvals.tab.all', '전체 대기'), count: pending.length },
    { key: 'requested', label: t('approvals.tab.requested', '내 요청'), count: myRequests.length },
    { key: 'done', label: t('approvals.tab.done', '처리됨') },
  ]

  return (
    <AppShell active="approvals" title="승인 관리">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('nav.approvals', '승인 관리')}</h1>
          <p className="mt-1 text-[13px] text-ink-subtle">
            {tf(
              'page.approvals.subtitle',
              { n: pending.filter((r) => r.myTurn).length },
              '사양서·배포·메뉴·권한 결재 (Mock 데이터) · 내 차례 {n}건',
            )}
          </p>
        </div>
      </div>

      {/* 요약 — 라벨 줄은 머리(옅은 면), 숫자는 몸 (규약 §7·§10) */}
      <div className="anim-fade-up mt-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card-spotlight overflow-hidden rounded-2xl border border-hairline bg-surface">
            <div className="flex items-center justify-between gap-2 surface-head px-4 py-2">
              <span className="truncate text-[11px] text-ink-subtle">{s.label}</span>
              {s.delta && <DeltaChip delta={s.delta} good={s.deltaGood} />}
            </div>
            <div className="px-4 py-3.5">
              <div className={`text-2xl font-semibold tabular-nums ${s.cls ?? 'text-ink'}`}>{s.value}</div>
              {s.caption && <div className="mt-1 text-[11px] text-ink-subtle">{s.caption}</div>}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-3 pc:flex-row pc:items-center">
        <div className="flex w-fit gap-1 rounded-lg border border-hairline bg-surface p-1 text-[13px]">
          {TABS.map((tb) => (
            <button
              key={tb.key}
              type="button"
              onClick={() => setTab(tb.key)}
              className={`rounded-md px-3 py-1.5 transition-colors ${
                tab === tb.key
                  ? 'bg-gradient-to-r from-primary to-accent2 font-semibold text-white shadow-[0_2px_10px_var(--color-glow)]'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              {tb.label}
              {tb.count != null && <span className="ml-1.5 tabular-nums">{tb.count}</span>}
            </button>
          ))}
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('approvals.searchPlaceholder', '제목, ID, 요청자 검색...')}
          className="h-10 rounded-lg border border-hairline bg-surface px-3 text-[13px] outline-none placeholder:text-ink-subtle focus:border-primary/60 pc:ml-auto pc:w-64"
        />
      </div>

      {tab === 'mine' || tab === 'all' ? (
        <ol className="mt-5 space-y-3">
          {rows.map((r, i) => (
            <li key={r.id} style={{ animationDelay: `${i * 60}ms` }} className="anim-fade-up">
              <button
                type="button"
                onClick={() => setDetail(r)}
                className="card-hover flex w-full flex-col card-spotlight overflow-hidden rounded-2xl border border-hairline bg-surface text-left"
              >
                {/* 머리 — 종류·ID·상태를 면+선으로 갈라 얹는다(규약 §7). 칩·배지가 있어 py-3 */}
                <span className="flex flex-wrap items-center gap-2 surface-head px-5 py-3">
                  {r.urgent && <UrgentChip />}
                  <KindChip kind={r.kind} />
                  <span className="font-mono text-xs text-ink-subtle">{r.id}</span>
                  <span className="rounded-full bg-review-bg px-2 py-0.5 text-[11px] font-semibold text-review-ink">
                    {t('approvals.waitingBadge', '대기')}
                  </span>
                  {r.myTurn && (
                    <span className="rounded-full bg-pending-bg px-2 py-0.5 text-[11px] font-semibold text-pending-ink">
                      {t('approvals.tab.mine', '내 차례')}
                    </span>
                  )}
                  <span className="ml-auto flex items-center gap-1.5 text-xs text-ink-subtle">
                    <Avatar name={r.requester} size={16} />
                    {r.requester} · {r.requestedAt} · {t('approvals.deadlineLabel', '기한')}{' '}
                    <b className={r.waitingDays >= 3 ? 'text-danger-ink' : 'text-ink-muted'}>{r.deadline}</b>
                  </span>
                </span>
                {/* 몸 */}
                <span className="block px-5 pb-5 pt-4">
                  <span className="block text-[15px] font-semibold text-ink">{r.title}</span>
                  <span className="mt-1 block text-[13px] leading-relaxed text-ink-muted">{r.summary}</span>
                  <span className="mt-3 flex items-center justify-between gap-3">
                    <StepDots step={r.step} />
                    {r.myTurn && (
                      <span className="flex-1 rounded-lg bg-deployed-bg/60 py-1.5 text-center text-xs font-medium text-deployed-ink">
                        {t('approvals.reviewThenProcess', '상세 검토 후 처리')}
                      </span>
                    )}
                  </span>
                </span>
              </button>
            </li>
          ))}
          {rows.length === 0 && (
            <li className="mt-10 text-center text-sm text-ink-subtle">
              {tab === 'mine'
                ? t('approvals.emptyMine', '내 차례인 결재가 없습니다.')
                : t('approvals.emptyAll', '대기 중인 결재가 없습니다.')}
            </li>
          )}
        </ol>
      ) : tab === 'requested' ? (
        <ol className="mt-5 space-y-2.5">
          {myRequests
            .filter((r) => matches(`${r.title} ${r.id}`))
            .map((r) => (
              <li
                key={r.id}
                className="card-spotlight overflow-hidden rounded-2xl border border-hairline bg-surface"
              >
                {/* 머리 — 종류·ID·상태를 면+선으로 갈라 얹는다(규약 §7). 칩·배지가 있어 py-3 */}
                <div className="flex flex-wrap items-center gap-2 surface-head px-5 py-3">
                  <KindChip kind={r.kind} />
                  <span className="font-mono text-xs text-ink-subtle">{r.id}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      r.status === '승인'
                        ? 'bg-deployed-bg text-deployed-ink'
                        : 'bg-review-bg text-review-ink'
                    }`}
                  >
                    {r.status}
                  </span>
                  <span className="ml-auto text-xs text-ink-subtle">
                    {tf(
                      'approvals.approverDeadline',
                      { approver: r.approver, requestedAt: r.requestedAt, deadline: r.deadline },
                      '승인자 {approver} · {requestedAt} · 기한 {deadline}',
                    )}
                  </span>
                </div>
                {/* 몸 */}
                <div className="px-5 pb-5 pt-4">
                  <span className="block text-[15px] font-semibold text-ink">{r.title}</span>
                  <span className="mt-1 block text-[13px] text-ink-muted">{r.summary}</span>
                </div>
              </li>
            ))}
        </ol>
      ) : (
        <ol className="mt-5 space-y-2.5">
          {[
            ...Object.entries(decided).map(([id, result]) => {
              const r = approvalRequests.find((x) => x.id === id)
              return {
                id,
                kind: r?.kind ?? ('사양서' as const),
                title: r?.title ?? id,
                result,
                by: '김현대',
                at: '방금',
                reason: result === '반려' ? opinion || undefined : undefined,
              }
            }),
            ...processedRequests.map((p) => ({ ...p, reason: 'reason' in p ? p.reason : undefined })),
          ].map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-hairline bg-surface px-4 py-3"
            >
              <span className="flex min-w-0 flex-wrap items-center gap-2 text-[13px]">
                <KindChip kind={p.kind} />
                <span className="font-mono text-xs text-ink-subtle">{p.id}</span>
                <span className="font-medium text-ink">{p.title}</span>
                {p.reason && <span className="w-full text-xs text-ink-subtle">└ {p.reason}</span>}
              </span>
              <span className="flex items-center gap-2.5 text-xs text-ink-subtle">
                <span
                  className={`rounded-full px-2 py-0.5 font-semibold ${
                    p.result === '승인' ? 'bg-deployed-bg text-deployed-ink' : 'bg-danger-bg text-danger-ink'
                  }`}
                >
                  {p.result}
                </span>
                {p.by} · {p.at}
              </span>
            </li>
          ))}
        </ol>
      )}

      {/* 승인 요청 상세 — 변경 전/후를 갈라 보여 주고, 처리도 여기서 한다 */}
      {detail && (
        <Modal
          title={t('approvals.detailModalTitle', '승인 요청 상세')}
          onClose={() => {
            setDetail(null)
            setOpinion('')
          }}
          wide
        >
          <div className="rounded-xl border border-hairline bg-canvas/50 px-4 py-3.5">
            <div className="flex flex-wrap items-center gap-2">
              {detail.urgent && <UrgentChip />}
              <KindChip kind={detail.kind} />
              <span className="font-mono text-xs text-ink-subtle">{detail.id}</span>
              <span className="rounded-full bg-review-bg px-2 py-0.5 text-[11px] font-semibold text-review-ink">
                {t('approvals.waitingBadge', '대기')}
              </span>
              <StepDots step={detail.step} />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-[15px] font-semibold text-ink">{detail.title}</span>
              {detail.specId && (
                <button
                  type="button"
                  onClick={() => navigate({ to: '/specs/$specId', params: { specId: detail.specId! } })}
                  className="rounded-full bg-primary/12 px-2.5 py-0.5 text-xs font-medium text-primary transition-opacity hover:opacity-80"
                >
                  {t('approvals.openSpec', '사양서 열기 →')}
                </button>
              )}
              {detail.kind === '배포' && (
                <button
                  type="button"
                  onClick={() => navigate({ to: '/deploys' })}
                  className="rounded-full bg-primary/12 px-2.5 py-0.5 text-xs font-medium text-primary transition-opacity hover:opacity-80"
                >
                  {t('approvals.openDeploys', '배포 관리 열기 →')}
                </button>
              )}
            </div>
          </div>

          <div className="mt-4">
            <div className="text-xs font-medium text-ink-subtle">
              {t('approvals.label.requestContent', '요청 내용')}
            </div>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">{detail.summary}</p>
          </div>

          <div className="mt-4">
            <div className="text-xs font-medium text-ink-subtle">{t('approvals.label.changes', '변경 항목')}</div>
            <div className="mt-1.5 overflow-x-auto rounded-xl border border-hairline">
              <table className="w-full min-w-[480px] border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-hairline bg-canvas/60 text-left text-xs text-ink-subtle">
                    <th className="px-3 py-2 font-medium">{t('approvals.th.item', '항목')}</th>
                    <th className="px-3 py-2 font-medium">{t('approvals.th.before', '변경 전')}</th>
                    <th className="px-3 py-2 font-medium">{t('approvals.th.after', '변경 후')}</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.changes.map((c) => (
                    <tr key={c.item} className="border-b border-hairline/60 last:border-0">
                      <td className="px-3 py-2.5 font-medium text-ink">{c.item}</td>
                      <td className="px-3 py-2.5">
                        {c.before ? (
                          <span className="rounded bg-danger-bg px-1.5 py-0.5 text-danger-ink line-through">
                            {c.before}
                          </span>
                        ) : (
                          <span className="text-ink-subtle">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="rounded bg-added-bg px-1.5 py-0.5 font-medium text-added-ink">
                          {c.after}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 pc:grid-cols-2">
            <div className="rounded-xl border border-hairline px-4 py-3">
              <div className="text-xs font-medium text-ink-subtle">{t('approvals.label.requester', '요청자')}</div>
              <div className="mt-1.5 flex items-center gap-2 text-[13px]">
                <Avatar name={detail.requester} size={24} />
                <span>
                  <b className="text-ink">{detail.requester}</b>
                  <span className="ml-1.5 text-ink-subtle">{detail.requesterTeam}</span>
                </span>
              </div>
              <div className="mt-1 text-xs text-ink-subtle">
                {tf('approvals.requestedOn', { date: detail.requestedAt }, '요청일 {date}')}
              </div>
            </div>
            <div className="rounded-xl border border-hairline px-4 py-3">
              <div className="text-xs font-medium text-ink-subtle">{t('approvals.label.approver', '승인자')}</div>
              <div className="mt-1.5 flex items-center gap-2 text-[13px]">
                <Avatar name={detail.approver} size={24} />
                <b className="text-ink">{detail.approver}</b>
              </div>
              <div className="mt-1 text-xs text-ink-subtle">
                {t('approvals.label.processDeadline', '처리 기한')}{' '}
                <b className={detail.waitingDays >= 3 ? 'text-danger-ink' : 'text-ink-muted'}>{detail.deadline}</b>
              </div>
            </div>
          </div>

          {detail.myTurn ? (
            <>
              <div className="mt-4">
                <label className="text-xs font-medium text-ink-subtle" htmlFor="opinion">
                  {t('approvals.label.opinion', '승인 의견')}{' '}
                  <span className="text-ink-subtle">
                    {t('approvals.opinionHint', '(반려 시 필수 — 무엇이 · 왜 · 다음에 무엇을)')}
                  </span>
                </label>
                <textarea
                  id="opinion"
                  value={opinion}
                  onChange={(e) => setOpinion(e.target.value)}
                  rows={3}
                  placeholder={t('approvals.opinionPlaceholder', '승인/반려 의견을 입력하세요...')}
                  className="mt-1.5 w-full rounded-lg border border-hairline bg-canvas/60 px-3 py-2.5 text-[13px] text-ink outline-none placeholder:text-ink-subtle focus:border-primary/60"
                />
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={opinion.trim() === ''}
                  onClick={() => decide(detail, '반려')}
                  className="h-9 rounded-lg bg-danger-ink px-4 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  ✕ {t('common.reject', '반려')}
                </button>
                <button
                  type="button"
                  onClick={() => decide(detail, '승인')}
                  className="h-9 rounded-lg bg-gradient-to-r from-primary to-accent2 px-5 text-[13px] font-semibold text-white shadow-[0_2px_10px_var(--color-glow)] transition-opacity hover:opacity-90"
                >
                  ✓ {t('common.approve', '승인')}
                </button>
              </div>
            </>
          ) : (
            <p className="mt-4 rounded-lg bg-chip px-3 py-2 text-xs text-ink-subtle">
              {tf(
                'approvals.notMyTurn',
                { cur: detail.step[0], total: detail.step[1] },
                '지금은 내 차례가 아닙니다 — {cur}/{total} 단계 결재자 처리를 기다립니다.',
              )}
            </p>
          )}
        </Modal>
      )}
    </AppShell>
  )
}
