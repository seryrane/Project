import { useEffect, useRef, useState } from 'react'
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
import { Icon } from './Icon'
import { Modal } from './Modal'
import { MotionRoot } from './motion'
import { MyAbilities } from './MyAbilities'
import { Popover } from './Popover'
import { Preferences } from './Preferences'
import { useToast } from './toast'

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
  /* ⚠ 레일(접힘)에서는 **이름표를 붙인다.** 아이콘만 남는데 이름을 알 길이 "호버해서
     사이드바를 통째로 펼치기"뿐이었다 — 어느 아이콘인지 확인하려고 매번 레일을 펴야 하면
     접어 둔 뜻이 없다. 펼친 상태에서는 글자가 이미 있으므로 붙이지 않는다(중복 툴팁은
     마우스만 성가시게 한다). 다만 **말줄임된 긴 이름**은 펼친 상태에서도 붙여 준다. */
  const tip = rail ? item.label : undefined
  const className = `relative mb-0.5 flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors ${
    active
      ? 'bg-gradient-to-r from-primary to-accent2 font-semibold text-white shadow-[0_2px_10px_var(--color-glow)]'
      : 'text-sidebar-ink hover:bg-sidebar-hover hover:text-sidebar-strong'
  }`
  const inner = (
    <>
      <span className="flex min-w-0 items-center gap-2.5">
        <span className={active ? 'text-white' : 'text-sidebar-ink'}>
          <Icon name={item.icon} />
        </span>
        <span className="truncate whitespace-nowrap">{item.label}</span>
      </span>
      {item.badge != null && (
        <span
          /* ⚠ 활성 항목의 바탕은 **두 테마 모두 보라 그라디언트**라, 그 위에서는 white 가
             맞다(사이드바에서 white/* 를 남긴 유일한 자리). 비활성은 사이드바 면을 타므로 토큰 */
          className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-semibold tabular-nums ${
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
    <Link to={item.to} className={className} onClick={onSelect} title={tip}>
      {inner}
    </Link>
  ) : (
    <button type="button" className={className} onClick={onSelect} title={tip}>
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

/** 본문 폭 — 표·대시보드는 설계서 폭(1680), 글을 읽는 화면은 읽기 폭(960) */
export type ContentWidth = 'data' | 'doc'

/**
 * ⚠⚠ **라우트가 바뀌면 이 셸이 통째로 다시 마운트된다** — 화면마다 자기 `<AppShell>` 을
 * 그리기 때문이다. 그래서 사이드바 상태를 `useState` 초기값 + `useEffect(localStorage)` 로
 * 두면, 메뉴를 누를 때마다 **초기값이 한 프레임 보였다가 저장값으로 되돌아간다** —
 * 접어 둔 카테고리가 순간 전부 펴졌다 다시 접히는 깜빡임이 그것이다(2026-08-13 사용자 지적).
 *
 * 모듈 스코프에 담아 두면 마운트를 넘어 살아남아 **첫 렌더부터 제 값**으로 그린다.
 * ⚠ 그런데도 초기값을 여기서 `localStorage` 로 채우지는 않는다 — 서버에는 localStorage 가
 * 없어서 SSR 결과와 어긋나고, 그러면 수화 때 화면이 통째로 다시 그려진다.
 * 첫 방문에서만 효과가 한 번 읽어 이 상자를 채우고, 그다음부터는 상자가 답한다.
 */
const lnbCache: { collapsed: Record<string, boolean> | null; pinned: boolean | null } = {
  collapsed: null,
  pinned: null,
}

function Shell({
  active,
  title,
  width = 'data',
  children,
}: {
  active: string
  title: string
  /** 본문 폭 — 'data'(표·대시보드, 1680) 기본, 'doc'(글 읽는 화면, 960) */
  width?: ContentWidth
  children: React.ReactNode
}) {
  const { theme, toggle } = useTheme()
  const { locale, setLocale, t, tf } = useI18n()
  const toast = useToast()
  const navigate = useNavigate()
  // 화면을 옮겨도 사이드바 모양이 그대로여야 한다 — 첫 렌더부터 상자(lnbCache)의 값으로
  // 그린다. 상자가 비어 있는 첫 방문에만 기본값으로 그리고, 아래 효과가 한 번 채운다
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => lnbCache.collapsed ?? {})
  // 좁은 화면(<720px)에서 사이드바는 본문을 덮는 서랍이다 — 규약 §8.
  const [navOpen, setNavOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  // LNB 핀 — 해제하면 아이콘 레일로 접히고, 올리면 다시 펴진다 (데스크톱 전용)
  const [pinned, setPinned] = useState(() => lnbCache.pinned ?? true)
  const [menu, setMenu] = useState<null | 'bell' | 'user'>(null)
  // 팝오버는 **연 조작에 매달린다** — 자리를 화면 끝에서 손으로 재던 것(`right-24`)을
  // 걷고 이 두 ref 에서 잰다. GNB 에 버튼이 하나 늘어도 따라온다 (규약 §1 팝오버 절)
  const bellRef = useRef<HTMLButtonElement>(null)
  const userRef = useRef<HTMLButtonElement>(null)
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

  // ⚠ **첫 방문에서 한 번만 읽는다.** 상자가 이미 차 있으면 건드리지 않는다 —
  //   화면을 옮길 때마다 다시 읽으면 그때마다 한 프레임 기본값이 보인다(깜빡임의 원인).
  //   수화 뒤에 읽는 것은 그대로다: 서버에는 localStorage 가 없다.
  useEffect(() => {
    if (lnbCache.collapsed !== null) return
    let saved: Record<string, boolean> = {}
    try {
      const raw = localStorage.getItem('lnb-collapsed')
      if (raw) saved = JSON.parse(raw) as Record<string, boolean>
    } catch {
      // 옛 판이 남긴 깨진 값 — 무시하고 기본(전부 펼침)으로 간다. 메뉴가 안 보이는 것보다 낫다
    }
    const savedPin = localStorage.getItem('lnb-pinned') !== '0'
    lnbCache.collapsed = saved
    lnbCache.pinned = savedPin
    setCollapsed(saved)
    setPinned(savedPin)
  }, [])
  const togglePin = () => {
    setPinned((p) => {
      const next = !p
      lnbCache.pinned = next
      localStorage.setItem('lnb-pinned', next ? '1' : '0')
      return next
    })
  }
  const toggleSection = (id: string) => {
    setCollapsed((c) => {
      const next = { ...c, [id]: !c[id] }
      lnbCache.collapsed = next
      localStorage.setItem('lnb-collapsed', JSON.stringify(next))
      return next
    })
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((v) => !v)
      }
      // ⚠ Esc 는 여기서 처리하지 않는다 — 팝오버 관문(Popover)이 자기 Esc 를 갖는다.
      //   두 곳에서 같은 키를 잡으면 나중에 한쪽만 고치게 된다 (작업 규율 1)
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
          className="fixed inset-0 z-backdrop bg-black/65 pc:hidden"
        />
      )}

      {/* 한 요소가 두 역할을 한다 — 넓은 화면에서는 **본문 위로 펼쳐지는 붙박이**(z-panel),
          좁은 화면에서는 본문을 덮는 **서랍**(z-modal). 층을 하나로 박으면 한쪽이 반드시
          틀린다: 늘 z-panel 이면 좁은 화면에서 서랍이 가림막 아래로 들어가고, 늘 z-modal
          이면 넓은 화면에서 사이드바가 덮개 위에 남는다 (규약 §8 사다리).
          ⚠ **`z-nav`(헤더와 같은 층)로 두면 안 된다** — 레일이 호버로 펴질 때 본문 위로
          넘어가는데, 헤더도 본문 컬럼 안에 있어서 DOM 순서상 헤더가 펴진 메뉴를 덮는다
          (2026-08-13 사용자 지적 "LNB가 헤더에 가려짐". styles.css 사다리 주석 참고) */}
      <aside
        className={`group/rail fixed inset-y-0 left-0 z-modal flex w-60 flex-col overflow-x-hidden border-r border-sidebar-line bg-sidebar text-sidebar-ink transition-[transform,width] duration-200 pc:z-panel pc:translate-x-0 ${
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
              {/* ⚠ 제품 이름이 `text-white` 로 박혀 있었다 — 라이트에서 기둥을 밝히자
                  **흰 기둥 위 흰 글자**가 되어 제품 이름이 통째로 사라졌다(2026-08-13 실측).
                  사이드바 안의 강한 글자는 토큰(`sidebar-strong`)이 정한다 */}
              <span className="truncate text-sm font-semibold text-sidebar-strong">HMG Admin</span>
              {/* 사이드바 안이라 primary 가 아니라 sidebar-accent 다 — 기둥이 어두울 때
                  라이트의 primary(원색 남색)를 그대로 쓰면 안 보인다. 밝은 기둥에서는
                  이 토큰이 곧 primary 다(styles.css 사이드바 절) */}
              <span className="rounded-full bg-sidebar-accent/15 px-1.5 py-px text-[10px] font-semibold text-sidebar-accent">
                PoC
              </span>
            </div>
            <div className="text-xs text-sidebar-ink">{t('brand.tagline')}</div>
          </div>
          <button
            type="button"
            onClick={togglePin}
            aria-label={pinned ? '메뉴 접기' : '메뉴 고정'}
            title={pinned ? '메뉴 접기' : '메뉴 고정'}
            className={`hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sidebar-ink transition-colors hover:bg-sidebar-hover hover:text-sidebar-strong pc:flex ${railHide}`}
          >
            <span className={pinned ? '' : 'rotate-45'}>
              <Icon name="pin" size={15} />
            </span>
          </button>
        </div>

        {/* 스크롤바는 숨기고, 아래에 더 있다는 신호는 하단 페이드가 말한다 */}
        <nav className="scrollbar-hidden relative flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-3 pb-4 [mask-image:linear-gradient(to_bottom,black_calc(100%-28px),transparent)]">
          {displayNav.map((section) => {
            /* ⚠⚠ **레일에서는 접힘을 적용하지 않는다** (2026-08-13 사용자 지적: "호버 시와
               아닐 때 위치가 너무 위아래로 움직임", 그리고 그 앞의 "고정핀 해제 해봐").
               접힘은 **펼친 사이드바에서 목록을 줄이는 장치**다. 아이콘만 남는 레일에서는
               이미 목록이 최소인데 접힘까지 걸리면 두 가지가 한꺼번에 망가진다:
               ① 접힌 섹션의 아이콘이 통째로 사라져 **아이콘 레일이 아이콘을 삼킨다**
                  (실제로 대시보드 아이콘 하나만 남은 화면이 나왔다)
               ② 호버로 펴는 순간 접힌 것이 되살아나며 줄 수가 확 바뀌어 **화면이 튄다**
               레일에서 항목 집합을 항상 같게 두면, 호버는 **라벨만 나타나는 일**이 된다. */
            const isCollapsed = !rail && collapsed[section.id]
            return (
              <div key={section.id} className="mt-2 first:mt-0">
                {/* ⚠ 레일에서는 **이름표**, 펼친 상태에서는 **접는 버튼**.
                    레일은 접힘이 안 먹는 자리라(위 isCollapsed 주석) 버튼으로 두면
                    눌러도 아무 일이 안 일어난다 — 안 되는 조작을 놔두느니 조작이 아닌
                    것으로 만든다(규약 §21 "화면이 자기 상태를 말한다"). 체브론도 같이 뺀다.
                    ⚠ 글자 밝기는 낮추지 않는다 — LNB 에서 가장 흐린 글자였다(2.96:1,
                    2026-08-06 전수 감사). "덜 중요하다"는 굵기·크기가 이미 말한다. */}
                {section.title ? (
                  rail ? (
                    <div
                      className={`truncate whitespace-nowrap px-2 py-1.5 text-xs font-semibold tracking-wide text-sidebar-ink ${railHide}`}
                    >
                      {section.title}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleSection(section.id)}
                      className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs font-semibold tracking-wide text-sidebar-ink transition-colors hover:text-sidebar-strong"
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
                  )
                ) : null}
                <div
                  className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                    isCollapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'
                  }`}
                >
                  <div
                    className={`min-h-0 overflow-hidden ${
                      section.title && !rail ? 'ml-2 border-l border-sidebar-line pl-2' : ''
                    } ${section.title && rail ? 'pc:group-hover/rail:ml-2 pc:group-hover/rail:border-l pc:group-hover/rail:border-sidebar-line pc:group-hover/rail:pl-2' : ''}`}
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
        <div className={`whitespace-nowrap border-t border-sidebar-line px-5 py-4 text-xs text-sidebar-ink ${railHide}`}>
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
        {/* 글라스 헤더 — blur 에 saturate 를 얹으면 비쳐 보이는 색이 탁해지지 않는다.
            ⚠ 면은 `topbar` 토큰이다(styles.css). 캔버스와 같은 색(`bg-canvas/75`)이면
            라이트에서 헤더와 본문이 붙어 버린다 — 2026-08-11 사용자 지적으로 갈랐다 */}
        <header className="sticky top-0 z-nav flex h-14 items-center justify-between gap-3 border-b border-topbar-line bg-topbar px-4 shadow-[var(--shadow-topbar)] backdrop-blur-md backdrop-saturate-150 pc:px-8">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              aria-label="메뉴 열기"
              onClick={() => setNavOpen(true)}
              /* ⚠ 이 버튼은 **헤더**에 있다(사이드바가 아니다) — `white/5` 를 쓰면 라이트의
                 흰 헤더 위에서 호버가 아예 안 보인다. 본문 쪽 조작 면 토큰을 쓴다 */
              className="-ml-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-chip pc:hidden"
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
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-hairline bg-field text-ink-muted transition-colors hover:text-ink pc:hidden"
            >
              <Icon name="search" size={16} />
            </button>
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="hidden h-9 w-52 items-center justify-between rounded-lg border border-hairline bg-field px-3 text-[13px] text-ink-subtle transition-colors hover:border-primary/40 hover:text-ink-muted pc:flex"
            >
              <span className="flex min-w-0 items-center gap-2">
                <Icon name="search" size={14} />
                <span className="truncate">{t('gnb.searchPlaceholder')}</span>
              </span>
              <kbd className="rounded-md border border-hairline bg-chip px-1.5 py-0.5 text-[10px] text-ink-muted">⌘K</kbd>
            </button>
            {/* ⚠ 여기 있던 챗봇 💬 는 **걷었다** (2026-08-13). 진입점이 셋이었다 —
                헤더 💬 · 떠 있는 버튼 · ⌘K. 아래 FAB 주석에는 "헤더는 좁은 화면에서
                접히는 줄이라" 헤더에서 옮겼다고 적혀 있는데 **헤더 쪽이 안 걷혀서**,
                옮긴 게 아니라 늘어난 상태였다. 게다가 여기만 아이콘이 아니라 **이모지
                문자**라 같은 기능이 화면에서 두 모양이었다(글꼴 따라 모양이 변한다).
                어디서나 같은 것을 여는 물건은 어디서나 **한 자리**에 있어야 한다. */}
            {/* 언어는 사람마다 (규약 §4-1) — 현재 언어를 표시하고 누르면 전환 */}
            <button
              type="button"
              onClick={() => setLocale(locale === 'ko' ? 'en' : 'ko')}
              aria-label="언어 전환 / Switch language"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-hairline bg-field text-xs font-bold text-ink-muted transition-colors hover:text-ink"
            >
              {locale === 'ko' ? '한' : 'EN'}
            </button>
            <button
              type="button"
              onClick={toggle}
              aria-label="테마 전환"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-hairline bg-field text-ink-muted transition-colors hover:text-ink"
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
              ref={bellRef}
              type="button"
              aria-label={`알림 ${unread}건`}
              aria-expanded={menu === 'bell'}
              aria-haspopup="dialog"
              onClick={() => setMenu(menu === 'bell' ? null : 'bell')}
              className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-hairline bg-field text-ink-muted transition-colors hover:text-ink"
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
              ref={userRef}
              type="button"
              aria-label="계정 메뉴"
              aria-expanded={menu === 'user'}
              aria-haspopup="dialog"
              onClick={() => setMenu(menu === 'user' ? null : 'user')}
              className="flex items-center gap-2.5 rounded-lg px-1 py-0.5 transition-colors hover:bg-chip"
            >
              <Avatar name={meInfo.name} size={30} />
              <span className="hidden text-left leading-tight pc:block">
                <span className="block text-[13px] font-semibold">{meInfo.name}</span>
                <span className="block text-xs text-ink-subtle">{meInfo.title}</span>
              </span>
            </button>
          </div>
        </header>
        {/* 본문 폭은 **화면 종류가 고른다** (styles.css 의 container-data/doc).
            한 값(예전 max-w-7xl)이 두 일을 하면 1920 에서 표는 좁고 글은 넓다 —
            데이터형은 설계서 폭 1680 까지 펴고, 글 읽는 화면은 960 에서 멈춘다. */}
        <main
          className={`relative mx-auto w-full flex-1 px-4 py-6 pc:px-8 pc:py-8 ${
            width === 'doc' ? 'max-w-doc' : 'max-w-data'
          }`}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -top-20 right-24 h-64 w-64 rounded-full bg-primary/10 blur-[100px]"
          />
          <div className="relative">{children}</div>
        </main>
      </div>

      {/* GNB 팝오버 — 자리·투명막·Esc·포커스 복귀는 전부 관문(Popover)이 지킨다.
          예전에는 여기서 `right-3 top-16 pc:right-24` 로 **화면 끝에서 손으로 재고** 있었고,
          배경막이 `<button class="fixed inset-0">` 이라 탭 순서에 유령 버튼이 끼었다 */}
      {menu === 'bell' && (
        <Popover
          anchor={bellRef}
          onClose={() => setMenu(null)}
          label={t('gnb.notifications')}
          width={340}
        >
          <div>
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
              <div className="border-t border-hairline px-4 py-2.5 text-xs text-ink-subtle">
                {t('gnb.bell.footer')}
              </div>
          </div>
        </Popover>
      )}
      {menu === 'user' && (
        <Popover anchor={userRef} onClose={() => setMenu(null)} label="계정 메뉴" width={224}>
          <div className="py-1.5">
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
        </Popover>
      )}

      {/*
        떠 있는 [물어보기] 버튼 — 자매 프로젝트(acrofuture)가 헤더에서 여기로 옮긴 이유를
        우리도 그대로 겪었다: **헤더는 좁은 화면에서 접히는 줄이라 늘 있는 자리가 아니고**,
        아이콘 하나는 다른 조작들 사이에서 눈에 안 띈다(2026-08-06 사용자: "챗봇은 어디에도
        안 보이는데"). 어디서나 같은 것을 여는 물건은 **어디서나 같은 자리**에 있어야 한다.

        자리 다툼은 미리 갈라 뒀다 — 좁은 화면에서 토스트는 이 버튼 **위로** 쌓고,
        넓은 화면에서는 토스트가 아예 우측 상단으로 비켜서 겹치지 않는다(toast.tsx).
        층은 `z-fab` — 서랍 가림막(`z-backdrop`)·덮개(`z-modal`)보다 **아래**다. 예전에는
        가림막과 똑같이 `z-30` 이라 DOM 순서로 이 버튼이 가림막 위에 있었다: 좁은 화면에서
        **서랍이 열려 있는데 이게 눌리고**, 누르면 서랍 위에 우측패널이 쌓였다
        (규약 §8 "덮개는 쌓지 않는다"를 스스로 깨고 있었다. 2026-08-13 사다리 도입으로 해소).
      */}
      <button
        type="button"
        onClick={() => setAskOpen(true)}
        aria-label={t('ask.title')}
        title={t('ask.title')}
        className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] right-[calc(1rem+env(safe-area-inset-right,0px))] z-fab flex h-[var(--fab-size)] w-[var(--fab-size)] items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent2 text-white shadow-[0_10px_30px_var(--color-glow)] transition-transform hover:-translate-y-0.5 active:translate-y-0"
      >
        <Icon name="chat" size={22} />
      </button>

      {/* ⚠ 팔레트에 **서버가 걸러 준 메뉴**를 내려 준다 — 예전에는 팔레트가 정적
          `data/nav` 를 직접 읽어, 권한이 없어 LNB 에 안 뜨는 화면이 ⌘K 검색에는
          그대로 나왔다(2026-08-13). 정본은 하나여야 한다 */}
      {paletteOpen && (
        <CommandPalette
          nav={serverNav}
          onClose={() => setPaletteOpen(false)}
          onAsk={() => setAskOpen(true)}
        />
      )}

      {/*
        ⚠⚠ 아래 셋은 **2026-08-13 에 우측패널에서 모달로 옮겼다.** 규약 §1 로 재면 셋 다
        "본문과 **대조**하는 것"이 아니라 **"끝내고 닫는 것"**이다 — 물어보기는 묻고 답을
        보고 닫고, 설정은 고르고 닫고, 내 권한은 읽고 닫는다. 뒤 목록을 훑으며 볼 일이 없다.

        자리를 잘못 잡아 둔 대가를 관문이 치르고 있었다: 모달감을 RIGHT 에 두니 우측패널이
        까만 배경막을 깔고 뒤 화면을 잠그게 됐고(모달의 몸가짐), 그 바람에 **정말로 대조가
        필요한 사양서 상세까지** 뒤를 못 보게 됐다. 셋을 제자리로 보내고 나서야 우측패널이
        가리개를 걷을 수 있었다(Drawer.tsx 머리 주석).

        좁은 화면에서 모달은 아래에서 올라오는 시트라 닫기가 엄지 자리에 온다 — 우측패널로
        열 때보다 한 손으로 쓰기 낫다(§1 "모바일에서는 이름은 같고 모양만 바뀐다").
      */}
      {/* 대화형 챗봇 — [그 화면 열기] 는 close 렌더-프롭으로 닫는다(퇴장 애니메이션이
          끝난 뒤 언마운트). 부모의 onClose 를 바로 부르면 애니메이션이 안 돈다.
          메뉴 키 → 경로는 서버 nav(serverNav) 에서 찾는다 */}
      {askOpen && (
        <Modal title={t('ask.title')} onClose={() => setAskOpen(false)} wide>
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
        </Modal>
      )}

      {/* 내가 할 수 있는 것 — 권한 이름이 아니라 사람 말로. 정본은 권한 관리(roleDefs) 파생 */}
      {abilitiesOpen && (
        <Modal title={t('gnb.myAbilities')} onClose={() => setAbilitiesOpen(false)}>
          <MyAbilities />
        </Modal>
      )}

      {/* 개인 설정 — 언어·테마·포인트 색상. 전부 즉시 적용이라 저장 버튼이 없다 */}
      {prefsOpen && (
        <Modal title={t('gnb.settings')} onClose={() => setPrefsOpen(false)}>
          <Preferences theme={theme} onToggleTheme={toggle} />
        </Modal>
      )}
    </div>
  )
}

/** ⚠ ToastProvider 를 여기에 다시 감싸지 않는다 — 루트(`routes/__root.tsx`)가 정본이다.
 *  여기 있으면 **화면 컴포넌트가 Provider 위**에 놓여 화면발 토스트가 조용히 죽는다
 *  (2026-08-11에 그 상태를 발견해서 루트로 올렸다). */
export function AppShell(props: {
  active: string
  title: string
  width?: ContentWidth
  children: React.ReactNode
}) {
  return (
    <MotionRoot>
      <Shell {...props} />
    </MotionRoot>
  )
}
