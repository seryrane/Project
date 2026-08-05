import { Avatar } from './Avatar'
import { StatusBadge } from './StatusBadge'
import { currentVersion } from '#/data/specs'
import type { Spec } from '#/data/specs'

interface Props {
  spec: Spec
  onDetail: () => void
  onCompare: () => void
}

export function SpecCard({ spec, onDetail, onCompare }: Props) {
  const cur = currentVersion(spec)
  const needsApproval = cur.status === '초안' || cur.status === '검토 중'
  return (
    <article className="flex flex-col rounded-2xl border border-hairline bg-surface p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_6px_20px_var(--color-glow)]">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-xs font-semibold text-ink-subtle">{spec.id}</span>
          <StatusBadge status={cur.status} />
        </div>
        <span className="rounded-full bg-primary/12 px-2.5 py-0.5 font-mono text-xs font-semibold text-primary">
          {cur.version}
        </span>
      </div>

      <h3 className="mt-2.5 text-base font-semibold text-ink">{spec.name}</h3>
      <div className="mt-0.5 text-xs text-ink-subtle">{spec.category}</div>
      <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-ink-muted">
        {spec.description}
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {spec.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-chip px-2 py-0.5 text-[11px] font-medium text-ink-muted"
          >
            #{tag}
          </span>
        ))}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2.5 rounded-xl border border-hairline bg-canvas/70 px-4 py-3.5">
        {cur.fields.slice(0, 4).map((f) => (
          <div key={f.label}>
            <dt className="text-[11px] text-ink-subtle">{f.label}</dt>
            <dd className="mt-0.5 text-[13px] font-medium tabular-nums text-ink">{f.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 flex items-center justify-between border-t border-hairline pt-4">
        <div className="flex items-center gap-2 text-xs text-ink-subtle">
          <Avatar name={cur.author} />
          <span className="font-medium text-ink-muted">{cur.author}</span>
          <span>·</span>
          <span>{spec.updated} 수정</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onDetail}
            className="h-8 rounded-lg border border-hairline bg-chip px-3 text-xs font-medium text-ink-muted transition-colors hover:bg-chip-strong hover:text-ink"
          >
            상세 보기
          </button>
          <button
            type="button"
            onClick={onCompare}
            className="h-8 rounded-lg border border-hairline bg-chip px-3 text-xs font-medium text-ink-muted transition-colors hover:bg-chip-strong hover:text-ink"
          >
            버전 비교
          </button>
          {needsApproval && (
            <button
              type="button"
              className="h-8 rounded-lg bg-gradient-to-r from-primary to-accent2 px-3 text-xs font-semibold text-white shadow-[0_2px_10px_var(--color-glow)] transition-opacity hover:opacity-90"
            >
              승인 요청
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
