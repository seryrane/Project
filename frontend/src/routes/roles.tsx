import { useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'

import { AppShell } from '#/components/portal/AppShell'
import { Icon } from '#/components/portal/Icon'
import { ChipSelect } from '#/components/portal/Chips'
import { CtaButton, simulate } from '#/components/portal/Skeleton'
import { apiSend } from '#/lib/api'
import { useI18n } from '#/lib/i18n'
import { Modal } from '#/components/portal/Modal'
import { useToast } from '#/components/portal/toast'
import {
  ACTIONS,
  ACTION_SPECS,
  MENUS,
  PREVIEW_ACTIONS,
  PREVIEW_MENUS,
  SCOPES,
  SCOPE_LABEL,
  SCOPE_SHORT,
  roleDefs,
  scopeOf,
} from '#/data/roles'
import type { Action, RoleDef, ScopeKey } from '#/data/roles'

export const Route = createFileRoute('/roles')({ component: RolesPage })

const ROLE_BADGE: Record<string, string> = {
  super: 'bg-danger-bg text-danger-ink',
  admin: 'bg-pending-bg text-pending-ink',
  editor: 'bg-draft-bg text-draft-ink',
  viewer: 'bg-chip text-ink-muted',
}

function has(role: RoleDef, menu: string, action: Action) {
  return (role.matrix[menu] ?? []).includes(action)
}

function RolesPage() {
  const { t, tf } = useI18n()
  const toast = useToast()
  const [roles, setRoles] = useState(roleDefs)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [editing, setEditing] = useState<RoleDef | null>(null)
  const [creating, setCreating] = useState(false)
  // 기반 역할 칩 — 라벨이 언어를 따라 바뀌므로 상태는 라벨이 아니라 순번으로 든다
  const [newBaseIdx, setNewBaseIdx] = useState(0)
  const [deleting, setDeleting] = useState<RoleDef | null>(null)
  const [holdersOpen, setHoldersOpen] = useState<string | null>(null)
  // 편집 매트릭스 체크 상태 + 메뉴별 조회 범위
  const [draft, setDraft] = useState<Record<string, boolean>>({})
  const [draftScope, setDraftScope] = useState<Record<string, ScopeKey>>({})

  const openEdit = (r: RoleDef) => {
    const d: Record<string, boolean> = {}
    const s: Record<string, ScopeKey> = {}
    for (const m of MENUS) {
      for (const a of ACTIONS) d[`${m}.${a}`] = has(r, m, a)
      s[m] = scopeOf(r, m)
    }
    setDraft(d)
    setDraftScope(s)
    setEditing(r)
  }
  const dirtyCount = editing
    ? MENUS.flatMap((m) => ACTIONS.map((a) => [m, a] as const)).filter(
        ([m, a]) => draft[`${m}.${a}`] !== has(editing, m, a),
      ).length +
      MENUS.filter((m) => draft[`${m}.조회`] && draftScope[m] !== scopeOf(editing, m)).length
    : 0

  /**
   * 자기 잠금 방지 — [권한 관리]를 고칠 수 있는 사람이 0명이 되는 저장은 막는다.
   * 관리자가 자기 역할에서 이 권한을 빼는 순간, 회사 안의 누구도 되돌릴 수 없다.
   */
  const selfLock =
    editing !== null &&
    has(editing, '권한 관리', '수정') &&
    !draft['권한 관리.수정'] &&
    !roles.some((r) => r.key !== editing.key && r.assigned > 0 && has(r, '권한 관리', '수정'))

  // 기반 역할 칩 라벨 — 역할 이름(데이터)은 그대로, "복사"(UI 어휘)만 언어를 입힌다
  const baseOptions = [t('roles.fromScratch'), ...roles.map((r) => tf('roles.copy', { name: r.name }))]

  return (
    <AppShell active="roles" title={t('nav.roles', '권한 관리')}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('nav.roles', '권한 관리')}</h1>
          <p className="mt-1 text-[13px] text-ink-subtle">
            {t('page.roles.subtitle', '역할 기반 접근 제어(RBAC) · 메뉴 × 액션 7종 (Mock 데이터)')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="h-9 rounded-lg bg-gradient-to-r from-primary to-accent2 px-4 text-[13px] font-semibold text-white shadow-[0_2px_10px_var(--color-glow)] transition-opacity hover:opacity-90"
        >
          + {t('roles.add')}
        </button>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
        {roles.map((r, i) => {
          const open = expanded === r.key
          return (
            <section
              key={r.key}
              style={{ animationDelay: `${i * 70}ms` }}
              className={`card-spotlight anim-fade-up overflow-hidden rounded-2xl border bg-surface transition-[transform,border-color,box-shadow] duration-200 ${
                open
                  ? 'border-primary/40 shadow-[0_6px_20px_var(--color-glow)]'
                  : 'border-hairline hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_6px_20px_var(--color-glow)]'
              }`}
            >
              {/* 머리 — 면으로 가른다 (규약 §5: 선 하나로는 약하다) */}
              <div className="flex flex-wrap items-center gap-2 surface-head px-5 py-3.5">
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${ROLE_BADGE[r.key] ?? 'bg-primary/12 text-primary'}`}>
                  {r.name}
                </span>
                {/* 배정은 이름만으로 부족하다 — 누가 · 어느 범위로 가 함께 와야 뜻이 있다 */}
                <button
                  type="button"
                  aria-expanded={holdersOpen === r.key}
                  onClick={() => setHoldersOpen(holdersOpen === r.key ? null : r.key)}
                  className="rounded-md px-1.5 py-0.5 text-xs tabular-nums text-ink-subtle underline decoration-dotted underline-offset-2 transition-colors hover:bg-chip hover:text-ink"
                >
                  {tf('roles.assigned', { n: r.assigned })}
                </button>
                {r.system && (
                  <span className="rounded-full border border-hairline px-1.5 py-0.5 text-[10px] text-ink-subtle">
                    {t('roles.systemBadge', '시스템 역할')}
                  </span>
                )}
                <span className="ml-auto flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(r)}
                    className="h-8 rounded-lg border border-hairline bg-chip px-3 text-xs font-medium text-ink-muted transition-colors hover:border-primary/40 hover:text-ink"
                  >
                    {t('roles.editPerms')}
                  </button>
                  <button
                    type="button"
                    aria-label={t('roles.delete')}
                    onClick={() => setDeleting(r)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-subtle transition-colors hover:bg-danger-bg hover:text-danger-ink"
                  >
                    <Icon name="trash" />
                  </button>
                </span>
              </div>
              <div className="p-5 pt-3.5">
              <p className="text-[13px] text-ink-muted">{r.desc}</p>

              {/* 보유자 — 이름 옆에 범위("어느 팀의"). 전부 나열하지 않고 대표 + 외 N명 */}
              <div className={`reveal-grid ${holdersOpen === r.key ? 'open' : ''}`}>
                <div>
                  <div className="reveal-inner mt-2.5 flex flex-wrap items-center gap-1.5 rounded-xl border border-hairline/70 bg-canvas/40 px-3 py-2.5">
                    {r.holders.map((h) => (
                      <span
                        key={h.name}
                        className="inline-flex items-center gap-1 rounded-full border border-hairline bg-surface px-2 py-0.5 text-xs"
                      >
                        <b className="font-medium text-ink">{h.name}</b>
                        <span className="text-ink-subtle">· {h.scopeLabel}</span>
                      </span>
                    ))}
                    {r.assigned > r.holders.length && (
                      <span className="text-xs text-ink-subtle">
                        {tf('roles.moreHolders', { n: r.assigned - r.holders.length })}
                      </span>
                    )}
                    <Link
                      to="/members"
                      className="ml-auto text-xs font-medium text-primary hover:underline"
                    >
                      {t('roles.viewMembers')}
                    </Link>
                  </div>
                </div>
              </div>

              {/* 미리보기 도트 — 인셋 박스로 본문과 가른다. 스태거 등장 */}
              <div className="mt-3.5 overflow-x-auto rounded-xl border border-hairline/70 bg-canvas/40 px-3.5 py-2.5">
                <table className="w-full min-w-[320px] border-collapse text-xs">
                  <thead>
                    <tr className="text-ink-subtle">
                      <th className="pb-1.5 text-left font-medium">{t('roles.th.permItem', '권한 항목')}</th>
                      {PREVIEW_ACTIONS.map((a) => (
                        <th key={a} className="w-12 pb-1.5 text-center font-medium">
                          {t(`perm.${a}`, a)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {PREVIEW_MENUS.map((m, mi) => (
                      <tr key={m} className="border-t border-hairline/50">
                        <td className="py-1.5 text-ink-muted">{t(`perm.${m}`, m)}</td>
                        {PREVIEW_ACTIONS.map((a, ai) => {
                          const on = has(r, m, a)
                          return (
                            <td key={a} className="py-1.5 text-center">
                              <span
                                style={{ '--i': mi * 3 + ai } as React.CSSProperties}
                                className={`anim-dot-in inline-block h-3 w-3 rounded-full ${
                                  on ? 'bg-fill-deployed' : 'bg-chip-strong'
                                }`}
                                title={`${m} · ${a}: ${on ? t('roles.tooltip.granted', '허용') : t('roles.tooltip.none', '없음')}`}
                              />
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                type="button"
                onClick={() => setExpanded(open ? null : r.key)}
                aria-expanded={open}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-hairline py-2 text-xs font-medium text-ink-muted transition-colors hover:border-primary/40 hover:text-ink"
              >
                {open ? t('roles.matrixHide') : t('roles.matrixShow')}
                <span className={`transition-transform duration-300 ${open ? 'rotate-180' : ''}`} aria-hidden>
                  <Icon name="chevronDown" size="sm" />
                </span>
              </button>

              {/* 펼침 — grid-rows 0fr→1fr 전환, 내용은 살짝 떠오른다 */}
              <div className={`reveal-grid ${open ? 'open' : ''}`}>
                <div>
                  <div className="reveal-inner table-scroll mt-3 rounded-xl border border-hairline">
                    <table className="w-full min-w-[560px] border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-hairline bg-canvas/60 text-ink-subtle">
                          <th className="px-3 py-2 text-left font-medium">{t('roles.th.menu', '메뉴')}</th>
                          {ACTIONS.map((a) => (
                            <th key={a} className="px-1.5 py-2 text-center font-medium">
                              {t(`perm.${a}`, a)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {MENUS.map((m) => (
                          <tr key={m} className="border-b border-divider last:border-0">
                            <td className="whitespace-nowrap px-3 py-1.5 text-ink-muted">
                              {t(`perm.${m}`, m)}
                            </td>
                            {ACTIONS.map((a) => (
                              <td key={a} className="px-1.5 py-1.5 text-center">
                                {has(r, m, a) ? (
                                  <span
                                    className="inline-block rounded bg-primary/12 px-1.5 py-0.5 text-[10px] font-medium text-primary"
                                    title={
                                      a === '조회'
                                        ? `${t('roles.tooltip.scopePrefix', '조회 범위')}: ${SCOPE_LABEL[scopeOf(r, m)]}`
                                        : undefined
                                    }
                                  >
                                    {t(`perm.${a}`, a)}
                                    {/* 조회는 범위가 함께 와야 뜻이 있다 — 전체가 아니면 표시 */}
                                    {a === '조회' && scopeOf(r, m) !== 'all' && (
                                      <span className="ml-0.5 opacity-70">· {SCOPE_SHORT[scopeOf(r, m)]}</span>
                                    )}
                                  </span>
                                ) : (
                                  <span className="text-ink-subtle/40">—</span>
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              </div>
            </section>
          )
        })}
      </div>

      {/* 권한 편집 — 메뉴 × 액션 7종 풀 매트릭스 (저장은 상신으로 끝난다) */}
      {editing && (
        <Modal
          title={tf('roles.editTitle', { name: editing.name })}
          onClose={() => setEditing(null)}
          wide
          /* ⚠ 발이 가장 절실한 자리다 — 메뉴 × 액션 7종 **풀 매트릭스**라 몸이 늘 넘친다.
             예전에는 [상신]이 매트릭스 아래에 있어서, 권한을 다 만지고 나서 **한참 내려가야**
             저장할 수 있었다. 게다가 바꾼 개수(dirtyCount)가 버튼에 붙어 있는데 그 숫자가
             안 보이니 "몇 개 바꿨더라"를 확인할 길도 같이 사라졌다 (규약 §7) */
          footer={
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="h-9 rounded-lg border border-hairline bg-chip px-4 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
              >
                {t('common.cancel')}
              </button>
              {/* 누른 그 버튼이 변한다 + 두 번 안 눌린다 (규약 §3 — 권한 변경은 결재로 간다) */}
              <CtaButton
                disabled={dirtyCount === 0 || selfLock}
                busyLabel={t('roles.submitting')}
                onAction={async () => {
                  // 결재 엔진 미확정 — 서버 접수함에 상신 사실만 남긴다.
                  // 자기 잠금 방지는 서버가 최종으로 한 번 더 막는다
                  const matrix: Record<string, Array<string>> = {}
                  for (const menu of MENUS) {
                    matrix[menu] = ACTIONS.filter((a) => draft[`${menu}.${a}`])
                  }
                  const ok = await apiSend('POST', '/submissions', {
                    kind: 'role-change',
                    payload: { roleKey: editing.key, matrix, scope: draftScope },
                  })
                  if (!ok) await simulate() // 서버 없는 시연 모드
                  setEditing(null)
                  toast(
                    tf('roles.toast.submitted', { name: editing.name, n: dirtyCount, assigned: editing.assigned }),
                  )
                }}
              >
                {t('roles.submit')}
                {dirtyCount > 0 && <span className="tabular-nums">{dirtyCount}</span>}
              </CtaButton>
            </div>
          }
        >
          {/* 권한명·설명도 여기서 고친다 — 이름 변경 역시 상신 대상이다 */}
          <div className="grid grid-cols-1 gap-3 pc:grid-cols-[220px_1fr]">
            <label className="block">
              <span className="text-xs font-medium text-ink-subtle">
                {t('roles.label.name', '권한명')} <b className="text-danger-ink">*</b>
                {editing.system && <span className="ml-1 text-[10px]">({t('roles.systemBadge', '시스템 역할')})</span>}
              </span>
              <input
                defaultValue={editing.name}
                className="mt-1 h-10 w-full rounded-lg border border-hairline bg-canvas/60 px-3 text-[13px] font-semibold outline-none focus:border-primary/60"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-ink-subtle">{t('roles.label.desc', '설명')}</span>
              <input
                defaultValue={editing.desc}
                className="mt-1 h-10 w-full rounded-lg border border-hairline bg-canvas/60 px-3 text-[13px] outline-none focus:border-primary/60"
              />
            </label>
          </div>
          <p className="mt-3 rounded-xl border border-hairline bg-canvas/50 px-4 py-3 text-xs leading-relaxed text-ink-muted">
            {t('roles.editHint.before', '현재')}{' '}
            <b className="tabular-nums text-ink">{tf('roles.editHint.count', { n: editing.assigned })}</b>{' — '}
            {t('roles.editHint.mid', '변경은 즉시 반영되지 않고')}{' '}
            <b className="text-ink">{t('roles.editHint.approvalFlow', '상신 후 결재')}</b>
            {t('roles.editHint.after', '를 거쳐 적용됩니다. 체크가 있는 줄은 밝게 표시됩니다.')}
          </p>
          <div className="table-scroll mt-3 rounded-xl border border-hairline">
            <table className="w-full min-w-[720px] border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-hairline bg-canvas/60 text-left text-xs text-ink-subtle">
                  <th className="px-3 py-2.5 font-medium">{t('roles.th.menu', '메뉴')}</th>
                  {/* 액션 머리에 사람 말 힌트 — 위험 액션은 ⚠ 로 표시한다 */}
                  {ACTIONS.map((a) => (
                    <th key={a} className="px-2 py-2.5 text-center font-medium" title={ACTION_SPECS[a].hint}>
                      {t(`perm.${a}`, a)}
                      {ACTION_SPECS[a].danger && <span className="ml-0.5 text-pending-ink">⚠</span>}
                    </th>
                  ))}
                  <th
                    className="px-2 py-2.5 text-center font-medium"
                    title={t(
                      'roles.tooltip.scopeHelp',
                      '조회가 켜진 메뉴에서 어디까지 보이는지 — 넓은 범위는 좁은 범위를 포함합니다',
                    )}
                  >
                    {t('roles.th.scope', '조회 범위')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {MENUS.map((m) => (
                  <tr key={m} className="perm-row border-b border-divider transition-colors last:border-0">
                    <td className="whitespace-nowrap px-3 py-2 font-medium text-ink">
                      {t(`perm.${m}`, m)}
                    </td>
                    {ACTIONS.map((a) => {
                      const on = draft[`${m}.${a}`] ?? false
                      return (
                        <td key={a} className="px-2 py-1.5 text-center">
                          {/* 체크박스 대신 토글 버튼 — 매트릭스에서도 칩 언어를 유지한다 */}
                          <button
                            type="button"
                            aria-label={`${m} ${a}`}
                            title={ACTION_SPECS[a].hint}
                            aria-pressed={on}
                            onClick={() => setDraft((d) => ({ ...d, [`${m}.${a}`]: !on }))}
                            className={`inline-flex h-6 w-6 items-center justify-center rounded-md border text-xs leading-none transition-all active:scale-90 ${
                              on
                                ? 'border-primary/50 bg-primary/15 text-primary'
                                : 'border-hairline/70 text-ink-subtle/50 hover:border-primary/30 hover:text-ink-muted'
                            }`}
                          >
                            {on ? '✓' : '─'}
                          </button>
                        </td>
                      )
                    })}
                    {/* 조회 범위 — 조회가 꺼진 줄에서는 뜻이 없으므로 함께 잠근다 */}
                    <td className="px-2 py-1.5 text-center">
                      <div
                        className={`inline-flex overflow-hidden rounded-md border border-hairline/70 transition-opacity ${
                          draft[`${m}.조회`] ? '' : 'pointer-events-none opacity-30'
                        }`}
                      >
                        {SCOPES.map((s) => {
                          const on = draftScope[m] === s
                          return (
                            <button
                              key={s}
                              type="button"
                              aria-label={`${m} ${t('roles.th.scope', '조회 범위')} ${SCOPE_LABEL[s]}`}
                              title={SCOPE_LABEL[s]}
                              aria-pressed={on}
                              onClick={() => setDraftScope((d) => ({ ...d, [m]: s }))}
                              className={`h-6 w-6 text-[10px] leading-none transition-colors ${
                                on
                                  ? 'bg-primary/15 font-semibold text-primary'
                                  : 'text-ink-subtle/60 hover:text-ink-muted'
                              }`}
                            >
                              {SCOPE_SHORT[s]}
                            </button>
                          )
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-ink-subtle">
            {t(
              'roles.footnote.scopeHelp',
              '⚠ 표시는 되돌리기 어렵거나 밖으로 나가는 액션입니다 — 머리글에 마우스를 올리면 설명이 보입니다. 조회 범위는 내 것만 ⊂ 우리 팀 ⊂ 전체 — 넓은 범위가 좁은 범위를 포함하므로 하나만 고릅니다.',
            )}
          </p>
          {selfLock && (
            <p className="mt-3 rounded-xl border border-danger-ink/30 bg-danger-bg px-4 py-3 text-xs leading-relaxed text-danger-ink">
              <b>{t('roles.selfLock.title', '[권한 관리 · 수정]을 뺄 수 없습니다')}</b> —{' '}
              {t(
                'roles.selfLock.body',
                '이 권한을 가진 사람이 회사에 0명이 됩니다. 권한 화면을 여는 열쇠라, 빼고 나면 누구도 되돌릴 수 없습니다. 먼저 다른 역할에 이 권한을 부여하세요.',
              )}
            </p>
          )}
        </Modal>
      )}

      {/* 새 역할 — 기반 역할 복사로 시작한다 (시안 2 채택) */}
      {creating && (
        <Modal
          title={t('roles.newTitle', '새 역할 추가')}
          onClose={() => setCreating(false)}
          footer={
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="h-9 rounded-lg border border-hairline bg-chip px-4 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreating(false)
                  setRoles((rs) => [
                    ...rs,
                    {
                      key: `custom-${rs.length}`,
                      name: '시니어 편집자',
                      desc: '편집자 + 승인 요청 없이 배포 요청 가능 (시연용)',
                      system: false,
                      assigned: 0,
                      matrix: roles.find((r) => r.key === 'editor')?.matrix ?? {},
                      holders: [],
                    },
                  ])
                  toast(
                    tf(
                      'roles.toast.created',
                      { editLabel: t('roles.editPerms') },
                      '역할을 생성했습니다 — [{editLabel}]에서 매트릭스를 다듬으세요',
                    ),
                  )
                }}
                className="h-9 rounded-lg bg-gradient-to-r from-primary to-accent2 px-4 text-[13px] font-semibold text-white shadow-[0_2px_10px_var(--color-glow)] transition-opacity hover:opacity-90"
              >
                {t('roles.create')}
              </button>
            </div>
          }
        >
          <label className="block">
            <span className="text-xs font-medium text-ink-subtle">
              {t('roles.label.roleName', '역할 이름')} <b className="text-danger-ink">*</b>
            </span>
            <input placeholder={t('roles.namePlaceholder')} className="mt-1 h-10 w-full rounded-lg border border-hairline bg-canvas/60 px-3 text-[13px] outline-none focus:border-primary/60" />
          </label>
          <label className="mt-3 block">
            <span className="text-xs font-medium text-ink-subtle">{t('roles.label.roleDesc', '역할 설명')}</span>
            <textarea rows={2} placeholder={t('roles.descPlaceholder')} className="mt-1 w-full rounded-lg border border-hairline bg-canvas/60 px-3 py-2.5 text-[13px] outline-none focus:border-primary/60" />
          </label>
          <div className="mt-3">
            <span className="text-xs font-medium text-ink-subtle">{t('roles.label.baseRole', '기반 역할 (복사)')}</span>
            <div className="mt-1.5">
              <ChipSelect
                options={baseOptions}
                value={baseOptions[newBaseIdx]}
                onChange={(v) => setNewBaseIdx(baseOptions.indexOf(v))}
              />
            </div>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-ink-subtle">
            {tf(
              'roles.newRoleHint',
              { editLabel: t('roles.editPerms') },
              '기존 역할을 복사해 시작하면 매트릭스를 처음부터 채우지 않아도 됩니다 — 생성 후 [{editLabel}]에서 다듬으세요.',
            )}
          </p>
        </Modal>
      )}

      {/* 삭제 — 배정 인원이 있으면 막는다 (유령 권한을 만들지 않는다) */}
      {deleting && (
        <Modal
          title={t('roles.deleteTitle', '역할 삭제')}
          onClose={() => setDeleting(null)}
          /* 발은 관문 슬롯으로 (규약 §7) — 몸 안의 마지막 줄로 두면 내용이 길어질 때
             마무리 조작이 스크롤에 밀려 사라진다 */
          footer={
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleting(null)}
                className="h-9 rounded-lg border border-hairline bg-chip px-4 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
              >
                {t('common.close')}
              </button>
              {!deleting.system && deleting.assigned === 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setRoles((rs) => rs.filter((r) => r.key !== deleting.key))
                    setDeleting(null)
                    toast(tf('roles.toast.deleted', { name: deleting.name }))
                  }}
                  className="h-9 rounded-lg bg-danger-ink px-4 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
                >
                  {t('common.delete')}
                </button>
              )}
            </div>
          }
        >
          {deleting.system ? (
            <p className="text-[13px] leading-relaxed text-ink-muted">
              {tf(
                'roles.delete.systemGuard',
                { name: deleting.name, editLabel: t('roles.editPerms') },
                '{name}은 시스템 기본 역할이라 삭제할 수 없습니다. 권한 범위는 [{editLabel}]으로 조정하세요.',
              )}
            </p>
          ) : deleting.assigned > 0 ? (
            <p className="text-[13px] leading-relaxed text-ink-muted">
              {tf(
                'roles.delete.assignedGuard',
                { name: deleting.name, n: deleting.assigned, membersLabel: t('nav.members') },
                '{name}에 {n}명이 배정되어 있습니다. 먼저 {membersLabel}에서 다른 역할로 재배정한 뒤 삭제할 수 있습니다 — 역할만 지우면 그 인원의 권한이 유령이 됩니다.',
              )}
            </p>
          ) : (
            <p className="text-[13px] leading-relaxed text-ink-muted">
              {tf(
                'roles.delete.confirm',
                { name: deleting.name },
                '{name}을 삭제합니다. 배정 인원이 없어 안전하게 삭제됩니다.',
              )}{' '}
              <b className="text-danger-ink">{t('roles.delete.irreversible', '되돌릴 수 없습니다.')}</b>
            </p>
          )}
        </Modal>
      )}
    </AppShell>
  )
}
