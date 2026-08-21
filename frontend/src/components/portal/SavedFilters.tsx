import { useEffect, useState } from 'react'

import { useI18n } from '#/lib/i18n'
import { useToast } from './toast'
import { Icon } from './Icon'

/**
 * 저장 필터의 **관문** — 자주 쓰는 거르기 조합에 이름을 붙여 두고 한 번에 부른다.
 *
 * ⚠ 거르는 조건은 이미 주소에 있다(lib/urlState.ts) — 그래서 이 관문은 **주소 값을 그대로**
 * 담고 그대로 되돌린다. 화면마다 자기 검색 타입을 갖고 있으므로 제네릭으로 받는다.
 *
 * ⚠ `scope` 로 상자를 가른다. 한 상자에 섞으면 사양서에서 저장한 조합이 승인 관리 칩으로
 * 튀어나온다 — 이름은 같아도 뜻이 다른 값들이다.
 *
 * ⚠ 저장은 **이 브라우저에만** 남는다(프로토타입). 본개발에서 계정 설정으로 옮길 때
 * 이 관문의 안쪽만 서버 호출로 갈면 되고, 화면은 모양을 모른다.
 */
export interface SavedFilter<T> {
  name: string
  value: T
}

export function SavedFilters<T extends object>({
  scope,
  current,
  canSave,
  onApply,
  className = '',
}: {
  /** 저장 상자를 가르는 이름 — 화면마다 하나 */
  scope: string
  /** 지금 걸려 있는 조건(주소에서 온 값 그대로) */
  current: T
  /** 거른 것이 없으면 저장할 것도 없다 — 부르는 쪽이 판단한다 */
  canSave: boolean
  onApply: (value: T) => void
  className?: string
}) {
  const { t, tf } = useI18n()
  const toast = useToast()
  const key = `saved-filters.${scope}`
  const [saved, setSaved] = useState<Array<SavedFilter<T>>>([])
  const [naming, setNaming] = useState(false)
  const [name, setName] = useState('')

  /* ⚠ 첫 렌더에서 localStorage 를 직접 읽지 않는다 — SSR 마크업과 어긋나 한 프레임
     빈 줄이 보인다(AppShell 의 LNB 깜빡임과 같은 병, 2026-08-13). */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key)
      if (raw) setSaved(JSON.parse(raw) as Array<SavedFilter<T>>)
    } catch {
      /* 깨진 저장본은 없는 셈 친다 */
    }
  }, [key])

  const persist = (next: Array<SavedFilter<T>>) => {
    setSaved(next)
    localStorage.setItem(key, JSON.stringify(next))
  }

  const save = () => {
    const trimmed = name.trim()
    if (trimmed === '') return
    // 같은 이름은 덮어쓴다 — 같은 이름 둘이 서로 다른 조건을 부르면 어느 쪽인지 모른다
    const next = [...saved.filter((f) => f.name !== trimmed), { name: trimmed, value: current }]
    persist(next)
    setNaming(false)
    setName('')
    toast(tf('savedFilters.toast.saved', { name: trimmed }, '[{name}] 조건을 저장했습니다'))
  }

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {saved.map((f) => (
        <span
          key={f.name}
          className="flex items-center rounded-full border border-hairline bg-surface pl-3 pr-1 text-xs text-ink-muted"
        >
          <button
            type="button"
            onClick={() => onApply(f.value)}
            className="py-1.5 pr-1.5 font-medium transition-colors hover:text-ink"
          >
            {f.name}
          </button>
          {/* 지우기는 되돌릴 수 있는 일이라 묻지 않는다 — 되돌릴 길을 토스트가 준다 (규약 §2) */}
          <button
            type="button"
            aria-label={tf('savedFilters.remove', { name: f.name }, '{name} 저장 조건 삭제')}
            onClick={() => {
              const rest = saved.filter((x) => x.name !== f.name)
              persist(rest)
              toast(tf('savedFilters.toast.removed', { name: f.name }, '[{name}] 을 지웠습니다'), {
                onUndo: () => persist([...rest, f]),
              })
            }}
            className="flex h-6 w-6 items-center justify-center rounded-full text-ink-subtle transition-colors hover:bg-chip hover:text-ink"
          >
            <Icon name="trash" />
          </button>
        </span>
      ))}

      {naming ? (
        <span className="flex items-center gap-1">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') save()
              if (e.key === 'Escape') setNaming(false)
            }}
            placeholder={t('savedFilters.namePlaceholder', '조건 이름 (예: 내 팀 승인 대기)')}
            className="h-8 w-52 rounded-lg border border-hairline bg-canvas/60 px-3 text-xs outline-none placeholder:text-ink-subtle focus:border-primary/60"
          />
          <button
            type="button"
            onClick={save}
            disabled={name.trim() === ''}
            className="h-8 rounded-lg bg-primary px-3 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {t('common.save', '저장')}
          </button>
        </span>
      ) : (
        canSave && (
          <button
            type="button"
            onClick={() => setNaming(true)}
            className="h-8 rounded-full border border-dashed border-hairline px-3 text-xs font-medium text-ink-subtle transition-colors hover:border-primary/40 hover:text-ink"
          >
            {t('savedFilters.save', '+ 지금 조건 저장')}
          </button>
        )
      )}
    </div>
  )
}
