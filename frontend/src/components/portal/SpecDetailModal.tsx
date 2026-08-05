import { useState } from 'react'

import { Avatar } from './Avatar'
import { Modal } from './Modal'
import { StatusBadge } from './StatusBadge'
import { currentVersion } from '#/data/specs'
import type { Spec, SpecVersion } from '#/data/specs'

interface Props {
  spec: Spec
  onClose: () => void
  onCompareWith: (base: SpecVersion) => void
}

export function SpecDetailModal({ spec, onClose, onCompareWith }: Props) {
  const [tab, setTab] = useState<'fields' | 'history'>('fields')
  const cur = currentVersion(spec)

  return (
    <Modal title={spec.name} onClose={onClose}>
      <div className="flex items-center gap-2.5">
        <span className="font-mono text-xs font-semibold text-ink-subtle">{spec.id}</span>
        <StatusBadge status={cur.status} />
        <span className="font-mono text-sm font-semibold text-primary">{cur.version}</span>
        {cur.status === '승인 대기' && (
          <span className="rounded-full bg-review-bg px-2.5 py-0.5 text-xs font-medium text-review-ink">
            승인 필요
          </span>
        )}
      </div>

      <div className="mt-4 flex gap-1 border-b border-hairline">
        <TabButton active={tab === 'fields'} onClick={() => setTab('fields')}>
          사양 항목
        </TabButton>
        <TabButton active={tab === 'history'} onClick={() => setTab('history')}>
          수정 이력
          <span className="ml-1.5 rounded-full bg-canvas px-1.5 py-0.5 text-[11px] text-ink-muted">
            {spec.history.length}
          </span>
        </TabButton>
      </div>

      {tab === 'fields' ? (
        <dl className="mt-4 divide-y divide-hairline rounded-lg border border-hairline">
          {cur.fields.map((f) => (
            <div key={f.label} className="grid grid-cols-[160px_1fr] gap-4 px-4 py-2.5">
              <dt className="text-[13px] text-ink-subtle">{f.label}</dt>
              <dd className="text-[13px] font-medium tabular-nums">{f.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <ol className="mt-4 space-y-3">
          {spec.history.map((v, i) => (
            <li key={v.version} className="rounded-lg border border-hairline px-4 py-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold">{v.version}</span>
                  <StatusBadge status={v.status} />
                  {i === 0 && (
                    <span className="rounded-full bg-canvas px-2 py-0.5 text-[11px] font-medium text-ink-muted">
                      현재
                    </span>
                  )}
                </div>
                <span className="text-xs text-ink-subtle">{v.date}</span>
              </div>
              <p className="mt-1.5 text-[13px] text-ink-muted">{v.summary}</p>
              <div className="mt-2.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs text-ink-muted">
                  <Avatar name={v.author} size={20} />
                  {v.author}
                </span>
                {i > 0 && (
                  <button
                    type="button"
                    onClick={() => onCompareWith(v)}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    현재 버전과 비교
                  </button>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </Modal>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px flex items-center border-b-2 px-3 py-2 text-sm transition-colors ${
        active
          ? 'border-primary font-semibold text-ink'
          : 'border-transparent text-ink-subtle hover:text-ink'
      }`}
    >
      {children}
    </button>
  )
}
