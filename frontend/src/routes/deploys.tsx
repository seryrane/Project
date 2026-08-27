import { useState } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'

import { AppShell } from '#/components/portal/AppShell'
import { CtaButton, simulate } from '#/components/portal/Skeleton'
import { Avatar } from '#/components/portal/Avatar'
import { Icon } from '#/components/portal/Icon'
import { ChipMulti, ChipSelect } from '#/components/portal/Chips'
import { Modal } from '#/components/portal/Modal'
import { useToast } from '#/components/portal/toast'
import { useI18n } from '#/lib/i18n'
import { PIPELINE } from '#/data/deploys'
import { useDeployList } from '#/data/deployStore'
import { requestDeploy } from '#/data/workflow'
import { conflictedSpecIds, useApprovalList } from '#/data/approvalStore'
import { useSpecList } from '#/data/specStore'
import type { Deploy, DeployStatus } from '#/data/deploys'
import { currentVersion, specs } from '#/data/specs'

export const Route = createFileRoute('/deploys')({ component: DeploysPage })

/** 데모 로그인 계정 — 본개발에서는 `GET /api/me` 가 준다 (규약 §4-2) */
const ME = '박준혁'

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
      {/* ⚠ 상태는 **모양으로 먼저** 가른다(규약 §16) — 색은 보조다. 뜻마다 이름이 있는
          관문 아이콘을 쓰면 그 규칙이 이름에 남는다: 완료=check · 롤백=undo · 나머지=clock */}
      <Icon name={status === '완료' ? 'check' : status === '롤백' ? 'undo' : 'clock'} />
    </span>
  )
}

/* 배포 파이프라인 — 개발→검증→승인→운영. 승인을 지나야 운영에 닿는다 */
function Pipeline() {
  const { t } = useI18n()
  const colors = ['bg-fill-draft/20 text-fill-draft', 'bg-review-bg text-review-ink', 'bg-pending-bg text-pending-ink', 'bg-deployed-bg text-deployed-ink']
  return (
    <div className="card-spotlight overflow-hidden rounded-2xl border border-hairline bg-surface">
      {/* 머리 — 섹션 제목을 면+선으로 갈라 얹는다(규약 §7). 제목만이라 py-3.5 */}
      <div className="surface-head px-5 py-3.5">
        <div className="text-sm font-semibold text-ink">{t('deploys.pipelineTitle', '배포 파이프라인')}</div>
      </div>
      {/* 몸 — 가로 스크롤은 몸 안에서만 두어, 머리 면은 overflow-hidden 으로 모서리를 지킨다 */}
      <div className="overflow-x-auto p-5">
      <ol className="flex min-w-max items-center">
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
              <span className="text-xs font-semibold text-ink">{t(`pipeline.${p.key}`, p.label)}</span>
              <span className="text-[10px] text-ink-subtle">{p.sub}</span>
            </span>
          </li>
        ))}
      </ol>
      </div>
    </div>
  )
}

