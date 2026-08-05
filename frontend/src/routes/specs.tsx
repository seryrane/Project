import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { AppShell } from '#/components/portal/AppShell'
import { SpecCard } from '#/components/portal/SpecCard'
import { SpecDetailModal } from '#/components/portal/SpecDetailModal'
import { VersionCompareModal } from '#/components/portal/VersionCompareModal'
import { currentVersion, specs } from '#/data/specs'
import type { Spec, SpecStatus, SpecVersion } from '#/data/specs'

export const Route = createFileRoute('/specs')({ component: SpecsPage })

const allStatuses: Array<SpecStatus> = ['초안', '검토 중', '승인 대기', '배포 완료']

function SpecsPage() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('전체 카테고리')
  const [status, setStatus] = useState('전체 상태')
  const [detail, setDetail] = useState<Spec | null>(null)
  const [compare, setCompare] = useState<{ spec: Spec; base: SpecVersion } | null>(null)

  const categories = useMemo(() => Array.from(new Set(specs.map((s) => s.category))), [])

  const filtered = specs.filter((s) => {
    const q = query.trim().toLowerCase()
    const matchesQuery =
      q === '' ||
      s.name.toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q) ||
      s.tags.some((t) => t.toLowerCase().includes(q))
    const matchesCategory = category === '전체 카테고리' || s.category === category
    const matchesStatus = status === '전체 상태' || currentVersion(s).status === status
    return matchesQuery && matchesCategory && matchesStatus
  })

  const pendingCount = specs.filter((s) => currentVersion(s).status === '승인 대기').length

  const openCompare = (spec: Spec) => {
    const prev = spec.history.find((v, i) => i > 0 && v.status === '배포 완료') ?? spec.history[1]
    setCompare({ spec, base: prev })
  }

  return (
    <AppShell active="specs" title="사양서 관리">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">사양서 관리</h1>
          <p className="mt-1 text-[13px] text-ink-subtle">
            총 {specs.length}개 사양서 · {pendingCount}개 승인 대기
          </p>
        </div>
        <button
          type="button"
          className="h-9 rounded-lg bg-gradient-to-r from-primary to-accent2 px-4 text-[13px] font-semibold text-white shadow-[0_2px_10px_var(--color-glow)] transition-opacity hover:opacity-90"
        >
          + 사양서 등록
        </button>
      </div>

      <div className="mt-6 flex gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="사양서 명, ID, 태그 검색..."
          className="h-10 flex-1 rounded-lg border border-hairline bg-surface px-4 text-[13px] outline-none placeholder:text-ink-subtle focus:border-primary"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-10 rounded-lg border border-hairline bg-surface px-3 text-[13px] text-ink-muted outline-none focus:border-primary"
        >
          <option>전체 카테고리</option>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-10 rounded-lg border border-hairline bg-surface px-3 text-[13px] text-ink-muted outline-none focus:border-primary"
        >
          <option>전체 상태</option>
          {allStatuses.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-2">
        {filtered.map((spec) => (
          <SpecCard
            key={spec.id}
            spec={spec}
            onDetail={() => setDetail(spec)}
            onCompare={() => openCompare(spec)}
          />
        ))}
      </div>
      {filtered.length === 0 && (
        <div className="mt-16 text-center text-sm text-ink-subtle">
          조건에 맞는 사양서가 없습니다.
        </div>
      )}

      {detail && (
        <SpecDetailModal
          spec={detail}
          onClose={() => setDetail(null)}
          onCompareWith={(base) => {
            setCompare({ spec: detail, base })
            setDetail(null)
          }}
        />
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
