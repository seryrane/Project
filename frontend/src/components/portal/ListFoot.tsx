import { useEffect, useMemo, useState } from 'react'

/**
 * 목록의 **발** — 규약 §9 "목록은 몇 건인지 말하고 끝난다".
 *
 * ⚠⚠ 이 관문이 없던 동안 화면의 표 열셋이 **전부 발 없이** 끝났다. 필터를 걸어 줄이
 * 절반이 되어도 화면은 아무 말이 없어서, 보는 사람은 그게 전부인지 걸러진 것인지
 * 알 수 없었다. 세는 말을 화면마다 손으로 적으면 말투가 갈리고, 갈린 순간 어느 쪽이
 * 맞는 셈인지 모른다 — 그래서 **한 곳에서만 그린다.**
 */

/** 발이 쓰는 말 — 거른 수와 전체 수를 **함께** 적는다 */
function countLabel(total: number, shown: number, unit: string) {
  return total === shown ? `전체 ${total}${unit}` : `전체 ${total}${unit} 중 ${shown}${unit}`
}

export function ListFoot({
  total,
  shown,
  unit = '건',
  page,
  pageCount,
  onPage,
  /** 잘라서 보여 주는 위젯이 전체로 보내는 길 (위젯은 쪽을 나누지 않는다) */
  more,
  className = '',
}: {
  total: number
  shown: number
  unit?: string
  page?: number
  pageCount?: number
  onPage?: (p: number) => void
  more?: { label: string; onClick?: () => void }
  className?: string
}) {
  const paged = page != null && pageCount != null && pageCount > 1 && onPage
  return (
    <div
      className={`mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-divider pt-3 text-xs text-ink-subtle ${className}`}
    >
      <span className="tabular-nums">{countLabel(total, shown, unit)}</span>
      {paged && (
        <span className="flex items-center gap-1">
          <PageBtn label="이전" disabled={page <= 1} onClick={() => onPage(page - 1)}>
            ‹
          </PageBtn>
          <span className="px-1.5 tabular-nums text-ink-muted">
            {page} / {pageCount}
          </span>
          <PageBtn label="다음" disabled={page >= pageCount} onClick={() => onPage(page + 1)}>
            ›
          </PageBtn>
        </span>
      )}
      {!paged && more && (
        <button
          type="button"
          onClick={more.onClick}
          className="rounded-md px-2 py-1 font-medium text-ink-muted transition-colors hover:bg-chip hover:text-ink"
        >
          {more.label} →
        </button>
      )}
    </div>
  )
}

function PageBtn({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    /* 좁은 화면 손가락 크기는 관문이 진다 (규약 §8) — 표·칩 안쪽 기준 36px */
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-md text-base leading-none text-ink-muted transition-colors hover:bg-chip hover:text-ink disabled:pointer-events-none disabled:opacity-35"
    >
      {children}
    </button>
  )
}

/**
 * 쪽 나누기 — 21줄부터 (규약 §9).
 *
 * ⚠ **거른 조건이 바뀌면 1쪽으로 돌아간다.** 3쪽을 보다가 조건을 좁히면 그 쪽이 비어
 * "결과가 없다"로 잘못 읽힌다 — 줄 수가 바뀌면 쪽을 되돌린다.
 */
export function usePaged<T>(rows: Array<T>, size = 20) {
  const [page, setPage] = useState(1)
  const pageCount = Math.max(1, Math.ceil(rows.length / size))
  /* ⚠ 되돌리는 근거를 **길이**로 잡는다. `[rows]` 로 잡으면 부르는 쪽이 `useMemo` 를
     안 걸었을 때 매 렌더마다 새 배열이라 쪽이 계속 1로 튄다(무한 되돌림).
     길이가 우연히 같은 조건 변경은 못 잡지만, 그때도 아래 `safe` 가 범위를 벗어난
     쪽을 끌어와서 빈 쪽은 안 나온다. */
  useEffect(() => {
    setPage(1)
  }, [rows.length])
  const safe = Math.min(page, pageCount)
  const pageRows = useMemo(() => (rows.length <= size ? rows : rows.slice((safe - 1) * size, safe * size)), [rows, safe, size])
  return { page: safe, pageCount, pageRows, setPage }
}
