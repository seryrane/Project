import { useEffect } from 'react'

/**
 * 모달 관문 — 규약(docs/화면_공통규칙.md) §1·§7 을 이 한 곳이 지킨다.
 * - 좁은 화면(<720px)에서는 아래에서 올라오는 시트가 된다 (닫기가 엄지 자리에 온다)
 * - 덮은 것은 전부 Esc 로 닫힌다 · MODAL 만 배경막을 눌러 닫는다
 * - 열려 있는 동안 뒤 화면 스크롤을 잠그고, 안쪽 스크롤은 안에서 끝낸다(overscroll)
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
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    // 뒤 화면 잠금 — overscroll 만으로는 안 구르는 자리(배경막·머리)를 잡고 끌 때 뒤가 구른다
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 backdrop-blur-sm pc:items-center pc:p-6"
      onClick={onClose}
    >
      <div
        className={`flex max-h-[calc(100dvh-3.5rem)] w-full flex-col rounded-t-2xl border border-white/8 bg-surface shadow-[0_24px_80px_rgb(0_0_0/55%)] pc:max-h-[85vh] pc:rounded-2xl ${
          wide ? 'pc:max-w-4xl' : 'pc:max-w-2xl'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-hairline px-5 py-3.5 pc:px-6 pc:py-4">
          <h2 className="min-w-0 truncate text-lg font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-subtle transition-colors hover:bg-canvas hover:text-ink"
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
      </div>
    </div>
  )
}
