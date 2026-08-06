// 아이콘 등록소 — LNB·GNB·알림이 다 같은 svg 세트를 쓴다. 이름(IconName) 하나로
// 어디서든 같은 획을 그리게 해서, 아이콘을 바꿀 땐 여기 한 곳만 고치면 된다.
import type { IconName } from '#/data/nav'

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

export function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
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
