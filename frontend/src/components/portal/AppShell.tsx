import { useEffect, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'

import { Avatar } from './Avatar'
import { CommandPalette } from './CommandPalette'
import { ToastProvider, useToast } from './toast'

type IconName =
  | 'dashboard'
  | 'stats'
  | 'users'
  | 'shield'
  | 'menu'
  | 'doc'
  | 'approve'
  | 'deploy'
  | 'engine'
  | 'search'
  | 'report'
  | 'bell'
  | 'message'
  | 'help'
  | 'book'
  | 'lock'
  | 'pin'
  | 'plus'
  | 'user'
  | 'settings'
  | 'logout'

const iconPaths: Record<IconName, React.ReactNode> = {
  dashboard: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </>
  ),
  stats: (
    <>
      <path d="M5 20v-7" />
      <path d="M12 20V5" />
      <path d="M19 20v-10" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8.5" r="3.5" />
      <path d="M3.5 19.5c.9-3.2 3-4.8 5.5-4.8s4.6 1.6 5.5 4.8" />
      <path d="M16 5.6a3 3 0 0 1 0 5.8M18.5 14.9c1.4.7 2.4 2 2.9 3.9" />
    </>
  ),
  shield: <path d="M12 3l7 2.8v5.3c0 4.4-2.9 7.4-7 9-4.1-1.6-7-4.6-7-9V5.8z" />,
  menu: (
    <>
      <path d="M4 6.5h16" />
      <path d="M4 12h16" />
      <path d="M4 17.5h9" />
    </>
  ),
  doc: (
    <>
      <path d="M6 3.5h7.5L18 8v12.5H6z" />
      <path d="M13.5 3.5V8H18" />
    </>
  ),
  approve: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 12.2l2.4 2.4 4.6-5.2" />
    </>
  ),
  deploy: (
    <>
      <path d="M12 19V6" />
      <path d="M6.5 11.5L12 6l5.5 5.5" />
      <path d="M5 20.5h14" />
    </>
  ),
  engine: (
    <>
      <rect x="7" y="7" width="10" height="10" rx="2" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="M20 20l-5-5" />
    </>
  ),
  report: (
    <>
      <rect x="5" y="3.5" width="14" height="17" rx="2" />
      <path d="M9 15.5v2M12 11.5v6M15 13.5v4" />
    </>
  ),
  bell: (
    <path d="M12 3.5a5.5 5.5 0 0 0-5.5 5.5v3l-1.3 2.6a.8.8 0 0 0 .7 1.2h12.2a.8.8 0 0 0 .7-1.2L17.5 12V9A5.5 5.5 0 0 0 12 3.5Zm-2 13.5a2 2 0 0 0 4 0" />
  ),
  message: <path d="M4 5.5h16v10.5H9.5L4 20z" />,
  help: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.5 9.3a2.6 2.6 0 1 1 3.6 2.4c-.8.4-1.1.9-1.1 1.8" />
      <path d="M12 17h.01" />
    </>
  ),
  book: (
    <>
      <path d="M4.5 19.5V6a2.5 2.5 0 0 1 2.5-2.5h12.5V17H7a2.5 2.5 0 0 0-2.5 2.5Zm0 0A2.5 2.5 0 0 1 7 17" />
      <path d="M19.5 17v3.5H7" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </>
  ),
  pin: (
    <>
      <path d="M9.5 3.5h5l-.7 6 3.2 3.5H7l3.2-3.5z" />
      <path d="M12 13v7" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  user: (
    <>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5.5 20c1-3.5 3.5-5.3 6.5-5.3s5.5 1.8 6.5 5.3" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 0 0-2-1.2L14.2 3h-4l-.4 2.7a7 7 0 0 0-2 1.2l-2.3-1-2 3.4 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 2 1.2l.4 2.7h4l.4-2.7a7 7 0 0 0 2-1.2l2.3 1 2-3.4-2-1.5c.06-.4.1-.8.1-1.2Z" />
    </>
  ),
  logout: (
    <>
      <path d="M9 4H5.5v16H9" />
      <path d="M14 8l4 4-4 4M18 12H9.5" />
    </>
  ),
}

function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="shrink-0"
    >
      {iconPaths[name]}
    </svg>
  )
}

interface NavItem {
  key: string
  label: string
  icon: IconName
  to?: string
  badge?: number
}

interface NavSection {
  id: string
  title?: string
  items: Array<NavItem>
}

