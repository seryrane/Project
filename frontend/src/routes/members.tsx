import { useEffect, useMemo, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { AppShell } from '#/components/portal/AppShell'
import { Avatar } from '#/components/portal/Avatar'
import { ChipMulti, ChipSelect } from '#/components/portal/Chips'
import { Drawer } from '#/components/portal/Drawer'
import { Modal } from '#/components/portal/Modal'
import { Select } from '#/components/portal/Select'
import { useToast } from '#/components/portal/toast'
import { GRADE_CLS, SERVICE_ROLES, STATUS_CLS, members } from '#/data/members'
import type { Grade, Member } from '#/data/members'
import { ACTIONS, MENUS, PREVIEW_ACTIONS, PREVIEW_MENUS, SCOPE_LABEL, roleDefs, scopeOf } from '#/data/roles'
import type { Action } from '#/data/roles'
import { apiSend, useApi } from '#/lib/api'
import { useI18n } from '#/lib/i18n'
import { orNone, pickOne, pickText } from '#/lib/urlState'

const GRADES: Array<Grade> = ['Super Admin', 'Admin', 'Editor', 'Viewer']
const MEMBER_STATES = ['활성', '비활성', '잠금'] as const
const ALL_STATUS = '전체 상태'
const ALL_GRADE = '전체 등급'

/** 보고 있는 상태는 주소에 둔다 (lib/urlState.ts) — 새로고침·뒤로가기·링크 공유에서 살아남는다 */
interface MembersSearch {
  q?: string
  status?: string
  grade?: string
}

export const Route = createFileRoute('/members')({
  component: MembersPage,
  validateSearch: (search: Record<string, unknown>): MembersSearch => ({
    q: pickText(search.q),
    status: pickOne(search.status, MEMBER_STATES),
    grade: pickOne(search.grade, GRADES),
  }),
})

const ACTIVITY_DOT: Record<NonNullable<Member['activity']>[number]['kind'], string> = {
  auth: 'bg-fill-draft',
  spec: 'bg-fill-pending',
  approve: 'bg-fill-deployed',
  admin: 'bg-fill-review',
}

/* 증감 칩 — charts.tsx StatTile 의 DeltaChip 과 같은 모양. 관문(components/**) 은 고칠 수
   없고 비공개 함수라 가져올 수도 없어, 라우트 안에 같은 모양을 그대로 옮겨 쓴다 (규약 §10) */
function DeltaChip({ delta, good }: { delta: string; good: boolean }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${
        good ? 'bg-deployed-bg text-deployed-ink' : 'bg-danger-bg text-danger-ink'
      }`}
    >
      <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden>
        {delta.startsWith('-') ? (
          <path d="M1 2.5h6L4 6.5z" fill="currentColor" />
        ) : (
          <path d="M1 5.5h6L4 1.5z" fill="currentColor" />
        )}
      </svg>
      {delta}
    </span>
  )
}

function MembersPage() {
  const { t, tf } = useI18n()
  const toast = useToast()
  const navigate = useNavigate()
  const { q: query = '', status = ALL_STATUS, grade = ALL_GRADE } = Route.useSearch()
  /** 칩은 뒤로가기로 되돌 수 있게 쌓고, 글자 입력은 replace 로 덮는다 (lib/urlState.ts) */
  // ⚠ `prev` 는 모든 화면의 검색 타입을 합친 것으로 들어온다 — 이 화면 몫으로 좁힌다
  const setSearch = (patch: Partial<MembersSearch>, replace = false) =>
    void navigate({
      to: '/members',
      search: (prev) => ({ ...(prev as MembersSearch), ...patch }),
      replace,
    })
  const [detail, setDetail] = useState<Member | null>(null)
  const [tab, setTab] = useState<'info' | 'activity' | 'perm'>('info')
  const [creating, setCreating] = useState(false)
  const [newGrade, setNewGrade] = useState<Grade>('Viewer')
  // 잠금/해제 — 서버가 있으면 즉시 반영(감사 로그도 서버가 남긴다), 없으면 화면 상태
  const [lockOverride, setLockOverride] = useState<Record<string, boolean>>({})

  // 정본은 서버 — 서버가 없으면 mock 으로 돌아간다 (관문 lib/api.ts)
  const { data: serverMembers } = useApi<Array<Member>>('/members', members)
  // ⚠ 서버 시드에는 아직 화면 전용 필드(활동 이력·가입일·연락처)가 없다 — 같은 id 의
  //   mock 으로 보강한다. 안 하면 [활동 이력] 탭이 undefined.map 으로 터진다(실사고).
  //   본개발에서 활동 이력이 서버 감사 로그로 이관되면 이 병합은 걷어낸다.
  const memberList = useMemo(
    () =>
      serverMembers.map((m) => {
        const local = members.find((x) => x.id === m.id)
        return local ? { ...local, ...m } : m
      }),
    [serverMembers],
  )

  const effStatus = (m: Member) => (m.id in lockOverride ? (lockOverride[m.id] ? '잠금' : '활성') : m.status)

  const rows = useMemo(
    () =>
      memberList.filter((m) => {
        const st = effStatus(m)
        const q = query.trim()
        return (
          (q === '' || `${m.name} ${m.email} ${m.dept}`.includes(q)) &&
          (status === ALL_STATUS || st === status) &&
          (grade === ALL_GRADE || m.grade === grade)
        )
      }),
    [memberList, query, status, grade, lockOverride],
  )

  const counts = {
    all: memberList.length,
    active: memberList.filter((m) => effStatus(m) === '활성').length,
    inactive: memberList.filter((m) => effStatus(m) === '비활성').length,
    locked: memberList.filter((m) => effStatus(m) === '잠금').length,
  }

  // 지난주 이 시각 스냅샷 — 실 이력이 없는 프로토타입이라 라우트 안 결정적 상수로 둔다
  // (난수 금지, 규약 §10).
  const PREV_WEEK = { active: 7, locked: 0 }
  const fmtDelta = (n: number) => `${n >= 0 ? '+' : ''}${n}`
  const activeDelta = counts.active - PREV_WEEK.active
  const lockedDelta = counts.locked - PREV_WEEK.locked
  const deltaCaption = t('members.delta.caption', '지난주 대비')

  const stats = [
    // 전체 회원은 계정 대장 헤드카운트라 전과 견줘도 뜻이 서지 않는다 — 면(①)만 적용
    { label: t('members.stat.all', '전체 회원'), value: counts.all },
    {
      label: t('members.stat.active', '활성'),
      value: counts.active,
      cls: 'text-deployed-ink',
      delta: fmtDelta(activeDelta),
      deltaGood: activeDelta >= 0,
      caption: deltaCaption,
    },
    // 비활성은 자연 이탈·휴면 전환이 섞여 있어 늘고 주는 방향에 좋고 나쁨을 못 가른다 — 증감 없음
    { label: t('members.stat.inactive', '비활성'), value: counts.inactive, cls: 'text-ink-subtle' },
    {
      label: t('members.stat.locked', '잠금'),
      value: counts.locked,
      cls: 'text-review-ink',
      // 잠금 계정이 늘면 나쁘다 — 보안 위협 대응 중이라는 뜻
      delta: fmtDelta(lockedDelta),
      deltaGood: lockedDelta <= 0,
      caption: deltaCaption,
    },
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
    // 서버에도 반영 — 잠금 처리 사실은 서버가 감사 로그로 남긴다
    void apiSend('POST', `/members/${m.id}/lock-toggle`)
    // 되돌릴 수 있으면 묻지 않는다 — 되돌릴 길을 문구로 준다 (규약 §2)
    toast(locking ? tf('members.toast.locked', { name: m.name }) : tf('members.toast.unlocked', { name: m.name }))
  }

  // 필터 칩 표시 어휘 — 값(한국어 원문)과 표시(언어별)를 가른다
  const allStatusLabel = t('members.filter.allStatus')
  const allGradeLabel = t('members.filter.allGrades')
  const modeLabel = (mode: '허용' | '차단') => t(mode === '허용' ? 'members.allow' : 'members.block')

  return (
    <AppShell active="members" title={t('nav.members', '회원 관리')}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('nav.members', '회원 관리')}</h1>
          <p className="mt-1 text-[13px] text-ink-subtle">
            {t('page.members.subtitle', 'HMG-SSO 연동 계정 · 등급 4종 + 서비스별 Role (Mock 데이터)')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="h-9 rounded-lg bg-gradient-to-r from-primary to-accent2 px-4 text-[13px] font-semibold text-white shadow-[0_2px_10px_var(--color-glow)] transition-opacity hover:opacity-90"
        >
          + {t('members.add')}
        </button>
      </div>

      <div className="anim-fade-up mt-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card-spotlight overflow-hidden rounded-2xl border border-hairline bg-surface">
            <div className="flex items-center justify-between gap-2 surface-head px-4 py-2">
              <span className="truncate text-[11px] text-ink-subtle">{s.label}</span>
              {s.delta && <DeltaChip delta={s.delta} good={s.deltaGood} />}
            </div>
            <div className="px-4 py-3.5">
              <div className={`text-2xl font-semibold tabular-nums ${s.cls ?? 'text-ink'}`}>{s.value}</div>
              {s.caption && <div className="mt-1 text-[11px] text-ink-subtle">{s.caption}</div>}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-3">
        <input
          value={query}
          onChange={(e) => setSearch({ q: pickText(e.target.value) }, true)}
          placeholder={t('members.searchPlaceholder')}
          className="h-10 rounded-lg border border-hairline bg-surface px-3 text-[13px] outline-none placeholder:text-ink-subtle focus:border-primary/60 pc:w-96"
        />
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {/* 상태·등급 값은 데이터 어휘라 그대로 — "전체" 칩(UI 어휘)만 언어를 입힌다.
              내부 값은 한국어 원문으로 고정해 필터 비교·언어 전환에 안전하다 (규약 §4-4) */}
          <ChipSelect
            options={[allStatusLabel, ...MEMBER_STATES]}
            value={status === ALL_STATUS ? allStatusLabel : status}
            onChange={(v) => setSearch({ status: orNone(v === allStatusLabel ? ALL_STATUS : v, ALL_STATUS) })}
          />
          <span className="hidden h-4 w-px bg-hairline pc:block" aria-hidden />
          <ChipSelect
            options={[allGradeLabel, ...GRADES]}
            value={grade === ALL_GRADE ? allGradeLabel : grade}
            onChange={(v) => setSearch({ grade: orNone(v === allGradeLabel ? ALL_GRADE : v, ALL_GRADE) })}
          />
        </div>
      </div>

      {/* 좁은 화면: 표 대신 카드 — 회원은 행마다 독립 개체라 열 비교가 필요 없다.
          가로 스크롤 표는 시트성(필드·매트릭스)에만 남긴다 (2026-08-05 모바일 리뷰) */}
      <ol className="mt-4 space-y-2.5 pc:hidden">
        {rows.map((m) => {
          const st = effStatus(m)
          return (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => {
                  setDetail(m)
                  setTab('info')
                }}
                className="card-hover w-full rounded-2xl border border-hairline bg-surface p-4 text-left"
              >
                <span className="flex items-start gap-2.5">
                  <Avatar name={m.name} size={34} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <b className="font-medium text-ink">{m.name}</b>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_CLS[st]}`}>
                        {st}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-ink-subtle">
                      {m.email} · {m.dept}
                    </span>
                  </span>
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label={st === '잠금' ? t('members.unlock') : t('members.lock')}
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleLock(m)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.stopPropagation()
                        toggleLock(m)
                      }
                    }}
                    className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs ${
                      st === '잠금' ? 'bg-review-bg text-review-ink' : 'text-ink-subtle'
                    }`}
                  >
                    {st === '잠금' ? `🔒 ${t('members.unlockShort')}` : '🔓'}
                  </span>
                </span>
                <span className="mt-2.5 flex flex-wrap items-center gap-1">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${GRADE_CLS[m.grade]}`}>
                    {m.grade}
                  </span>
                  {m.roles.map((r) => (
                    <span key={r} className="rounded-full border border-hairline px-1.5 py-0.5 font-mono text-[10px] text-ink-muted">
                      {r}
                    </span>
                  ))}
                  <span className="ml-auto font-mono text-[11px] tabular-nums text-ink-subtle">
                    FIDO {m.fido ? 'ON' : 'OFF'} · {m.lastLogin}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
        {rows.length === 0 && (
          <li className="rounded-2xl border border-hairline bg-surface px-4 py-10 text-center text-sm text-ink-subtle">
            {t('members.empty', '조건에 맞는 회원이 없습니다.')}
          </li>
        )}
      </ol>

      <div className="anim-fade-up mt-4 hidden overflow-x-auto card-spotlight rounded-2xl border border-hairline bg-surface pc:block">
        <table className="w-full min-w-[860px] border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-hairline bg-canvas/60 text-left text-xs text-ink-subtle">
              <th className="px-4 py-2.5 font-medium">{t('members.th.member', '회원')}</th>
              <th className="px-4 py-2.5 font-medium">{t('members.th.dept', '부서')}</th>
              <th className="px-4 py-2.5 font-medium">{t('members.th.gradeRole', '등급 · Role')}</th>
              <th className="px-4 py-2.5 font-medium">{t('members.th.status', '상태')}</th>
              <th className="px-4 py-2.5 font-medium">{t('members.th.fido', 'FIDO')}</th>
              <th className="px-4 py-2.5 font-medium">{t('members.th.lastLogin', '최종 로그인')}</th>
              <th className="px-4 py-2.5 text-right font-medium">{t('members.th.lock', '잠금')}</th>
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
                      aria-label={st === '잠금' ? t('members.unlock') : t('members.lock')}
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
                      {st === '잠금' ? `🔒 ${t('members.unlockShort')}` : '🔓'}
                    </button>
                  </td>
                </tr>
              )
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-ink-subtle">
                  {t('members.empty', '조건에 맞는 회원이 없습니다.')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 회원 상세 — 목록을 훑으며 보는 상세라 드로어 (규약 §1) */}
      {detail && (
        <Drawer title={tf('members.detailTitle', { name: detail.name })} onClose={() => setDetail(null)}>
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
                  ).map((tb) => (
                    <button
                      key={tb.key}
                      type="button"
                      onClick={() => setTab(tb.key)}
                      className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                        tab === tb.key ? 'bg-primary/15 text-primary' : 'text-ink-muted hover:text-ink'
                      }`}
                    >
                      {t(`members.tab.${tb.key}`, tb.label)}
                    </button>
                  ))}
                </div>

                <div className="mt-4 flex-1">
                  {tab === 'info' && (
                    <dl className="grid grid-cols-2 gap-3 text-[13px]">
                      {[
                        { k: t('members.label.name', '이름'), v: detail.name },
                        { k: t('members.label.email', '이메일'), v: detail.email },
                        { k: t('members.th.dept', '부서'), v: detail.dept },
                        { k: t('members.label.phone', '연락처'), v: detail.phone },
                        { k: t('members.label.joined', '가입일'), v: detail.joined },
                        { k: t('members.th.lastLogin', '최종 로그인'), v: detail.lastLogin },
                        {
                          k: t('members.label.fido2fa', 'FIDO 2차 인증'),
                          v: detail.fido ? t('members.fido.on', '사용 중') : t('members.fido.off', '미사용'),
                        },
                        {
                          k: t('members.label.serviceRole', '서비스 Role'),
                          v: detail.roles.length > 0 ? detail.roles.join(', ') : t('members.none', '— (없음)'),
                        },
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
                      {/* 빈 자리에 이유를 적는다 (규약 17절) — 신규·서버 계정은 이력이 없다 */}
                      {(detail.activity ?? []).length === 0 && (
                        <p className="rounded-xl bg-canvas/40 px-3.5 py-3 text-xs text-ink-subtle">
                          {t(
                            'members.activity.empty',
                            '아직 기록된 활동이 없습니다 — 로그인·상신 등 활동이 생기면 여기에 쌓입니다.',
                          )}
                        </p>
                      )}
                      {(detail.activity ?? []).map((a) => (
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
                        {t(
                          'members.activity.retention',
                          '감사로그는 5년 보관됩니다 — 전체 이력은 본개발에서 별도 조회 화면으로.',
                        )}
                      </p>
                    </ol>
                  )}

                  {tab === 'perm' && (
                    <div className="space-y-4">
                      {/* ① 역할 배정 — 권한은 역할이 정한다 */}
                      <div className="rounded-xl border border-hairline p-3.5">
                        <div className="text-xs font-semibold text-ink">{t('members.perm.roleAssign', '역할 배정')}</div>
                        <div className="mt-2">
                          <span className="text-[11px] text-ink-subtle">{t('members.perm.gradeSingle', '등급 (단일)')}</span>
                          <div className="mt-1.5">
                            <ChipSelect options={GRADES} value={draftGrade} onChange={setDraftGrade} />
                          </div>
                        </div>
                        <div className="mt-2.5">
                          <span className="text-[11px] text-ink-subtle">
                            {t('members.perm.serviceRoleMulti', '서비스 Role (겸직 가능)')}
                          </span>
                          <div className="mt-1.5">
                            <ChipMulti options={SERVICE_ROLES} values={draftRoles} onChange={setDraftRoles} mono />
                          </div>
                        </div>
                      </div>

                      {/* ② 역할이 주는 권한 — 읽기 전용. 고치려면 권한 관리로 간다 */}
                      <div className="rounded-xl border border-hairline bg-canvas/40 p-3.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-ink">
                            {t('members.perm.rolePermsReadonly', '역할이 주는 권한 (읽기 전용)')}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              close()
                              navigate({ to: '/roles' })
                            }}
                            className="text-[11px] font-medium text-primary transition-opacity hover:opacity-80"
                          >
                            {t('members.defineRoles')}
                          </button>
                        </div>
                        <table className="mt-2 w-full border-collapse text-xs">
                          <thead>
                            <tr className="text-ink-subtle">
                              <th className="pb-1 text-left font-medium">{t('members.th.menu', '메뉴')}</th>
                              {PREVIEW_ACTIONS.map((a) => (
                                <th key={a} className="w-11 pb-1 text-center font-medium">
                                  {t(`perm.${a}`, a)}
                                </th>
                              ))}
                              <th className="w-16 pb-1 text-center font-medium">{t('members.th.scope', '범위')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {PREVIEW_MENUS.map((m) => {
                              const canRead = (gradeRole?.matrix[m] ?? []).includes('조회')
                              return (
                                <tr key={m} className="border-t border-hairline/50">
                                  <td className="py-1.5 text-ink-muted">{t(`perm.${m}`, m)}</td>
                                  {PREVIEW_ACTIONS.map((a) => (
                                    <td key={a} className="py-1.5 text-center">
                                      <span
                                        className={`inline-block h-2.5 w-2.5 rounded-full ${
                                          (gradeRole?.matrix[m] ?? []).includes(a) ? 'bg-fill-deployed' : 'bg-chip-strong'
                                        }`}
                                      />
                                    </td>
                                  ))}
                                  {/* 조회 범위도 역할의 파생물 — 정본은 권한 관리 */}
                                  <td className="py-1.5 text-center text-[10px] text-ink-subtle">
                                    {canRead && gradeRole ? SCOPE_LABEL[scopeOf(gradeRole, m)] : '—'}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* ③ 사용자 예외 — 명시적 목록만. 없으면 역할이 전부다 */}
                      <div className="rounded-xl border border-hairline p-3.5">
                        <div className="text-xs font-semibold text-ink">
                          {t('members.perm.exceptions', '사용자 예외')}{' '}
                          <span className="font-normal text-ink-subtle">
                            {t('members.perm.exceptionsHint', '(허용/차단 오버라이드)')}
                          </span>
                        </div>
                        {exceptions.length === 0 ? (
                          <p className="mt-2 text-xs text-ink-subtle">
                            {t('members.perm.noExceptions', '예외 없음 — 권한은 배정된 역할이 전부 정합니다.')}
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
                                  {modeLabel(ex.mode)}
                                </span>
                                <span className="text-ink">
                                  {ex.menu} · {ex.action}
                                </span>
                                <button
                                  type="button"
                                  aria-label={t('members.removeException')}
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
                            {/* 값은 한국어 그대로(권한 정본의 키), 보이는 글자만 번역 */}
                            {MENUS.map((m) => (
                              <option key={m} value={m}>
                                {t(`perm.${m}`, m)}
                              </option>
                            ))}
                          </Select>
                          <Select value={exAction} onChange={(e) => setExAction(e.target.value as Action)} className="w-24">
                            {ACTIONS.map((a) => (
                              <option key={a} value={a}>
                                {t(`perm.${a}`, a)}
                              </option>
                            ))}
                          </Select>
                          <ChipSelect
                            options={[modeLabel('허용'), modeLabel('차단')]}
                            value={modeLabel(exMode)}
                            onChange={(v) => setExMode(v === modeLabel('허용') ? '허용' : '차단')}
                          />
                          <button
                            type="button"
                            onClick={() => setExceptions((xs) => [...xs, { menu: exMenu, action: exAction, mode: exMode }])}
                            className="h-10 rounded-lg border border-dashed border-hairline px-3 text-xs font-medium text-ink-muted transition-colors hover:border-primary/40 hover:text-ink"
                          >
                            + {t('common.add')}
                          </button>
                        </div>
                        <p className="mt-2 text-[11px] leading-relaxed text-ink-subtle">
                          {t(
                            'members.perm.exceptionNote1',
                            '예외는 감사 대상입니다 — 역할로 풀 수 있으면 역할을 고치세요. 변경은',
                          )}{' '}
                          <b className="text-ink-muted">{t('members.perm.submitApproval', '상신 후 결재')}</b>
                          {t('members.perm.exceptionNote2', '를 거쳐 적용됩니다.')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* 발 — 주 동작 오른쪽 끝 (규약 §7) */}
                <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-hairline pt-4">
                  <button
                    type="button"
                    onClick={() => toast(tf('members.toast.resetPw', { name: detail.name }))}
                    className="mr-auto h-9 rounded-lg border border-hairline bg-chip px-3.5 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
                  >
                    {t('members.resetPw')}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleLock(detail)}
                    className="h-9 rounded-lg border border-hairline bg-chip px-3.5 text-[13px] font-medium text-ink-muted transition-colors hover:bg-review-bg hover:text-review-ink"
                  >
                    {st === '잠금' ? t('members.unlock') : t('members.lock')}
                  </button>
                  <button
                    type="button"
                    disabled={tab !== 'perm' || dirtyCount === 0}
                    onClick={() => {
                      close()
                      toast(tf('members.toast.submitChanges', { name: detail.name, n: dirtyCount }))
                      navigate({ to: '/approvals' })
                    }}
                    className="h-9 rounded-lg bg-gradient-to-r from-primary to-accent2 px-4 text-[13px] font-semibold text-white shadow-[0_2px_10px_var(--color-glow)] transition-opacity hover:opacity-90 disabled:opacity-40"
                  >
                    {t('members.submit')}
                    {dirtyCount > 0 && <span className="ml-1 tabular-nums">{dirtyCount}</span>}
                  </button>
                </div>
              </div>
            )
          }}
        </Drawer>
      )}

      {/* 회원 등록 — HMG-SSO 가 원장이라 초대 개념이다 */}
      {creating && (
        <Modal title={t('members.add')} onClose={() => setCreating(false)}>
          <p className="rounded-xl border border-hairline bg-canvas/50 px-4 py-3 text-xs leading-relaxed text-ink-muted">
            {t(
              'members.create.hint',
              '계정 원장은 HMG-SSO 입니다 — 여기서는 포털 접근 등급과 Role 을 부여합니다.',
            )}
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 pc:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium text-ink-subtle">
                {t('members.label.name', '이름')} <b className="text-danger-ink">*</b>
              </span>
              <input placeholder={t('members.ph.name')} className="mt-1 h-10 w-full rounded-lg border border-hairline bg-canvas/60 px-3 text-[13px] outline-none focus:border-primary/60" />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-ink-subtle">
                {t('members.label.emailSso', '이메일 (SSO)')} <b className="text-danger-ink">*</b>
              </span>
              <input placeholder="email@hmg.com" className="mt-1 h-10 w-full rounded-lg border border-hairline bg-canvas/60 px-3 text-[13px] outline-none focus:border-primary/60" />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-ink-subtle">{t('members.th.dept', '부서')}</span>
              <input placeholder={t('members.ph.dept')} className="mt-1 h-10 w-full rounded-lg border border-hairline bg-canvas/60 px-3 text-[13px] outline-none focus:border-primary/60" />
            </label>
            <div>
              <span className="text-xs font-medium text-ink-subtle">{t('members.label.grade', '등급')}</span>
              <div className="mt-2">
                <ChipSelect options={GRADES} value={newGrade} onChange={setNewGrade} />
              </div>
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="h-9 rounded-lg border border-hairline bg-chip px-4 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={() => {
                setCreating(false)
                toast(t('members.toast.registered', '회원을 등록했습니다 — 첫 로그인은 SSO 인증 후 활성화됩니다'))
              }}
              className="h-9 rounded-lg bg-gradient-to-r from-primary to-accent2 px-4 text-[13px] font-semibold text-white shadow-[0_2px_10px_var(--color-glow)] transition-opacity hover:opacity-90"
            >
              {t('members.register')}
            </button>
          </div>
        </Modal>
      )}
    </AppShell>
  )
}
