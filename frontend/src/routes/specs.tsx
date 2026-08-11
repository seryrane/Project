import { useEffect, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { AppShell } from '#/components/portal/AppShell'
import { ChipSelect } from '#/components/portal/Chips'
import { SpecCard } from '#/components/portal/SpecCard'
import { VersionCompareModal } from '#/components/portal/VersionCompareModal'
import { useI18n } from '#/lib/i18n'
import { orNone, pickOne, pickText } from '#/lib/urlState'
import { currentVersion, specs } from '#/data/specs'
import type { Spec, SpecStatus, SpecVersion } from '#/data/specs'

const allStatuses: Array<SpecStatus> = ['초안', '검토 중', '승인 대기', '배포 완료']

// 필터 내부 값(sentinel)은 한국어 원문 그대로 — 화면에 보일 때만 사전을 입힌다
const ALL_CATEGORY = '전체 카테고리'
const ALL_STATUS = '전체 상태'

const specCategories = Array.from(new Set(specs.map((s) => s.category)))

/** 보고 있는 상태는 주소에 둔다 (lib/urlState.ts) — 새로고침·뒤로가기·링크 공유에서 살아남는다 */
interface SpecsSearch {
  open?: string
  q?: string
  cat?: string
  status?: SpecStatus
}

export const Route = createFileRoute('/specs')({
  component: SpecsPage,
  // 대시보드 승인 큐 등에서 특정 사양서를 바로 연다: /specs?open=SP-001
  validateSearch: (search: Record<string, unknown>): SpecsSearch => ({
    open: pickText(search.open),
    q: pickText(search.q),
    cat: pickOne(search.cat, specCategories),
    status: pickOne(search.status, allStatuses),
  }),
})

function SpecsPage() {
  const { t, tf } = useI18n()
  const { open, q: query = '', cat: category = ALL_CATEGORY, status = ALL_STATUS } = Route.useSearch()
  const navigate = useNavigate()
  const [compare, setCompare] = useState<{ spec: Spec; base: SpecVersion } | null>(null)

  /** 고르는 것(칩)은 뒤로가기로 되돌 수 있게 쌓고, 글자 입력은 replace 로 덮는다
   *  — 한 글자마다 히스토리가 쌓이면 뒤로가기가 못 쓰게 된다 (lib/urlState.ts) */
  // ⚠ `prev` 는 **모든 화면의 검색 타입을 합친 것**으로 들어온다(navigate 가 라우트에
  //   묶여 있지 않아서) — 이 화면 몫으로 좁혀서 편다
  const setSearch = (patch: Partial<SpecsSearch>, replace = false) =>
    void navigate({
      to: '/specs',
      search: (prev) => ({ ...(prev as SpecsSearch), ...patch }),
      replace,
    })

  // ?open=SP-001 은 상세 본문 페이지로 보낸다 (대시보드 승인 큐·알림 → 여기 → 상세)
  useEffect(() => {
    if (!open) return
    const target = specs.find((s) => s.id === open)
    if (target) navigate({ to: '/specs/$specId', params: { specId: target.id }, replace: true })
  }, [open, navigate])

  const categories = specCategories

  const filtered = specs.filter((s) => {
    const q = query.trim().toLowerCase()
    const matchesQuery =
      q === '' ||
      s.name.toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q) ||
      s.tags.some((tag) => tag.toLowerCase().includes(q))
    const matchesCategory = category === ALL_CATEGORY || s.category === category
    const matchesStatus = status === ALL_STATUS || currentVersion(s).status === status
    return matchesQuery && matchesCategory && matchesStatus
  })

  const pendingCount = specs.filter((s) => currentVersion(s).status === '승인 대기').length

  const openCompare = (spec: Spec) => {
    const prev = spec.history.find((v, i) => i > 0 && v.status === '배포 완료') ?? spec.history[1]
    setCompare({ spec, base: prev })
  }

  return (
    <AppShell active="specs" title="사양서 관리">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('nav.specs', '사양서 관리')}</h1>
          <p className="mt-1 text-[13px] text-ink-subtle">
            {tf(
              'page.specs.subtitle',
              { total: specs.length, pending: pendingCount },
              '총 {total}개 사양서 · {pending}개 승인 대기',
            )}
          </p>
        </div>
        <button
          type="button"
          className="h-9 rounded-lg bg-gradient-to-r from-primary to-accent2 px-4 text-[13px] font-semibold text-white shadow-[0_2px_10px_var(--color-glow)] transition-opacity hover:opacity-90"
        >
          {t('specs.register', '+ 사양서 등록')}
        </button>
      </div>

      {/* 좁은 화면: 검색 한 줄 + 필터 한 줄로 접힌다 (규약 §8 — 가로 스크롤 금지) */}
      <div className="mt-6 flex flex-col gap-3 pc:flex-row">
        <input
          value={query}
          onChange={(e) => setSearch({ q: pickText(e.target.value) }, true)}
          placeholder={t('specs.searchPlaceholder', '사양서 명, ID, 태그 검색...')}
          className="h-10 rounded-lg border border-hairline bg-surface px-4 text-[13px] outline-none placeholder:text-ink-subtle focus:border-primary pc:flex-1"
        />
        <div className="flex items-center">
          {/* 표시만 번역한다 — 내부 값은 sentinel 유지 (언어를 바꿔도 필터가 안 깨진다) */}
          <ChipSelect
            options={[t('specs.allCategories', ALL_CATEGORY), ...categories]}
            value={category === ALL_CATEGORY ? t('specs.allCategories', ALL_CATEGORY) : category}
            onChange={(v) =>
              setSearch({
                cat: orNone(v === t('specs.allCategories', ALL_CATEGORY) ? ALL_CATEGORY : v, ALL_CATEGORY),
              })
            }
          />
        </div>
      </div>

      {/* 상태 필터: 셀렉트 대신 카운트 칩 — 좁은 화면에서는 줄바꿈으로 접힌다 */}
      <div className="mt-3 flex flex-wrap gap-2">
        {[ALL_STATUS, ...allStatuses].map((st) => {
          const count =
            st === ALL_STATUS
              ? specs.length
              : specs.filter((sp) => currentVersion(sp).status === st).length
          const selected = status === st
          return (
            <button
              key={st}
              type="button"
              onClick={() => setSearch({ status: orNone(st as SpecStatus, ALL_STATUS as SpecStatus) })}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all active:scale-95 ${
                selected
                  ? 'border-primary/50 bg-primary/15 text-primary'
                  : 'border-hairline bg-surface text-ink-muted hover:border-primary/30 hover:text-ink'
              }`}
            >
              {st === ALL_STATUS ? t('common.all', '전체') : st}
              <span className={selected ? 'text-primary/80' : 'text-ink-subtle'}>{count}</span>
            </button>
          )
        })}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-2">
        {filtered.map((spec, i) => (
          <SpecCard
            key={spec.id}
            spec={spec}
            index={i}
            onDetail={() => navigate({ to: '/specs/$specId', params: { specId: spec.id } })}
            onCompare={() => openCompare(spec)}
          />
        ))}
      </div>
      {filtered.length === 0 && (
        <div className="mt-16 text-center text-sm text-ink-subtle">
          {t('specs.empty', '조건에 맞는 사양서가 없습니다.')}
        </div>
      )}

      {compare && (
        <VersionCompareModal
          spec={compare.spec}
          base={compare.base}
          onClose={() => setCompare(null)}
        />
      )}
    </AppShell>
  )
}