const nav: Array<NavSection> = [
  {
    id: 'main',
    items: [
      { key: 'dashboard', label: '대시보드', icon: 'dashboard', to: '/dashboard' },
      { key: 'analytics', label: '통계 & 분석', icon: 'stats', to: '/analytics' },
    ],
  },
  {
    id: 'admin',
    title: '관리',
    items: [
      { key: 'members', label: '회원 관리', icon: 'users', to: '/members' },
      { key: 'roles', label: '권한 관리', icon: 'shield', to: '/roles' },
      { key: 'menus', label: '메뉴 관리', icon: 'menu', to: '/menus' },
    ],
  },
  {
    id: 'idms',
    title: '사양 (IDMS)',
    items: [
      { key: 'specs', label: '사양서 관리', icon: 'doc', to: '/specs' },
      { key: 'approvals', label: '승인 관리', icon: 'approve', badge: 3, to: '/approvals' },
      { key: 'deploys', label: '배포 관리', icon: 'deploy', to: '/deploys' },
    ],
  },
  {
    id: 'validation',
    title: '검증엔진',
    items: [
      { key: 'engine', label: '검증엔진 관리', icon: 'engine', to: '/validation-engine' },
      { key: 'results', label: '검증 결과 조회', icon: 'search', to: '/validation-results' },
      { key: 'reports', label: '검증 리포트', icon: 'report', to: '/validation-reports' },
    ],
  },
  {
    id: 'community',
    title: '커뮤니티',
    items: [
      { key: 'notice', label: '공지사항', icon: 'bell' },
      { key: 'qna', label: 'Q&A', icon: 'message' },
      { key: 'faq', label: 'FAQ', icon: 'help' },
      { key: 'guide', label: '사용자 가이드', icon: 'book' },
    ],
  },
  {
    id: 'system',
    title: '시스템',
    items: [
      { key: 'alerts', label: '시스템 알림', icon: 'bell', badge: 3 },
      { key: 'privacy', label: '개인정보보호', icon: 'lock' },
    ],
  },
]

