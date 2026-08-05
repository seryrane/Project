import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'

import { Avatar } from './Avatar'
import { CommandPalette } from './CommandPalette'
import { ToastProvider } from './toast'

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
      { key: 'analytics', label: '통계 & 분석', icon: 'stats' },
    ],
  },
  {
    id: 'admin',
    title: '관리',
    items: [
      { key: 'members', label: '회원 관리', icon: 'users' },
      { key: 'roles', label: '권한 관리', icon: 'shield' },
      { key: 'menus', label: '메뉴 관리', icon: 'menu' },
    ],
  },
  {
    id: 'idms',
    title: '사양 (IDMS)',
    items: [
      { key: 'specs', label: '사양서 관리', icon: 'doc', to: '/specs' },
      { key: 'approvals', label: '승인 관리', icon: 'approve', badge: 1 },
      { key: 'deploys', label: '배포 관리', icon: 'deploy' },
    ],
  },
  {
    id: 'validation',
    title: '검증엔진',
    items: [
      { key: 'engine', label: '검증엔진 관리', icon: 'engine' },
      { key: 'results', label: '검증 결과 조회', icon: 'search' },
      { key: 'reports', label: '검증 리포트', icon: 'report' },
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
  onSelect,
}: {
  item: NavItem
  active: boolean
  // 잎(메뉴 항목)을 고르면 좁은 화면 서랍을 닫는다 — 규약 §8. 가지(섹션)는 그대로 둔다.
  onSelect: () => void
}) {
  const className = `mb-0.5 flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors ${
    active
      ? 'bg-gradient-to-r from-primary to-accent2 font-semibold text-white shadow-[0_2px_10px_var(--color-glow)]'
      : 'text-sidebar-ink hover:bg-white/5 hover:text-white'
  }`
  const inner = (
    <>
      <span className="flex items-center gap-2.5">
        <span className={active ? 'text-white' : 'text-sidebar-ink/70'}>
          <Icon name={item.icon} />
        </span>
        {item.label}
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

export function AppShell({
  active,
  title,
  children,
}: {
  active: string
  title: string
  children: React.ReactNode
}) {
  const { theme, toggle } = useTheme()
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  // 좁은 화면(<720px)에서 사이드바는 본문을 덮는 서랍이다 — 규약 §8.
  const [navOpen, setNavOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <ToastProvider>
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
        className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-white/5 bg-sidebar text-sidebar-ink transition-transform duration-200 pc:translate-x-0 ${
          navOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-2.5 px-5 py-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent2 text-sm font-bold text-white shadow-[0_2px_10px_var(--color-glow)]">
            H
          </span>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-white">HMG Admin</div>
            <div className="text-[11px] text-sidebar-ink/60">통합 관리자 포털</div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto overscroll-contain px-3 pb-4">
          {nav.map((section) => {
            const isCollapsed = collapsed[section.id]
            return (
              <div key={section.id} className="mt-2 first:mt-0">
                {section.title ? (
                  <button
                    type="button"
                    onClick={() =>
                      setCollapsed((c) => ({ ...c, [section.id]: !c[section.id] }))
                    }
                    className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-[11px] font-semibold tracking-wide text-sidebar-ink/45 transition-colors hover:text-sidebar-ink"
                  >
                    {section.title}
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
                      section.title ? 'ml-2 border-l border-white/8 pl-2' : ''
                    }`}
                  >
                    {section.items.map((item) => (
                      <NavRow
                        key={item.key}
                        item={item}
                        active={item.key === active}
                        onSelect={() => setNavOpen(false)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </nav>
        <div className="border-t border-white/5 px-5 py-4 text-[11px] text-sidebar-ink/40">
          프로토타입 v0.3 · 디자인 검토용
        </div>
      </aside>

      <div className="flex min-h-dvh flex-1 flex-col pc:ml-60">
        {/* 앱 헤더는 어떤 덮개도 먹지 않는다 — 지금 어디인지와 나가는 길이 함께 사라진다 (규약 §8) */}
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
          <div className="flex shrink-0 items-center gap-3 pc:gap-4">
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
              className="hidden h-9 w-56 items-center justify-between rounded-lg border border-hairline bg-surface px-3 text-[13px] text-ink-subtle transition-colors hover:border-primary/40 hover:text-ink-muted pc:flex"
            >
              <span className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden>
                  <circle cx="10.5" cy="10.5" r="6" />
                  <path d="M20 20l-5-5" />
                </svg>
                전체 검색...
              </span>
              <kbd className="rounded-md border border-hairline bg-chip px-1.5 py-0.5 text-[10px]">
                ⌘K
              </kbd>
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
            <span className="relative text-ink-muted">
              <Icon name="bell" size={18} />
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-danger-ink" />
            </span>
            <span className="flex items-center gap-2.5">
              <Avatar name="김현대" size={30} />
              <span className="hidden leading-tight pc:block">
                <span className="block text-[13px] font-semibold">김현대</span>
                <span className="block text-[11px] text-ink-subtle">시스템 관리자</span>
              </span>
            </span>
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
      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} />}
    </div>
    </ToastProvider>
  )
}
