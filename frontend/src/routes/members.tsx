import { useEffect, useMemo, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { AppShell } from '#/components/portal/AppShell'
import { Avatar } from '#/components/portal/Avatar'
import { Drawer } from '#/components/portal/Drawer'
import { Modal } from '#/components/portal/Modal'
import { Select } from '#/components/portal/Select'
import { useToast } from '#/components/portal/toast'
import { GRADE_CLS, SERVICE_ROLES, STATUS_CLS, members } from '#/data/members'
import type { Grade, Member } from '#/data/members'
import { ACTIONS, MENUS, PREVIEW_ACTIONS, PREVIEW_MENUS, roleDefs } from '#/data/roles'
import type { Action } from '#/data/roles'

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

  // 롤베이스 정합: 권한의 원천은 역할이다 — 사용자 쪽에서는 ①역할 배정을 바꾸고
  // ②명시적 예외(허용/차단)만 목록으로 얹는다. 기능 토글 나열은 하지 않는다.
  const [draftGrade, setDraftGrade] = useState<Grade>('Viewer')
  const [draftRoles, setDraftRoles] = useState<Array<string>>([])
  const [exceptions, setExceptions] = useState<Array<{ menu: string; action: Action; mode: '허용' | '차단' }>>([])
  const [exMenu, setExMenu] = useState<string>(MENUS[5])
  const [exAction, setExAction] = useState<Action>('수정')
  const [exMode, setExMode] = useState<'허용' | '차단'>('허용')

  useEffect(() => {
    if (detail) {
      setDraftGrade(detail.grade)
      setDraftRoles(detail.roles)
      setExceptions([])
    }
  }, [detail])

  const gradeRole = roleDefs.find((r) => r.name === draftGrade)
  const dirtyCount = detail
    ? (draftGrade !== detail.grade ? 1 : 0) +
      draftRoles.filter((r) => !detail.roles.includes(r)).length +
      detail.roles.filter((r) => !draftRoles.includes(r)).length +
      exceptions.length
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
          <div key={s.label} className="card-spotlight rounded-2xl border border-hairline bg-surface px-5 py-4">
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

      <div className="anim-fade-up mt-4 overflow-x-auto card-spotlight rounded-2xl border border-hairline bg-surface">
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
                    <div className="space-y-4">
                      {/* ① 역할 배정 — 권한은 역할이 정한다 */}
                      <div className="rounded-xl border border-hairline p-3.5">
                        <div className="text-xs font-semibold text-ink">역할 배정</div>
                        <label className="mt-2 block">
                          <span className="text-[11px] text-ink-subtle">등급 (단일)</span>
                          <Select
                            value={draftGrade}
                            onChange={(e) => setDraftGrade(e.target.value as Grade)}
                            className="mt-1 w-full"
                          >
                            {GRADES.map((g) => (
                              <option key={g}>{g}</option>
                            ))}
                          </Select>
                        </label>
                        <div className="mt-2.5">
                          <span className="text-[11px] text-ink-subtle">서비스 Role (겸직 가능)</span>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {SERVICE_ROLES.map((r) => {
                              const on = draftRoles.includes(r)
                              return (
                                <button
                                  key={r}
                                  type="button"
                                  aria-pressed={on}
                                  onClick={() =>
                                    setDraftRoles((rs) => (on ? rs.filter((x) => x !== r) : [...rs, r]))
                                  }
                                  className={`rounded-full border px-2.5 py-1 font-mono text-[10px] font-medium transition-all active:scale-95 ${
                                    on
                                      ? 'border-primary/50 bg-primary/15 text-primary'
                                      : 'border-hairline text-ink-subtle hover:border-primary/30 hover:text-ink'
                                  }`}
                                >
                                  {on ? '✓ ' : ''}
                                  {r}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      </div>

                      {/* ② 역할이 주는 권한 — 읽기 전용. 고치려면 권한 관리로 간다 */}
                      <div className="rounded-xl border border-hairline bg-canvas/40 p-3.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-ink">역할이 주는 권한 (읽기 전용)</span>
                          <button
                            type="button"
                            onClick={() => {
                              close()
                              navigate({ to: '/roles' })
                            }}
                            className="text-[11px] font-medium text-primary transition-opacity hover:opacity-80"
                          >
                            권한 관리에서 역할 정의 →
                          </button>
                        </div>
                        <table className="mt-2 w-full border-collapse text-xs">
                          <thead>
                            <tr className="text-ink-subtle">
                              <th className="pb-1 text-left font-medium">메뉴</th>
                              {PREVIEW_ACTIONS.map((a) => (
                                <th key={a} className="w-11 pb-1 text-center font-medium">
                                  {a}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {PREVIEW_MENUS.map((m) => (
                              <tr key={m} className="border-t border-hairline/50">
                                <td className="py-1.5 text-ink-muted">{m}</td>
                                {PREVIEW_ACTIONS.map((a) => (
                                  <td key={a} className="py-1.5 text-center">
                                    <span
                                      className={`inline-block h-2.5 w-2.5 rounded-full ${
                                        (gradeRole?.matrix[m] ?? []).includes(a) ? 'bg-fill-deployed' : 'bg-chip-strong'
                                      }`}
                                    />
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* ③ 사용자 예외 — 명시적 목록만. 없으면 역할이 전부다 */}
                      <div className="rounded-xl border border-hairline p-3.5">
                        <div className="text-xs font-semibold text-ink">
                          사용자 예외 <span className="font-normal text-ink-subtle">(허용/차단 오버라이드)</span>
                        </div>
                        {exceptions.length === 0 ? (
                          <p className="mt-2 text-xs text-ink-subtle">
                            예외 없음 — 권한은 배정된 역할이 전부 정합니다.
                          </p>
                        ) : (
                          <ul className="mt-2 space-y-1.5">
                            {exceptions.map((ex, i) => (
                              <li
                                key={`${ex.menu}.${ex.action}.${i}`}
                                className="flex items-center gap-2 rounded-lg bg-canvas/50 px-2.5 py-1.5 text-xs"
                              >
                                <span
                                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                                    ex.mode === '허용'
                                      ? 'bg-deployed-bg text-deployed-ink'
                                      : 'bg-danger-bg text-danger-ink'
                                  }`}
                                >
                                  {ex.mode}
                                </span>
                                <span className="text-ink">
                                  {ex.menu} · {ex.action}
                                </span>
                                <button
                                  type="button"
                                  aria-label="예외 제거"
                                  onClick={() => setExceptions((xs) => xs.filter((_, j) => j !== i))}
                                  className="ml-auto rounded px-1.5 text-ink-subtle transition-colors hover:bg-danger-bg hover:text-danger-ink"
                                >
                                  ✕
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                          <Select value={exMenu} onChange={(e) => setExMenu(e.target.value)} className="min-w-0 flex-1">
                            {MENUS.map((m) => (
                              <option key={m}>{m}</option>
                            ))}
                          </Select>
                          <Select value={exAction} onChange={(e) => setExAction(e.target.value as Action)} className="w-24">
                            {ACTIONS.map((a) => (
                              <option key={a}>{a}</option>
                            ))}
                          </Select>
                          <Select value={exMode} onChange={(e) => setExMode(e.target.value as '허용' | '차단')} className="w-20">
                            <option>허용</option>
                            <option>차단</option>
                          </Select>
                          <button
                            type="button"
                            onClick={() => setExceptions((xs) => [...xs, { menu: exMenu, action: exAction, mode: exMode }])}
                            className="h-10 rounded-lg border border-dashed border-hairline px-3 text-xs font-medium text-ink-muted transition-colors hover:border-primary/40 hover:text-ink"
                          >
                            + 추가
                          </button>
                        </div>
                        <p className="mt-2 text-[11px] leading-relaxed text-ink-subtle">
                          예외는 감사 대상입니다 — 역할로 풀 수 있으면 역할을 고치세요. 변경은{' '}
                          <b className="text-ink-muted">상신 후 결재</b>를 거쳐 적용됩니다.
                        </p>
                      </div>
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
                      toast(`${detail.name} 역할·예외 변경 ${dirtyCount}건을 상신했습니다 — 승인 관리에서 결재 후 적용됩니다`)
                      navigate({ to: '/approvals' })
                    }}
                    className="h-9 rounded-lg bg-gradient-to-r from-primary to-accent2 px-4 text-[13px] font-semibold text-white shadow-[0_2px_10px_var(--color-glow)] transition-opacity hover:opacity-90 disabled:opacity-40"
                  >
                    변경 상신{dirtyCount > 0 && <span className="ml-1 tabular-nums">{dirtyCount}</span>}
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