function DeploysPage() {
  const { t, tf } = useI18n()
  const toast = useToast()
  const navigate = useNavigate()
  /* 정본은 배포 스토어 — 요청하면 목록에 실제로 서고, 승인되면 상태가 바뀐다.
     ⚠ 예전엔 고정 mock 배열이라 [배포 승인 요청]이 토스트만 쏘고 끝났다(2026-08-18). */
  const deploys = useDeployList()
  const specList = useSpecList()
  const [detail, setDetail] = useState<Deploy | null>(null)
  const [creating, setCreating] = useState(false)
  const [newEnv, setNewEnv] = useState('Production')
  const [newSpecs, setNewSpecs] = useState<Array<string>>(['SP-001', 'SP-002'])
  // ⚠ 버전 칸이 `defaultValue` 라 화면에 적은 값이 요청에 안 실렸다 — 상태로 든다
  const [newVersion, setNewVersion] = useState('v3.1.2')

  /* ⚠⚠ **반영은 겹침을 막는 유일한 자리다** (고객 2026-07-20: "마지막에 반영할 때 동일하게
     2개 이상이면 반영을 못하게 검증하는 것도 있어야겠다 — 사용자가 체크 못 해서 두 개가
     다 반영돼 버리면 무슨 문제가 생길지 모르니까"). 신청은 막지 않는다 — 같은 회의에서
     못 박은 자리다. 결재함을 구독해야 승인 관리에서 겹침을 정리하면 이 화면이 함께 풀린다. */
  const blocked = conflictedSpecIds(useApprovalList())
  const blockedPicked = newSpecs.filter((id) => blocked.has(id))
  const nameOf = (id: string) => specList.find((sp) => sp.id === id)?.name ?? id

  return (
    <AppShell active="deploys" title="배포 관리">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('nav.deploys', '배포 관리')}</h1>
          <p className="mt-1 text-[13px] text-ink-subtle">
            {t('page.deploys.subtitle', '사양서 통합 배포 · 승인 기반 릴리즈 관리 (Mock 데이터)')}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {/* 흐름 허브로 가는 다리 — 무엇이 배포를 기다리는지는 보드가 한눈에 말한다 */}
          <Link
            to="/board"
            className="flex h-9 items-center rounded-lg border border-hairline bg-surface px-3.5 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
          >
            {t('flow.toBoard', '상태 보드 →')}
          </Link>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="h-9 rounded-lg bg-gradient-to-r from-primary to-accent2 px-4 text-[13px] font-semibold text-white shadow-[0_2px_10px_var(--color-glow)] transition-opacity hover:opacity-90"
          >
            {t('deploys.newRequest', '→ 새 배포 요청')}
          </button>
        </div>
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
              className="card-hover flex w-full flex-col card-spotlight overflow-hidden rounded-2xl border border-hairline bg-surface text-left"
            >
              {/* 머리 — 버전·환경·상태를 면+선으로 갈라 얹는다(규약 §7). 칩·배지가 있어 py-3 */}
              <span className="flex flex-wrap items-center gap-2 surface-head px-5 py-3">
                <span className="font-mono text-base font-semibold text-ink">{d.version}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    d.env === 'Production' ? 'bg-pending-bg text-pending-ink' : 'bg-review-bg text-review-ink'
                  }`}
                >
                  {d.env}
                </span>
                {/* ⚠ 식별자는 **왼쪽**, 사람·시각은 **오른쪽** — 승인 관리·검증 리포트가 그렇게
                    선다. 여기만 ID 를 오른쪽에 두어 같은 부류의 카드 셋이 서로 다른 순서로
                    읽혔다(2026-08-18 사용자 지적: "검증 리포트만 결이 다르다"를 따라가다 찾음). */}
                <span className="font-mono text-xs text-ink-subtle">{d.id}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_CLS[d.status]}`}>
                  {t(`deployStatus.${d.status}`, d.status)}
                </span>
                {d.rollbackTo && (
                  <span className="text-xs text-danger-ink">
                    {tf('deploys.rollbackTo', { version: d.rollbackTo }, '← {version}으로 롤백')}
                  </span>
                )}
                <span className="ml-auto flex items-center gap-1.5 text-xs text-ink-subtle">
                  <Avatar name={d.owner} size={16} />
                  {d.owner}
                  <span className="tabular-nums">
                    · {d.at}
                    {d.scheduled ? ` ${t('deploys.scheduledSuffix', '(예정)')}` : ''}
                  </span>
                </span>
              </span>
              {/* 몸 */}
              <span className="flex items-start gap-4 p-5">
              <StatusIcon status={d.status} />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap gap-1.5">
                  {d.changes.map((c) => (
                    <span key={c} className="rounded-full bg-chip px-2 py-0.5 text-xs text-ink-muted">
                      {c}
                    </span>
                  ))}
                </span>
                {d.specs.length > 0 && (
                  <span className="mt-1.5 flex flex-wrap gap-1.5">
                    {d.specs.map((s) => (
                      <span
                        key={s.id}
                        className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                      >
                        {s.name} {s.version}
                      </span>
                    ))}
                  </span>
                )}
                {/* 담당자·시각은 머리로 올라갔다 — 몸에는 **머리가 말하지 않는 것**만 남긴다 */}
                {d.durationMin != null && (
                  <span className="mt-2.5 flex items-center gap-1.5 text-xs tabular-nums text-ink-subtle">
                    <Icon name="calendar" />
                    {tf('deploys.minutes', { n: d.durationMin }, '{n}분')}
                  </span>
                )}
              </span>
              </span>
            </button>
          </li>
        ))}
      </ol>

      {/* 배포 상세 */}
      {detail && (
        <Modal title={t('deploys.detailModalTitle', '배포 상세')} onClose={() => setDetail(null)}>
          <div className="rounded-xl border border-hairline bg-canvas/50 px-4 py-3.5">
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-lg font-semibold text-ink">{detail.version}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  detail.env === 'Production' ? 'bg-pending-bg text-pending-ink' : 'bg-review-bg text-review-ink'
                }`}
              >
                {detail.env}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_CLS[detail.status]}`}>
                {detail.status}
              </span>
            </span>
          </div>
          {/* 승인 없이는 배포가 시작되지 않는다 — 대기 건은 결재로 가는 길을 함께 둔다 */}
          {detail.status === '대기' && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-review-ink/30 bg-review-bg px-4 py-3 text-[13px] text-review-ink">
              <span>
                {t(
                  'deploys.pendingHint',
                  '승인 대기 중입니다 — 승인 완료 후 예정 시각에 배포가 시작됩니다.',
                )}
              </span>
              <button
                type="button"
                onClick={() => {
                  setDetail(null)
                  navigate({ to: '/approvals' })
                }}
                className="rounded-lg bg-review-ink/15 px-3 py-1.5 font-semibold transition-opacity hover:opacity-80"
              >
                {t('deploys.goApprovals', '승인 관리에서 처리 →')}
              </button>
            </div>
          )}
          <dl className="mt-4 grid grid-cols-2 gap-3 text-[13px]">
            {[
              { k: t('deploys.dl.id', '배포 ID'), v: <span className="font-mono">{detail.id}</span> },
              { k: t('deploys.dl.owner', '배포 담당자'), v: detail.owner },
              // 0(빈 값)을 평온함으로 읽지 않는다 — 승인자가 없으면 "미정"이라고 적는다
              {
                k: t('deploys.dl.approver', '승인자'),
                v: detail.approver ?? <span className="text-review-ink">{t('deploys.unset', '미정')}</span>,
              },
              {
                k: t('deploys.dl.startTime', '시작 시간'),
                v: (
                  <span className="tabular-nums">
                    {detail.at}
                    {detail.scheduled ? ` ${t('deploys.scheduledSuffix', '(예정)')}` : ''}
                  </span>
                ),
              },
              {
                k: t('deploys.dl.duration', '소요 시간'),
                v: detail.durationMin != null ? tf('deploys.minutes', { n: detail.durationMin }, '{n}분') : '—',
              },
            ].map((row) => (
              <div key={row.k} className="rounded-xl border border-hairline px-3.5 py-2.5">
                <dt className="text-xs text-ink-subtle">{row.k}</dt>
                <dd className="mt-0.5 font-medium text-ink">{row.v}</dd>
              </div>
            ))}
          </dl>
          {detail.specs.length > 0 && (
            <div className="mt-4">
              <div className="text-xs font-medium text-ink-subtle">
                {t('deploys.includedSpecs', '포함된 사양서')}
              </div>
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
            <div className="text-xs font-medium text-ink-subtle">{t('deploys.changesLabel', '변경 사항')}</div>
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
        <Modal
          title={t('deploys.requestModalTitle', '배포 요청')}
          onClose={() => setCreating(false)}
          /* 발은 관문 슬롯으로 (규약 §7). 포함 사양서를 여러 건 고르면 칩이 줄줄이 늘어나
             몸이 넘친다 — 몸 안에 두면 다 고르고 나서 [승인 요청]을 찾으러 내려가야 한다 */
          footer={
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="h-9 rounded-lg border border-control bg-chip px-4 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
              >
                {t('common.cancel', '취소')}
              </button>
              {/* 누른 그 버튼이 변한다 + 두 번 안 눌린다 (규약 §3) */}
              <CtaButton
                disabled={blockedPicked.length > 0}
                busyLabel={t('deploys.submitting', '요청 보내는 중…')}
                onAction={async () => {
                  await simulate()
                  setCreating(false)
                  /* 배포 목록에 '대기'로 서고 **같은 순간 결재함에도 건이 생긴다**(workflow).
                     승인 전에는 배포가 시작되지 않는다 — 상태가 그것을 말한다. */
                  const picked = specList.filter((sp) => newSpecs.includes(sp.id))
                  const rec = requestDeploy({
                    version: newVersion.trim() || 'v0.0.1',
                    env: newEnv as Deploy['env'],
                    owner: ME,
                    specs: picked.map((sp) => ({
                      id: sp.id,
                      name: sp.name,
                      version: currentVersion(sp).version,
                    })),
                    changes: picked.map((sp) => `${sp.name} ${currentVersion(sp).version} 반영`),
                  })
                  /* 관문(workflow)이 겹침을 마지막으로 한 번 더 본다 — 화면이 잠갔더라도
                     여기서 null 이면 요청은 서지 않았다. "보냈습니다"라고 말하지 않는다. */
                  if (!rec) {
                    toast(
                      t(
                        'deploys.toast.blockedByConflict',
                        '겹친 변경 요청이 있는 사양서가 포함되어 요청하지 못했습니다 — 승인 관리에서 하나를 고르세요',
                      ),
                    )
                    return
                  }
                  toast(
                    tf(
                      'deploys.toast.requestedWithId',
                      { id: rec.id },
                      '배포 승인 요청을 보냈습니다 ({id}) — 승인 관리에서 진행을 확인하세요',
                    ),
                  )
                }}
              >
                {t('deploys.submitRequest', '배포 승인 요청')}
              </CtaButton>
            </div>
          }
        >
          <div className="rounded-xl border border-review-ink/30 bg-review-bg px-4 py-3 text-[13px] leading-relaxed text-review-ink">
            {t(
              'deploys.requestHint',
              '배포는 승인자의 최종 승인 후 진행됩니다. 미승인 상태에서는 배포가 시작되지 않습니다.',
            )}
          </div>
          {/* 못 하면 **이유와 푸는 법**을 함께 적는다 (규약 §17) — 회색 버튼만 있으면 고장으로 읽힌다 */}
          {blockedPicked.length > 0 && (
            <div className="mt-3 rounded-xl border border-danger-ink/30 bg-danger-bg px-4 py-3 text-[13px] leading-relaxed text-danger-ink">
              <div className="font-semibold">
                {tf(
                  'deploys.conflictBlockTitle',
                  { names: blockedPicked.map(nameOf).join(' · ') },
                  '{names} — 변경 요청이 겹쳐 있어 반영할 수 없습니다',
                )}
              </div>
              <p className="mt-1 opacity-90">
                {t(
                  'deploys.conflictBlockDesc',
                  '같은 사양서에 심사 중인 요청이 둘 이상입니다. 둘 다 반영되면 어느 쪽이 최종인지 알 수 없습니다 — 승인 관리에서 하나를 고르고 나머지를 취소한 뒤 다시 요청하세요.',
                )}
              </p>
              <button
                type="button"
                onClick={() => navigate({ to: '/approvals' })}
                className="mt-2 rounded-lg border border-danger-ink/70 bg-danger-ink/15 px-3 py-1.5 font-semibold transition-opacity hover:opacity-80"
              >
                {t('deploys.goResolveConflict', '겹침 정리하러 가기 →')}
              </button>
            </div>
          )}
          <label className="mt-4 block">
            <span className="text-xs font-medium text-ink-subtle">{t('deploys.label.version', '배포 버전')}</span>
            <input
              value={newVersion}
              onChange={(e) => setNewVersion(e.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-control bg-canvas/60 px-3 font-mono text-[13px] outline-none focus:border-primary/60"
            />
          </label>
          <div className="mt-3">
            <span className="text-xs font-medium text-ink-subtle">{t('deploys.label.env', '배포 환경')}</span>
            <div className="mt-1.5">
              <ChipSelect options={['Production', 'Staging']} value={newEnv} onChange={setNewEnv} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xs font-medium text-ink-subtle">
              {t('deploys.label.includedSpecs', '포함 사양서')}{' '}
              <span className="font-normal">
                {tf('deploys.selectedCount', { n: newSpecs.length }, '({n}건 선택)')}
              </span>
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
        </Modal>
      )}
    </AppShell>
  )
}
