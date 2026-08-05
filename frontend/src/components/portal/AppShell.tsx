import { Avatar } from './Avatar'

interface NavItem {
  label: string
  active?: boolean
  badge?: number
}

interface NavSection {
  title?: string
  items: Array<NavItem>
}

const nav: Array<NavSection> = [
  { items: [{ label: '대시보드' }, { label: '통계 & 분석' }] },
  {
    title: '관리',
    items: [{ label: '회원 관리' }, { label: '권한 관리' }, { label: '메뉴 관리' }],
  },
  {
    title: '사양 (IDMS)',
    items: [
      { label: '사양서 관리', active: true },
      { label: '승인 관리', badge: 1 },
      { label: '배포 관리' },
    ],
  },
  {
    title: '검증엔진',
    items: [{ label: '검증엔진 관리' }, { label: '검증 결과 조회' }, { label: '검증 리포트' }],
  },
  {
    title: '커뮤니티',
    items: [{ label: '공지사항' }, { label: 'Q&A' }, { label: 'FAQ' }, { label: '사용자 가이드' }],
  },
  {
    title: '시스템',
    items: [{ label: '시스템 알림', badge: 3 }, { label: '개인정보보호' }],
  },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-canvas text-ink">
      <aside className="fixed inset-y-0 left-0 flex w-60 flex-col bg-sidebar text-sidebar-ink">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">
            H
          </span>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-white">HMG Admin</div>
            <div className="text-[11px] text-sidebar-ink/60">통합 관리자 포털</div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          {nav.map((section, i) => (
            <div key={i} className="mt-3 first:mt-0">
              {section.title && (
                <div className="px-2 pb-1.5 pt-2 text-[11px] font-semibold tracking-wide text-sidebar-ink/50">
                  {section.title}
                </div>
              )}
              {section.items.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[13px] transition-colors ${
                    item.active
                      ? 'bg-primary font-semibold text-white'
                      : 'text-sidebar-ink hover:bg-white/5'
                  }`}
                >
                  <span>{item.label}</span>
                  {item.badge != null && (
                    <span
                      className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-semibold ${
                        item.active ? 'bg-white/25 text-white' : 'bg-primary text-white'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="border-t border-white/10 px-5 py-4 text-[11px] text-sidebar-ink/50">
          프로토타입 v0.1 · 디자인 검토용
        </div>
      </aside>

      <div className="ml-60 flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-hairline bg-surface px-8">
          <div className="text-[13px] text-ink-subtle">
            HMG Admin <span className="mx-1.5">›</span>
            <span className="font-medium text-ink">사양서 관리</span>
          </div>
          <div className="flex items-center gap-4">
            <input
              placeholder="전체 검색..."
              className="h-9 w-56 rounded-lg border border-hairline bg-canvas px-3 text-[13px] outline-none placeholder:text-ink-subtle focus:border-primary"
            />
            <span className="relative text-ink-muted">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M12 3a6 6 0 0 0-6 6v3.2L4.6 15a1 1 0 0 0 .9 1.5h13a1 1 0 0 0 .9-1.5L18 12.2V9a6 6 0 0 0-6-6Zm-2 15a2 2 0 0 0 4 0"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-danger-ink" />
            </span>
            <span className="flex items-center gap-2.5">
              <Avatar name="김현대" size={30} />
              <span className="leading-tight">
                <span className="block text-[13px] font-semibold">김현대</span>
                <span className="block text-[11px] text-ink-subtle">시스템 관리자</span>
              </span>
            </span>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-8 py-8">{children}</main>
      </div>
    </div>
  )
}
