import { useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { Link, createFileRoute } from '@tanstack/react-router'

import { AppShell } from '#/components/portal/AppShell'
import { FilterAxes, FilterAxis } from '#/components/portal/FilterAxis'
import { Avatar } from '#/components/portal/Avatar'
import { ChipSelect, Switch } from '#/components/portal/Chips'
import { ListFoot } from '#/components/portal/ListFoot'
import { Modal } from '#/components/portal/Modal'
import { useToast } from '#/components/portal/toast'
import { pickOne } from '#/lib/urlState'
import { useI18n } from '#/lib/i18n'
import { SPEC_APPROVAL_LINE } from '#/data/approvals'
import { activeRequestOfSpec, activeRequestsOfSpec, unsettledRequestsOfSpec, useApprovalList } from '#/data/approvalStore'
import { SPEC_CATEGORIES, currentVersion } from '#/data/specs'
import { SPEC_STATUS_FILL, startSpecReview, useSpecList } from '#/data/specStore'
import { requestDeploy, submitSpec, withdrawSpecRequest } from '#/data/workflow'
import type { Spec, SpecStatus } from '#/data/specs'

export const Route = createFileRoute('/board')({
  component: BoardPage,
  // 반환 타입을 옵셔널로 명시 — 안 하면 라우터가 search 를 필수로 보고 링크마다 요구한다
  validateSearch: (search: Record<string, unknown>): { cat?: (typeof SPEC_CATEGORIES)[number]; mine?: '1' } => ({
    cat: pickOne(search.cat, SPEC_CATEGORIES),
    mine: search.mine === '1' || search.mine === 1 || search.mine === true ? ('1' as const) : undefined,
  }),
})

/**
 * 상태 보드 — 사양서 수명주기를 칸반으로 본다 (정의서 밖 제안, 2026-08-26 사용자 요청.
 * 채택되면 요구사항추적표에 확장으로 적는다).
 *
 * ⚠⚠ **끌기는 상태를 바꾸지 않는다 — 그 걸음의 결재 패널을 연다.** 처음엔 끌기를 아예
 * 뺐는데("끌면 결재를 우회한다"), 사용자가 짚었다(2026-08-26): 패널을 다리로 쓰면 된다.
 * 끌기 = **의도**, 패널 = **관문**. 놓는 자리에 따라 상신·회수·배포 요청 패널이 열리고,
 * 패널에서 확정해야 workflow(정본 한 자리)를 지나 상태가 움직인다. 흐름에 없는 걸음은
 * 놓아도 토스트가 이유를 말한다(§17) — 조용히 무시되는 드롭이 제일 나쁘다.
 *
 * 열 = 사양서 상태 5종(정본 specStore 가 센다). 겹침·결재 단계는 결재함이 센 것을 그대로
 * 받는다 — 보드가 다시 세면 두 화면이 딴 숫자를 말한다.
 */
const COLUMNS: Array<SpecStatus> = ['초안', '검토 중', '승인 대기', '승인 완료', '배포 완료']

/** 레인당 보이는 카드 상한 — 종결 상태(배포 완료)는 끝없이 쌓인다(2026-08-26 사용자 질문
 *  "더보기 등은 준비되어 있는지"). 넘치면 **사양서 관리(상태 필터)로 보낸다** — 검색·발·
 *  페이징은 목록 화면이 이미 갖고 있으므로 보드에서 재발명하지 않는다(§9). 열 머리의
 *  수 배지는 계속 **전체 수**를 말한다. */
const LANE_CAP = 6

/** 상태색은 정본 하나(specStore.SPEC_STATUS_FILL) — 보드가 사본을 들면 화면마다 색이 갈린다(§9) */
const DOT = SPEC_STATUS_FILL

/** 빈 레인이 말하는 "언제 이 상태가 되나" — 흐름의 문을 자리에서 가르쳐 준다 */
const EMPTY_HINT: Record<SpecStatus, string> = {
  초안: '새 사양서가 등록되면 여기서 시작합니다 — 반려·회수된 문서도 여기로 돌아옵니다',
  '검토 중': '초안 카드를 이 열로 끌면 검토가 시작됩니다',
  '승인 대기': '카드를 이 열로 끌어 상신하면 결재가 시작됩니다',
  '승인 완료': '결재 마지막 단계가 승인되면 옵니다 — 배포 요청을 기다리는 자리입니다',
  '배포 완료': '배포 결재까지 승인되면 옵니다',
}

/** 지금 사용자 — SSO 확정 전 관례(상세·결재함과 같은 값) */
const ME = '김현대'

/** 끌어 놓기가 여는 패널의 종류 */
type IntentKind = 'review' | 'submit' | 'withdraw' | 'deploy'

/**
 * 이 걸음이 결재 흐름의 어느 문인가 — 없으면 왜 없는지를 말한다.
 * 문 셋: 상신(초안·검토 중→승인 대기) · 회수(승인 대기→뒤로) · 배포 요청(승인 완료→배포).
 */
function intentOf(from: SpecStatus, to: SpecStatus): { kind: IntentKind } | { block: string } | null {
  if (from === to) return null
  /* ⚠ 예전엔 초안→검토 중을 막고 "상세에서 저장하며 도달한다"고 안내했다 — **거짓말**이었다:
     그 전이는 어디에도 없었고 '검토 중'은 시드 전용 상태였다(2026-08-26 사용자 질문으로
     드러남). 이제 이 끌기가 검토 시작의 문이다(결재 전 전이라 결재를 안 탄다). */
  if (from === '초안' && to === '검토 중') return { kind: 'review' }
  if ((from === '초안' || from === '검토 중') && to === '승인 대기') return { kind: 'submit' }
  // 회수의 정본(workflow→specStore.withdrawSpec)은 **초안**으로 돌린다 — 검토 중에 놓아도
  // 카드는 초안으로 간다. 문은 하나고, 어디로 가는지는 패널이 말한다.
  if (from === '승인 대기' && (to === '검토 중' || to === '초안')) return { kind: 'withdraw' }
  if (from === '승인 완료' && to === '배포 완료') return { kind: 'deploy' }
  if (from === '검토 중' && to === '초안')
    return { block: '검토 중과 초안은 둘 다 결재 전입니다 — 되돌릴 것 없이 어느 쪽에서든 상신할 수 있습니다.' }
  if (from === '배포 완료')
    return { block: '배포된 버전은 보드에서 되돌리지 않습니다 — 고칠 것이 있으면 상세에서 새 버전을 상신하세요.' }
  return { block: `${from} → ${to} 걸음은 결재 흐름에 없습니다.` }
}

/** 상태 전이를 View Transition 으로 감싼다 — 카드가 옛 열에서 새 열로 **미끄러져 간다**
 *  (spec-title 이름이 전·후 화면에 다 있어 morph 짝이 성립한다). flushSync 로 스토어
 *  갱신을 스냅샷 안에서 강제로 그린다 — 안 그러면 전환이 빈손으로 끝난다. */
function withCardTransition(apply: () => void) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!('startViewTransition' in document) || reduce) {
    apply()
    return
  }
  document.startViewTransition(() => {
    flushSync(apply)
  })
}

