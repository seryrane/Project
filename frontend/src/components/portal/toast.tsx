import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

import { useI18n } from '#/lib/i18n'

/** 토스트에 붙일 수 있는 것 — 지금은 되돌리기 하나 (규약 §2: 성공은 토스트+되돌리기) */
export interface ToastOptions {
  /** 누르면 방금 한 일을 무르고 토스트를 닫는다. 없으면 버튼이 안 붙는다 */
  onUndo?: () => void
  /** 버튼 이름 — 기본 "되돌리기". 무르는 일이 특수할 때만 바꾼다 */
  undoLabel?: string
}

interface Toast {
  id: number
  message: string
  /** 같은 말이 연달아 온 횟수 — 1이면 안 보이고, 2부터 `외 N건`으로 접힌다 */
  count: number
  onUndo?: () => void
  undoLabel?: string
}

/** 규약 §2 겹침·모임 — 한 번에 최대 3개. 넘으면 **오래된 것부터** 밀어낸다
 *  (방금 한 일의 결과가 살아남아야 한다) */
const MAX = 3
/** 사라지는 시간. 같은 말이 다시 오면 이 시계를 되감는다 */
const LIFE = 3200

const ToastContext = createContext<(message: string, options?: ToastOptions) => void>(() => {})

export function useToast() {
  return useContext(ToastContext)
}

