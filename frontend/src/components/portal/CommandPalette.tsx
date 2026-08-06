import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'

import { nav } from '#/data/nav'
import { specs } from '#/data/specs'
import { useI18n } from '#/lib/i18n'

interface Command {
  group: string
  label: string
  hint?: string
  to: string
}

export function CommandPalette({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const { locale, t } = useI18n()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => inputRef.current?.focus(), [])

  // 페이지 명령은 LNB 정본(nav)에서 파생한다 — 손으로 다시 적으면 새 화면이
  // 생길 때마다 팔레트만 모르는 화면이 남는다 (실제로 두 개만 알고 있었다).
  // 라벨은 LNB 와 같은 규칙으로 언어를 입힌다 (EN: labelEn → 사전 → ko).
  const commands = useMemo<Array<Command>>(
    () => [
      ...nav.flatMap((section) =>
        section.items.flatMap((item) =>
          item.to == null
            ? []
            : [{
                group: section.title
                  ? t(`nav.section.${section.id}`, section.title)
                  : t('palette.pages'),
                label:
                  locale === 'en'
                    ? (item.labelEn ?? t(`nav.${item.key}`, item.label))
                    : item.label,
                hint: t('palette.go'),
                to: item.to,
              }],
        ),
      ),
      ...specs.map((s) => ({
        group: t('palette.specs'),
        label: s.name,
        hint: s.id,
        to: '/specs',
      })),
    ],
    [locale, t],
  )

  const q = query.trim().toLowerCase()
  const filtered = commands.filter(
    (c) => q === '' || c.label.toLowerCase().includes(q) || c.hint?.toLowerCase().includes(q),
  )

  useEffect(() => setActive(0), [q])

  const run = (cmd: Command) => {
    onClose()
    navigate({ to: cmd.to })
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(filtered.length - 1, a + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(0, a - 1))
    } else if (e.key === 'Enter' && filtered[active]) {
      run(filtered[active])
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  let lastGroup = ''

  return (
    <div
      className="anim-fade-in fixed inset-0 z-[60] bg-black/55 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="anim-scale-in mx-auto mt-[14vh] w-full max-w-lg overflow-hidden rounded-2xl border border-hairline bg-surface shadow-[0_32px_90px_rgb(0_0_0/50%)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-hairline px-4">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className="text-ink-subtle" aria-hidden>
            <circle cx="10.5" cy="10.5" r="6" />
            <path d="M20 20l-5-5" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKey}
            placeholder="페이지, 사양서 검색..."
            className="h-12 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-subtle"
          />
          <kbd className="rounded-md border border-hairline bg-chip px-1.5 py-0.5 text-[10px] text-ink-subtle">
            ESC
          </kbd>
        </div>
        <div className="max-h-72 overflow-y-auto p-2">
          {filtered.length === 0 && (
            <div className="px-3 py-8 text-center text-sm text-ink-subtle">
              검색 결과가 없습니다.
            </div>
          )}
          {filtered.map((c, i) => {
            const header = c.group !== lastGroup ? c.group : null
            lastGroup = c.group
            return (
              <div key={`${c.group}-${c.label}`}>
                {header && (
                  <div className="px-3 pb-1 pt-2.5 text-[11px] font-semibold text-ink-subtle">
                    {header}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => run(c)}
                  onPointerEnter={() => setActive(i)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-[13px] transition-colors ${
                    i === active ? 'bg-primary/15 text-ink' : 'text-ink-muted'
                  }`}
                >
                  <span>{c.label}</span>
                  <span className="flex items-center gap-2">
                    {c.hint && (
                      <span className="font-mono text-[11px] text-ink-subtle">{c.hint}</span>
                    )}
                    {i === active && (
                      <kbd className="rounded-md border border-hairline bg-chip px-1.5 py-0.5 text-[10px] text-ink-subtle">
                        ↵
                      </kbd>
                    )}
                  </span>
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