function BoardPage() {
  const { t, tf } = useI18n()
  const toast = useToast()
  const specs = useSpecList()
  const approvals = useApprovalList()
  const { cat, mine } = Route.useSearch()
  const navigate = Route.useNavigate()
  const setSearch = (patch: Record<string, unknown>) =>
    navigate({ search: (prev: Record<string, unknown>) => ({ ...prev, ...patch }), replace: true })
  const catAll = t('specs.allCategories', '전체 카테고리')
  /* 보드가 커지면(2026-08-26 "필터도 필요") 거른다 — 값은 정본 그대로, 표시만 사전(§4-7).
     '내 차례만'은 결재자의 눈: 지금 판단을 기다리는 카드만 남긴다. */
  const filtered = specs.filter((sp) => {
    if (cat && sp.category !== cat) return false
    if (mine && !approvals.some((r) => r.specId === sp.id && r.state === '진행 중' && r.myTurn)) return false
    return true
  })

  /* 끌리는 카드는 **ref 로** 든다 — 빠른 손짓은 state 리렌더를 앞지른다
     (끌기를 state 로 재다 손짓이 통째로 사라지는 버그를 겪은 규칙). 레인 하이라이트만 state. */
  const dragging = useRef<Spec | null>(null)
  const [overLane, setOverLane] = useState<SpecStatus | null>(null)
  const [intent, setIntent] = useState<{ kind: IntentKind; spec: Spec } | null>(null)

  const byStatus = (st: SpecStatus) => filtered.filter((sp) => currentVersion(sp).status === st)

  function dropOn(to: SpecStatus) {
    const spec = dragging.current
    dragging.current = null
    setOverLane(null)
    if (!spec) return
    const it = intentOf(currentVersion(spec).status, to)
    if (!it) return
    if ('block' in it) {
      toast(it.block)
      return
    }
    if (it.kind === 'withdraw') {
      /* 회수는 **요청자만** 할 수 있다(approvalStore 관문 규칙) — 남의 건은 패널을 열어 봤자
         확정에서 막힌다. 미리 이유를 말하는 쪽이 §17 이다. */
      const rec = activeRequestOfSpec(spec.id)
      if (rec && rec.requester !== ME) {
        toast(tf('board.toast.notRequester', { name: rec.requester }, '회수는 요청자만 할 수 있습니다 — 이 건은 {name} 님이 올렸습니다.'))
        return
      }
    }
    setIntent({ kind: it.kind, spec })
  }

  function Card({ spec }: { spec: Spec }) {
    const cur = currentVersion(spec)
    const active = approvals.find((r) => r.specId === spec.id && r.state === '진행 중')
    const unsettled = unsettledRequestsOfSpec(spec.id)
    const tone = DOT[cur.status]
    return (
      <li>
        <Link
          to="/specs/$specId"
          params={{ specId: spec.id }}
          draggable
          onDragStart={(e) => {
            dragging.current = spec
            e.dataTransfer.effectAllowed = 'move'
            e.dataTransfer.setData('text/plain', spec.id)
          }}
          onDragEnd={() => {
            dragging.current = null
            setOverLane(null)
          }}
          className="card-hover card-spotlight block cursor-grab rounded-xl border border-hairline bg-surface p-3.5 transition-colors hover:border-primary/40 active:cursor-grabbing"
          /* 좌측 상태색 보더 — 카드가 레인 밖(검색 결과 등)에 혼자 서도 상태를 말한다.
             border-l 은 라운드 모서리를 깎아서 inset 그림자로 긋는다 (§16 색+글자 이중 표시 —
             글자는 열 머리가 맡는다) */
          style={{ boxShadow: `inset 3px 0 0 0 ${tone}` }}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[11px] text-ink-subtle">{spec.id}</span>
            <span className="rounded bg-chip px-1.5 py-0.5 font-mono text-[10px] text-ink-muted">{cur.version}</span>
          </div>
          {/* 카드 제목 — 사양서 목록·상세와 같은 view-transition-name: 상세로 들어갈 때도,
              끌어 놓아 열이 바뀔 때도 제목이 **이어져 간다** */}
          <div
            className="mt-1.5 text-[13px] font-semibold leading-snug text-ink"
            style={{ viewTransitionName: `spec-title-${spec.id}` }}
          >
            {spec.name}
          </div>
          <span
            className="mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium"
            style={{ backgroundColor: `color-mix(in oklab, ${tone} 14%, transparent)`, color: tone }}
          >
            {t(`specCategory.${spec.category}`, spec.category)}
          </span>
          {(active || unsettled.length > 1) && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {active && (
                <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                  {Array.from({ length: active.step[1] }, (_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 w-1.5 rounded-full ${i < active.step[0] ? 'bg-primary' : 'bg-primary/30'}`}
                    />
                  ))}
                  {active.step[0]}/{active.step[1]}
                </span>
              )}
              {active?.myTurn && (
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
                  {t('board.myTurn', '내 차례')}
                </span>
              )}
              {unsettled.length > 1 && (
                <span className="rounded-full bg-[var(--color-fill-pending)]/15 px-2 py-0.5 text-[10px] font-medium text-[var(--color-fill-pending)]">
                  {tf('board.conflict', { n: unsettled.length }, '겹침 {n}')}
                </span>
              )}
            </div>
          )}
          {/* 발 — 누가 들고 있고 언제 만졌나. 결재 중이면 **지금 누구 차례**가 더 급한 정보다 */}
          <div className="mt-2.5 flex items-center gap-1.5 border-t border-hairline/60 pt-2 text-[10.5px] text-ink-subtle">
            <Avatar name={active ? active.approver : cur.author} size={16} />
            <span className="truncate">
              {active ? tf('board.nowTurn', { name: active.approver }, '지금 {name} 차례') : cur.author}
            </span>
            <span className="ml-auto shrink-0 tabular-nums">{spec.updated}</span>
          </div>
        </Link>
      </li>
    )
  }

  return (
    <AppShell active="board" title={t('nav.board', '상태 보드')}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('nav.board', '상태 보드')}</h1>
          {/* 끌기가 무엇을 하는지 화면이 먼저 말한다(§17) — "왜 바로 안 옮겨지지"가
              문의로 돌아오지 않게 */}
          <p className="mt-1.5 text-[13px] text-ink-muted">
            {t('board.subtitle', '카드를 다음 열에 끌어 놓으면 그 걸음의 결재 패널이 열립니다 — 상태는 결재가 바꿉니다.')}
          </p>
        </div>
        <Link
          to="/approvals"
          className="rounded-full border border-hairline bg-surface px-3.5 py-2 text-xs font-medium text-ink-muted transition-colors hover:border-primary/40 hover:text-ink"
        >
          {t('board.toApprovals', '결재함으로 →')}
        </Link>
      </div>

      <FilterAxes className="mt-4">
        <FilterAxis label={t('specs.filter.category', '카테고리')}>
          <ChipSelect
            options={[catAll, ...SPEC_CATEGORIES]}
            label={(c) => (c === catAll ? c : t(`specCategory.${c}`, c))}
            value={cat ?? catAll}
            onChange={(v) => setSearch({ cat: v === catAll ? undefined : v })}
          />
        </FilterAxis>
        <FilterAxis label={t('board.filter.scope', '범위')}>
          <div className="flex items-center gap-2">
            <Switch
              checked={mine === '1'}
              onChange={(v) => setSearch({ mine: v ? '1' : undefined })}
              label={t('board.filter.mineOnly', '내 차례만 보기')}
            />
            <span className="text-xs text-ink-muted">{t('board.filter.mineOnly', '내 차례만 보기')}</span>
          </div>
        </FilterAxis>
      </FilterAxes>

      <div className="mt-4 grid grid-cols-1 gap-4 pc:grid-cols-5">
        {COLUMNS.map((st) => {
          const cards = byStatus(st)
          const isOver = overLane === st
          return (
            /* 레인 — 상단 2px 이 상태색을 물고, 머리·카드가 한 트랙 안에 산다(칸반 문법).
               넓은 화면은 트랙을 세워(min-h) 흐름의 모양을 유지한다 — 빈 열이 접히면
               "왼쪽에서 오른쪽" 부제가 거짓말이 된다 */
            <section
              key={st}
              onDragOver={(e) => {
                const d = dragging.current
                if (!d) return
                const it = intentOf(currentVersion(d).status, st)
                if (!it) return // 같은 열 — 아무 일도 없다
                /* 막힌 걸음도 드롭은 받는다 — 받아야 "왜 안 되는지"를 토스트로 말할 수 있다.
                   preventDefault 를 안 하면 drop 이 아예 안 떨어져 **조용한 무시**가 된다
                   (§17 의 반대 — 판이 잡았다). 하이라이트는 성립하는 걸음에만. */
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
                if ('kind' in it) {
                  if (overLane !== st) setOverLane(st)
                } else if (overLane !== null) setOverLane(null)
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node) && overLane === st) setOverLane(null)
              }}
              onDrop={(e) => {
                e.preventDefault()
                dropOn(st)
              }}
              className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-hairline/60 bg-[var(--color-lane)] transition-colors pc:min-h-[440px]"
              style={{
                borderTop: `2px solid ${DOT[st]}`,
                /* 받을 수 있는 레인 위에 끌고 오면 레인이 제 색으로 답한다 (§16) */
                borderColor: isOver ? DOT[st] : undefined,
                backgroundColor: isOver ? `color-mix(in oklab, ${DOT[st]} 8%, var(--color-lane))` : undefined,
              }}
            >
              {/* ⚠ 머리의 전체 틴트(7%)를 걷었다 — 회색 트랙 위에 저채도 상태색을 얇게 깔면
                  탁해진다(2026-08-26 사용자 지적). 색은 스트립·점·수 배지 세 점만 말하고,
                  배지는 투명 위가 아니라 **surface 에 섞어** 맑은 파스텔로 만든다. */}
              <header className="flex items-center gap-2 px-3.5 pb-1.5 pt-3">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: DOT[st] }} />
                <h2 className="text-[13px] font-semibold text-ink">{t(`specStatus.${st}`, st)}</h2>
                <span
                  className="ml-auto rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums"
                  style={{
                    backgroundColor: `color-mix(in oklab, ${DOT[st]} 14%, var(--color-surface))`,
                    color: DOT[st],
                  }}
                >
                  {cards.length}
                </span>
              </header>
              <ol className="flex-1 space-y-2.5 p-2.5">
                {cards.slice(0, LANE_CAP).map((sp) => (
                  <Card key={sp.id} spec={sp} />
                ))}
                {cards.length > LANE_CAP && (
                  <li>
                    <Link
                      to="/specs"
                      search={{ status: st, view: '표' }}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-ink/20 px-3 py-2.5 text-[12px] font-medium text-ink-muted transition-colors hover:border-primary/40 hover:text-ink"
                    >
                      {tf('board.laneOverflow', { n: cards.length - LANE_CAP }, '외 {n}건 — 사양서 관리에서 보기 →')}
                    </Link>
                  </li>
                )}
                {cards.length === 0 && (
                  /* 빈 열은 **언제 이 상태가 되는지**를 말한다(§17 강화, 2026-08-26 사용자
                     질문 "초안·검토 중·승인 완료는 언제?") — "없습니다"만으로는 흐름이 안 보인다 */
                  <li className="grid h-full min-h-24 place-items-center rounded-xl border border-dashed border-ink/20 px-4 text-center text-[11px] leading-relaxed text-ink-subtle">
                    {t(`board.empty.${st}`, EMPTY_HINT[st])}
                  </li>
                )}
              </ol>
            </section>
          )
        })}
      </div>

      <ListFoot total={specs.length} shown={filtered.length} unit={t('board.unit', '개')} />

      {intent?.kind === 'review' && (
        <ReviewPanel
          spec={intent.spec}
          onClose={() => setIntent(null)}
          onDone={() => {
            withCardTransition(() => {
              startSpecReview(intent.spec.id)
            })
            toast(tf('board.toast.reviewStarted', { name: intent.spec.name }, '{name} — 검토를 시작했습니다'))
          }}
        />
      )}
      {intent?.kind === 'submit' && (
        <SubmitPanel
          spec={intent.spec}
          onClose={() => setIntent(null)}
          onDone={() => {
            withCardTransition(() => {
              submitSpec(intent.spec, ME)
            })
            toast(tf('board.toast.submitted', { name: intent.spec.name }, '{name} — 결재에 올렸습니다'))
          }}
        />
      )}
      {intent?.kind === 'withdraw' && (
        <WithdrawPanel
          spec={intent.spec}
          onClose={() => setIntent(null)}
          onDone={() => {
            // 클로저 안 대입이라 TS 가 좁히지 못하게 boolean 으로 넓혀 둔다
            let ok = false as boolean
            withCardTransition(() => {
              ok = withdrawSpecRequest(intent.spec.id, ME)
            })
            toast(
              ok
                ? tf('board.toast.withdrawn', { name: intent.spec.name }, '{name} — 회수했습니다')
                : t('board.toast.withdrawBlocked', '회수할 수 없습니다 — 이미 한 단계 이상 승인이 찍혔습니다. 반려·재요청으로 진행하세요.'),
            )
          }}
        />
      )}
      {intent?.kind === 'deploy' && (
        <DeployPanel
          spec={intent.spec}
          onClose={() => setIntent(null)}
          onDone={(version, env) => {
            const rec = requestDeploy({
              version,
              env,
              owner: ME,
              specs: [{ id: intent.spec.id, name: intent.spec.name, version: currentVersion(intent.spec).version }],
              changes: [`${intent.spec.name} ${currentVersion(intent.spec).version} 반영`],
            })
            toast(
              rec
                ? t('board.toast.deployRequested', '배포 요청이 결재함으로 갔습니다 — 배포 승인이 나면 배포 완료로 옮겨집니다.')
                : t('board.toast.deployBlocked', '반영이 막혀 있습니다 — 이 사양서에 반영 안 된 요청이 겹쳐 있습니다.'),
            )
          }}
        />
      )}
    </AppShell>
  )
}

/* ── 끌어 놓기가 여는 패널 셋 — 확정 없이는 아무것도 움직이지 않는다 ────────── */

/** 검토 시작 — 초안을 검토 중으로 (결재 전 전이라 결재선이 없다 · 가벼운 확인만) */
function ReviewPanel({ spec, onClose, onDone }: { spec: Spec; onClose: () => void; onDone: () => void }) {
  const { t } = useI18n()
  return (
    <Modal
      title={t('board.panel.reviewTitle', '검토 시작')}
      onClose={onClose}
      footer={(close) => (
        <>
          <button
            type="button"
            onClick={close}
            className="h-9 rounded-lg border border-hairline bg-chip px-4 text-xs font-medium text-ink-muted transition-colors hover:text-ink"
          >
            {t('common.cancel', '취소')}
          </button>
          <button
            type="button"
            onClick={() => {
              onDone()
              close()
            }}
            className="h-9 rounded-lg bg-gradient-to-r from-primary to-accent2 px-4 text-xs font-semibold text-white hover:opacity-90"
          >
            {t('board.panel.review', '검토 시작')}
          </button>
        </>
      )}
    >
      <p className="text-[13px] text-ink">
        <b>{spec.name}</b> {currentVersion(spec).version}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-ink-muted">
        {t('board.panel.reviewHint', '문서를 다듬는 동안 검토 중으로 표시합니다 — 결재 전 상태라 결재선을 타지 않고, 준비되면 승인 대기로 끌어 상신합니다.')}
      </p>
    </Modal>
  )
}

/** 상신 — 결재선을 보여 주고 올린다 (상세의 상신과 같은 workflow 문을 지난다) */
function SubmitPanel({ spec, onClose, onDone }: { spec: Spec; onClose: () => void; onDone: () => void }) {
  const { t, tf } = useI18n()
  const overlapped = activeRequestsOfSpec(spec.id).length
  return (
    <Modal
      title={t('board.panel.submitTitle', '결재 상신')}
      onClose={onClose}
      footer={(close) => (
        <>
          <button
            type="button"
            onClick={close}
            className="h-9 rounded-lg border border-hairline bg-chip px-4 text-xs font-medium text-ink-muted transition-colors hover:text-ink"
          >
            {t('common.cancel', '취소')}
          </button>
          <button
            type="button"
            onClick={() => {
              onDone()
              close()
            }}
            className="h-9 rounded-lg bg-gradient-to-r from-primary to-accent2 px-4 text-xs font-semibold text-white hover:opacity-90"
          >
            {t('board.panel.submit', '상신')}
          </button>
        </>
      )}
    >
      <p className="text-[13px] text-ink">
        <b>{spec.name}</b> {currentVersion(spec).version}
      </p>
      <p className="mt-1 text-xs text-ink-subtle">
        {t('board.panel.submitHint', '상신하면 아래 결재선을 차례로 지납니다 — 결재 중에는 편집이 잠깁니다.')}
      </p>
      {/* 결재선 정본(SPEC_APPROVAL_LINE)을 그대로 보여 준다 — 상신 뒤 "지금 누구 차례"의 근거 */}
      <ol className="mt-3 space-y-1.5">
        {SPEC_APPROVAL_LINE.map((s) => (
          <li key={s.seq} className="flex items-center gap-2 rounded-lg bg-canvas/60 px-3 py-2 text-xs">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-chip font-semibold text-ink-muted">
              {s.seq}
            </span>
            <span className="font-medium text-ink">{s.name}</span>
            <span className="ml-auto text-ink-subtle">{s.label}</span>
          </li>
        ))}
      </ol>
      {overlapped > 0 && (
        <p className="mt-3 rounded-lg bg-[var(--color-fill-pending)]/10 px-3 py-2 text-xs text-[var(--color-fill-pending)]">
          {tf('board.panel.overlapWarn', { n: overlapped }, '⚠ 이 사양서에 이미 심사 중인 요청이 {n}건 있습니다 — 신청은 막지 않지만, 반영은 하나로 정리될 때까지 막힙니다.')}
        </p>
      )}
    </Modal>
  )
}

/** 회수 — 아무도 판단하지 않았을 때만 내릴 수 있다 (FR-114 확장) */
function WithdrawPanel({ spec, onClose, onDone }: { spec: Spec; onClose: () => void; onDone: () => void }) {
  const { t } = useI18n()
  return (
    <Modal
      title={t('board.panel.withdrawTitle', '결재 회수')}
      onClose={onClose}
      footer={(close) => (
        <>
          <button
            type="button"
            onClick={close}
            className="h-9 rounded-lg border border-hairline bg-chip px-4 text-xs font-medium text-ink-muted transition-colors hover:text-ink"
          >
            {t('common.cancel', '취소')}
          </button>
          <button
            type="button"
            onClick={() => {
              onDone()
              close()
            }}
            className="h-9 rounded-lg bg-gradient-to-r from-primary to-accent2 px-4 text-xs font-semibold text-white hover:opacity-90"
          >
            {t('board.panel.withdraw', '회수')}
          </button>
        </>
      )}
    >
      <p className="text-[13px] text-ink">
        <b>{spec.name}</b> {currentVersion(spec).version}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-ink-muted">
        {t('board.panel.withdrawHint', '올린 결재를 거두어 오면 카드는 초안으로 돌아갑니다. 아무도 판단하지 않았을 때만 가능합니다 — 한 단계라도 승인이 찍혔다면 반려를 받아 재요청하는 것이 이력에 남는 길입니다.')}
      </p>
    </Modal>
  )
}

/** 배포 요청 — 배포는 결재를 거친다. 카드는 배포 **승인**이 나야 옮겨간다(정직한 지연) */
function DeployPanel({
  spec,
  onClose,
  onDone,
}: {
  spec: Spec
  onClose: () => void
  onDone: (version: string, env: 'Production' | 'Staging') => void
}) {
  const { t } = useI18n()
  const [version, setVersion] = useState('v3.1.3')
  const [env, setEnv] = useState<'Production' | 'Staging'>('Production')
  return (
    <Modal
      title={t('board.panel.deployTitle', '배포 요청')}
      onClose={onClose}
      footer={(close) => (
        <>
          <button
            type="button"
            onClick={close}
            className="h-9 rounded-lg border border-hairline bg-chip px-4 text-xs font-medium text-ink-muted transition-colors hover:text-ink"
          >
            {t('common.cancel', '취소')}
          </button>
          <button
            type="button"
            onClick={() => {
              onDone(version, env)
              close()
            }}
            className="h-9 rounded-lg bg-gradient-to-r from-primary to-accent2 px-4 text-xs font-semibold text-white hover:opacity-90"
          >
            {t('board.panel.deploy', '배포 요청')}
          </button>
        </>
      )}
    >
      <p className="text-[13px] text-ink">
        <b>{spec.name}</b> {currentVersion(spec).version}
      </p>
      <p className="mt-1 text-xs text-ink-subtle">
        {t('board.panel.deployHint', '배포도 결재를 거칩니다 — 요청이 결재함으로 가고, 배포 승인이 나면 카드가 배포 완료로 옮겨집니다.')}
      </p>
      <label className="mt-3 block text-xs font-medium text-ink-subtle">
        {t('board.panel.releaseVersion', '릴리즈 버전')}
        <input
          value={version}
          onChange={(e) => setVersion(e.target.value)}
          className="mt-1.5 h-9 w-full rounded-lg border border-hairline bg-canvas/60 px-3 text-[13px] text-ink outline-none focus:border-primary/60"
        />
      </label>
      <div className="mt-3">
        <span className="text-xs font-medium text-ink-subtle">{t('board.panel.env', '환경')}</span>
        <div className="mt-1.5">
          <ChipSelect options={['Production', 'Staging'] as const} value={env} onChange={setEnv} mono />
        </div>
      </div>
    </Modal>
  )
}
