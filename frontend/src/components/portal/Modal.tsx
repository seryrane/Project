import { useCallback, useId, useState } from 'react'

import { m } from './motion'
import { coverProps, useCover } from './useCover'

/**
 * 모달 관문 — 규약(docs/화면_공통규칙.md) §1·§7 을 이 한 곳이 지킨다.
 * - 좁은 화면(<720px)에서는 아래에서 올라오는 시트가 된다 (닫기가 엄지 자리에 온다)
 * - 덮은 것은 전부 Esc 로 닫힌다 · MODAL 만 배경막을 눌러 닫는다
 * - 열려 있는 동안 뒤 화면 스크롤을 잠그고, 안쪽 스크롤은 안에서 끝낸다(overscroll)
 * - motion 스프링 presence — 퇴장 애니메이션이 끝난 뒤 언마운트한다
 */
export function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: React.ReactNode
  onClose: () => void
  children: React.ReactNode
  wide?: boolean
}) {
  const [closing, setClosing] = useState(false)
  const titleId = useId()

  const close = useCallback(() => setClosing(true), [])
  // Esc · 뒤 화면 잠금 · 포커스 이동/가둠/복귀는 관문 하나가 지킨다 (useCover)
  const panelRef = useCover(close)

  return (
    <m.div
      // 덮개는 뒤가 실제로 겹치는 몇 안 되는 자리라 **여기서는 진짜로 흐린다**
      // (카드에는 안 건다 — styles.css 의 '유리와 깊이' 절 참고)
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-md pc:items-center pc:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: closing ? 0 : 1 }}
      transition={{ duration: closing ? 0.16 : 0.2 }}
      onClick={close}
    >
      <m.div
        ref={panelRef}
        {...coverProps(titleId)}
        className={`flex max-h-[calc(100dvh-3.5rem)] w-full flex-col rounded-t-2xl border border-hairline bg-cover-glass shadow-[var(--shadow-cover)] backdrop-blur-2xl pc:max-h-[85vh] pc:rounded-2xl ${
          wide ? 'pc:max-w-4xl' : 'pc:max-w-2xl'
        }`}
        // 데스크톱은 살짝 떠오르며 눌러앉고, 모바일 시트도 같은 값으로 자연스럽다.
        // 등장 스프링 · 퇴장은 짧은 트윈 (퇴장 스프링은 굼떠 보인다)
        initial={{ opacity: 0, y: 32, scale: 0.97 }}
        animate={closing ? { opacity: 0, y: 20, scale: 0.98 } : { opacity: 1, y: 0, scale: 1 }}
        transition={
          closing ? { duration: 0.15 } : { type: 'spring', stiffness: 460, damping: 36 }
        }
        // 퇴장이 끝난 뒤 언마운트 — setTimeout 으로 어림잡지 않는다
        onAnimationComplete={() => {
          if (closing) onClose()
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 머리는 면(배경)+선으로 가른다 — 선 하나면 스크롤 중 내용 첫 줄처럼 읽힌다 (규약 §7) */}
        <div className="flex items-center justify-between rounded-t-2xl surface-head px-5 py-3.5 pc:px-6 pc:py-4">
          <h2 id={titleId} className="min-w-0 truncate text-lg font-semibold">
            {title}
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="닫기"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-subtle transition-colors hover:bg-chip hover:text-ink"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="m6 6 12 12M18 6 6 18"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto overscroll-contain px-5 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pc:px-6">
          {children}
        </div>
      </m.div>
    </m.div>
  )
}
