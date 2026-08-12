import { useCallback, useId, useState } from 'react'

import { m } from './motion'
import { coverProps, useCover } from './useCover'

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
  const titleId = useId()

  const close = useCallback(() => setClosing(true), [])
  // 규약 §7 — Esc · 뒤 화면 잠금 · 포커스 이동/가둠/복귀를 관문 하나가 지킨다 (useCover)
  const panelRef = useCover(close)

  return (
    <m.div
      // 뒤가 실제로 겹치는 자리 — 여기서는 진짜로 흐린다(카드에는 안 건다)
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[3px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: closing ? 0 : 1 }}
      transition={{ duration: closing ? 0.18 : 0.22 }}
      onClick={close}
    >
      <m.div
        ref={panelRef}
        {...coverProps(titleId)}
        className="absolute inset-y-0 right-0 flex w-full max-w-[520px] flex-col border-l border-hairline bg-cover-glass shadow-[var(--shadow-cover)] backdrop-blur-2xl"
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
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>
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
