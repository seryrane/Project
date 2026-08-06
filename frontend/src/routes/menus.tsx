import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { AppShell } from '#/components/portal/AppShell'
import { ChipMulti, ChipSelect, Switch } from '#/components/portal/Chips'
// 이 파일은 `m` 이 메뉴 항목 변수라 모션 관문을 fx 로 별칭한다
import { layoutSpring, m as fx } from '#/components/portal/motion'
import { Modal } from '#/components/portal/Modal'
import { Select } from '#/components/portal/Select'
import { useToast } from '#/components/portal/toast'
import { COLUMN_OPTIONS, TEMPLATES, menuItems } from '#/data/menus'
import type { MenuConfig, MenuItem, TemplateKey } from '#/data/menus'
import { WIDGET_META } from '#/data/dashboardLayout'
import { roleDefs } from '#/data/roles'

// 접근 가능 역할은 권한 관리 정본(roleDefs)에서 파생한다 — 역할이 추가되면
// 여기도 자동 노출된다 (본개발에서는 서버 역할 목록으로 교체)
const ROLE_NAMES = roleDefs.map((r) => r.name)

export const Route = createFileRoute('/menus')({ component: MenusPage })

/** 템플릿 미니 와이어프레임 — 이 메뉴가 어떤 화면으로 열릴지 그림으로 말한다 */
function Wireframe({ t }: { t: TemplateKey }) {
  const line = 'var(--color-ink-subtle)'
  const box = 'var(--color-chip-strong)'
  const accent = 'var(--color-primary)'
  return (
    <svg viewBox="0 0 64 44" className="block h-full w-full" aria-hidden>
      <rect x="0.5" y="0.5" width="63" height="43" rx="3" fill="none" stroke={line} strokeOpacity="0.4" />
      {t === 'dashboard' && (
        <>
          {[3, 19, 35, 51].map((x) => (
            <rect key={x} x={x} y="4" width="12" height="8" rx="1.5" fill={box} />
          ))}
          <rect x="3" y="16" width="37" height="24" rx="2" fill={box} />
          <path d="M7 34 L14 27 L21 31 L28 23 L36 26" fill="none" stroke={accent} strokeWidth="1.6" strokeLinecap="round" />
          <rect x="44" y="16" width="17" height="24" rx="2" fill={box} />
        </>
      )}
      {t === 'list-detail' && (
        <>
          <rect x="3" y="4" width="37" height="5" rx="1.5" fill={box} />
          {[13, 20, 27, 34].map((y) => (
            <rect key={y} x="3" y={y} width="37" height="4.5" rx="1.5" fill={box} opacity={y === 20 ? 1 : 0.55} />
          ))}
          <rect x="44" y="4" width="17" height="36" rx="2" fill={box} />
          <rect x="47" y="8" width="11" height="2.5" rx="1" fill={accent} />
        </>
      )}
      {t === 'board' && (
        <>
          <rect x="3" y="4" width="44" height="5" rx="1.5" fill={box} />
          <rect x="51" y="4" width="10" height="5" rx="1.5" fill={accent} />
          {[13, 20, 27, 34].map((y) => (
            <rect key={y} x="3" y={y} width="58" height="4.5" rx="1.5" fill={box} opacity="0.7" />
          ))}
        </>
      )}
      {t === 'document' && (
        <>
          {[4, 10, 16, 22].map((y) => (
            <rect key={y} x="3" y={y} width="13" height="3" rx="1" fill={box} />
          ))}
          <rect x="21" y="4" width="30" height="3.5" rx="1" fill={accent} opacity="0.8" />
          {[11, 16, 21, 26, 31, 36].map((y) => (
            <rect key={y} x="21" y={y} width={y % 2 ? 40 : 34} height="2.5" rx="1" fill={box} opacity="0.7" />
          ))}
        </>
      )}
      {t === 'blank' && (
        <>
          <rect x="6" y="6" width="52" height="32" rx="2" fill="none" stroke={line} strokeOpacity="0.5" strokeDasharray="3 2.5" />
          <path d="M32 17v10M27 22h10" stroke={line} strokeWidth="1.6" strokeLinecap="round" />
        </>
      )}
    </svg>
  )
}

