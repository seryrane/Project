import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { AppShell } from '#/components/portal/AppShell'
import { Modal } from '#/components/portal/Modal'
import { Select } from '#/components/portal/Select'
import { useToast } from '#/components/portal/toast'
import { MENU_ROLE_OPTIONS, menuItems } from '#/data/menus'
import type { MenuItem } from '#/data/menus'

export const Route = createFileRoute('/menus')({ component: MenusPage })

function MenusPage() {
  const toast = useToast()
  const [items, setItems] = useState(menuItems)
  const [selected, setSelected] = useState<MenuItem | null>(null)
  const [creating, setCreating] = useState(false)
  // 선택 메뉴 편집 초안 (우측 패널)
  const [draft, setDraft] = useState<MenuItem | null>(null)

  const select = (m: MenuItem) => {
    setSelected(m)
    setDraft({ ...m })
  }

  // 드래그로 순서를 바꾼다 — 같은 부모 아래에서만 (계층이 섞이면 뜻이 바뀐다)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropId, setDropId] = useState<string | null>(null)

  const reorder = (fromId: string, toId: string) => {
    setItems((list) => {
      const from = list.find((x) => x.id === fromId)
      const to = list.find((x) => x.id === toId)
      if (!from || !to || from.parent !== to.parent) return list
      const without = list.filter((x) => x.id !== fromId)
      const toIdx = without.findIndex((x) => x.id === toId)
      without.splice(toIdx, 0, from)
      return without.map((x, i) => ({ ...x, order: i + 1 }))
    })
  }

  const toggleActive = (m: MenuItem) => {
    setItems((list) => list.map((x) => (x.id === m.id ? { ...x, active: !x.active } : x)))
    // 되돌릴 수 있으니 묻지 않는다 — 되돌릴 길을 문구로 (규약 §2)
    toast(`${m.name} 메뉴를 ${m.active ? '숨겼습니다' : '노출합니다'} — 같은 토글로 되돌립니다`)
  }

  const children = (id: string) => items.filter((x) => x.parent === id)
  const tops = items.filter((x) => !x.parent)

  // ⚠ 컴포넌트가 아니라 렌더 함수다 — 페이지 안에서 컴포넌트를 정의하면 리렌더마다
  // 타입이 바뀌어 DOM 이 재마운트되고, 진행 중이던 드래그가 끊긴다 (실측으로 잡음)
  const renderRow = (m: MenuItem, depth: number): React.ReactNode => (
    <li key={m.id}>
      <div
        onClick={() => select(m)}
        draggable
        onDragStart={() => setDragId(m.id)}
        onDragEnd={() => {
          setDragId(null)
          setDropId(null)
        }}
        onDragOver={(e) => {
          if (dragId && dragId !== m.id) {
            e.preventDefault()
            setDropId(m.id)
          }
        }}
        onDrop={(e) => {
          e.preventDefault()
          if (dragId && dragId !== m.id) reorder(dragId, m.id)
          setDragId(null)
          setDropId(null)
        }}
        className={`group flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 transition-all ${
          selected?.id === m.id
            ? 'border-primary/50 bg-primary/8'
            : dropId === m.id
              ? 'border-primary border-dashed bg-primary/6'
              : 'border-transparent hover:border-hairline hover:bg-chip'
        } ${depth > 0 ? 'ml-7 border-l-2 border-l-hairline' : ''} ${dragId === m.id ? 'opacity-40' : ''}`}
      >
        {/* 드래그 손잡이 — 평소에도 보인다 (숨기면 옮길 수 있다는 걸 모른다) */}
        <span aria-hidden className="cursor-grab select-none text-ink-subtle active:cursor-grabbing">
          <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor">
            <circle cx="2.5" cy="2.5" r="1.3" />
            <circle cx="7.5" cy="2.5" r="1.3" />
            <circle cx="2.5" cy="8" r="1.3" />
            <circle cx="7.5" cy="8" r="1.3" />
            <circle cx="2.5" cy="13.5" r="1.3" />
            <circle cx="7.5" cy="13.5" r="1.3" />
          </svg>
        </span>
        <span className="w-6 text-right font-mono text-xs tabular-nums text-ink-subtle">{m.order}</span>
        <span className="min-w-0 flex-1">
          <span className={`block truncate text-[13px] font-medium ${m.active ? 'text-ink' : 'text-ink-subtle line-through'}`}>
            {m.name}
            {children(m.id).length > 0 && (
              <span className="ml-1.5 rounded-full bg-chip px-1.5 py-0.5 text-[10px] font-normal text-ink-subtle no-underline">
                {children(m.id).length}개 하위
              </span>
            )}
          </span>
        </span>
        <code className="hidden font-mono text-[11px] text-ink-subtle sm:block">{m.path}</code>
        <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-primary">
          {m.roles.length}개 역할
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={m.active}
          aria-label={`${m.name} 노출`}
          onClick={(e) => {
            e.stopPropagation()
            toggleActive(m)
          }}
          className={`h-5.5 w-10 shrink-0 rounded-full p-0.5 transition-colors ${m.active ? 'bg-primary' : 'bg-chip-strong'}`}
        >
          <span className={`block h-4.5 w-4.5 rounded-full bg-white shadow transition-transform ${m.active ? 'translate-x-[18px]' : ''}`} />
        </button>
      </div>
      {children(m.id).length > 0 && (
        <ul className="mt-1 space-y-1">{children(m.id).map((c) => renderRow(c, depth + 1))}</ul>
      )}
    </li>
  )

  return (
    <AppShell active="menus" title="메뉴 관리">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">메뉴 관리</h1>
          <p className="mt-1 text-[13px] text-ink-subtle">
            내비게이션 동적 구성 · 역할 연결 — 정본은 이 목록이다 (LNB·팔레트·권한이 함께 본다)
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="h-9 rounded-lg bg-gradient-to-r from-primary to-accent2 px-4 text-[13px] font-semibold text-white shadow-[0_2px_10px_var(--color-glow)] transition-opacity hover:opacity-90"
        >
          + 메뉴 추가
        </button>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px]">
        {/* 좌: 메뉴 구조 트리 */}
        <section className="anim-fade-up card-spotlight rounded-2xl border border-hairline bg-surface">
          <div className="flex items-center justify-between border-b border-hairline bg-canvas/50 px-5 py-3.5">
            <h2 className="text-sm font-semibold text-ink">메뉴 구조 ({items.length}개)</h2>
            <span className="text-xs text-ink-subtle">드래그하여 순서 변경 · 행을 누르면 우측에서 설정</span>
          </div>
          <ul className="space-y-1 p-4">{tops.map((m) => renderRow(m, 0))}</ul>
        </section>

        {/* 우: 메뉴 설정 패널 — 목록→상세 짝 (규약 §1의 패널 안 2열) */}
        <section className="anim-fade-up card-spotlight rounded-2xl border border-hairline bg-surface [animation-delay:80ms]">
          <div className="border-b border-hairline bg-canvas/50 px-5 py-3.5">
            <h2 className="text-sm font-semibold text-ink">메뉴 설정</h2>
          </div>
          {draft && selected ? (
            <div className="space-y-3.5 p-5">
              <label className="block">
                <span className="text-xs font-medium text-ink-subtle">메뉴 이름 <b className="text-danger-ink">*</b></span>
                <input
                  value={draft.name}
                  onChange={(e) => setDraft((d) => d && { ...d, name: e.target.value })}
                  className="mt-1 h-10 w-full rounded-lg border border-hairline bg-canvas/60 px-3 text-[13px] outline-none focus:border-primary/60"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-ink-subtle">경로 (Path) <b className="text-danger-ink">*</b></span>
                <input
                  value={draft.path}
                  onChange={(e) => setDraft((d) => d && { ...d, path: e.target.value })}
                  className="mt-1 h-10 w-full rounded-lg border border-hairline bg-canvas/60 px-3 font-mono text-xs outline-none focus:border-primary/60"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-ink-subtle">아이콘명</span>
                <input
                  value={draft.icon}
                  onChange={(e) => setDraft((d) => d && { ...d, icon: e.target.value })}
                  className="mt-1 h-10 w-full rounded-lg border border-hairline bg-canvas/60 px-3 font-mono text-xs outline-none focus:border-primary/60"
                />
              </label>
              <div className="flex items-center justify-between rounded-xl bg-chip px-3.5 py-2.5">
                <span className="text-[13px] font-medium text-ink">노출 여부</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={draft.active}
                  aria-label="노출"
                  onClick={() => setDraft((d) => d && { ...d, active: !d.active })}
                  className={`h-6 w-11 rounded-full p-0.5 transition-colors ${draft.active ? 'bg-primary' : 'bg-chip-strong'}`}
                >
                  <span className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${draft.active ? 'translate-x-5' : ''}`} />
                </button>
              </div>
              <div>
                <span className="text-xs font-medium text-ink-subtle">접근 가능 역할</span>
                <div className="mt-1.5 space-y-1">
                  {MENU_ROLE_OPTIONS.map((r) => {
                    const on = draft.roles.includes(r)
                    return (
                      <label
                        key={r}
                        className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors hover:bg-chip"
                      >
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() =>
                            setDraft(
                              (d) => d && { ...d, roles: on ? d.roles.filter((x) => x !== r) : [...d.roles, r] },
                            )
                          }
                          className="accent-[var(--color-primary)]"
                        />
                        <span className="text-ink">{r}</span>
                      </label>
                    )
                  })}
                </div>
                {draft.roles.length === 0 && (
                  <p className="mt-1.5 rounded-lg bg-danger-bg px-3 py-2 text-[11px] text-danger-ink">
                    접근 역할이 없으면 아무도 이 메뉴를 못 봅니다 — 저장 전에 하나 이상 고르세요.
                  </p>
                )}
              </div>
              <div className="flex gap-2 border-t border-hairline pt-4">
                <button
                  type="button"
                  disabled={draft.roles.length === 0}
                  onClick={() => {
                    setItems((list) => list.map((x) => (x.id === draft.id ? draft : x)))
                    toast(`${draft.name} 메뉴 설정을 저장했습니다 — LNB 에 바로 반영됩니다`)
                  }}
                  className="h-9 flex-1 rounded-lg bg-gradient-to-r from-primary to-accent2 text-[13px] font-semibold text-white shadow-[0_2px_10px_var(--color-glow)] transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  저장
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const kids = children(selected.id).length
                    if (kids > 0) {
                      toast(`하위 메뉴 ${kids}개가 있어 삭제할 수 없습니다 — 하위를 먼저 옮기거나 삭제하세요`)
                      return
                    }
                    setItems((list) => list.filter((x) => x.id !== selected.id))
                    setSelected(null)
                    setDraft(null)
                    toast(`${selected.name} 메뉴를 삭제했습니다`)
                  }}
                  className="h-9 rounded-lg bg-danger-ink px-4 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
                >
                  삭제
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 px-5 py-16 text-center text-ink-subtle">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
                <path d="M4 6.5h16M4 12h16M4 17.5h9" />
              </svg>
              <p className="text-[13px]">메뉴를 클릭하여 설정을 변경하세요</p>
            </div>
          )}
        </section>
      </div>

      {/* 새 메뉴 추가 — 상위 메뉴를 골라 계층으로 넣는다 */}
      {creating && (
        <Modal title="새 메뉴 추가" onClose={() => setCreating(false)}>
          <label className="block">
            <span className="text-xs font-medium text-ink-subtle">메뉴 이름 <b className="text-danger-ink">*</b></span>
            <input placeholder="메뉴 이름 입력" className="mt-1 h-10 w-full rounded-lg border border-hairline bg-canvas/60 px-3 text-[13px] outline-none focus:border-primary/60" />
          </label>
          <label className="mt-3 block">
            <span className="text-xs font-medium text-ink-subtle">경로 (Path) <b className="text-danger-ink">*</b></span>
            <input placeholder="/path/to/page" className="mt-1 h-10 w-full rounded-lg border border-hairline bg-canvas/60 px-3 font-mono text-xs outline-none focus:border-primary/60" />
          </label>
          <label className="mt-3 block">
            <span className="text-xs font-medium text-ink-subtle">상위 메뉴 (선택)</span>
            <Select defaultValue="최상위 메뉴" className="mt-1 w-full">
              <option>최상위 메뉴</option>
              {tops.map((m) => (
                <option key={m.id}>{m.name}</option>
              ))}
            </Select>
          </label>
          <div className="mt-3">
            <span className="text-xs font-medium text-ink-subtle">접근 역할</span>
            <div className="mt-1.5 grid grid-cols-2 gap-1">
              {MENU_ROLE_OPTIONS.map((r) => (
                <label key={r} className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] transition-colors hover:bg-chip">
                  <input type="checkbox" className="accent-[var(--color-primary)]" />
                  <span className="text-ink">{r}</span>
                </label>
              ))}
            </div>
          </div>
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
                toast('메뉴를 추가했습니다 — 접근 역할이 있는 사람에게 바로 보입니다')
              }}
              className="h-9 rounded-lg bg-gradient-to-r from-primary to-accent2 px-4 text-[13px] font-semibold text-white shadow-[0_2px_10px_var(--color-glow)] transition-opacity hover:opacity-90"
            >
              추가
            </button>
          </div>
        </Modal>
      )}
    </AppShell>
  )
}
