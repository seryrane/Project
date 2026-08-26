import { useMemo, useState } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'

import { AppShell } from '#/components/portal/AppShell'
import { Avatar } from '#/components/portal/Avatar'
import { Icon } from '#/components/portal/Icon'
import { Select } from '#/components/portal/Select'
import { SERVICE_ROLES, SERVICE_ROLE_LABEL, membersWithRole } from '#/data/members'
import { ListFoot } from '#/components/portal/ListFoot'
import { Modal } from '#/components/portal/Modal'
import { useToast } from '#/components/portal/toast'
import { useI18n } from '#/lib/i18n'
import { orNone, pickOne } from '#/lib/urlState'
import { KIND_CLS, processedRequests } from '#/data/approvals'
import {
  MAX_APPROVAL_STEPS,
  conflictedSpecIds,
  setApprovalLine,
  useApprovalLine,
  useApprovalList,
} from '#/data/approvalStore'
import type { ApprovalRecord } from '#/data/approvalStore'
import {
  cancelRequestById as cancelFlow,
  decide as decideFlow,
  withdrawRequestById as withdrawFlow,
} from '#/data/workflow'

/** 데모 로그인 계정 — 본개발에서는 `GET /api/me` 가 준다 (규약 §4-2) */
const ME = '김현대'

const TAB_KEYS = ['mine', 'all', 'requested', 'done'] as const
const DEFAULT_TAB: Tab = 'mine'

/** 지금 보고 있는 탭을 주소에 둔다 (lib/urlState.ts) — 상세를 보고 뒤로 와도 그 탭이다 */
interface ApprovalsSearch {
  tab?: Tab
}

export const Route = createFileRoute('/approvals')({
  component: ApprovalsPage,
  validateSearch: (search: Record<string, unknown>): ApprovalsSearch => ({
    tab: pickOne(search.tab, TAB_KEYS),
  }),
})

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
      <span className="ml-1 text-xs tabular-nums text-ink-subtle">
        {cur}/{total}
      </span>
    </span>
  )
}