function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  useEffect(() => {
    const saved = localStorage.getItem('theme')
    if (saved === 'light' || saved === 'dark') {
      setTheme(saved)
      document.documentElement.dataset.theme = saved
    }
  }, [])
  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.dataset.theme = next
    localStorage.setItem('theme', next)
  }
  return { theme, toggle }
}

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
            active ? 'bg-white/25 text-white' : 'bg-primary/25 text-primary'
          }`}
        >
          {item.badge}
        </span>
      )}
      {/* 레일 모드: 배지가 접혀도 "기다리는 일이 있다"는 신호는 남긴다 */}
      {rail && item.badge != null && (
        <span className="absolute right-1 top-1 hidden h-1.5 w-1.5 rounded-full bg-primary pc:block pc:group-hover/rail:hidden" />
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
  { icon: 'message', text: '전기차 배터리 규격서에 검토 의견이 달렸습니다', time: '42분 전', todo: false, to: '/specs', search: { open: 'SP-002' } },
  { icon: 'deploy', text: '자율주행 센서 통합 규격 v3.1 배포 완료', time: '3시간 전', todo: false, to: '/specs', search: { open: 'SP-003' } },
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
  const toast = useToast()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  // 좁은 화면(<720px)에서 사이드바는 본문을 덮는 서랍이다 — 규약 §8.
  const [navOpen, setNavOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  // LNB 핀 — 해제하면 아이콘 레일로 접히고, 올리면 다시 펴진다 (데스크톱 전용)
  const [pinned, setPinned] = useState(true)
  const [menu, setMenu] = useState<null | 'bell' | 'user'>(null)
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
      const t = e.target instanceof Element ? e.target.closest('.card-spotlight') : null
      if (t instanceof HTMLElement) {
        const r = t.getBoundingClientRect()
        t.style.setProperty('--mx', `${e.clientX - r.left}px`)
        t.style.setProperty('--my', `${e.clientY - r.top}px`)
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
              <span className="rounded-full bg-primary/25 px-1.5 py-px text-[10px] font-semibold text-primary">
                PoC
              </span>
            </div>
            <div className="text-[11px] text-sidebar-ink/60">통합 관리자 포털</div>
          </div>
          <button
            type="button"
            onClick={togglePin}
            aria-label={pinned ? '메뉴 접기' : '메뉴 고정'}
            title={pinned ? '메뉴 접기' : '메뉴 고정'}
            className={`hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sidebar-ink/50 transition-colors hover:bg-white/5 hover:text-white pc:flex ${railHide}`}
          >
            <span className={pinned ? '' : 'rotate-45'}>
              <Icon name="pin" size={15} />
            </span>
          </button>
        </div>

        {/* 스크롤바는 숨기고, 아래에 더 있다는 신호는 하단 페이드가 말한다 */}
        <nav className="scrollbar-hidden relative flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-3 pb-4 [mask-image:linear-gradient(to_bottom,black_calc(100%-28px),transparent)]">
          {nav.map((section) => {
            const isCollapsed = collapsed[section.id]
            return (
              <div key={section.id} className="mt-2 first:mt-0">
                {section.title ? (
                  <button
                    type="button"
                    onClick={() => setCollapsed((c) => ({ ...c, [section.id]: !c[section.id] }))}
                    className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-[11px] font-semibold tracking-wide text-sidebar-ink/45 transition-colors hover:text-sidebar-ink ${railHide}`}
                  >
                    <span className="whitespace-nowrap">{section.title}</span>
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
        <div className={`whitespace-nowrap border-t border-white/5 px-5 py-4 text-[11px] text-sidebar-ink/40 ${railHide}`}>
          프로토타입 v0.5 · 디자인 검토용
        </div>
      </aside>

      <div className={`flex min-h-dvh flex-1 flex-col ${rail ? 'pc:ml-16' : 'pc:ml-60'}`}>
        {/* 앱 헤더는 어떤 덮개도 먹지 않는다 — 지금 어디인지와 나가는 길이 함께 사라진다 (규약 §8).
            헤더에는 사용자 관점의 필수 정보(현재 위치·기다리는 일·내 계정)를 상시 노출한다 */}
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-3 border-b border-hairline bg-canvas/75 px-4 backdrop-blur-md pc:px-8">
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
              <span className="font-medium text-ink">{title}</span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2.5 pc:gap-3">
            <Link
              to="/specs"
              className="hidden h-9 items-center gap-1.5 rounded-lg bg-gradient-to-r from-primary to-accent2 px-3.5 text-[13px] font-semibold text-white shadow-[0_2px_10px_var(--color-glow)] transition-opacity hover:opacity-90 pc:flex"
            >
              <Icon name="plus" size={14} />새 사양서
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
              <span className="flex items-center gap-2">
                <Icon name="search" size={14} />
                전체 검색...
              </span>
              <kbd className="rounded-md border border-hairline bg-chip px-1.5 py-0.5 text-[10px]">⌘K</kbd>
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
              {unread > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-danger-ink px-1 text-[10px] font-bold tabular-nums text-white">
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
              <Avatar name="김현대" size={30} />
              <span className="hidden text-left leading-tight pc:block">
                <span className="block text-[13px] font-semibold">김현대</span>
                <span className="block text-[11px] text-ink-subtle">시스템 관리자</span>
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
                <span className="text-sm font-semibold">알림</span>
                <button
                  type="button"
                  onClick={() => {
                    setUnread(0)
                    toast('알림을 모두 읽음 처리했습니다')
                  }}
                  className="rounded-md px-2 py-1 text-xs text-ink-muted transition-colors hover:bg-chip hover:text-ink"
                >
                  모두 읽음
                </button>
              </div>
              <div className="flex gap-1 border-b border-hairline px-3 py-2">
                {(
                  [
                    { key: 'all', label: '전체' },
                    { key: 'todo', label: '해야 할 일' },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setBellTab(t.key)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      bellTab === t.key
                        ? 'bg-primary/15 text-primary'
                        : 'text-ink-muted hover:bg-chip hover:text-ink'
                    }`}
                  >
                    {t.label}
                    {t.key === 'todo' && (
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
                알림 수신 설정은 마이페이지에서 바꿉니다
              </div>
            </div>
          )}
          {menu === 'user' && (
            <div className="anim-scale-in fixed right-3 top-16 z-50 w-56 rounded-xl border border-hairline bg-surface py-1.5 shadow-[0_24px_80px_rgb(0_0_0/45%)] pc:right-8">
              <div className="border-b border-hairline px-4 pb-2.5 pt-1.5">
                <div className="text-[13px] font-semibold">김현대</div>
                <div className="text-xs text-ink-subtle">hyundae.kim@hmg.com · Super Admin</div>
              </div>
              {(
                [
                  { icon: 'user' as IconName, label: '마이페이지' },
                  { icon: 'settings' as IconName, label: '개인 설정' },
                  { icon: 'logout' as IconName, label: '로그아웃' },
                ] as const
              ).map((m) => (
                <button
                  key={m.label}
                  type="button"
                  onClick={() => {
                    setMenu(null)
                    toast(`${m.label} — 본개발에서 연결됩니다`)
                  }}
                  className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-[13px] text-ink-muted transition-colors hover:bg-chip hover:text-ink"
                >
                  <Icon name={m.icon} size={15} />
                  {m.label}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} />}
    </div>
  )
}

export function AppShell(props: { active: string; title: string; children: React.ReactNode }) {
  return (
    <ToastProvider>
      <Shell {...props} />
    </ToastProvider>
  )
}
