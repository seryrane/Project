import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { AppShell } from '#/components/portal/AppShell'
import { Modal } from '#/components/portal/Modal'
import { Select } from '#/components/portal/Select'
import { useToast } from '#/components/portal/toast'
import { ACTIONS, MENUS, PREVIEW_ACTIONS, PREVIEW_MENUS, roleDefs } from '#/data/roles'
import type { Action, RoleDef } from '#/data/roles'

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
  const toast = useToast()
  const [roles, setRoles] = useState(roleDefs)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [editing, setEditing] = useState<RoleDef | null>(null)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<RoleDef | null>(null)
  // 편집 매트릭스 체크 상태
  const [draft, setDraft] = useState<Record<string, boolean>>({})

  const openEdit = (r: RoleDef) => {
    const d: Record<string, boolean> = {}
    for (const m of MENUS) for (const a of ACTIONS) d[`${m}.${a}`] = has(r, m, a)
    setDraft(d)
    setEditing(r)
  }
  const dirtyCount = editing
    ? MENUS.flatMap((m) => ACTIONS.map((a) => [m, a] as const)).filter(
        ([m, a]) => draft[`${m}.${a}`] !== has(editing, m, a),
      ).length
    : 0

  return (
    <AppShell active="roles" title="권한 관리">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">권한 관리</h1>
          <p className="mt-1 text-[13px] text-ink-subtle">
            역할 기반 접근 제어(RBAC) · 메뉴 × 액션 7종 (Mock 데이터)
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="h-9 rounded-lg bg-gradient-to-r from-primary to-accent2 px-4 text-[13px] font-semibold text-white shadow-[0_2px_10px_var(--color-glow)] transition-opacity hover:opacity-90"
        >
          + 역할 추가
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
              <div className="flex flex-wrap items-center gap-2 border-b border-hairline bg-canvas/50 px-5 py-3.5">
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${ROLE_BADGE[r.key] ?? 'bg-primary/12 text-primary'}`}>
                  {r.name}
                </span>
                <span className="text-xs tabular-nums text-ink-subtle">{r.assigned}명 배정</span>
                {r.system && (
                  <span className="rounded-full border border-hairline px-1.5 py-0.5 text-[10px] text-ink-subtle">
                    시스템 역할
                  </span>
                )}
                <span className="ml-auto flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(r)}
                    className="h-8 rounded-lg border border-hairline bg-chip px-3 text-xs font-medium text-ink-muted transition-colors hover:border-primary/40 hover:text-ink"
                  >
                    권한 편집
                  </button>
                  <button
                    type="button"
                    aria-label="역할 삭제"
                    onClick={() => setDeleting(r)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-subtle transition-colors hover:bg-danger-bg hover:text-danger-ink"
                  >
                    🗑
                  </button>
                </span>
              </div>
              <div className="p-5 pt-3.5">
              <p className="text-[13px] text-ink-muted">{r.desc}</p>

              {/* 미리보기 도트 — 인셋 박스로 본문과 가른다. 스태거 등장 */}
              <div className="mt-3.5 overflow-x-auto rounded-xl border border-hairline/70 bg-canvas/40 px-3.5 py-2.5">
                <table className="w-full min-w-[320px] border-collapse text-xs">
                  <thead>
                    <tr className="text-ink-subtle">
                      <th className="pb-1.5 text-left font-medium">권한 항목</th>
                      {PREVIEW_ACTIONS.map((a) => (
                        <th key={a} className="w-12 pb-1.5 text-center font-medium">
                          {a}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {PREVIEW_MENUS.map((m, mi) => (
                      <tr key={m} className="border-t border-hairline/50">
                        <td className="py-1.5 text-ink-muted">{m}</td>
                        {PREVIEW_ACTIONS.map((a, ai) => {
                          const on = has(r, m, a)
                          return (
                            <td key={a} className="py-1.5 text-center">
                              <span
                                style={{ '--i': mi * 3 + ai } as React.CSSProperties}
                                className={`anim-dot-in inline-block h-3 w-3 rounded-full ${
                                  on ? 'bg-fill-deployed' : 'bg-chip-strong'
                                }`}
                                title={`${m} · ${a}: ${on ? '허용' : '없음'}`}
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
                전체 매트릭스 {open ? '접기' : '보기'}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-300 ${open ? 'rotate-180' : ''}`} aria-hidden>
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              {/* 펼침 — grid-rows 0fr→1fr 전환, 내용은 살짝 떠오른다 */}
              <div className={`reveal-grid ${open ? 'open' : ''}`}>
                <div>
                  <div className="reveal-inner mt-3 overflow-x-auto rounded-xl border border-hairline">
                    <table className="w-full min-w-[560px] border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-hairline bg-canvas/60 text-ink-subtle">
                          <th className="px-3 py-2 text-left font-medium">메뉴</th>
                          {ACTIONS.map((a) => (
                            <th key={a} className="px-1.5 py-2 text-center font-medium">
                              {a}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {MENUS.map((m) => (
                          <tr key={m} className="border-b border-hairline/50 last:border-0">
                            <td className="whitespace-nowrap px-3 py-1.5 text-ink-muted">{m}</td>
                            {ACTIONS.map((a) => (
                              <td key={a} className="px-1.5 py-1.5 text-center">
                                {has(r, m, a) ? (
                                  <span className="inline-block rounded bg-primary/12 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                                    {a}
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
        <Modal title={`권한 편집 — ${editing.name}`} onClose={() => setEditing(null)} wide>
          {/* 권한명·설명도 여기서 고친다 — 이름 변경 역시 상신 대상이다 */}
          <div className="grid grid-cols-1 gap-3 pc:grid-cols-[220px_1fr]">
            <label className="block">
              <span className="text-xs font-medium text-ink-subtle">
                권한명 <b className="text-danger-ink">*</b>
                {editing.system && <span className="ml-1 text-[10px]">(시스템 역할)</span>}
              </span>
              <input
                defaultValue={editing.name}
                className="mt-1 h-10 w-full rounded-lg border border-hairline bg-canvas/60 px-3 text-[13px] font-semibold outline-none focus:border-primary/60"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-ink-subtle">설명</span>
              <input
                defaultValue={editing.desc}
                className="mt-1 h-10 w-full rounded-lg border border-hairline bg-canvas/60 px-3 text-[13px] outline-none focus:border-primary/60"
              />
            </label>
          </div>
          <p className="mt-3 rounded-xl border border-hairline bg-canvas/50 px-4 py-3 text-xs leading-relaxed text-ink-muted">
            현재 <b className="tabular-nums text-ink">{editing.assigned}명</b> 배정 — 변경은 즉시
            반영되지 않고 <b className="text-ink">상신 후 결재</b>를 거쳐 적용됩니다. 체크가 있는
            줄은 밝게 표시됩니다.
          </p>
          <div className="mt-3 overflow-x-auto rounded-xl border border-hairline">
            <table className="w-full min-w-[640px] border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-hairline bg-canvas/60 text-left text-xs text-ink-subtle">
                  <th className="px-3 py-2.5 font-medium">메뉴</th>
                  {ACTIONS.map((a) => (
                    <th key={a} className="px-2 py-2.5 text-center font-medium">
                      {a}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MENUS.map((m) => (
                  <tr key={m} className="perm-row border-b border-hairline/60 transition-colors last:border-0">
                    <td className="whitespace-nowrap px-3 py-2 font-medium text-ink">{m}</td>
                    {ACTIONS.map((a) => (
                      <td key={a} className="px-2 py-2 text-center">
                        <input
                          type="checkbox"
                          aria-label={`${m} ${a}`}
                          checked={draft[`${m}.${a}`] ?? false}
                          onChange={(e) => setDraft((d) => ({ ...d, [`${m}.${a}`]: e.target.checked }))}
                          className="accent-[var(--color-primary)]"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="h-9 rounded-lg border border-hairline bg-chip px-4 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
            >
              취소
            </button>
            <button
              type="button"
              disabled={dirtyCount === 0}
              onClick={() => {
                setEditing(null)
                toast(`${editing.name} 권한 변경 ${dirtyCount}건을 상신했습니다 — 결재 후 ${editing.assigned}명에게 적용됩니다`)
              }}
              className="h-9 rounded-lg bg-gradient-to-r from-primary to-accent2 px-4 text-[13px] font-semibold text-white shadow-[0_2px_10px_var(--color-glow)] transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              변경 상신{dirtyCount > 0 && <span className="ml-1 tabular-nums">{dirtyCount}</span>}
            </button>
          </div>
        </Modal>
      )}

      {/* 새 역할 — 기반 역할 복사로 시작한다 (시안 2 채택) */}
      {creating && (
        <Modal title="새 역할 추가" onClose={() => setCreating(false)}>
          <label className="block">
            <span className="text-xs font-medium text-ink-subtle">역할 이름 <b className="text-danger-ink">*</b></span>
            <input placeholder="예: 시니어 편집자" className="mt-1 h-10 w-full rounded-lg border border-hairline bg-canvas/60 px-3 text-[13px] outline-none focus:border-primary/60" />
          </label>
          <label className="mt-3 block">
            <span className="text-xs font-medium text-ink-subtle">역할 설명</span>
            <textarea rows={2} placeholder="역할에 대한 설명을 입력하세요" className="mt-1 w-full rounded-lg border border-hairline bg-canvas/60 px-3 py-2.5 text-[13px] outline-none focus:border-primary/60" />
          </label>
          <label className="mt-3 block">
            <span className="text-xs font-medium text-ink-subtle">기반 역할 (복사)</span>
            <Select defaultValue="처음부터 시작" className="mt-1 w-full">
              <option>처음부터 시작</option>
              {roles.map((r) => (
                <option key={r.key}>{r.name} 복사</option>
              ))}
            </Select>
          </label>
          <p className="mt-3 text-[11px] leading-relaxed text-ink-subtle">
            기존 역할을 복사해 시작하면 매트릭스를 처음부터 채우지 않아도 됩니다 — 생성 후 [권한
            편집]에서 다듬으세요.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="h-9 rounded-lg border border-hairline bg-chip px-4 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
            >
              취소
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
                  },
                ])
                toast('역할을 생성했습니다 — [권한 편집]에서 매트릭스를 다듬으세요')
              }}
              className="h-9 rounded-lg bg-gradient-to-r from-primary to-accent2 px-4 text-[13px] font-semibold text-white shadow-[0_2px_10px_var(--color-glow)] transition-opacity hover:opacity-90"
            >
              생성
            </button>
          </div>
        </Modal>
      )}

      {/* 삭제 — 배정 인원이 있으면 막는다 (유령 권한을 만들지 않는다) */}
      {deleting && (
        <Modal title="역할 삭제" onClose={() => setDeleting(null)}>
          {deleting.system ? (
            <p className="text-[13px] leading-relaxed text-ink-muted">
              <b className="text-ink">{deleting.name}</b>은 시스템 기본 역할이라 삭제할 수
              없습니다. 권한 범위는 [권한 편집]으로 조정하세요.
            </p>
          ) : deleting.assigned > 0 ? (
            <p className="text-[13px] leading-relaxed text-ink-muted">
              <b className="text-ink">{deleting.name}</b>에{' '}
              <b className="tabular-nums text-danger-ink">{deleting.assigned}명</b>이 배정되어
              있습니다. 먼저 회원 관리에서 다른 역할로 재배정한 뒤 삭제할 수 있습니다 — 역할만
              지우면 그 인원의 권한이 유령이 됩니다.
            </p>
          ) : (
            <p className="text-[13px] leading-relaxed text-ink-muted">
              <b className="text-ink">{deleting.name}</b>을 삭제합니다. 배정 인원이 없어 안전하게
              삭제됩니다. <b className="text-danger-ink">되돌릴 수 없습니다.</b>
            </p>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setDeleting(null)}
              className="h-9 rounded-lg border border-hairline bg-chip px-4 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
            >
              닫기
            </button>
            {!deleting.system && deleting.assigned === 0 && (
              <button
                type="button"
                onClick={() => {
                  setRoles((rs) => rs.filter((r) => r.key !== deleting.key))
                  setDeleting(null)
                  toast(`${deleting.name} 역할을 삭제했습니다`)
                }}
                className="h-9 rounded-lg bg-danger-ink px-4 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
              >
                삭제
              </button>
            )}
          </div>
        </Modal>
      )}
    </AppShell>
  )
}