function MenusPage() {
  const toast = useToast()
  const [items, setItems] = useState(menuItems)
  const [selected, setSelected] = useState<MenuItem | null>(null)
  const [creating, setCreating] = useState(false)
  const [newTemplate, setNewTemplate] = useState<TemplateKey>('list-detail')
  const [newRoles, setNewRoles] = useState<Array<string>>([])
  const [newMinimal, setNewMinimal] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPath, setNewPath] = useState('')
  // 선택 메뉴 편집 초안 (우측 패널)
  const [draft, setDraft] = useState<MenuItem | null>(null)

  const select = (m: MenuItem) => {
    setSelected(m)
    setDraft({ ...m })
  }

  const patchConfig = (patch: Partial<MenuConfig>) =>
    setDraft((d) => d && { ...d, config: { ...d.config, ...patch } })

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
    // layout 스프링 — 드래그로 순서가 바뀌면 행이 미끄러져 자리를 잡는다
    <fx.li key={m.id} layout transition={{ layout: layoutSpring }}>
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
        {m.minimal ? (
          <span
            className="rounded-full bg-deployed-bg px-1.5 py-0.5 text-[10px] font-medium text-deployed-ink"
            title="권한 없이 모든 역할에 보이는 메뉴"
          >
            최소 메뉴
          </span>
        ) : (
          <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-primary">
            {m.roles.length}개 역할
          </span>
        )}
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
    </fx.li>
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
              {/* 화면 템플릿·구성은 **관리자가 만든 메뉴에만** — 시스템 메뉴(코드 화면)에
                  템플릿을 노출하면 실제 화면과 어긋난다 (2026-08-06 사용자 지적) */}
              {draft.custom ? (
                <>
                  <div>
                    <span className="text-xs font-medium text-ink-subtle">화면 템플릿</span>
                    <div className="mt-1.5 flex items-center gap-3 rounded-xl border border-hairline bg-canvas/40 p-3">
                      <span className="h-14 w-20 shrink-0 overflow-hidden rounded-lg">
                        <Wireframe t={draft.template} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <ChipSelect
                          options={TEMPLATES.map((t) => t.name)}
                          value={TEMPLATES.find((t) => t.key === draft.template)?.name ?? TEMPLATES[0].name}
                          onChange={(name) => {
                            const t = TEMPLATES.find((x) => x.name === name)
                            if (t) setDraft((d) => d && { ...d, template: t.key })
                          }}
                        />
                        <span className="mt-1.5 block text-[11px] text-ink-subtle">
                          {TEMPLATES.find((t) => t.key === draft.template)?.desc}
                        </span>
                      </span>
                    </div>
                  </div>
                  {/* 화면 구성 — 관리자가 만든 메뉴가 실제로 무엇을 하는지 여기서 정한다 */}
                  <div className="rounded-xl border border-hairline/70 bg-canvas/40 p-3.5">
                    <span className="text-xs font-semibold text-ink">화면 구성</span>
                    <div className="mt-2.5 space-y-3">
                      {draft.template === 'list-detail' && (
                        <>
                          <div>
                            <span className="text-[11px] text-ink-subtle">표 컬럼</span>
                            <div className="mt-1.5">
                              <ChipMulti
                                options={COLUMN_OPTIONS}
                                values={(draft.config?.columns ?? ['이름', '상태']) as Array<(typeof COLUMN_OPTIONS)[number]>}
                                onChange={(columns) => patchConfig({ columns })}
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-between rounded-lg bg-chip px-3 py-2">
                            <span className="text-xs text-ink">검색칸 사용</span>
                            <Switch
                              checked={draft.config?.searchable ?? true}
                              onChange={(searchable) => patchConfig({ searchable })}
                              label="검색칸 사용"
                            />
                          </div>
                          <div>
                            <span className="text-[11px] text-ink-subtle">상세가 열리는 곳 (규약 §1)</span>
                            <div className="mt-1.5">
                              <ChipSelect
                                options={['우측 패널', '모달', '본문 페이지'] as const}
                                value={draft.config?.detailSurface ?? '우측 패널'}
                                onChange={(detailSurface) => patchConfig({ detailSurface })}
                              />
                            </div>
                          </div>
                        </>
                      )}
                      {draft.template === 'dashboard' && (
                        <div>
                          <span className="text-[11px] text-ink-subtle">배치할 위젯 (역할 권한이 다시 거른다)</span>
                          <div className="mt-1.5">
                            <ChipMulti
                              options={Object.values(WIDGET_META).map((w) => w.title)}
                              values={draft.config?.widgets ?? []}
                              onChange={(widgets) => patchConfig({ widgets })}
                            />
                          </div>
                        </div>
                      )}
                      {draft.template === 'board' && (
                        <>
                          <label className="block">
                            <span className="text-[11px] text-ink-subtle">카테고리 (콤마로 구분)</span>
                            <input
                              value={draft.config?.categories ?? ''}
                              onChange={(e) => patchConfig({ categories: e.target.value })}
                              placeholder="예: 공지, 자료, 질문"
                              className="mt-1 h-9 w-full rounded-lg border border-hairline bg-canvas/60 px-3 text-xs outline-none focus:border-primary/60"
                            />
                          </label>
                          <div>
                            <span className="text-[11px] text-ink-subtle">작성 가능 등급</span>
                            <div className="mt-1.5">
                              <ChipSelect
                                options={['Viewer 이상', 'Editor 이상', 'Admin 이상'] as const}
                                value={draft.config?.writeGrade ?? 'Editor 이상'}
                                onChange={(writeGrade) => patchConfig({ writeGrade })}
                              />
                            </div>
                          </div>
                        </>
                      )}
                      {draft.template === 'document' && (
                        <div className="flex items-center justify-between rounded-lg bg-chip px-3 py-2">
                          <span className="text-xs text-ink">제목에서 목차 자동 생성</span>
                          <Switch
                            checked={draft.config?.autoToc ?? true}
                            onChange={(autoToc) => patchConfig({ autoToc })}
                            label="목차 자동 생성"
                          />
                        </div>
                      )}
                      {draft.template === 'blank' && (
                        <label className="block">
                          <span className="text-[11px] text-ink-subtle">
                            외부 시스템 URL — 등록하면 이 메뉴가 그 화면을 임베드합니다 (신규 시스템 편입)
                          </span>
                          <input
                            value={draft.config?.embedUrl ?? ''}
                            onChange={(e) => patchConfig({ embedUrl: e.target.value })}
                            placeholder="https://..."
                            className="mt-1 h-9 w-full rounded-lg border border-hairline bg-canvas/60 px-3 font-mono text-xs outline-none focus:border-primary/60"
                          />
                        </label>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <p className="rounded-xl border border-hairline bg-canvas/50 px-3.5 py-2.5 text-[11px] leading-relaxed text-ink-subtle">
                  시스템 메뉴 — 화면이 코드로 만들어져 있어 이름·노출·접근 역할만 설정합니다.
                  템플릿·화면 구성은 [+ 메뉴 추가]로 만든 메뉴에서 편집합니다.
                </p>
              )}
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
              {/* 최소 메뉴 — 권한으로만 가리면 권한 적은 역할의 LNB 가 텅 빈다.
                  특히 가이드·공지는 권한 없는 사람일수록 필요하다 */}
              <div className="flex items-center justify-between gap-2.5 rounded-xl bg-chip px-3.5 py-2.5">
                <span className="text-[13px]">
                  <b className="font-medium text-ink">최소 메뉴</b>
                  <span className="block text-[11px] text-ink-subtle">권한 없이 모든 역할에 보입니다</span>
                </span>
                <Switch
                  checked={draft.minimal ?? false}
                  onChange={(v) => setDraft((d) => d && { ...d, minimal: v })}
                  label="최소 메뉴"
                />
              </div>
              {!draft.minimal && (
                <div>
                  <span className="text-xs font-medium text-ink-subtle">
                    접근 가능 역할 <span className="font-normal">(권한 관리의 역할이 자동 노출)</span>
                  </span>
                  <div className="mt-1.5">
                    <ChipMulti
                      options={ROLE_NAMES}
                      values={draft.roles}
                      onChange={(roles) => setDraft((d) => d && { ...d, roles })}
                    />
                  </div>
                  {draft.roles.length === 0 && (
                    <p className="mt-1.5 rounded-lg bg-danger-bg px-3 py-2 text-[11px] text-danger-ink">
                      접근 역할이 없으면 아무도 이 메뉴를 못 봅니다 — 하나 이상 고르거나 [최소
                      메뉴]로 전환하세요.
                    </p>
                  )}
                </div>
              )}
              <div className="flex gap-2 border-t border-hairline pt-4">
                <button
                  type="button"
                  disabled={!draft.minimal && draft.roles.length === 0}
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
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="메뉴 이름 입력"
              className="mt-1 h-10 w-full rounded-lg border border-hairline bg-canvas/60 px-3 text-[13px] outline-none focus:border-primary/60"
            />
          </label>
          <label className="mt-3 block">
            <span className="text-xs font-medium text-ink-subtle">경로 (Path) <b className="text-danger-ink">*</b></span>
            <input
              value={newPath}
              onChange={(e) => setNewPath(e.target.value)}
              placeholder="/path/to/page"
              className="mt-1 h-10 w-full rounded-lg border border-hairline bg-canvas/60 px-3 font-mono text-xs outline-none focus:border-primary/60"
            />
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
          {/* 화면 템플릿 — 관리자가 새 메뉴의 UI 를 미리 구상한다 */}
          <div className="mt-3">
            <span className="text-xs font-medium text-ink-subtle">
              화면 템플릿 <b className="text-danger-ink">*</b>
            </span>
            <div className="mt-1.5 grid grid-cols-2 gap-2 pc:grid-cols-3">
              {TEMPLATES.map((t) => {
                const on = newTemplate === t.key
                return (
                  <button
                    key={t.key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setNewTemplate(t.key)}
                    className={`rounded-xl border p-2.5 text-left transition-all active:scale-[0.98] ${
                      on
                        ? 'border-primary/60 bg-primary/8 shadow-[0_2px_10px_var(--color-glow)]'
                        : 'border-hairline hover:border-primary/30 hover:bg-chip'
                    }`}
                  >
                    <span className="block h-16 overflow-hidden rounded-lg bg-canvas/50">
                      <Wireframe t={t.key} />
                    </span>
                    <span className={`mt-1.5 flex items-center justify-between text-xs font-semibold ${on ? 'text-primary' : 'text-ink'}`}>
                      {t.name}
                      {/* 규약 16절 — 선택은 색만으로 말하지 않는다 */}
                      {on && <span className="text-[10px] font-medium">✓ 선택됨</span>}
                    </span>
                    <span className="mt-0.5 block text-[10px] leading-snug text-ink-subtle">{t.desc}</span>
                  </button>
                )
              })}
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-2.5 rounded-xl bg-chip px-3.5 py-2.5">
            <span className="text-[13px]">
              <b className="font-medium text-ink">최소 메뉴</b>
              <span className="block text-[11px] text-ink-subtle">권한 없이 모든 역할에 보입니다</span>
            </span>
            <Switch checked={newMinimal} onChange={setNewMinimal} label="최소 메뉴" />
          </div>
          {!newMinimal && (
            <div className="mt-3">
              <span className="text-xs font-medium text-ink-subtle">
                접근 역할 <span className="font-normal">(권한 관리의 역할이 자동 노출)</span>
              </span>
              <div className="mt-1.5">
                <ChipMulti options={ROLE_NAMES} values={newRoles} onChange={setNewRoles} />
              </div>
            </div>
          )}
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
              disabled={newName.trim() === '' || !newPath.trim().startsWith('/') || (!newMinimal && newRoles.length === 0)}
              onClick={() => {
                // 실제로 만들어진다 — 만든 뒤 우측 설정에서 화면 구성을 이어간다
                const item: MenuItem = {
                  id: `m-custom-${items.length + 1}`,
                  order: tops.length + 1,
                  name: newName.trim(),
                  path: newPath.trim(),
                  icon: 'doc',
                  active: true,
                  roles: newMinimal ? [] : newRoles,
                  minimal: newMinimal,
                  template: newTemplate,
                  custom: true,
                  config: {},
                }
                setItems((list) => [...list, item])
                setCreating(false)
                setNewName('')
                setNewPath('')
                select(item)
                toast('메뉴를 추가했습니다 — 우측 [화면 구성]에서 이 화면에 들어갈 요소를 정하세요')
              }}
              className="h-9 rounded-lg bg-gradient-to-r from-primary to-accent2 px-4 text-[13px] font-semibold text-white shadow-[0_2px_10px_var(--color-glow)] transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              추가
            </button>
          </div>
        </Modal>
      )}
    </AppShell>
  )
}
