/**
 * 선택 칩 관문 — 체크박스·셀렉트 남발을 막는다 (DESIGN.md Rules).
 * 옵션이 한눈에 들어오는 수(≤6)면 칩으로 고른다. 많으면 Select 를 쓴다.
 */

export function ChipSelect<T extends string>({
  options,
  value,
  onChange,
  mono,
}: {
  options: ReadonlyArray<T>
  value: T
  onChange: (v: T) => void
  /** 코드성 값(타입 등)은 모노로 */
  mono?: boolean
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = value === o
        return (
          <button
            key={o}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all active:scale-95 ${
              mono ? 'font-mono text-xs' : ''
            } ${
              on
                ? 'border-primary/50 bg-primary/8 text-primary'
                : 'border-hairline bg-surface text-ink-muted hover:border-primary/30 hover:text-ink'
            }`}
          >
            {/* 규약 16절 — 고른 것은 색만으로 말하지 않는다. 글자로도 남긴다 */}
            {on ? '✓ ' : ''}
            {o}
          </button>
        )
      })}
    </div>
  )
}

export function ChipMulti<T extends string>({
  options,
  values,
  onChange,
  mono,
  label,
}: {
  options: ReadonlyArray<T>
  values: Array<T>
  onChange: (v: Array<T>) => void
  /** 코드성 값(Role 등)은 모노로 */
  mono?: boolean
  /** 표시만 갈아끼운다 — 값은 언제나 옵션 그대로다 (규약 §4-7 번역은 라벨에만).
   *  라벨을 주면 코드는 title 로 남아, 코드를 아는 사람도 확인할 수 있다. */
  label?: (o: T) => string
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = values.includes(o)
        return (
          <button
            key={o}
            type="button"
            aria-pressed={on}
            title={label ? o : undefined}
            onClick={() => onChange(on ? values.filter((x) => x !== o) : [...values, o])}
            className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-all active:scale-95 ${
              mono ? 'font-mono text-[10px]' : ''
            } ${
              on
                ? 'border-primary/50 bg-primary/8 text-primary'
                : 'border-hairline text-ink-subtle hover:border-primary/30 hover:text-ink'
            }`}
          >
            {on ? '✓ ' : ''}
            {label ? label(o) : o}
          </button>
        )
      })}
    </div>
  )
}

/** 토글 스위치 — on/off 하나짜리 설정에 쓴다 (체크박스 대체) */
export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`h-6 w-11 shrink-0 rounded-full p-0.5 transition-colors ${checked ? 'bg-primary' : 'bg-chip-strong'}`}
    >
      <span className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </button>
  )
}
