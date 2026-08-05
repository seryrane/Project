import { Modal } from './Modal'
import { currentVersion } from '#/data/specs'
import type { Spec, SpecVersion } from '#/data/specs'

interface Props {
  spec: Spec
  base: SpecVersion
  onClose: () => void
}

export function VersionCompareModal({ spec, base, onClose }: Props) {
  const cur = currentVersion(spec)
  const labels = Array.from(
    new Set([...base.fields.map((f) => f.label), ...cur.fields.map((f) => f.label)]),
  )
  const baseMap = new Map(base.fields.map((f) => [f.label, f.value]))
  const curMap = new Map(cur.fields.map((f) => [f.label, f.value]))

  return (
    <Modal title="버전 비교" onClose={onClose} wide>
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg bg-raised py-2.5 text-center text-sm font-medium text-ink-muted">
          이전 버전 <span className="ml-1 font-mono font-semibold">{base.version}</span>
        </div>
        <div className="rounded-lg border-2 border-primary/60 bg-primary/10 py-2 text-center text-sm font-medium">
          현재 버전 <span className="ml-1 font-mono font-semibold text-primary">{cur.version}</span>
        </div>

        {labels.map((label) => {
          const before = baseMap.get(label)
          const after = curMap.get(label)
          const changed = before !== after
          return (
            <div key={label} className="contents">
              <DiffCell label={label} value={before} tone={changed ? 'removed' : 'same'} />
              <DiffCell label={label} value={after} tone={changed ? 'added' : 'same'} />
            </div>
          )
        })}
      </div>
      <div className="mt-5 flex items-center gap-5 rounded-lg bg-raised px-4 py-2.5 text-xs text-ink-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-danger-bg ring-1 ring-danger-ink/30" />
          삭제/변경 전
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-added-bg ring-1 ring-added-ink/30" />
          추가/변경 후
        </span>
      </div>
    </Modal>
  )
}

function DiffCell({
  label,
  value,
  tone,
}: {
  label: string
  value: string | undefined
  tone: 'same' | 'removed' | 'added'
}) {
  const toneClass =
    tone === 'removed'
      ? 'border-danger-ink/20 bg-danger-bg'
      : tone === 'added'
        ? 'border-added-ink/20 bg-added-bg'
        : 'border-hairline bg-raised/60'
  const valueClass =
    tone === 'removed'
      ? 'text-danger-ink line-through'
      : tone === 'added'
        ? 'text-added-ink'
        : 'text-ink'
  return (
    <div className={`rounded-lg border px-4 py-2.5 ${toneClass}`}>
      <div className="text-[11px] text-ink-subtle">{label}</div>
      <div className={`mt-0.5 text-[13px] font-medium tabular-nums ${valueClass}`}>
        {value ?? '—'}
      </div>
    </div>
  )
}
