/**
 * 로딩 관문 (규약 §3) — 스켈레톤·버튼 로딩을 화면마다 새로 그리지 않는다.
 *
 *   Skeleton        빛이 쓸고 가는 셔머 한 칸 — 곧 채워질 자리의 모양대로 놓는다
 *   WidgetSkeleton  카드 로딩 — 안은 셔머, **겉은 보더 빔**(테두리를 도는 빛)
 *   CtaButton       누른 그 버튼이 변한다 — 스피너 + 잠금(두 번 안 눌림)
 *
 * ⚠ 영원히 도는 스켈레톤이 제일 나쁘다 — 실패하면 지우고 이유를 남긴다(§3 규칙 5).
 */
import { useState } from 'react'

export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`skeleton ${className}`} />
}

/** 대시보드 위젯 자리 — 머리 한 줄 + 본문 덩어리, 테두리엔 빔이 돈다 */
export function WidgetSkeleton({ tall }: { tall?: boolean }) {
  return (
    <div className="card-loading h-full rounded-2xl border border-hairline bg-surface p-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-3 w-14" />
      </div>
      <Skeleton className={`mt-4 w-full ${tall ? 'h-40' : 'h-24'}`} />
      <div className="mt-3 flex gap-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  )
}

/** 주 CTA — 누르면 그 자리에서 스피너가 돌고 잠긴다. onAction 이 끝나야 풀린다 */
export function CtaButton({
  children,
  busyLabel,
  onAction,
  disabled,
  className = 'h-9 px-4',
}: {
  children: React.ReactNode
  /** 도는 동안 바꿔 말할 라벨 — "상신 중…" 처럼 무엇을 하는 중인지 */
  busyLabel?: React.ReactNode
  onAction: () => Promise<void> | void
  disabled?: boolean
  /** 크기·여백만 — 색·모양은 관문이 정한다 */
  className?: string
}) {
  const [busy, setBusy] = useState(false)
  return (
    <button
      type="button"
      disabled={disabled || busy}
      onClick={() => {
        setBusy(true)
        void Promise.resolve(onAction()).finally(() => setBusy(false))
      }}
      className={`inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-primary to-accent2 text-[13px] font-semibold text-white shadow-[0_2px_10px_var(--color-glow)] transition-opacity hover:opacity-90 disabled:opacity-60 ${className}`}
    >
      {busy && (
        <span
          aria-hidden
          className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-white/35 border-t-white"
        />
      )}
      {busy ? (busyLabel ?? children) : children}
    </button>
  )
}

/** 목업 시연용 지연 — 본개발에서는 실제 요청 Promise 를 넘긴다 */
export const simulate = (ms = 700) => new Promise<void>((resolve) => setTimeout(resolve, ms))