function KindChip({ kind }: { kind: keyof typeof KIND_CLS }) {
  // 값은 정본(한국어), 표시만 사전이 옮긴다 — EN 화면에서 종류 칩만 한국어로 남아 있었다
  const { t } = useI18n()
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${KIND_CLS[kind]}`}>
      {t(`requestKind.${kind}`, kind)}
    </span>
  )
}

function UrgentChip() {
  const { t } = useI18n()
  return (
    <span className="rounded-full bg-danger-bg px-2 py-0.5 text-xs font-semibold text-danger-ink">
      {t('approvals.urgent', '긴급')}
    </span>
  )
}

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

type Tab = 'mine' | 'all' | 'requested' | 'done'

function ApprovalsPage() {
  const { t, tf } = useI18n()
  const toast = useToast()
  const navigate = useNavigate()
  const { tab = DEFAULT_TAB } = Route.useSearch()
  const setTab = (next: Tab) =>
    void navigate({ to: '/approvals', search: { tab: orNone(next, DEFAULT_TAB) } })
  const [query, setQuery] = useState('')
  /* ⚠⚠ 처리 결과가 **이 화면의 useState** 였다: 승인을 눌러도 사양서로 돌아가면 여전히
     '승인 대기'였고, 새로고침하면 아무 일도 없던 것이 됐다(2026-08-18). 정본은 결재함
     스토어이고, 승인/반려는 workflow 를 지나 사양서·배포까지 함께 움직인다. */
  const requests = useApprovalList()
  const [detail, setDetail] = useState<ApprovalRecord | null>(null)
  const [opinion, setOpinion] = useState('')
  /* 처리 직후의 두 신호(2026-08-26 사용자 지적 "승인 눌렀는데 안 된 줄 알고 계속 누른다"):
     ① justDone — 방금 무엇이 처리됐는지 배너로 남긴다(다음 건이 같은 모달에 바로 서는
        연속 처리라, 신호가 없으면 "안 닫혔나?"로 읽히고 **연타가 다음 건을 실수 승인**한다)
     ② cooldown — 처리 직후 0.7초 버튼을 잠근다: 연타의 두 번째 클릭이 닿을 곳을 없앤다 */
  const [justDone, setJustDone] = useState<{ title: string; action: '승인' | '반려' } | null>(null)
  const [cooldown, setCooldown] = useState(false)
  const [lineOpen, setLineOpen] = useState(false)
  /* 겹침 정리 — 취소는 **남의 요청을 내리는 일**이라 사유 없이는 못 누른다 (workflow 가 막지만
     화면이 먼저 말해 준다). 대상 건을 들고 있는 상태 하나로 모달을 연다. */
  const [canceling, setCanceling] = useState<ApprovalRecord | null>(null)
  const [cancelReason, setCancelReason] = useState('')

  /* ⚠ 겹침은 **결재함이 센다**(conflictedSpecIds) — 화면이 자기 목록을 다시 훑어 세면
     탭·검색으로 걸러진 목록을 세게 되어 "겹쳤는데 안 겹쳤다"고 말한다 (규약 §10). */
  const conflicted = useMemo(() => conflictedSpecIds(requests), [requests])
  /** 이 건과 같은 사양서를 보는 **다른** 진행 중 요청 */
  const siblingsOf = (r: ApprovalRecord) =>
    r.specId && conflicted.has(r.specId)
      ? requests.filter(
          // ⚠ **승인만 나고 아직 반영 안 된 건도 형제다** — 대기 풀에 같이 남아 있다
          (o) => o.specId === r.specId && (o.state === '진행 중' || o.state === '승인 완료') && o.id !== r.id,
        )
      : []

  const pending = requests.filter((r) => r.state === '진행 중')
  const processed = requests.filter((r) => r.state !== '진행 중')
  const myRequests = requests.filter((r) => r.requester === ME)
  const matches = (text: string) => query.trim() === '' || text.includes(query.trim())

  const rows = useMemo(() => {
    const base = tab === 'mine' ? pending.filter((r) => r.myTurn) : pending
    const hit = base.filter((r) => matches(`${r.title} ${r.id} ${r.requester}`))
    /* 겹친 건은 **붙여 세운다** (고객 2026-07-20: "같은 항목에 대해서 들어오면 이 밑에
       한 번 더 가지식으로 리스트업이 되면 좋겠다"). 목록 순서는 그대로 두고, 먼저 나온
       형제 뒤에 나머지를 끌어다 붙인다 — 위아래로 흩어져 있으면 겹친 줄을 모른다.
       ⚠ 정렬로 뒤집지 않는다: 기한 순서가 무너지면 "왜 이 건이 위에 있지"가 된다. */
    const out: Array<ApprovalRecord> = []
    const done = new Set<string>()
    for (const r of hit) {
      if (done.has(r.id)) continue
      out.push(r)
      done.add(r.id)
      if (!r.specId || !conflicted.has(r.specId)) continue
      for (const o of hit) {
        if (o.specId === r.specId && !done.has(o.id)) {
          out.push(o)
          done.add(o.id)
        }
      }
    }
    return out
  }, [tab, requests, query, conflicted])

  /** 방금 처리한 건 **다음**의 내 차례 건. 없으면 null(덮개를 닫는다). */
  const queueAfter = (doneId: string): ApprovalRecord | null => {
    const mine = pending.filter((r) => r.myTurn && r.id !== doneId)
    if (mine.length === 0) return null
    // 보고 있던 자리 뒤부터 — 목록 순서를 그대로 따라간다(위에서 아래로 훑는 손을 안 끊는다)
    const at = pending.findIndex((r) => r.id === doneId)
    return mine.find((r) => pending.indexOf(r) > at) ?? mine[0]
  }

  const decide = (req: ApprovalRecord, action: '승인' | '반려') => {
    // 반려는 사유가 필수 — 스토어가 막지만, 화면이 먼저 말해 준다(누르고 나서 알면 늦다)
    if (action === '반려' && opinion.trim() === '') {
      toast(t('approvals.toast.needOpinion', '반려 사유를 입력해 주세요 — 요청자는 이 글을 보고 고칩니다'))
      return
    }
    const res = decideFlow(req.id, action, opinion, ME)
    if (!res.ok) {
      toast(t('approvals.toast.decideFailed', '이미 처리된 요청입니다'))
      return
    }
    setOpinion('')
    setJustDone({ title: req.title, action })
    setCooldown(true)
    window.setTimeout(() => setCooldown(false), 700)
    /* ── 연속 처리 ─────────────────────────────────────────────────────
       ⚠ 결재는 **한 건씩 오지 않는다**: 내 차례가 넷이면 [상세]→[승인]→닫기→[상세]…
       를 네 번 반복해야 했다(2026-08-18). 처리하고 나면 **다음 내 차례 건을 그 자리에
       바로 세운다** — 판단은 여전히 한 건씩 하되(승인/반려 버튼은 그대로), 오가는 걸음만
       줄인다. 마지막 건을 처리하면 덮개가 닫힌다(더 세울 것이 없으면 자리를 비운다). */
    const next = queueAfter(req.id)
    setDetail(next)
    // 마지막 단계가 아니면 **아직 끝난 게 아니다** — 다음 결재자에게 넘어갔다고 말한다
    if (action === '승인' && !res.finished) {
      toast(
        tf(
          'approvals.toast.passedOn',
          { title: req.title },
          '{title} — 승인했습니다. 다음 결재자에게 넘어갔습니다',
        ),
      )
      return
    }
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
    processed.filter((r) => r.state === '승인 완료').length
  const rejectedCount =
    processedRequests.filter((p) => p.result === '반려').length +
    processed.filter((r) => r.state === '반려').length

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
    { label: t('approvals.stat.total', '전체 요청'), value: requests.length + processedRequests.length },
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
        <div className="flex shrink-0 items-center gap-2">
          {/* 흐름 허브로 가는 다리 — 결재하다 전체 흐름이 궁금하면 보드로 */}
          <Link
            to="/board"
            className="flex h-9 items-center rounded-lg border border-hairline bg-surface px-3.5 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
          >
            {t('flow.toBoard', '상태 보드 →')}
          </Link>
          {/* FR-114 ② "승인선을 설정으로 변경할 수 있다" — 설정은 결재를 보는 자리 옆에 둔다
              (별도 메뉴로 빼면 결재선을 고치러 어디로 가야 하는지 아무도 모른다) */}
          <button
            type="button"
            onClick={() => setLineOpen(true)}
            className="h-9 rounded-lg border border-hairline bg-surface px-3.5 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
          >
            {t('approvals.lineSettings', '결재선 설정')}
          </button>
        </div>
      </div>

      {/* 요약 — 라벨 줄은 머리(옅은 면), 숫자는 몸 (규약 §7·§10) */}
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
                  {/* ⚠⚠ **배지가 여섯이었다**(2026-08-21 실측: 긴급·종류·ID·대기·내 차례·겹침,
                      색이 여섯 가지). 다 중요하다고 말하면 아무것도 중요하지 않다 — 좁은
                      화면에서는 이 줄이 두 줄로 접혀 **제목보다 자리를 더 먹었다**.
                      규칙: **색 배지는 카드당 둘까지** — 위험 하나(긴급·겹침) + 내 차례 하나.
                      나머지(종류·ID·대기)는 무채색 사실이라 글자로 적는다. */}
                  {r.urgent && <UrgentChip />}
                  {/* 겹침은 **위험**이다 — 이 건만 보고 승인하면 반영이 막힌다 */}
                  {r.specId && conflicted.has(r.specId) && (
                    <span className="rounded-full bg-danger-bg px-2 py-0.5 text-xs font-semibold text-danger-ink">
                      {tf('approvals.conflictBadge', { n: siblingsOf(r).length + 1 }, '겹침 {n}')}
                    </span>
                  )}
                  {r.myTurn && (
                    <span className="flex items-center gap-1 rounded-full bg-pending-bg px-2 py-0.5 text-xs font-semibold text-pending-ink">
                      {/* 색만으로 가르지 않는다 — 점을 함께 둔다 (규약 §2) */}
                      <span aria-hidden>●</span>
                      {t('approvals.tab.mine', '내 차례')}
                    </span>
                  )}
                  <span className="text-xs text-ink-subtle">
                    {t(`requestKind.${r.kind}`, r.kind)} · <span className="font-mono">{r.id}</span> ·{' '}
                    {t('approvals.waitingBadge', '대기')}
                  </span>
                  <span className="ml-auto flex items-center gap-1.5 text-xs text-ink-subtle">
                    <Avatar name={r.requester} size={16} />
                    {r.requester} · {r.requestedAt} · {t('approvals.deadlineLabel', '기한')}{' '}
                    <b className={r.waitingDays >= 3 ? 'text-danger-ink' : 'text-ink-muted'}>{r.deadline}</b>
                  </span>
                </span>
                {/* 몸 */}
                <span className="block px-5 pb-5 pt-4">
                  <span className="block text-base font-semibold text-ink">{r.title}</span>
                  <span className="mt-1 block text-[13px] leading-relaxed text-ink-muted">{r.summary}</span>
                  {/* ⚠⚠ **눌리게 생겼는데 안 눌리던 자리**(2026-08-21). 여기엔 카드 폭 70% 를
                      차지하는 초록 띠가 "상세 검토 후 처리"라고 적혀 있었다 — 크기가 곧
                      약속이라 사람은 그것을 버튼으로 읽는데, 실은 안내문이었다.
                      ⚠ 카드 자체가 이미 `<button>` 이라 안에 버튼을 또 둘 수 없다(중첩 금지).
                      그래서 **카드의 어포던스를 대신 말하는 한 줄**로 낮춘다 — 오른쪽 끝에
                      서고, 누르면 실제로 그 일이 일어난다(카드를 누르는 것과 같다). */}
                  <span className="mt-3 flex items-center justify-between gap-3">
                    <StepDots step={r.step} />
                    {r.myTurn && (
                      <span className="shrink-0 text-[13px] font-semibold text-primary">
                        {t('approvals.reviewCta', '검토하기 →')}
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
          {/* 거르면 몇 건 중 몇 건인지 말한다 (규약 §9) — 탭마다 세는 모수가 다르다:
              [내 차례]는 내 차례 전체를, [전체 대기]는 대기 전체를 모수로 삼는다.
              모수를 하나로 두면 "내 차례 2건 중 2건"인데 발이 "전체 5건"이라고 말한다. */}
          {rows.length > 0 && (
            <ListFoot
              total={tab === 'mine' ? pending.filter((r) => r.myTurn).length : pending.length}
              shown={rows.length}
            />
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
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      r.state === '승인 완료'
                        ? 'bg-deployed-bg text-deployed-ink'
                        : r.state === '반려'
                          ? 'bg-danger-bg text-danger-ink'
                          : r.state === '회수'
                            ? 'bg-chip text-ink-subtle'
                            : 'bg-review-bg text-review-ink'
                    }`}
                  >
                    {r.state}
                  </span>
                  {/* 회수 — 아직 아무도 판단하지 않은 건만 (✔ 2026-08-19 채택) */}
                  {r.state === '진행 중' && r.trail.length === 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const ok = withdrawFlow(r.id, ME)
                        toast(
                          ok
                            ? t('approvals.toast.withdrawn', '요청을 회수했습니다')
                            : t('approvals.toast.withdrawFailed', '이미 결재가 진행되어 회수할 수 없습니다'),
                        )
                      }}
                      className="rounded-lg border border-hairline px-2.5 py-1 text-xs font-medium text-ink-muted transition-colors hover:text-ink"
                    >
                      {t('approvals.withdraw', '회수')}
                    </button>
                  )}
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
                  <span className="block text-base font-semibold text-ink">{r.title}</span>
                  <span className="mt-1 block text-[13px] text-ink-muted">{r.summary}</span>
                </div>
              </li>
            ))}
        </ol>
      ) : (
        <ol className="mt-5 space-y-2.5">
          {[
            /* 결재함이 끝났다고 말하는 건들 — 마지막 처리 기록(trail)이 누가·언제·왜를 안다.
               ⚠ 예전엔 이 목록이 화면 state(`decided`)라 새로고침하면 사라졌다 */
            ...processed.map((r) => {
              // ⚠ `.at(-1)` 은 빈 배열에서 undefined 를 준다 — 자리 인덱스는 타입이 그걸 못 말한다
              const last = r.trail.at(-1)
              return {
                id: r.id,
                kind: r.kind,
                title: r.title,
                result:
                  r.state === '승인 완료' || r.state === '반영 완료'
                    ? ('승인' as const)
                    : r.state === '반려'
                      ? ('반려' as const)
                      : r.state === '취소'
                        ? ('취소' as const)
                        : ('회수' as const),
                by: last?.approver ?? r.requester,
                at: last?.at ?? r.requestedAt,
                // ⚠ 취소도 사유가 남는다 — 요청자가 "왜 내 것이 내려갔나"를 여기서 읽는다
                reason: r.state === '반려' || r.state === '취소' ? last?.opinion : undefined,
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
                    p.result === '승인'
                      ? 'bg-deployed-bg text-deployed-ink'
                      : p.result === '회수'
                        ? 'bg-chip text-ink-subtle'
                        : 'bg-danger-bg text-danger-ink'
                  }`}
                >
                  {t(`trailAction.${p.result}`, p.result)}
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
          title={
            <span className="flex items-center gap-2.5">
              {t('approvals.detailModalTitle', '승인 요청 상세')}
              {/* 내 차례가 몇 건 남았는지 **항상** 보인다 — 발의 안내만으로는 처리 후 놓친다 */}
              {pending.filter((r) => r.myTurn).length > 0 && (
                <span className="rounded-full bg-primary/12 px-2 py-0.5 text-[11px] font-medium tabular-nums text-primary">
                  {tf('approvals.mineLeft', { n: pending.filter((r) => r.myTurn).length }, '내 차례 {n}건')}
                </span>
              )}
            </span>
          }
          onClose={() => {
            setDetail(null)
            setOpinion('')
            setJustDone(null)
          }}
          wide
          /* 뒤에 남은 내 차례 수만큼 종이가 겹쳐 보인다 — "이 건 뒤에 더 있다"의 물리적
             표현(글자 카운터만으로는 약하다, 2026-08-26 사용자 지적) */
          stack={detail.myTurn ? pending.filter((r) => r.myTurn && r.id !== detail.id).length : 0}
          /* ⚠ 발은 **내 차례일 때만** 선다 — 조작이 없는데 빈 발을 세우면 "여기서 무언가
             해야 하나"로 읽힌다 (규약 §7). 내 차례가 아니면 몸이 그 사실을 말한다. */
          footer={
            detail.myTurn ? (
              <div className="flex flex-wrap items-center justify-end gap-2">
                {/* 연속 처리 중이라는 것을 **처리 전에** 알려 준다 — 처리하고 나서 다음 건이
                    불쑥 서면 "안 닫혔나?"로 읽힌다 (규약 §0 예측 가능성) */}
                {queueAfter(detail.id) && (
                  /* "다음에 무엇이 오는지"를 제목으로 보여 준다 — 수만 말하면 추상적이라
                     약하다. 처리하면 이 칩의 건이 그 자리에 선다(연속 처리 예고). */
                  <span className="mr-auto flex min-w-0 items-center gap-1.5 text-xs text-ink-subtle">
                    <span className="shrink-0">{t('approvals.nextUp', '다음 ▸')}</span>
                    <span className="max-w-52 truncate rounded-full bg-chip px-2.5 py-1 font-medium text-ink-muted">
                      {queueAfter(detail.id)!.title}
                    </span>
                    {pending.filter((r) => r.myTurn && r.id !== detail.id).length > 1 && (
                      <span className="shrink-0 rounded-full bg-chip px-2 py-1 tabular-nums text-ink-muted">
                        +{pending.filter((r) => r.myTurn && r.id !== detail.id).length - 1}
                      </span>
                    )}
                  </span>
                )}
                <button
                  type="button"
                  disabled={cooldown || opinion.trim() === ''}
                  onClick={() => decide(detail, '반려')}
                  className="h-9 rounded-lg bg-danger-ink px-4 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  ✕ {t('common.reject', '반려')}
                </button>
                <button
                  type="button"
                  disabled={cooldown}
                  onClick={() => decide(detail, '승인')}
                  className="h-9 rounded-lg bg-gradient-to-r from-primary to-accent2 px-5 text-[13px] font-semibold text-white shadow-[0_2px_10px_var(--color-glow)] transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  ✓ {t('common.approve', '승인')}
                </button>
              </div>
            ) : undefined
          }
        >
          {justDone && (
            /* 방금 처리한 것의 자국 — 다음 건이 같은 자리에 서므로, "앞 건이 처리됐고
               지금 보는 것은 다른 건"임을 화면이 말해야 한다. 지우지 않고 다음 처리 때 갱신 —
               사람이 제 속도로 읽는다. */
            <div className="anim-fade-in mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-deployed-ink/30 bg-deployed-bg px-4 py-2.5 text-[13px] text-deployed-ink">
              <span className="font-semibold">
                {justDone.action === '승인' ? '✓' : '✕'} {justDone.title}
              </span>
              <span>
                {justDone.action === '승인'
                  ? t('approvals.justApproved', '승인 처리됨')
                  : t('approvals.justRejected', '반려 처리됨')}
              </span>
              <span className="ml-auto tabular-nums opacity-80">
                {tf('approvals.remainingMine', { n: pending.filter((r) => r.myTurn).length }, '남은 내 차례 {n}건')}
              </span>
            </div>
          )}
          <div key={detail.id} className="anim-fade-up rounded-xl border border-hairline bg-canvas/50 px-4 py-3.5">
            <div className="flex flex-wrap items-center gap-2">
              {detail.urgent && <UrgentChip />}
              <KindChip kind={detail.kind} />
              <span className="font-mono text-xs text-ink-subtle">{detail.id}</span>
              <span className="rounded-full bg-review-bg px-2 py-0.5 text-xs font-semibold text-review-ink">
                {t('approvals.waitingBadge', '대기')}
              </span>
              <StepDots step={detail.step} />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-base font-semibold text-ink">{detail.title}</span>
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

          {/* ⚠⚠ 겹침을 **판단 전에** 세운다 — 승인 버튼을 누르고 나서 "사실 같은 사양서에
              한 건이 더 있었다"를 알면 이미 늦다. 고르는 것도 여기서 한다: 형제 건마다
              [취소]가 붙어, 하나를 승인하기 전에 나머지를 사유와 함께 내릴 수 있다. */}
          {siblingsOf(detail).length > 0 && (
            <div className="mt-4 rounded-xl border border-danger-ink/30 bg-danger-bg px-4 py-3.5 text-[13px] text-danger-ink">
              <div className="font-semibold">
                {tf(
                  'approvals.conflictTitle',
                  { n: siblingsOf(detail).length + 1 },
                  '같은 사양서에 변경 요청이 {n}건 겹쳐 있습니다',
                )}
              </div>
              <p className="mt-1 leading-relaxed opacity-90">
                {t(
                  'approvals.conflictDesc',
                  '하나를 골라 승인하고 나머지는 사유를 내고 취소합니다. 겹친 채로는 배포 요청이 서지 않습니다.',
                )}
              </p>
              <ul className="mt-2.5 space-y-1.5">
                {siblingsOf(detail).map((o) => (
                  <li key={o.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-surface/60 px-3 py-2">
                    <span className="font-mono text-xs opacity-80">{o.id}</span>
                    <span className="min-w-0 flex-1 truncate font-medium">{o.title}</span>
                    <span className="text-xs opacity-80">
                      {o.requester} · {o.requestedAt}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setCanceling(o)
                        setCancelReason('')
                      }}
                      className="rounded-lg bg-danger-ink/15 px-2.5 py-1 text-xs font-semibold transition-opacity hover:opacity-80"
                    >
                      {t('approvals.cancelRequest', '이 건 취소')}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

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
                    <tr key={c.item} className="border-b border-divider last:border-0">
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
            <div className="mt-4">
              <div>
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
                  className="min-h-20 mt-1.5 w-full rounded-lg border border-hairline bg-canvas/60 px-3 py-2.5 text-[13px] text-ink outline-none placeholder:text-ink-subtle focus:border-primary/60"
                />
              </div>
            </div>
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

      {/* 겹친 요청 취소 — 사유가 없으면 못 누른다. 고객이 회의에서 요구한 그대로다:
          "둘 중 하나는 취소해야 된다, 그러면 취소 사유를 내고 취소한다" (2026-07-20) */}
      {canceling && (
        <Modal
          title={t('approvals.cancelModalTitle', '겹친 요청 취소')}
          onClose={() => setCanceling(null)}
          footer={
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCanceling(null)}
                className="h-9 rounded-lg border border-hairline bg-chip px-4 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
              >
                {t('common.close', '닫기')}
              </button>
              <button
                type="button"
                disabled={cancelReason.trim() === ''}
                onClick={() => {
                  const target = canceling
                  const ok = cancelFlow(target.id, cancelReason, ME)
                  setCanceling(null)
                  setCancelReason('')
                  if (!ok) {
                    toast(t('approvals.toast.cancelFailed', '이미 처리된 요청입니다'))
                    return
                  }
                  // 상세를 열어 둔 채 형제를 내렸다 — 목록이 바뀌었으니 정본에서 다시 집는다
                  setDetail((d) => (d && d.id === target.id ? null : d))
                  toast(
                    tf(
                      'approvals.toast.canceled',
                      { title: target.title },
                      '{title} — 취소했습니다. 요청자에게 사유가 남습니다',
                    ),
                  )
                }}
                className="h-9 rounded-lg bg-danger-ink px-4 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {t('approvals.cancelSubmit', '취소 처리')}
              </button>
            </div>
          }
        >
          <div className="rounded-xl border border-hairline bg-canvas/50 px-4 py-3.5 text-[13px]">
            <span className="font-mono text-xs text-ink-subtle">{canceling.id}</span>
            <b className="ml-2 text-ink">{canceling.title}</b>
            <span className="ml-2 text-ink-subtle">
              {canceling.requester} · {canceling.requestedAt}
            </span>
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-ink-muted">
            {t(
              'approvals.cancelDesc',
              '취소는 반려가 아닙니다 — 이 요청이 틀렸다는 뜻이 아니라, 같은 사양서의 다른 요청으로 간다는 뜻입니다. 요청자는 이 사유를 보고 이해합니다.',
            )}
          </p>
          <label className="mt-3 block text-xs font-medium text-ink-subtle" htmlFor="cancel-reason">
            {t('approvals.cancelReasonLabel', '취소 사유 (필수)')}
          </label>
          <textarea
            id="cancel-reason"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            rows={3}
            placeholder={t('approvals.cancelReasonPlaceholder', '예: APR-2026-0012 로 통합해 반영합니다')}
            className="min-h-20 mt-1.5 w-full rounded-lg border border-hairline bg-surface px-3 py-2 text-[13px] outline-none placeholder:text-ink-subtle focus:border-primary/60"
          />
        </Modal>
      )}

      {lineOpen && <ApprovalLineModal onClose={() => setLineOpen(false)} />}
    </AppShell>
  )
}


/**
 * 결재선 설정 — FR-114 ② "승인선을 설정으로 변경할 수 있다".
 *
 * ⚠ ASM-011: **최대 3단계, 조건부 분기 없음.** 단계를 더 넣을 수 없다는 것을 버튼이
 *   사라지는 것으로만 말하지 않고 글로도 적는다(규약 §17 — 못 하는 일은 이유를 적는다).
 * ⚠ 이미 올라간 건의 결재선은 **안 바뀐다**(approvalStore.ApprovalRecord.line 주석) —
 *   결재 중에 선이 움직이면 이력이 못 믿을 것이 된다. 그 말을 화면에도 적는다.
 */
/** 결재 단계 이름 — 자유 입력이 아니라 **정해진 낱말**에서 고른다(사전이 EN 을 입힌다) */
const STEP_LABELS = ['검토', '중간 승인', '최종 승인'] as const

function ApprovalLineModal({ onClose }: { onClose: () => void }) {
  const { t, tf } = useI18n()
  const roleLabel = (code: string) =>
    t(`role.${code}`, (SERVICE_ROLE_LABEL as Record<string, string | undefined>)[code] ?? code)
  const holdersOf = (role: string) => membersWithRole(role)
  const toast = useToast()
  const current = useApprovalLine()
  const [draft, setDraft] = useState(current.map((a) => ({ name: a.name, role: a.role, label: a.label })))

  const set = (i: number, patch: Partial<(typeof draft)[number]>) =>
    setDraft((d) => d.map((row, j) => (j === i ? { ...row, ...patch } : row)))

  return (
    <Modal
      title={t('approvals.lineModalTitle', '결재선 설정')}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-lg border border-hairline bg-chip px-4 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
          >
            {t('common.cancel', '취소')}
          </button>
          <button
            type="button"
            onClick={() => {
              if (!setApprovalLine(draft)) {
                toast(t('approvals.toast.lineInvalid', '결재자 이름이 빈 단계가 있습니다'))
                return
              }
              onClose()
              toast(
                tf(
                  'approvals.toast.lineSaved',
                  { n: draft.length },
                  '결재선을 {n}단계로 저장했습니다 — 다음 상신부터 적용됩니다',
                ),
              )
            }}
            className="h-9 rounded-lg bg-gradient-to-r from-primary to-accent2 px-4 text-[13px] font-semibold text-white shadow-[0_2px_10px_var(--color-glow)] transition-opacity hover:opacity-90"
          >
            {t('common.save', '저장')}
          </button>
        </div>
      }
    >
      <ol className="space-y-2.5">
        {draft.map((row, i) => (
          <li key={i} className="rounded-xl border border-hairline p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-chip px-2 py-0.5 text-xs font-semibold text-ink-muted">
                {tf('approvals.lineStepNo', { n: i + 1 }, '{n}차')}
              </span>
              {/* ⚠⚠ 결재자를 **이름으로 받지 않는다**(2026-08-18): 자유 입력이라 오타 하나로
                  존재하지 않는 사람에게 결재가 올라갈 수 있었고, 그 건은 영영 누구의 차례도
                  되지 않았다. 역할을 고르면 **그 역할 보유자**로 후보가 좁혀진다(회원 정본). */}
              <Select
                className="min-w-0 flex-1 basis-40"
                value={row.role}
                onChange={(e) => {
                  const role = e.target.value
                  // 역할을 바꾸면 결재자도 그 역할의 첫 사람으로 따라간다 — 안 그러면
                  // "역할은 배포 담당자인데 결재자는 법무팀"인 줄이 남는다
                  set(i, { role, name: membersWithRole(role)[0]?.name ?? '' })
                }}
              >
                {SERVICE_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {roleLabel(r)}
                  </option>
                ))}
              </Select>
              {holdersOf(row.role).length === 0 ? (
                // 못 고르는 이유를 적는다 (규약 §17) — 빈 셀렉트만 두면 고장으로 읽힌다
                <span className="min-w-0 flex-1 basis-40 rounded-lg bg-danger-bg px-3 py-2 text-xs text-danger-ink">
                  {t('approvals.lineNoHolder', '이 역할을 가진 회원이 없습니다')}
                </span>
              ) : (
                <Select
                  className="min-w-0 flex-1 basis-32"
                  value={row.name}
                  onChange={(e) => set(i, { name: e.target.value })}
                >
                  {holdersOf(row.role).map((m) => (
                    <option key={m.id} value={m.name}>
                      {m.name} · {m.dept}
                    </option>
                  ))}
                </Select>
              )}
              <Select
                className="basis-32"
                value={row.label}
                onChange={(e) => set(i, { label: e.target.value })}
              >
                {STEP_LABELS.map((l) => (
                  <option key={l} value={l}>
                    {t(`approvalStep.${l}`, l)}
                  </option>
                ))}
              </Select>
              {/* 마지막 한 단계는 못 지운다 — 결재선이 비면 상신이 갈 곳을 잃는다 */}
              {draft.length > 1 && (
                <button
                  type="button"
                  aria-label={t('approvals.lineRemove', '단계 삭제')}
                  onClick={() => setDraft((d) => d.filter((_, j) => j !== i))}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-subtle transition-colors hover:bg-danger-bg hover:text-danger-ink"
                >
                  <Icon name="trash" />
                </button>
              )}
            </div>
          </li>
        ))}
      </ol>

      {draft.length < MAX_APPROVAL_STEPS ? (
        <button
          type="button"
          onClick={() =>
            setDraft((d) => [
              ...d,
              { name: membersWithRole('IBD_APPROVER')[0]?.name ?? '', role: 'IBD_APPROVER', label: '검토' },
            ])
          }
          className="mt-3 h-9 rounded-lg border border-hairline bg-chip px-3.5 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
        >
          {t('approvals.lineAdd', '+ 단계 추가')}
        </button>
      ) : (
        <p className="mt-3 rounded-lg bg-chip px-3 py-2 text-xs text-ink-subtle">
          {tf(
            'approvals.lineMaxHint',
            { n: MAX_APPROVAL_STEPS },
            '결재선은 최대 {n}단계입니다 (조건부 분기는 이번 범위가 아닙니다).',
          )}
        </p>
      )}
      <p className="mt-2 text-xs text-ink-subtle">
        {t('approvals.lineScopeHint', '이미 올라간 결재는 상신 시점의 결재선을 그대로 따릅니다.')}
      </p>
    </Modal>
  )
}
