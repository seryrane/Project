import { useCallback, useEffect, useState } from 'react'

import { m } from './motion'

/* Right-hand slide-over panel — motion 스프링 presence.
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

  const close = useCallback(() => setClosing(true), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    // 규약 §7: 덮개가 열려 있는 동안 뒤 화면 스크롤을 잠근다 (스크롤바가 html 에
    // 붙어 있으므로 html 까지 — body 만 잠그면 12px 트랙이 남는다)
    const prevBody = document.body.style.overflow
    const prevHtml = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevBody
      document.documentElement.style.overflow = prevHtml
    }
  }, [close])

  return (
    <m.div
      className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[2px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: closing ? 0 : 1 }}
      transition={{ duration: closing ? 0.18 : 0.22 }}
      onClick={close}
    >
      <m.div
        className="absolute inset-y-0 right-0 flex w-full max-w-[520px] flex-col border-l border-hairline bg-surface shadow-[-24px_0_80px_rgb(0_0_0/40%)]"
        initial={{ x: '100%' }}
        animate={{ x: closing ? '100%' : 0 }}
        // 등장은 스프링(살짝 눌러앉는 감), 퇴장은 짧은 트윈 — 퇴장 스프링은 굼떠 보인다
        transition={
          closing
            ? { duration: 0.2, ease: [0.4, 0, 1, 1] }
            : { type: 'spring', stiffness: 380, damping: 40 }
        }
        // 퇴장 애니메이션이 끝난 뒤 언마운트 — setTimeout 으로 어림잡지 않는다
        onAnimationComplete={() => {
          if (closing) onClose()
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 머리는 면(배경)+선으로 가른다 (규약 §7) */}
        <div className="flex items-center justify-between surface-head px-6 py-4">
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
      </m.div>
    </m.div>
  )
}
