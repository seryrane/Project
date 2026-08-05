import { useMemo, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { AppShell } from '#/components/portal/AppShell'
import { Avatar } from '#/components/portal/Avatar'
import { Modal } from '#/components/portal/Modal'
import { useToast } from '#/components/portal/toast'
import { approvalRequests, processedRequests } from '#/data/approvals'
import type { ApprovalRequest, RequestType } from '#/data/approvals'

export const Route = createFileRoute('/approvals')({ component: ApprovalsPage })

/* 유형은 이름표지만 삭제만은 위험을 함께 말한다 */
const TYPE_CLS: Record<RequestType, string> = {
  신규: 'bg-deployed-bg text-deployed-ink',
  수정: 'bg-draft-bg text-draft-ink',
  삭제: 'bg-danger-bg text-danger-ink',
}

/** 결재 단계 점 — ● 지난 단계 · ◉ 현재 · ○ 남은 단계 */
function StepDots({ step }: { step: [number, number] }) {
  const [cur, total] = step
  return (
    <span className="flex items-center gap-1" title={`${cur}/${total} 단계`}>
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

type Tab = 'mine' | 'all' | 'done'

function ApprovalsPage() {
  const toast = useToast()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('mine')
  // 프로토타입: 처리 결과는 화면 상태로만 든다
  const [decided, setDecided] = useState<Record<string, '승인' | '반려'>>({})
  const [confirming, setConfirming] = useState<{ req: ApprovalRequest; action: '승인' | '반려' } | null>(null)
  const [reason, setReason] = useState('')

  const pending = approvalRequests.filter((r) => !(r.id in decided))
  const rows = useMemo(() => {
    if (tab === 'mine') return pending.filter((r) => r.myTurn)
    if (tab === 'all') return pending
    return []
  }, [tab, decided])

  const decide = (req: ApprovalRequest, action: '승인' | '반려') => {
    setDecided((d) => ({ ...d, [req.id]: action }))
    setConfirming(null)
    setReason('')
    // 되돌릴 수 있으면 묻지 말고 되돌릴 길을 준다 — 프로토타입에서는 문구로만 시늉한다
    toast(`${req.specName} ${req.version} — ${action} 처리했습니다`)
  }

  const TABS: Array<{ key: Tab; label: string; count?: number }> = [
    { key: 'mine', label: '내 차례', count: pending.filter((r) => r.myTurn).length },
    { key: 'all', label: '전체 대기', count: pending.length },
    { key: 'done', label: '처리됨' },
  ]

  return (
    <AppShell active="approvals" title="승인 관리">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">승인 관리</h1>
          <p className="mt-1 text-[13px] text-ink-subtle">
            사양서 신규·수정·삭제 요청 결재 (Mock 데이터) · 내 차례{' '}
            <b className="tabular-nums text-ink">{pending.filter((r) => r.myTurn).length}건</b>
          </p>
        </div>
      </div>

      <div className="mt-5 flex gap-1 rounded-lg border border-hairline bg-surface p-1 text-[13px] w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-md px-3 py-1.5 transition-colors ${
              tab === t.key
                ? 'bg-gradient-to-r from-primary to-accent2 font-semibold text-white shadow-[0_2px_10px_var(--color-glow)]'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            {t.label}
            {t.count != null && <span className="ml-1.5 tabular-nums">{t.count}</span>}
          </button>
        ))}
      </div>

      {tab !== 'done' ? (
        <ol className="mt-5 space-y-3">
          {rows.map((r, i) => (
            <li
              key={r.id}
              style={{ animationDelay: `${i * 60}ms` }}
              className="anim-fade-up rounded-2xl border border-hairline bg-surface p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <button
                  type="button"
                  onClick={() => navigate({ to: '/specs', search: { open: r.specId } })}
                  className="min-w-0 text-left"
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${TYPE_CLS[r.type]}`}>
                      {r.type}
                    </span>
                    <span className="text-[15px] font-semibold text-ink hover:text-primary">
                      {r.specName}
                    </span>
                    <span className="rounded-full bg-primary/12 px-2 py-0.5 font-mono text-xs font-semibold text-primary">
                      {r.version}
                    </span>
                    {r.myTurn && (
                      <span className="rounded-full bg-pending-bg px-2 py-0.5 text-[11px] font-semibold text-pending-ink">
                        내 차례
                      </span>
                    )}
                  </span>
                  <span className="mt-1.5 block text-[13px] leading-relaxed text-ink-muted">
                    {r.summary}
                  </span>
                  <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-ink-subtle">
                    <span className="flex items-center gap-1.5">
                      <Avatar name={r.requester} size={16} />
                      {r.requester}
                    </span>
                    <span className="font-mono">{r.id}</span>
                    <span>{r.requestedAt} 상신</span>
                    <StepDots step={r.step} />
                    <span
                      className={`rounded-full px-2 py-0.5 font-semibold tabular-nums ${
                        r.waitingDays >= 3 ? 'bg-danger-bg text-danger-ink' : 'bg-chip text-ink-muted'
                      }`}
                    >
                      {r.waitingDays}일 경과
                    </span>
                  </span>
                </button>
                {r.myTurn && (
                  <span className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirming({ req: r, action: '반려' })}
                      className="h-9 rounded-lg border border-hairline bg-chip px-3.5 text-[13px] font-medium text-ink-muted transition-colors hover:bg-danger-bg hover:text-danger-ink"
                    >
                      반려
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirming({ req: r, action: '승인' })}
                      className="h-9 rounded-lg bg-gradient-to-r from-primary to-accent2 px-4 text-[13px] font-semibold text-white shadow-[0_2px_10px_var(--color-glow)] transition-opacity hover:opacity-90"
                    >
                      승인
                    </button>
                  </span>
                )}
              </div>
            </li>
          ))}
          {rows.length === 0 && (
            <li className="mt-10 text-center text-sm text-ink-subtle">
              {tab === 'mine' ? '내 차례인 결재가 없습니다.' : '대기 중인 결재가 없습니다.'}
            </li>
          )}
        </ol>
      ) : (
        <ol className="mt-5 space-y-2.5">
          {[
            ...Object.entries(decided).map(([id, result]) => {
              const r = approvalRequests.find((x) => x.id === id)
              const fallback: RequestType = '수정'
              return { id, specName: r?.specName ?? id, version: r?.version ?? '', type: r?.type ?? fallback, result, by: '김현대', at: '방금', reason: undefined as string | undefined }
            }),
            ...processedRequests,
          ].map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-hairline bg-surface px-4 py-3"
            >
              <span className="flex min-w-0 flex-wrap items-center gap-2 text-[13px]">
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${TYPE_CLS[p.type]}`}>
                  {p.type}
                </span>
                <span className="font-medium text-ink">{p.specName}</span>
                {p.version && <span className="font-mono text-xs text-ink-subtle">{p.version}</span>}
                {'reason' in p && p.reason && (
                  <span className="w-full text-xs text-ink-subtle">└ {p.reason}</span>
                )}
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

      {/* 확인 모달 — 승인·반려는 되돌릴 수 없는 것이라 여기만 묻는다 (규약 §2) */}
      {confirming && (
        <Modal
          title={`${confirming.action} 확인`}
          onClose={() => {
            setConfirming(null)
            setReason('')
          }}
        >
          <p className="text-[13px] leading-relaxed text-ink-muted">
            <b className="text-ink">
              {confirming.req.specName} {confirming.req.version}
            </b>{' '}
            ({confirming.req.type} 요청)을 <b className="text-ink">{confirming.action}</b>
            합니다. 처리 후에는 되돌릴 수 없고, {confirming.action === '승인'
              ? confirming.req.step[0] === confirming.req.step[1]
                ? '마지막 단계라 즉시 확정됩니다.'
                : `다음 단계(${confirming.req.step[0] + 1}/${confirming.req.step[1]}) 결재자에게 넘어갑니다.`
              : '요청자가 보완 후 재상신해야 합니다.'}
          </p>
          {confirming.action === '반려' && (
            <div className="mt-4">
              <label className="text-xs font-medium text-ink-subtle" htmlFor="reject-reason">
                반려 사유 <span className="text-danger-ink">*</span> — 무엇이 · 왜 · 다음에 무엇을
              </label>
              <textarea
                id="reject-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="예) 수집 주기 근거 자료 누락 — 첨부 보완 후 재상신해 주세요"
                className="mt-1.5 w-full rounded-lg border border-hairline bg-canvas/70 px-3 py-2.5 text-[13px] text-ink outline-none placeholder:text-ink-subtle focus:border-primary/60"
              />
            </div>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setConfirming(null)
                setReason('')
              }}
              className="h-9 rounded-lg border border-hairline bg-chip px-4 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
            >
              취소
            </button>
            <button
              type="button"
              disabled={confirming.action === '반려' && reason.trim() === ''}
              onClick={() => decide(confirming.req, confirming.action)}
              className={`h-9 rounded-lg px-4 text-[13px] font-semibold text-white transition-opacity disabled:opacity-40 ${
                confirming.action === '승인'
                  ? 'bg-gradient-to-r from-primary to-accent2 shadow-[0_2px_10px_var(--color-glow)] hover:opacity-90'
                  : 'bg-danger-ink hover:opacity-90'
              }`}
            >
              {confirming.action} 확정
            </button>
          </div>
        </Modal>
      )}
    </AppShell>
  )
}
