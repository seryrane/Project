import { createContext, useCallback, useContext, useRef, useState } from 'react'

interface Toast {
  id: number
  message: string
}

const ToastContext = createContext<(message: string) => void>(() => {})

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Array<Toast>>([])
  const nextId = useRef(0)

  const push = useCallback((message: string) => {
    const id = nextId.current++
    setToasts((t) => [...t, { id, message }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200)
  }, [])

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-6 right-6 z-[70] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="anim-toast-in flex items-center gap-2.5 rounded-xl border border-hairline bg-raised px-4 py-3 text-[13px] text-ink shadow-[0_12px_40px_rgb(0_0_0/35%)]"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-deployed-bg text-deployed-ink">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 12.5l4.5 4.5L19 7" />
              </svg>
            </span>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
