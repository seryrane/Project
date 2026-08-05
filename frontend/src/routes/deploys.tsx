import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { AppShell } from '#/components/portal/AppShell'
import { CtaButton, simulate } from '#/components/portal/Skeleton'
import { Avatar } from '#/components/portal/Avatar'
import { ChipMulti, ChipSelect } from '#/components/portal/Chips'
import { Modal } from '#/components/portal/Modal'
import { useToast } from '#/components/portal/toast'
import { PIPELINE, deploys } from '#/data/deploys'
import type { Deploy, DeployStatus } from '#/data/deploys'
import { specs } from '#/data/specs'

export const Route = createFileRoute('/deploys')({ component: DeploysPage })

const STATUS_CLS: Record<DeployStatus, string> = {
  대기: 'bg-review-bg text-review-ink',
  진행중: 'bg-draft-bg text-draft-ink',
  완료: 'bg-deployed-bg text-deployed-ink',
  롤백: 'bg-danger-bg text-danger-ink',
}

/* 상태 아이콘 — 뜻마다 하나 (규약 §12): 대기=시계 · 완료=체크 · 롤백=되돌림 */
function StatusIcon({ status }: { status: DeployStatus }) {
  const cls =
    status === '완료'
      ? 'bg-deployed-bg text-deployed-ink'
      : status === '롤백'
        ? 'bg-danger-bg text-danger-ink'
        : 'bg-review-bg text-review-ink'
  return (
    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${cls}`}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {status === '완료' ? (
          <path d="M5 12.5l4.5 4.5L19 7" />
        ) : status === '롤백' ? (
          <>
            <path d="M3.5 9a8.5 8.5 0 1 1-1 5.5" />
            <path d="M3 4v5h5" />
          </>
        ) : (
          <>
            <circle cx="12" cy="12" r="8.5" />
            <path d="M12 7.5V12l3 2" />
          </>
        )}
      </svg>
    </span>
  )
}

/* 배포 파이프라인 — 개발→검증→승인→운영. 승인을 지나야 운영에 닿는다 */
function Pipeline() {
  const colors = ['bg-fill-draft/20 text-fill-draft', 'bg-review-bg text-review-ink', 'bg-pending-bg text-pending-ink', 'bg-deployed-bg text-deployed-ink']
  return (
    <div className="overflow-x-auto card-spotlight rounded-2xl border border-hairline bg-surface p-5">
      <div className="text-sm font-semibold text-ink">배포 파이프라인</div>
      <ol className="mt-4 flex min-w-max items-center">
        {PIPELINE.map((p, i) => (
          <li key={p.key} className="flex items-center">
            {i > 0 && <span className="mx-3 h-px w-16 bg-hairline pc:w-32" aria-hidden />}
            <span className="flex flex-col items-center gap-1.5 text-center">
              <span className={`flex h-10 w-10 items-center justify-center rounded-full ${colors[i]}`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  {i === 0 ? (
                    <path d="M8 7l-4.5 5L8 17M16 7l4.5 5L16 17" />
                  ) : i === 1 ? (
                    <>
                      <circle cx="12" cy="12" r="8.5" />
                      <path d="M8.5 12.2l2.4 2.4 4.6-5.2" />
                    </>
                  ) : i === 2 ? (
                    <>
                      <rect x="4" y="5" width="16" height="14" rx="2" />
                      <path d="M8.5 12.2l2.4 2.4 4.6-5.2" />
                    </>
                  ) : (
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  )}
                </svg>
              </span>
              <span className="text-xs font-semibold text-ink">{p.label}</span>
              <span className="text-[10px] text-ink-subtle">{p.sub}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}

function DeploysPage() {
  const toast = useToast()
  const navigate = useNavigate()
  const [detail, setDetail] = useState<Deploy | null>(null)
  const [creating, setCreating] = useState(false)
  const [newEnv, setNewEnv] = useState('Production')
  const [newSpecs, setNewSpecs] = useState<Array<string>>(['SP-001', 'SP-002'])

  return (
    <AppShell active="deploys" title="배포 관리">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">배포 관리</h1>
          <p className="mt-1 text-[13px] text-ink-subtle">사양서 통합 배포 · 승인 기반 릴리즈 관리 (Mock 데이터)</p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="h-9 rounded-lg bg-gradient-to-r from-primary to-accent2 px-4 text-[13px] font-semibold text-white shadow-[0_2px_10px_var(--color-glow)] transition-opacity hover:opacity-90"
        >
          → 새 배포 요청
        </button>
      </div>

      <div className="anim-fade-up mt-5">
        <Pipeline />
      </div>

      {/* 릴리스 타임라인 */}
      <ol className="mt-5 space-y-3">
        {deploys.map((d, i) => (
          <li key={d.id} style={{ animationDelay: `${i * 60}ms` }} className="anim-fade-up">
            <button
              type="button"
              onClick={() => setDetail(d)}
              className="card-hover flex w-full items-start gap-4 card-spotlight rounded-2xl border border-hairline bg-surface p-5 text-left"
            >
              <StatusIcon status={d.status} />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[15px] font-semibold text-ink">{d.version}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      d.env === 'Production' ? 'bg-pending-bg text-pending-ink' : 'bg-review-bg text-review-ink'
                    }`}
                  >
                    {d.env}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_CLS[d.status]}`}>
                    {d.status}
                  </span>
                  {d.rollbackTo && (
                    <span className="text-xs text-danger-ink">← {d.rollbackTo}으로 롤백</span>
                  )}
                  <span className="ml-auto font-mono text-xs text-ink-subtle">{d.id}</span>
                </span>
                <span className="mt-2 flex flex-wrap gap-1.5">
                  {d.changes.map((c) => (
                    <span key={c} className="rounded-full bg-chip px-2 py-0.5 text-[11px] text-ink-muted">
                      {c}
                    </span>
                  ))}
                </span>
                {d.specs.length > 0 && (
                  <span className="mt-1.5 flex flex-wrap gap-1.5">
                    {d.specs.map((s) => (
                      <span
                        key={s.id}
                        className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
                      >
                        {s.name} {s.version}
                      </span>
                    ))}
                  </span>
                )}
                <span className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-subtle">
                  <span className="flex items-center gap-1.5">
                    <Avatar name={d.owner} size={16} />
                    {d.owner}
                  </span>
                  <span className="tabular-nums">
                    {d.at}
                    {d.scheduled ? ' (예정)' : ''}
                  </span>
                  {d.durationMin != null && <span className="tabular-nums">⏱ {d.durationMin}분</span>}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ol>

      {/* 배포 상세 */}
      {detail && (
        <Modal title="배포 상세" onClose={() => setDetail(null)}>
          <div className="rounded-xl border border-hairline bg-canvas/50 px-4 py-3.5">
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-lg font-semibold text-ink">{detail.version}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  detail.env === 'Production' ? 'bg-pending-bg text-pending-ink' : 'bg-review-bg text-review-ink'
                }`}
              >
                {detail.env}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_CLS[detail.status]}`}>
                {detail.status}
              </span>
            </span>
          </div>
          {/* 승인 없이는 배포가 시작되지 않는다 — 대기 건은 결재로 가는 길을 함께 둔다 */}
          {detail.status === '대기' && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-review-ink/30 bg-review-bg px-4 py-3 text-[13px] text-review-ink">
              <span>승인 대기 중입니다 — 승인 완료 후 예정 시각에 배포가 시작됩니다.</span>
              <button
                type="button"
                onClick={() => {
                  setDetail(null)
                  navigate({ to: '/approvals' })
                }}
                className="rounded-lg bg-review-ink/15 px-3 py-1.5 font-semibold transition-opacity hover:opacity-80"
              >
                승인 관리에서 처리 →
              </button>
            </div>
          )}
          <dl className="mt-4 grid grid-cols-2 gap-3 text-[13px]">
            {[
              { k: '배포 ID', v: <span className="font-mono">{detail.id}</span> },
              { k: '배포 담당자', v: detail.owner },
              // 0(빈 값)을 평온함으로 읽지 않는다 — 승인자가 없으면 "미정"이라고 적는다
              { k: '승인자', v: detail.approver ?? <span className="text-review-ink">미정</span> },
              { k: '시작 시간', v: <span className="tabular-nums">{detail.at}{detail.scheduled ? ' (예정)' : ''}</span> },
              { k: '소요 시간', v: detail.durationMin != null ? `${detail.durationMin}분` : '—' },
            ].map((row) => (
              <div key={row.k} className="rounded-xl border border-hairline px-3.5 py-2.5">
                <dt className="text-xs text-ink-subtle">{row.k}</dt>
                <dd className="mt-0.5 font-medium text-ink">{row.v}</dd>
              </div>
            ))}
          </dl>
          {detail.specs.length > 0 && (
            <div className="mt-4">
              <div className="text-xs font-medium text-ink-subtle">포함된 사양서</div>
              <div className="mt-1.5 space-y-1.5">
                {detail.specs.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => navigate({ to: '/specs/$specId', params: { specId: s.id } })}
                    className="flex w-full items-center justify-between rounded-xl border border-hairline px-3.5 py-2.5 text-left text-[13px] transition-colors hover:border-primary/40 hover:bg-chip"
                  >
                    <span className="font-medium text-ink">{s.name}</span>
                    <span className="font-mono text-xs text-primary">{s.version}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="mt-4">
            <div className="text-xs font-medium text-ink-subtle">변경 사항</div>
            <ul className="mt-1.5 space-y-1">
              {detail.changes.map((c) => (
                <li key={c} className="flex items-center gap-2 text-[13px] text-ink-muted">
                  <span className="text-deployed-ink">✓</span>
                  {c}
                </li>
              ))}
            </ul>
          </div>
        </Modal>
      )}

      {/* 새 배포 요청 — 승인 없이는 시작되지 않는다 */}
      {creating && (
        <Modal title="배포 요청" onClose={() => setCreating(false)}>
          <div className="rounded-xl border border-review-ink/30 bg-review-bg px-4 py-3 text-[13px] leading-relaxed text-review-ink">
            배포는 승인자의 최종 승인 후 진행됩니다. 미승인 상태에서는 배포가 시작되지 않습니다.
          </div>
          <label className="mt-4 block">
            <span className="text-xs font-medium text-ink-subtle">배포 버전</span>
            <input
              defaultValue="v3.1.2"
              className="mt-1 h-10 w-full rounded-lg border border-hairline bg-canvas/60 px-3 font-mono text-[13px] outline-none focus:border-primary/60"
            />
          </label>
          <div className="mt-3">
            <span className="text-xs font-medium text-ink-subtle">배포 환경</span>
            <div className="mt-1.5">
              <ChipSelect options={['Production', 'Staging']} value={newEnv} onChange={setNewEnv} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xs font-medium text-ink-subtle">
              포함 사양서 <span className="font-normal">({newSpecs.length}건 선택)</span>
            </span>
            <div className="mt-1.5">
              <ChipMulti
                options={specs.map((s) => `${s.name} ${s.history[0].version}`)}
                values={specs.filter((s) => newSpecs.includes(s.id)).map((s) => `${s.name} ${s.history[0].version}`)}
                onChange={(labels) =>
                  setNewSpecs(specs.filter((s) => labels.includes(`${s.name} ${s.history[0].version}`)).map((s) => s.id))
                }
              />
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="h-9 rounded-lg border border-hairline bg-chip px-4 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
            >
              취소
            </button>
            {/* 누른 그 버튼이 변한다 + 두 번 안 눌린다 (규약 §3) */}
            <CtaButton
              busyLabel="요청 보내는 중…"
              onAction={async () => {
                await simulate()
                setCreating(false)
                toast('배포 승인 요청을 보냈습니다 — 승인 관리에서 진행 상황을 확인하세요')
              }}
            >
              배포 승인 요청
            </CtaButton>
          </div>
        </Modal>
      )}
    </AppShell>
  )
}
