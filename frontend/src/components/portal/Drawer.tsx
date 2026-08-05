import { useCallback, useEffect, useState } from 'react'

/* Right-hand slide-over panel with animated open/close.
   Call the `close` render-prop (not the parent's onClose) so the exit
   animation plays before unmounting. Esc closes as well. */
export function Drawer({
  title,
  onClose,
  children,
}: {
  title: React.ReactNode
  onClose: () => void
  children: (close: () => void) => React.ReactNode
}) {
  const [closing, setClosing] = useState(false)

  const close = useCallback(() => {
    setClosing(true)
    setTimeout(onClose, 190)
  }, [onClose])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    // 규약 §7: 덮개가 열려 있는 동안 뒤 화면 스크롤을 잠근다
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [close])

  return (
    <div
      className={`fixed inset-0 z-50 bg-black/55 backdrop-blur-[2px] ${
        closing ? 'anim-fade-out' : 'anim-fade-in'
      }`}
      onClick={close}
    >
      <div
        className={`absolute inset-y-0 right-0 flex w-full max-w-[520px] flex-col border-l border-hairline bg-surface shadow-[-24px_0_80px_rgb(0_0_0/40%)] ${
          closing ? 'anim-slide-out' : 'anim-slide-in'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-hairline px-6 py-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            type="button"
            onClick={close}
            aria-label="닫기"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-subtle transition-colors hover:bg-chip hover:text-ink"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children(close)}</div>
      </div>
    </div>
  )
}
