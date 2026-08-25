import { Link, createFileRoute } from '@tanstack/react-router'

import { AppShell } from '#/components/portal/AppShell'
import { Avatar } from '#/components/portal/Avatar'
import { ListFoot } from '#/components/portal/ListFoot'
import { useI18n } from '#/lib/i18n'
import { unsettledRequestsOfSpec, useApprovalList } from '#/data/approvalStore'
import { currentVersion } from '#/data/specs'
import { useSpecList } from '#/data/specStore'
import type { Spec, SpecStatus } from '#/data/specs'

export const Route = createFileRoute('/board')({ component: BoardPage })

/**
 * 상태 보드 — 사양서 수명주기를 칸반으로 **본다** (정의서 밖 제안, 2026-08-26 사용자 요청.
 * 채택되면 요구사항추적표에 확장으로 적는다).
 *
 * ⚠⚠ **카드를 끌어서 옮기지 않는다.** 상태 전이의 정본은 결재(workflow.ts 한 자리)다 —
 * 보드에서 끌어 상태가 바뀌면 결재선·이력·알림을 전부 우회한 전이가 생긴다(상세에서
 * 상신하면 남고 보드에서 끌면 안 남는, "화면마다 딴 규칙"의 병). 그래서 이 화면은
 * ① 흐름을 한눈에 보이고 ② 카드가 **다음 행동이 있는 곳**(상세·결재함)으로 안내한다.
 *
 * 열 = 사양서 상태 5종(정본 specStore 가 센다). 겹침·결재 단계는 결재함이 센 것을 그대로
 * 받는다 — 보드가 다시 세면 두 화면이 딴 숫자를 말한다.
 */
const COLUMNS: Array<SpecStatus> = ['초안', '검토 중', '승인 대기', '승인 완료', '배포 완료']

/** 상태별 점 색 — styles.css 의 상태색 사다리를 그대로 쓴다(§16 고른 것은 면으로) */
const DOT: Record<SpecStatus, string> = {
  초안: 'var(--color-fill-draft)',
  '검토 중': 'var(--color-fill-review)',
  '승인 대기': 'var(--color-fill-pending)',
  '승인 완료': 'var(--color-fill-approved)',
  '배포 완료': 'var(--color-fill-deployed)',
}

function BoardPage() {
  const { t, tf } = useI18n()
  const specs = useSpecList()
  const approvals = useApprovalList()

  const byStatus = (st: SpecStatus) => specs.filter((sp) => currentVersion(sp).status === st)

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
          className="card-hover card-spotlight block rounded-xl border border-hairline bg-surface p-3.5 transition-colors hover:border-primary/40"
          /* 좌측 상태색 보더 — 카드가 레인 밖(검색 결과 등)에 혼자 서도 상태를 말한다.
             border-l 은 라운드 모서리를 깎아서 inset 그림자로 긋는다 (§16 색+글자 이중 표시 —
             글자는 열 머리가 맡는다) */
          style={{ boxShadow: `inset 3px 0 0 0 ${tone}` }}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[11px] text-ink-subtle">{spec.id}</span>
            <span className="rounded bg-chip px-1.5 py-0.5 font-mono text-[10px] text-ink-muted">{cur.version}</span>
          </div>
          {/* 카드 제목 — 사양서 목록·상세와 같은 view-transition-name: 보드에서 상세로
              들어갈 때 제목이 **이어져 간다**(칸반의 손맛이 여기서 난다) */}
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
          {/* 끌 수 없는 이유를 화면이 스스로 말한다(§17 빈 자리에 이유를) — 안 적으면
              "왜 드래그가 안 되지"가 문의로 돌아온다 */}
          <p className="mt-1.5 text-[13px] text-ink-muted">
            {t('board.subtitle', '사양서가 결재를 따라 왼쪽에서 오른쪽으로 흐릅니다 — 카드는 끌지 않습니다. 상태는 결재가 바꿉니다.')}
          </p>
        </div>
        <Link
          to="/approvals"
          className="rounded-full border border-hairline bg-surface px-3.5 py-2 text-xs font-medium text-ink-muted transition-colors hover:border-primary/40 hover:text-ink"
        >
          {t('board.toApprovals', '결재함으로 →')}
        </Link>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 pc:grid-cols-5">
        {COLUMNS.map((st) => {
          const cards = byStatus(st)
          return (
            /* 레인 — 상단 2px 이 상태색을 물고, 머리·카드가 한 트랙 안에 산다(칸반 문법).
               넓은 화면은 트랙을 세워(min-h) 흐름의 모양을 유지한다 — 빈 열이 접히면
               "왼쪽에서 오른쪽" 부제가 거짓말이 된다 */
            <section
              key={st}
              className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-hairline/60 bg-canvas/40 pc:min-h-[440px]"
              style={{ borderTop: `2px solid ${DOT[st]}` }}
            >
              <header
                className="flex items-center gap-2 px-3.5 py-2.5"
                style={{ backgroundColor: `color-mix(in oklab, ${DOT[st]} 7%, transparent)` }}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: DOT[st] }} />
                <h2 className="text-[13px] font-semibold text-ink">{t(`specStatus.${st}`, st)}</h2>
                <span
                  className="ml-auto rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums"
                  style={{ backgroundColor: `color-mix(in oklab, ${DOT[st]} 15%, transparent)`, color: DOT[st] }}
                >
                  {cards.length}
                </span>
              </header>
              <ol className="flex-1 space-y-2.5 p-2.5">
                {cards.map((sp) => (
                  <Card key={sp.id} spec={sp} />
                ))}
                {cards.length === 0 && (
                  /* 빈 열도 이유를 말한다(§17) — 접으면 흐름의 모양이 사라진다 */
                  <li className="grid h-full min-h-24 place-items-center rounded-xl border border-dashed border-hairline/70 px-2 text-center text-[11px] text-ink-subtle">
                    {t('board.emptyColumn', '이 상태의 사양서가 없습니다')}
                  </li>
                )}
              </ol>
            </section>
          )
        })}
      </div>

      <ListFoot total={specs.length} shown={specs.length} unit={t('board.unit', '개')} />
    </AppShell>
  )
}
