import { useEffect, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'

import { nav } from '#/data/nav'
import type { IconName, NavItem, NavSection } from '#/data/nav'
import { unseenCount } from '#/data/whatsnew'
import { apiSend, clearToken, useApi } from '#/lib/api'
import { useI18n } from '#/lib/i18n'
import { useTheme } from '#/lib/useTheme'

import { AskPanel } from './AskPanel'
import { Avatar } from './Avatar'
import { CommandPalette } from './CommandPalette'
import { Drawer } from './Drawer'
import { Icon } from './Icon'
import { MotionRoot } from './motion'
import { MyAbilities } from './MyAbilities'
import { Preferences } from './Preferences'
import { ToastProvider, useToast } from './toast'

function NavRow({
  item,
  active,
  rail,
  onSelect,
}: {
  item: NavItem
  active: boolean
  /** 데스크톱 핀 해제 상태(아이콘 레일). 배지 숫자는 접히므로 점으로 말한다 */
  rail: boolean
  // 잎(메뉴 항목)을 고르면 좁은 화면 서랍을 닫는다 — 규약 §8. 가지(섹션)는 그대로 둔다.
  onSelect: () => void
}) {
  const className = `relative mb-0.5 flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors ${
    active
      ? 'bg-gradient-to-r from-primary to-accent2 font-semibold text-white shadow-[0_2px_10px_var(--color-glow)]'
      : 'text-sidebar-ink hover:bg-white/5 hover:text-white'
  }`
  const inner = (
    <>
      <span className="flex min-w-0 items-center gap-2.5">
        <span className={active ? 'text-white' : 'text-sidebar-ink/70'}>
          <Icon name={item.icon} />
        </span>
        <span className="truncate whitespace-nowrap">{item.label}</span>
      </span>
      {item.badge != null && (
        <span
          className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-semibold tabular-nums ${
            active ? 'bg-white/25 text-white' : 'bg-sidebar-accent/15 text-sidebar-accent'
          }`}
        >
          {item.badge}
        </span>
      )}
      {/* 레일 모드: 배지가 접혀도 "기다리는 일이 있다"는 신호는 남긴다 */}
      {rail && item.badge != null && (
        <span className="absolute right-1 top-1 hidden h-1.5 w-1.5 rounded-full bg-sidebar-accent pc:block pc:group-hover/rail:hidden" />
      )}
    </>
  )
  return item.to ? (
    <Link to={item.to} className={className} onClick={onSelect}>
      {inner}
    </Link>
  ) : (
    <button type="button" className={className} onClick={onSelect}>
      {inner}
    </button>
  )
}

/* GNB 알림 — 나를 기다리는 일은 종 하나에 모인다 (규약 §2). 배지 숫자는 "안 본 것".
   누르면 그 일이 있는 화면으로 간다 — 눌렀는데 아무 데도 안 가는 알림이 제일 나쁘다 */
const NOTIFICATIONS: Array<{
  icon: IconName
  text: string
  time: string
  todo: boolean
  to: string
  search?: Record<string, string>
}> = [
  { icon: 'approve', text: 'VN7 엔진 사양서 v2.3 승인 요청', time: '10분 전', todo: true, to: '/approvals' },
  { icon: 'engine', text: '배치 검증 완료 — 오류 12건 검출', time: '1시간 전', todo: true, to: '/validation-results' },
  { icon: 'message', text: 'Q&A 답변 대기 1건 — 버전 비교 문의', time: '25분 전', todo: true, to: '/qna' },
  { icon: 'message', text: '전기차 배터리 규격서에 검토 의견이 달렸습니다', time: '42분 전', todo: false, to: '/specs', search: { open: 'SP-002' } },
  { icon: 'deploy', text: '자율주행 센서 통합 규격 v3.1 배포 완료', time: '3시간 전', todo: false, to: '/specs', search: { open: 'SP-003' } },
  { icon: 'bell', text: '[공지] 8월 정기 점검 — 8/9(토) 02:00~06:00', time: '어제', todo: false, to: '/notice' },
]

function Shell({
  active,
  title,
  children,
}: {
  active: string
  title: string
  children: React.ReactNode
}) {
  const { theme, toggle } = useTheme()
  const { locale, setLocale, t, tf } = useI18n()
  const toast = useToast()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  // 좁은 화면(<720px)에서 사이드바는 본문을 덮는 서랍이다 — 규약 §8.
  const [navOpen, setNavOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  // LNB 핀 — 해제하면 아이콘 레일로 접히고, 올리면 다시 펴진다 (데스크톱 전용)
  const [pinned, setPinned] = useState(true)
  const [menu, setMenu] = useState<null | 'bell' | 'user'>(null)
  // 내가 할 수 있는 것 — 권한은 말없이 붙고 회수는 더 조용하다. 받은 본인이 확인할 자리
  const [abilitiesOpen, setAbilitiesOpen] = useState(false)
  const [prefsOpen, setPrefsOpen] = useState(false)
  // 대화형 챗봇 — 자리는 GNB 💬 · 커맨드 팔레트와 같은 층(정본: 챗봇_표준질의_설계.md §1)
  const [askOpen, setAskOpen] = useState(false)
  // 새 기능 배지 (규약 19절) — localStorage 는 서버에 없으므로 수화 뒤에 센다
  const [whatsNew, setWhatsNew] = useState(0)
  useEffect(() => {
    setWhatsNew(unseenCount())
  }, [])
  // 메뉴는 권한의 파생물 — 서버(/api/me/menu)가 걸러서 준다. 없으면 정적 정본(시연 모드)
  const { data: serverNav } = useApi<Array<NavSection>>('/me/menu', nav)
  // 내 정보도 서버에서 — SSO 확정 전엔 서버가 김현대로 고정해 준다
  const { data: meInfo } = useApi('/me', {
    name: '김현대',
    email: 'hyundae.kim@hmg.com',
    title: '시스템 관리자',
    gradeName: 'Super Admin',
  })
  // 라벨은 언어별로 입힌다 — 서버 재료는 key(규약 §4-2). EN 은 관리자가 메뉴 관리에서
  // 넣은 영문명(labelEn)이 우선이고, 없으면 사전, 그것도 없으면 한국어 라벨 그대로.
  const displayNav = serverNav.map((s) => ({
    ...s,
    title: s.title ? t(`nav.section.${s.id}`, s.title) : undefined,
    items: s.items.map((it) => ({
      ...it,
      label:
        locale === 'en'
          ? (it.labelEn ?? t(`nav.${it.key}`, it.label))
          : it.label,
      ...(it.key === 'guide' && whatsNew > 0 ? { badge: whatsNew } : {}),
    })),
  }))
  const [bellTab, setBellTab] = useState<'all' | 'todo'>('all')
  const [unread, setUnread] = useState(3)

  useEffect(() => {
    if (localStorage.getItem('lnb-pinned') === '0') setPinned(false)
  }, [])
  const togglePin = () => {
    setPinned((p) => {
      localStorage.setItem('lnb-pinned', p ? '0' : '1')
      return !p
    })
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((v) => !v)
      }
      if (e.key === 'Escape') setMenu(null)
    }
    // 스포트라이트 좌표 위임 — .card-spotlight 위에서만 --mx/--my 를 채운다
    const onMove = (e: PointerEvent) => {
      const card = e.target instanceof Element ? e.target.closest('.card-spotlight') : null
      if (card instanceof HTMLElement) {
        const r = card.getBoundingClientRect()
        card.style.setProperty('--mx', `${e.clientX - r.left}px`)
        card.style.setProperty('--my', `${e.clientY - r.top}px`)
      }
    }
    window.addEventListener('keydown', onKey)
    document.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('pointermove', onMove)
    }
  }, [])

  const rail = !pinned
  // 레일에서 글자·배지는 호버로 펼쳤을 때만 보인다
  const railHide = rail
    ? 'pc:opacity-0 pc:pointer-events-none pc:group-hover/rail:opacity-100 pc:group-hover/rail:pointer-events-auto transition-opacity duration-150'
    : ''

  const bellItems = NOTIFICATIONS.filter((n) => bellTab === 'all' || n.todo)

  return (
    <div className="flex min-h-dvh bg-canvas text-ink">
      {/* 서랍 가림막 — 좁은 화면에서 서랍이 열렸을 때만 */}
      {navOpen && (
        <button
          type="button"
          aria-label="메뉴 닫기"
          onClick={() => setNavOpen(false)}
          className="fixed inset-0 z-30 bg-black/65 pc:hidden"
        />
      )}

      <aside
        className={`group/rail fixed inset-y-0 left-0 z-40 flex w-60 flex-col overflow-x-hidden border-r border-white/5 bg-sidebar text-sidebar-ink transition-[transform,width] duration-200 pc:translate-x-0 ${
          navOpen ? 'translate-x-0' : '-translate-x-full'
        } ${rail ? 'pc:w-16 pc:hover:w-60 pc:hover:shadow-[12px_0_40px_rgb(0_0_0/40%)]' : 'pc:w-60'}`}
      >
        {/* 로고 영역 — 지금 어느 제품·어느 판인지가 한눈에 */}
        <div className="flex items-center gap-2.5 px-3.5 py-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent2 text-sm font-bold text-white shadow-[0_2px_10px_var(--color-glow)]">
            H
          </span>
          <div className={`min-w-0 flex-1 leading-tight ${railHide}`}>
            <div className="flex items-center gap-1.5">
              <span className="truncate text-sm font-semibold text-white">HMG Admin</span>
              {/* 사이드바 안이라 primary 가 아니라 sidebar-accent 다 — 라이트에서 primary 는
                  아주 어두운 남색이라 어두운 사이드바에서 안 보인다(styles.css 주석 참고) */}
              <span className="rounded-full bg-sidebar-accent/15 px-1.5 py-px text-[10px] font-semibold text-sidebar-accent">
                PoC
              </span>
            </div>
            <div className="text-[11px] text-sidebar-ink/75">{t('brand.tagline')}</div>
          </div>
          <button
            type="button"
            onClick={togglePin}
            aria-label={pinned ? '메뉴 접기' : '메뉴 고정'}
            title={pinned ? '메뉴 접기' : '메뉴 고정'}
            className={`hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sidebar-ink/70 transition-colors hover:bg-white/5 hover:text-white pc:flex ${railHide}`}
          >
            <span className={pinned ? '' : 'rotate-45'}>
              <Icon name="pin" size={15} />
            </span>
          </button>
        </div>

        {/* 스크롤바는 숨기고, 아래에 더 있다는 신호는 하단 페이드가 말한다 */}
        <nav className="scrollbar-hidden relative flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-3 pb-4 [mask-image:linear-gradient(to_bottom,black_calc(100%-28px),transparent)]">
          {displayNav.map((section) => {
            const isCollapsed = collapsed[section.id]
            return (
              <div key={section.id} className="mt-2 first:mt-0">
                {section.title ? (
                  <button
                    type="button"
                    onClick={() => setCollapsed((c) => ({ ...c, [section.id]: !c[section.id] }))}
                    /* ⚠ LNB 에서 가장 흐린 글자였다 — 2.96:1(2026-08-06 전수 감사).
                       "덜 중요하다"는 굵기·크기가 이미 말하고 있으니 밝기까지 낮출 필요가
                       없다. 45% → 70% (4.74:1) */
                    className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-[11px] font-semibold tracking-wide text-sidebar-ink/70 transition-colors hover:text-sidebar-ink ${railHide}`}
                  >
                    {/* 영문은 한글의 1.5~2배 — 넘치면 말줄임 (규약 §4-5) */}
                    <span className="min-w-0 truncate whitespace-nowrap">{section.title}</span>
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={`transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
                      aria-hidden
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                ) : null}
                <div
                  className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                    isCollapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'
                  }`}
                >
                  <div
                    className={`min-h-0 overflow-hidden ${
                      section.title && !rail ? 'ml-2 border-l border-white/8 pl-2' : ''
                    } ${section.title && rail ? 'pc:group-hover/rail:ml-2 pc:group-hover/rail:border-l pc:group-hover/rail:border-white/8 pc:group-hover/rail:pl-2' : ''}`}
                  >
                    {section.items.map((item) => (
                      <NavRow
                        key={item.key}
                        item={item}
                        active={item.key === active}
                        rail={rail}
                        onSelect={() => setNavOpen(false)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </nav>
        <div className={`whitespace-nowrap border-t border-white/5 px-5 py-4 text-[11px] text-sidebar-ink/75 ${railHide}`}>
          {t('brand.footer')}
        </div>
      </aside>

      {/* ⚠ min-w-0 이 없으면 flex 항목의 min-width:auto 가 안쪽 넓은 표를 따라 컬럼째
          늘어난다 — 모바일 브라우저는 넘친 페이지를 축소해서 "PC 화면"처럼 보여 주고,
          innerWidth 도 같이 커져 e2e 넘침 검사가 장님이 된다 (2026-08-05 실기기 실증).
          overflow-x-clip 은 이중 안전벨트 — clip 은 스크롤 컨테이너를 안 만들어 sticky 가 산다 */}
      <div className={`flex min-h-dvh min-w-0 flex-1 flex-col overflow-x-clip ${rail ? 'pc:ml-16' : 'pc:ml-60'}`}>
        {/* 앱 헤더는 어떤 덮개도 먹지 않는다 — 지금 어디인지와 나가는 길이 함께 사라진다 (규약 §8).
            헤더에는 사용자 관점의 필수 정보(현재 위치·기다리는 일·내 계정)를 상시 노출한다 */}
        {/* 글라스 헤더 — blur 에 saturate 를 얹으면 비쳐 보이는 색이 탁해지지 않는다 */}
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-3 border-b border-hairline bg-canvas/75 px-4 backdrop-blur-md backdrop-saturate-150 pc:px-8">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              aria-label="메뉴 열기"
              onClick={() => setNavOpen(true)}
              className="-ml-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-white/5 pc:hidden"
            >
              <Icon name="menu" size={20} />
            </button>
            <div className="truncate text-[13px] text-ink-subtle">
              <span className="hidden pc:inline">
                HMG Admin <span className="mx-1.5">›</span>
              </span>
              {/* 자리 이름은 LNB 와 같은 낱말로 — 메뉴는 Members 인데 머리는 회원 관리면
                  같은 화면이 두 이름을 갖는다. active 키로 표시 라벨을 되찾는다 */}
              <span className="font-medium text-ink">
                {displayNav.flatMap((s) => s.items).find((i) => i.key === active)?.label ?? title}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2.5 pc:gap-3">
            <Link
              to="/specs"
              className="hidden h-9 items-center gap-1.5 rounded-lg bg-gradient-to-r from-primary to-accent2 px-3.5 text-[13px] font-semibold text-white shadow-[0_2px_10px_var(--color-glow)] transition-opacity hover:opacity-90 pc:flex"
            >
              <Icon name="plus" size={14} />
              {t('gnb.newSpec')}
            </Link>
            <button
              type="button"
              aria-label="검색"
              onClick={() => setPaletteOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-hairline bg-surface text-ink-muted transition-colors hover:text-ink pc:hidden"
            >
              <Icon name="search" size={16} />
            </button>
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="hidden h-9 w-52 items-center justify-between rounded-lg border border-hairline bg-surface px-3 text-[13px] text-ink-subtle transition-colors hover:border-primary/40 hover:text-ink-muted pc:flex"
            >
              <span className="flex min-w-0 items-center gap-2">
                <Icon name="search" size={14} />
                <span className="truncate">{t('gnb.searchPlaceholder')}</span>
              </span>
              <kbd className="rounded-md border border-hairline bg-chip px-1.5 py-0.5 text-[10px] text-ink-muted">⌘K</kbd>
            </button>
            {/* 대화형 챗봇 — 어느 화면에서나 같은 패널 하나(정본 §1). 특정 화면 안에
                두면 그 화면 권한이 없는 사람은 챗봇 자체를 못 쓰게 된다 */}
            <button
              type="button"
              onClick={() => setAskOpen(true)}
              aria-label={t('ask.title')}
              title={t('ask.title')}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-hairline bg-surface text-[15px] text-ink-muted transition-colors hover:text-ink"
            >
              💬
            </button>
            {/* 언어는 사람마다 (규약 §4-1) — 현재 언어를 표시하고 누르면 전환 */}
            <button
              type="button"
              onClick={() => setLocale(locale === 'ko' ? 'en' : 'ko')}
              aria-label="언어 전환 / Switch language"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-hairline bg-surface text-[11px] font-bold text-ink-muted transition-colors hover:text-ink"
            >
              {locale === 'ko' ? '한' : 'EN'}
            </button>
            <button
              type="button"
              onClick={toggle}
              aria-label="테마 전환"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-hairline bg-surface text-ink-muted transition-colors hover:text-ink"
            >
              {theme === 'dark' ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <circle cx="12" cy="12" r="4.5" />
                  <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5 5l1.4 1.4M17.6 17.6L19 19M19 5l-1.4 1.4M6.4 17.6L5 19" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M20 13.5A8.5 8.5 0 0 1 10.5 4a8.5 8.5 0 1 0 9.5 9.5Z" />
                </svg>
              )}
            </button>
            <button
              type="button"
              aria-label={`알림 ${unread}건`}
              onClick={() => setMenu(menu === 'bell' ? null : 'bell')}
              className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-hairline bg-surface text-ink-muted transition-colors hover:text-ink"
            >
              <Icon name="bell" size={17} />
              {/* ⚠ 배지에 흰 글자를 박지 않는다 — 다크에서 danger-ink 는 **밝은 빨강**이라
                  흰 글자가 2.3:1 로 떨어진다(2026-08-06 감사). 상태색은 bg/ink 가 짝이라
                  서로를 뒤집어 쓰면 두 테마 모두 대비가 선다.
                  ⚠ 이 주석은 `{조건 && (...)}` **밖**에 둔다 — 안에 넣으면 표현식이 둘이 되어
                  JSX 가 깨진다(방금 겪었다) */}
              {unread > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-danger-ink px-1 text-[10px] font-bold tabular-nums text-danger-bg">
                  {unread}
                </span>
              )}
            </button>
            <button
              type="button"
              aria-label="계정 메뉴"
              onClick={() => setMenu(menu === 'user' ? null : 'user')}
              className="flex items-center gap-2.5 rounded-lg px-1 py-0.5 transition-colors hover:bg-chip"
            >
              <Avatar name={meInfo.name} size={30} />
              <span className="hidden text-left leading-tight pc:block">
                <span className="block text-[13px] font-semibold">{meInfo.name}</span>
                <span className="block text-[11px] text-ink-subtle">{meInfo.title}</span>
              </span>
            </button>
          </div>
        </header>
        <main className="relative mx-auto w-full max-w-7xl flex-1 px-4 py-6 pc:px-8 pc:py-8">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-20 right-24 h-64 w-64 rounded-full bg-primary/10 blur-[100px]"
          />
          <div className="relative">{children}</div>
        </main>
      </div>

      {/* GNB 팝오버 — 배경을 누르면 닫힌다. Esc 도 닫는다 */}
      {menu && (
        <>
          <button
            type="button"
            aria-label="메뉴 닫기"
            onClick={() => setMenu(null)}
            className="fixed inset-0 z-40 cursor-default"
          />
          {menu === 'bell' && (
            <div className="anim-scale-in fixed right-3 top-16 z-50 w-[340px] max-w-[calc(100vw-1.5rem)] rounded-xl border border-hairline bg-surface shadow-[0_24px_80px_rgb(0_0_0/45%)] pc:right-24">
              <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
                <span className="text-sm font-semibold">{t('gnb.notifications')}</span>
                <button
                  type="button"
                  onClick={() => {
                    setUnread(0)
                    toast('알림을 모두 읽음 처리했습니다')
                  }}
                  className="rounded-md px-2 py-1 text-xs text-ink-muted transition-colors hover:bg-chip hover:text-ink"
                >
                  {t('gnb.markAllRead')}
                </button>
              </div>
              <div className="flex gap-1 border-b border-hairline px-3 py-2">
                {(
                  [
                    { key: 'all', label: t('gnb.bell.all') },
                    { key: 'todo', label: t('gnb.bell.todo') },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setBellTab(tab.key)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      bellTab === tab.key
                        ? 'bg-primary/15 text-primary'
                        : 'text-ink-muted hover:bg-chip hover:text-ink'
                    }`}
                  >
                    {tab.label}
                    {tab.key === 'todo' && (
                      <span className="ml-1 tabular-nums">{NOTIFICATIONS.filter((n) => n.todo).length}</span>
                    )}
                  </button>
                ))}
              </div>
              <ol className="max-h-80 overflow-y-auto overscroll-contain py-1">
                {bellItems.map((n) => (
                  <li key={n.text}>
                    <button
                      type="button"
                      onClick={() => {
                        setMenu(null)
                        navigate({ to: n.to, search: n.search })
                      }}
                      className="flex w-full items-start gap-2.5 px-4 py-2.5 text-left transition-colors hover:bg-chip"
                    >
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
                        <Icon name={n.icon} size={14} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[13px] leading-snug text-ink">{n.text}</span>
                        <span className="mt-0.5 block text-xs text-ink-subtle">{n.time}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
              <div className="border-t border-hairline px-4 py-2.5 text-[11px] text-ink-subtle">
                {t('gnb.bell.footer')}
              </div>
            </div>
          )}
          {menu === 'user' && (
            <div className="anim-scale-in fixed right-3 top-16 z-50 w-56 rounded-xl border border-hairline bg-surface py-1.5 shadow-[0_24px_80px_rgb(0_0_0/45%)] pc:right-8">
              <div className="border-b border-hairline px-4 pb-2.5 pt-1.5">
                <div className="text-[13px] font-semibold">{meInfo.name}</div>
                <div className="text-xs text-ink-subtle">{meInfo.email} · {meInfo.gradeName}</div>
              </div>
              {/* 권한은 여러 길로 말없이 붙는다 — 받은 본인이 사람 말로 확인하는 자리 */}
              <button
                type="button"
                onClick={() => {
                  setMenu(null)
                  setAbilitiesOpen(true)
                }}
                className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-[13px] text-ink-muted transition-colors hover:bg-chip hover:text-ink"
              >
                <Icon name="shield" size={15} />
                {t('gnb.myAbilities')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenu(null)
                  toast(tf('gnb.notReady', { label: t('gnb.myPage') }))
                }}
                className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-[13px] text-ink-muted transition-colors hover:bg-chip hover:text-ink"
              >
                <Icon name="user" size={15} />
                {t('gnb.myPage')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenu(null)
                  setPrefsOpen(true)
                }}
                className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-[13px] text-ink-muted transition-colors hover:bg-chip hover:text-ink"
              >
                <Icon name="settings" size={15} />
                {t('gnb.settings')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenu(null)
                  // 서버 세션도 걷는다 — 실패해도 화면 토큰은 지운다(로그아웃이 막히면 안 된다)
                  void apiSend('POST', '/auth/logout')
                  clearToken()
                  void navigate({ to: '/login' })
                }}
                className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-[13px] text-ink-muted transition-colors hover:bg-chip hover:text-ink"
              >
                <Icon name="logout" size={15} />
                {t('gnb.logout')}
              </button>
            </div>
          )}
        </>
      )}

      {/*
        떠 있는 [물어보기] 버튼 — 자매 프로젝트(acrofuture)가 헤더에서 여기로 옮긴 이유를
        우리도 그대로 겪었다: **헤더는 좁은 화면에서 접히는 줄이라 늘 있는 자리가 아니고**,
        아이콘 하나는 다른 조작들 사이에서 눈에 안 띈다(2026-08-06 사용자: "챗봇은 어디에도
        안 보이는데"). 어디서나 같은 것을 여는 물건은 **어디서나 같은 자리**에 있어야 한다.

        자리 다툼은 미리 갈라 뒀다 — 토스트는 이 버튼 **위로** 쌓는다(toast.tsx).
        z 는 서랍·모달(50 이상)보다 낮다: 덮개를 쓰는 중에 이 버튼이 그 위에 떠 있으면
        "끝내고 닫는" 흐름을 방해한다.
      */}
      <button
        type="button"
        onClick={() => setAskOpen(true)}
        aria-label={t('ask.title')}
        title={t('ask.title')}
        className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] right-[calc(1rem+env(safe-area-inset-right,0px))] z-30 flex h-[var(--fab-size)] w-[var(--fab-size)] items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent2 text-white shadow-[0_10px_30px_var(--color-glow)] transition-transform hover:-translate-y-0.5 active:translate-y-0"
      >
        <Icon name="chat" size={22} />
      </button>

      {paletteOpen && (
        <CommandPalette onClose={() => setPaletteOpen(false)} onAsk={() => setAskOpen(true)} />
      )}

      {/* 대화형 챗봇 — [그 화면 열기] 는 Drawer 의 close 렌더-프롭으로 닫는다(퇴장
          애니메이션이 끝난 뒤 언마운트). 부모의 onClose 를 바로 부르면 애니메이션이
          안 돈다(Drawer.tsx 주석 참고). 메뉴 키 → 경로는 서버 nav(serverNav) 에서 찾는다 */}
      {askOpen && (
        <Drawer title={t('ask.title')} onClose={() => setAskOpen(false)}>
          {(close) => (
            <AskPanel
              onOpenMenu={(key) => {
                const item = serverNav.flatMap((s) => s.items).find((i) => i.key === key)
                if (!item?.to) return
                navigate({ to: item.to })
                close()
              }}
            />
          )}
        </Drawer>
      )}

      {/* 내가 할 수 있는 것 — 권한 이름이 아니라 사람 말로. 정본은 권한 관리(roleDefs) 파생 */}
      {abilitiesOpen && (
        <Drawer title={t('gnb.myAbilities')} onClose={() => setAbilitiesOpen(false)}>
          {() => <MyAbilities />}
        </Drawer>
      )}

      {/* 개인 설정 — 언어·테마·포인트 색상. 전부 즉시 적용이라 저장 버튼이 없다 */}
      {prefsOpen && (
        <Drawer title={t('gnb.settings')} onClose={() => setPrefsOpen(false)}>
          {() => <Preferences theme={theme} onToggleTheme={toggle} />}
        </Drawer>
      )}
    </div>
  )
}

export function AppShell(props: { active: string; title: string; children: React.ReactNode }) {
  return (
    <ToastProvider>
      <MotionRoot>
        <Shell {...props} />
      </MotionRoot>
    </ToastProvider>
  )
}
