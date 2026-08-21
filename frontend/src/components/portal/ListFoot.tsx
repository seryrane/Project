import { useEffect, useMemo, useState } from 'react'

import { useI18n } from '#/lib/i18n'

/**
 * 목록의 **발** — 규약 §9 "목록은 몇 건인지 말하고 끝난다".
 *
 * ⚠⚠ 이 관문이 없던 동안 화면의 표 열셋이 **전부 발 없이** 끝났다. 필터를 걸어 줄이
 * 절반이 되어도 화면은 아무 말이 없어서, 보는 사람은 그게 전부인지 걸러진 것인지
 * 알 수 없었다. 세는 말을 화면마다 손으로 적으면 말투가 갈리고, 갈린 순간 어느 쪽이
 * 맞는 셈인지 모른다 — 그래서 **한 곳에서만 그린다.**
 */

/* 발이 쓰는 말은 사전이 갖는다 — 관문이 한국어를 손으로 적고 있어서 EN 화면의
   모든 목록 발만 한국어로 남았다(2026-08-18 EN 실검수). 세는 단위(건·명)는 부르는
   쪽이 주고, EN 문장은 그 자리를 안 쓴다("3 of 6" 에는 단위가 안 붙는다). */

export function ListFoot({
  total,
  shown,
  unit = '건',
  page,
  pageCount,
  onPage,
  /** 잘라서 보여 주는 위젯이 **전체로 보내는 길** (위젯은 쪽을 나누지 않는다) */
  more,
  /**
   * **그 자리에서** 접었다 펴는 발 — `more` 와 다른 물건이다.
   * `more` 는 다른 화면으로 보내고, 이건 같은 목록을 늘렸다 줄인다.
   * ⚠ 쪽과 **함께** 설 수 있다: 긴 목록은 "8줄만 보이기 + 21줄부터 쪽"이 같이 온다.
   *   (`more` 는 쪽이 서면 숨는다 — 위젯이 쪽을 안 나누기 때문이고, 이건 그 부류가 아니다)
   */
  toggle,
  className = '',
}: {
  total: number
  shown: number
  unit?: string
  page?: number
  pageCount?: number
  onPage?: (p: number) => void
  more?: { label: string; onClick?: () => void }
  toggle?: { label: string; expanded: boolean; onClick: () => void }
  className?: string
}) {
  const { t, tf } = useI18n()
  const countLabel =
    total === shown
      ? tf('listFoot.total', { n: total, unit }, '전체 {n}{unit}')
      : tf('listFoot.filtered', { n: total, m: shown, unit }, '전체 {n}{unit} 중 {m}{unit}')
  const paged = page != null && pageCount != null && pageCount > 1 && onPage
  return (
    <div
      className={`mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-divider pt-3 text-xs text-ink-subtle ${className}`}
    >
      <span className="tabular-nums">{countLabel}</span>
      {paged && (
        <span className="flex items-center gap-1">
          <PageBtn label={t('common.prevPage', '이전')} disabled={page <= 1} onClick={() => onPage(page - 1)}>
            ‹
          </PageBtn>
          <span className="px-1.5 tabular-nums text-ink-muted">
            {page} / {pageCount}
          </span>
          <PageBtn label={t('common.nextPage', '다음')} disabled={page >= pageCount} onClick={() => onPage(page + 1)}>
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
      {toggle && (
        /* ⚠ 화살표는 **상태를 말한다** — 펴면 위, 접으면 아래. 글자만으로도 읽히지만
           방향이 함께 서야 누르기 전에 무슨 일이 날지 안다 (규약 §21 자기 상태). */
        <button
          type="button"
          aria-expanded={toggle.expanded}
          onClick={toggle.onClick}
          className="rounded-md px-2 py-1 font-medium text-ink-muted transition-colors hover:bg-chip hover:text-ink"
        >
          {toggle.label} {toggle.expanded ? '↑' : '↓'}
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
export function usePaged<T>(rows: ReadonlyArray<T>, size = 20) {
  /* ⚠ 읽기만 하므로 `as const` 로 굳힌 mock 도 그대로 받는다 — DataTable 은 이미
     그렇게 받고 있었는데 여기만 `Array<T>` 라, 감사 로그(굳은 시드)에 쪽을 붙이려는
     순간 타입이 막았다(2026-08-18). 짝이 되는 관문은 같은 것을 받아야 한다. */
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