/** ⚠ `I18nProvider` **안**에 둔다(정본 배치: routes/__root.tsx) — `외 N건`이 사전을 탄다. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { t: tt, tf } = useI18n()
  const [toasts, setToasts] = useState<Array<Toast>>([])
  const nextId = useRef(0)
  /** ⚠ 목록을 ref 로도 들고 간다 — 겹침 판정·개수 제한은 setState 업데이터 **밖**에서
   *  해야 한다. 업데이터 안에서 id 를 발급하거나 타이머를 걸면 StrictMode 이중 호출에
   *  부작용이 두 번 난다(같은 토스트가 둘로 보이거나 시계가 두 개 걸린다). */
  const listRef = useRef<Array<Toast>>([])
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>())

  const sync = useCallback((next: Array<Toast>) => {
    listRef.current = next
    setToasts(next)
  }, [])

  const clearTimer = useCallback((id: number) => {
    const t = timers.current.get(id)
    if (t) clearTimeout(t)
    timers.current.delete(id)
  }, [])

  /** 시계를 (다시) 건다 — 같은 말이 또 오면 처음부터 3.2초 */
  const arm = useCallback(
    (id: number) => {
      clearTimer(id)
      timers.current.set(
        id,
        setTimeout(() => {
          clearTimer(id)
          sync(listRef.current.filter((x) => x.id !== id))
        }, LIFE),
      )
    },
    [clearTimer, sync],
  )

  /** 되돌리기를 누르면 그 자리에서 토스트가 사라진다 — 무른 일에 대한 토스트가 남아
   *  있으면 사람이 "무른 게 맞나" 다시 확인하러 간다 */
  const dismiss = useCallback(
    (id: number) => {
      clearTimer(id)
      sync(listRef.current.filter((x) => x.id !== id))
    },
    [clearTimer, sync],
  )

  const push = useCallback(
    (message: string, options?: ToastOptions) => {
      const list = listRef.current
      // ⚠ 빈 목록에서 `list[list.length - 1]` 은 undefined 인데 타입은 Toast 라고 말한다
      //   (noUncheckedIndexedAccess 없음) — 길이로 갈라 undefined 를 타입에 남긴다
      const last = list.length > 0 ? list[list.length - 1] : undefined
      // "연달아 오면 하나로" — 맨 뒤(가장 최근)와 같은 말일 때만 접는다. 사이에 다른 말이
      // 끼었으면 그것은 다른 일이 벌어진 것이라 따로 세운다.
      // ⚠ **되돌리기가 붙은 것은 접지 않는다** — 버튼 하나로 두 일을 무를 수는 없다.
      //   접어 버리면 마지막 하나만 물러 놓고 "다 물렀다"고 보이게 된다.
      const foldable = last && last.message === message && !last.onUndo && !options?.onUndo
      if (foldable) {
        sync(list.map((x) => (x.id === last.id ? { ...x, count: x.count + 1 } : x)))
        arm(last.id)
        return
      }
      const id = nextId.current++
      const grown = [...list, { id, message, count: 1, ...options }]
      const kept = grown.slice(Math.max(0, grown.length - MAX))
      // 밀려난 것의 시계는 같이 거둔다 — 안 그러면 남은 토스트를 나중에 지운다
      for (const gone of grown.slice(0, grown.length - kept.length)) clearTimer(gone.id)
      sync(kept)
      arm(id)
    },
    [arm, clearTimer, sync],
  )

  // 화면을 떠날 때 남은 시계를 거둔다
  useEffect(() => {
    const running = timers.current
    return () => {
      for (const t of running.values()) clearTimeout(t)
      running.clear()
    }
  }, [])

  return (
    <ToastContext.Provider value={push}>
      {children}
      {/* 자리는 화면 크기가 가른다 (규약 §2 알림 네 가지).
          ⚠ **넓은 화면: 헤더 바로 아래 우측 상단.** 우측 하단은 사람이 보고 있지 않는 자리라
          "떴는데 못 봤다"가 된다(2026-08-11 사용자 지적). 헤더(h-14)만큼 내려서 GNB 를
          가리지 않는다 — 방금 누른 버튼이 토스트에 먹히면 무엇 때문에 뜬 건지도 잃는다.
          ⚠ **좁은 화면: 하단 유지.** 상단은 모바일 주소창에 가리고 엄지에서 멀다(규약 표).
          그 자리에는 떠 있는 [물어보기] 버튼이 사니 **그 위로** 쌓는다 — 겹치면 토스트가
          버튼을 먹어 못 누르게 된다. 치수는 styles.css 의 --fab-size 하나가 정한다.
          ⚠ 등장 방향도 자리를 따라간다(styles.css .anim-toast-in 의 pc 분기).
          aria-live: 화면을 안 보고 있어도 읽어 준다 — 눈에 안 띄는 문제의 나머지 절반. */}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed bottom-[calc(1.5rem+var(--fab-size)+0.5rem+env(safe-area-inset-bottom,0px))] right-6 z-[70] flex flex-col gap-2 pc:bottom-auto pc:top-[calc(3.5rem+0.75rem)]"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="anim-toast-in relative flex max-w-[min(88vw,26rem)] items-center gap-2.5 overflow-hidden rounded-xl border border-hairline bg-raised py-3 pl-5 pr-4 text-[13px] text-ink shadow-[var(--shadow-2)] ring-1 ring-primary/15"
          >
            {/* 왼쪽 색 띠 — 흰 카드 위에 떠도 "무언가 떴다"가 먼저 읽힌다 */}
            <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-deployed-ink" />
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-deployed-bg text-deployed-ink">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 12.5l4.5 4.5L19 7" />
              </svg>
            </span>
            <span className="min-w-0">{t.message}</span>
            {/* 같은 말이 연달아 오면 줄을 늘리지 않고 여기서 센다 (규약 §2 겹침·모임) */}
            {t.count > 1 && (
              <span className="ml-auto shrink-0 rounded-full bg-chip-strong px-2 py-0.5 text-[11px] font-semibold tabular-nums text-ink-muted">
                {tf('toast.more', { n: t.count - 1 }, '외 {n}건')}
              </span>
            )}
            {/* 되돌리기 — 되돌릴 수 있는 일은 묻지 않고 하고, 무를 길을 여기 둔다 (규약 §2).
                ⚠ 감싼 상자가 pointer-events-none 이라 이 버튼만 다시 켠다 */}
            {t.onUndo && (
              <button
                type="button"
                onClick={() => {
                  t.onUndo?.()
                  dismiss(t.id)
                }}
                className="pointer-events-auto ml-auto shrink-0 rounded-lg border border-hairline bg-chip px-2.5 py-1 text-[12px] font-semibold text-ink transition-colors hover:border-primary/40 hover:bg-chip-strong"
              >
                {t.undoLabel ?? tt('common.undo', '되돌리기')}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
