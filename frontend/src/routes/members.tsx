import { useMemo, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { AppShell } from '#/components/portal/AppShell'
import { Avatar } from '#/components/portal/Avatar'
import { Drawer } from '#/components/portal/Drawer'
import { Modal } from '#/components/portal/Modal'
import { Select } from '#/components/portal/Select'
import { useToast } from '#/components/portal/toast'
import { FEATURES, GRADE_CLS, STATUS_CLS, members } from '#/data/members'
import type { Grade, Member } from '#/data/members'

export const Route = createFileRoute('/members')({ component: MembersPage })

const GRADES: Array<Grade> = ['Super Admin', 'Admin', 'Editor', 'Viewer']

const ACTIVITY_DOT: Record<Member['activity'][number]['kind'], string> = {
  auth: 'bg-fill-draft',
  spec: 'bg-fill-pending',
  approve: 'bg-fill-deployed',
  admin: 'bg-fill-review',
}

function MembersPage() {
  const toast = useToast()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('전체 상태')
  const [grade, setGrade] = useState('전체 등급')
  const [detail, setDetail] = useState<Member | null>(null)
  const [tab, setTab] = useState<'info' | 'activity' | 'perm'>('info')
  const [creating, setCreating] = useState(false)
  // 잠금/해제는 화면 상태로만 (프로토타입)
  const [lockOverride, setLockOverride] = useState<Record<string, boolean>>({})
  // 권한 예외 편집 — 저장이 아니라 "상신"으로 끝난다 (권한 변경은 결재를 탄다)
  const [overrides, setOverrides] = useState<Record<string, boolean>>({})

  const effStatus = (m: Member) => (m.id in lockOverride ? (lockOverride[m.id] ? '잠금' : '활성') : m.status)

  const rows = useMemo(
    () =>
      members.filter((m) => {
        const st = effStatus(m)
        const q = query.trim()
        return (
          (q === '' || `${m.name} ${m.email} ${m.dept}`.includes(q)) &&
          (status === '전체 상태' || st === status) &&
          (grade === '전체 등급' || m.grade === grade)
        )
      }),
    [query, status, grade, lockOverride],
  )

  const counts = {
    all: members.length,
    active: members.filter((m) => effStatus(m) === '활성').length,
    inactive: members.filter((m) => effStatus(m) === '비활성').length,
    locked: members.filter((m) => effStatus(m) === '잠금').length,
  }

  const stats = [
    { label: '전체 회원', value: counts.all },
    { label: '활성', value: counts.active, cls: 'text-deployed-ink' },
    { label: '비활성', value: counts.inactive, cls: 'text-ink-subtle' },
    { label: '잠금', value: counts.locked, cls: 'text-review-ink' },
  ]

  const grantedByGrade = (m: Member, key: string) =>
    (FEATURES.find((f) => f.key === key)?.grades as ReadonlyArray<string> | undefined)?.includes(m.grade) ?? false

  const overrideKey = (m: Member, key: string) => `${m.id}.${key}`
  const effective = (m: Member, key: string) => overrides[overrideKey(m, key)] ?? grantedByGrade(m, key)
  const dirtyCount = detail
    ? FEATURES.filter((f) => {
        const k = overrideKey(detail, f.key)
        return k in overrides && overrides[k] !== grantedByGrade(detail, f.key)
      }).length
    : 0

  const toggleLock = (m: Member) => {
    const locking = effStatus(m) !== '잠금'
    setLockOverride((o) => ({ ...o, [m.id]: locking }))
    // 되돌릴 수 있으면 묻지 않는다 — 되돌릴 길을 문구로 준다 (규약 §2)
    toast(locking ? `${m.name} 계정을 잠갔습니다 — 같은 버튼으로 해제할 수 있습니다` : `${m.name} 계정 잠금을 해제했습니다`)
  }

  return (
    <AppShell active="members" title="회원 관리">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">회원 관리</h1>
          <p className="mt-1 text-[13px] text-ink-subtle">
            HMG-SSO 연동 계정 · 등급 4종 + 서비스별 Role (Mock 데이터)
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="h-9 rounded-lg bg-gradient-to-r from-primary to-accent2 px-4 text-[13px] font-semibold text-white shadow-[0_2px_10px_var(--color-glow)] transition-opacity hover:opacity-90"
        >
          + 회원 등록
        </button>
      </div>

      <div className="anim-fade-up mt-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-hairline bg-surface px-5 py-4">
            <div className={`text-2xl font-semibold tabular-nums ${s.cls ?? 'text-ink'}`}>{s.value}</div>
            <div className="mt-0.5 text-xs text-ink-subtle">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-3 pc:flex-row pc:items-center">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="이름, 이메일, 부서 검색..."
          className="h-10 rounded-lg border border-hairline bg-surface px-3 text-[13px] outline-none placeholder:text-ink-subtle focus:border-primary/60 pc:flex-1"
        />
        <div className="flex gap-3">
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="min-w-0 flex-1 pc:flex-none">
            <option>전체 상태</option>
            <option>활성</option>
            <option>비활성</option>
            <option>잠금</option>
          </Select>
          <Select value={grade} onChange={(e) => setGrade(e.target.value)} className="min-w-0 flex-1 pc:flex-none">
            <option>전체 등급</option>
            {GRADES.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </Select>
        </div>
      </div>

      <div className="anim-fade-up mt-4 overflow-x-auto rounded-2xl border border-hairline bg-surface">
        <table className="w-full min-w-[860px] border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-hairline bg-canvas/60 text-left text-xs text-ink-subtle">
              <th className="px-4 py-2.5 font-medium">회원</th>
              <th className="px-4 py-2.5 font-medium">부서</th>
              <th className="px-4 py-2.5 font-medium">등급 · Role</th>
              <th className="px-4 py-2.5 font-medium">상태</th>
              <th className="px-4 py-2.5 font-medium">FIDO</th>
              <th className="px-4 py-2.5 font-medium">최종 로그인</th>
              <th className="px-4 py-2.5 text-right font-medium">잠금</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => {
              const st = effStatus(m)
              return (
                <tr
                  key={m.id}
                  onClick={() => {
                    setDetail(m)
                    setTab('info')
                  }}
                  className="cursor-pointer border-b border-hairline/60 transition-colors last:border-0 hover:bg-chip"
                >
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2.5">
                      <Avatar name={m.name} size={30} />
                      <span className="min-w-0">
                        <span className="block font-medium text-ink">{m.name}</span>
                        <span className="block truncate text-xs text-ink-subtle">{m.email}</span>
                      </span>
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink-muted">{m.dept}</td>
                  <td className="px-4 py-3">
                    <span className="flex flex-wrap items-center gap-1">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${GRADE_CLS[m.grade]}`}>
                        {m.grade}
                      </span>
                      {m.roles.map((r) => (
                        <span key={r} className="rounded-full border border-hairline px-1.5 py-0.5 font-mono text-[10px] text-ink-muted">
                          {r}
                        </span>
                      ))}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_CLS[st]}`}>{st}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-mono text-[11px] font-semibold ${m.fido ? 'text-deployed-ink' : 'text-ink-subtle'}`}>
                      {m.fido ? 'ON' : 'OFF'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs tabular-nums text-ink-subtle">
                    {m.lastLogin}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      aria-label={st === '잠금' ? '잠금 해제' : '계정 잠금'}
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleLock(m)
                      }}
                      className={`rounded-lg px-2.5 py-1 text-xs transition-colors ${
                        st === '잠금'
                          ? 'bg-review-bg text-review-ink hover:opacity-80'
                          : 'text-ink-subtle hover:bg-chip hover:text-ink'
                      }`}
                    >
                      {st === '잠금' ? '🔒 해제' : '🔓'}
                    </button>
                  </td>
                </tr>
              )
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-ink-subtle">
                  조건에 맞는 회원이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 회원 상세 — 목록을 훑으며 보는 상세라 드로어 (규약 §1) */}
      {detail && (
        <Drawer title={`회원 상세 — ${detail.name}`} onClose={() => setDetail(null)}>
          {(close) => {
            const st = effStatus(detail)
            return (
              <div className="flex h-full flex-col">
                <div className="flex items-center gap-3">
                  <Avatar name={detail.name} size={44} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <b className="text-[15px] text-ink">{detail.name}</b>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_CLS[st]}`}>{st}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${GRADE_CLS[detail.grade]}`}>
                        {detail.grade}
                      </span>
                    </div>
                    <div className="mt-0.5 truncate text-xs text-ink-subtle">
                      {detail.email} · {detail.dept}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex gap-1 rounded-lg border border-hairline bg-canvas/50 p-1 text-xs w-fit">
                  {(
                    [
                      { key: 'info', label: '기본 정보' },
                      { key: 'activity', label: '활동 이력' },
                      { key: 'perm', label: '권한' },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setTab(t.key)}
                      className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                        tab === t.key ? 'bg-primary/15 text-primary' : 'text-ink-muted hover:text-ink'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <div className="mt-4 flex-1">
                  {tab === 'info' && (
                    <dl className="grid grid-cols-2 gap-3 text-[13px]">
                      {[
                        { k: '이름', v: detail.name },
                        { k: '이메일', v: detail.email },
                        { k: '부서', v: detail.dept },
                        { k: '연락처', v: detail.phone },
                        { k: '가입일', v: detail.joined },
                        { k: '최종 로그인', v: detail.lastLogin },
                        { k: 'FIDO 2차 인증', v: detail.fido ? '사용 중' : '미사용' },
                        { k: '서비스 Role', v: detail.roles.length > 0 ? detail.roles.join(', ') : '— (없음)' },
                      ].map((row) => (
                        <div key={row.k} className="rounded-xl border border-hairline px-3.5 py-2.5">
                          <dt className="text-xs text-ink-subtle">{row.k}</dt>
                          <dd className="mt-0.5 break-all font-medium tabular-nums text-ink">{row.v}</dd>
                        </div>
                      ))}
                    </dl>
                  )}

                  {tab === 'activity' && (
                    <ol className="space-y-2">
                      {detail.activity.map((a) => (
                        <li
                          key={a.text}
                          className="flex items-center justify-between gap-3 rounded-xl bg-canvas/40 px-3.5 py-2.5 text-[13px]"
                        >
                          <span className="flex min-w-0 items-center gap-2.5">
                            <span className={`h-2 w-2 shrink-0 rounded-full ${ACTIVITY_DOT[a.kind]}`} />
                            <span className="truncate text-ink">{a.text}</span>
                          </span>
                          <span className="shrink-0 font-mono text-xs tabular-nums text-ink-subtle">{a.at}</span>
                        </li>
                      ))}
                      <p className="pt-1 text-[11px] text-ink-subtle">
                        감사로그는 5년 보관됩니다 — 전체 이력은 본개발에서 별도 조회 화면으로.
                      </p>
                    </ol>
                  )}

                  {tab === 'perm' && (
                    <div className="space-y-1.5">
                      {FEATURES.map((f) => {
                        const base = grantedByGrade(detail, f.key)
                        const eff = effective(detail, f.key)
                        const isOverride = eff !== base
                        return (
                          <div
                            key={f.key}
                            className="flex items-center justify-between gap-3 rounded-xl border border-hairline px-3.5 py-2.5 text-[13px]"
                          >
                            <span className="flex min-w-0 flex-wrap items-center gap-2">
                              <span className="text-ink">{f.label}</span>
                              {isOverride ? (
                                <span className="rounded-full bg-review-bg px-1.5 py-0.5 text-[10px] font-semibold text-review-ink">
                                  예외
                                </span>
                              ) : (
                                <span className="rounded-full bg-chip px-1.5 py-0.5 text-[10px] text-ink-subtle">
                                  등급 기본
                                </span>
                              )}
                            </span>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={eff}
                              aria-label={f.label}
                              onClick={() => setOverrides((o) => ({ ...o, [overrideKey(detail, f.key)]: !eff }))}
                              className={`h-6 w-11 shrink-0 rounded-full p-0.5 transition-colors ${eff ? 'bg-primary' : 'bg-chip-strong'}`}
                            >
                              <span className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${eff ? 'translate-x-5' : ''}`} />
                            </button>
                          </div>
                        )
                      })}
                      <p className="pt-1 text-[11px] leading-relaxed text-ink-subtle">
                        권한 변경은 즉시 반영되지 않습니다 — <b className="text-ink-muted">상신하면 결재</b>(승인
                        관리)를 거쳐 적용됩니다. 등급 기본과 다른 항목만 예외로 저장됩니다.
                      </p>
                    </div>
                  )}
                </div>

                {/* 발 — 주 동작 오른쪽 끝 (규약 §7) */}
                <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-hairline pt-4">
                  <button
                    type="button"
                    onClick={() => toast(`${detail.name} 비밀번호 초기화 메일을 보냈습니다`)}
                    className="mr-auto h-9 rounded-lg border border-hairline bg-chip px-3.5 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
                  >
                    비밀번호 초기화
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleLock(detail)}
                    className="h-9 rounded-lg border border-hairline bg-chip px-3.5 text-[13px] font-medium text-ink-muted transition-colors hover:bg-review-bg hover:text-review-ink"
                  >
                    {st === '잠금' ? '잠금 해제' : '계정 잠금'}
                  </button>
                  <button
                    type="button"
                    disabled={tab !== 'perm' || dirtyCount === 0}
                    onClick={() => {
                      close()
                      toast(`${detail.name} 권한 변경 ${dirtyCount}건을 상신했습니다 — 승인 관리에서 결재 후 적용됩니다`)
                      navigate({ to: '/approvals' })
                    }}
                    className="h-9 rounded-lg bg-gradient-to-r from-primary to-accent2 px-4 text-[13px] font-semibold text-white shadow-[0_2px_10px_var(--color-glow)] transition-opacity hover:opacity-90 disabled:opacity-40"
                  >
                    권한 변경 상신{dirtyCount > 0 && <span className="ml-1 tabular-nums">{dirtyCount}</span>}
                  </button>
                </div>
              </div>
            )
          }}
        </Drawer>
      )}

      {/* 회원 등록 — HMG-SSO 가 원장이라 초대 개념이다 */}
      {creating && (
        <Modal title="회원 등록" onClose={() => setCreating(false)}>
          <p className="rounded-xl border border-hairline bg-canvas/50 px-4 py-3 text-xs leading-relaxed text-ink-muted">
            계정 원장은 HMG-SSO 입니다 — 여기서는 포털 접근 등급과 Role 을 부여합니다.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 pc:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium text-ink-subtle">이름 <b className="text-danger-ink">*</b></span>
              <input placeholder="홍길동" className="mt-1 h-10 w-full rounded-lg border border-hairline bg-canvas/60 px-3 text-[13px] outline-none focus:border-primary/60" />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-ink-subtle">이메일 (SSO) <b className="text-danger-ink">*</b></span>
              <input placeholder="email@hmg.com" className="mt-1 h-10 w-full rounded-lg border border-hairline bg-canvas/60 px-3 text-[13px] outline-none focus:border-primary/60" />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-ink-subtle">부서</span>
              <input placeholder="IT 전략팀" className="mt-1 h-10 w-full rounded-lg border border-hairline bg-canvas/60 px-3 text-[13px] outline-none focus:border-primary/60" />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-ink-subtle">등급</span>
              <Select defaultValue="Viewer" className="mt-1 w-full">
                {GRADES.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </Select>
            </label>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="h-9 rounded-lg border border-hairline bg-chip px-4 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
            >
              취소
            </button>
            <button
              type="button"
              onClick={() => {
                setCreating(false)
                toast('회원을 등록했습니다 — 첫 로그인은 SSO 인증 후 활성화됩니다')
              }}
              className="h-9 rounded-lg bg-gradient-to-r from-primary to-accent2 px-4 text-[13px] font-semibold text-white shadow-[0_2px_10px_var(--color-glow)] transition-opacity hover:opacity-90"
            >
              등록
            </button>
          </div>
        </Modal>
      )}
    </AppShell>
  )
}
