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
  /* 열린 자물쇠 — 잠금과 **모양**이 다르다(고리가 열려 한쪽으로 서 있다).
     색만 바꾸면 색을 못 가르는 사람에게는 같은 그림이다 (규약 §2 색만으로 가르지 않는다) */
  unlock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2" />
      <path d="M8 10.5V8a4 4 0 0 1 7.7-1.5" />
    </>
  ),
  trash: (
    <>
      <path d="M4.5 6.5h15" />
      <path d="M9.5 6.5V4.5h5v2" />
      <path d="M6.5 6.5 7.4 20a1.5 1.5 0 0 0 1.5 1.4h6.2a1.5 1.5 0 0 0 1.5-1.4l.9-13.5" />
      <path d="M10.5 10v7M13.5 10v7" />
    </>
  ),
  edit: (
    <>
      <path d="M4.5 19.5h4L19 9a2.1 2.1 0 0 0-3-3L5.5 16.5z" />
      <path d="M14.5 6.5 17.5 9.5" />
    </>
  ),
  bolt: <path d="M13.5 3 5.5 13.5H11l-.5 7.5 8-10.5H13z" />,
  calendar: (
    <>
      <rect x="4" y="5.5" width="16" height="15" rx="2" />
      <path d="M4 10h16M9 3.5v4M15 3.5v4" />
    </>
  ),
  print: (
    <>
      <path d="M7.5 9V3.5h9V9" />
      <rect x="4" y="9" width="16" height="7.5" rx="2" />
      <path d="M7.5 14h9v6.5h-9z" />
    </>
  ),
  download: (
    <>
      <path d="M12 4v11" />
      <path d="M7.5 10.5 12 15l4.5-4.5" />
      <path d="M4.5 19.5h15" />
    </>
  ),
  /* 올리기 — 내려받기와 **화살표 방향이 반대**다(색이 아니라 모양이 뜻을 진다) */
  upload: (
    <>
      <path d="M12 19.5V8.5" />
      <path d="M7.5 13 12 8.5l4.5 4.5" />
      <path d="M4.5 4.5h15" />
    </>
  ),
  thumbsUp: (
    <>
      <path d="M7 20.5V10l4-6.5A2 2 0 0 1 14 5l-.8 4.5h5.1a2 2 0 0 1 2 2.4l-1.4 6.2a2 2 0 0 1-2 1.4z" />
      <path d="M7 10.5H4.5v10H7z" />
    </>
  ),
  check: <path d="M5 12.5 9.5 17 19 7" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  undo: (
    <>
      <path d="M3.5 9a8.5 8.5 0 1 1-1 5.5" />
      <path d="M3 4v5h5" />
    </>
  ),
  alert: (
    <>
      <path d="M12 4.5 21 20H3z" />
      <path d="M12 10v4M12 16.6v.4" />
    </>
  ),
  close: <path d="m6 6 12 12M18 6 6 18" />,
  chevronDown: <path d="m6 9 6 6 6-6" />,
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  eyeOff: (
    <>
      <path d="M4 4.5 20 20.5" />
      <path d="M9.6 6.1A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3.3 4" />
      <path d="M6.3 8.1A17.6 17.6 0 0 0 2.5 12S6 18.5 12 18.5c1.2 0 2.2-.2 3.2-.6" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2.2M12 19.3v2.2M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6" />
    </>
  ),
  moon: <path d="M20 13.5A8.5 8.5 0 1 1 10.5 4a6.8 6.8 0 0 0 9.5 9.5Z" />,
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5M12 7.8v.6" />
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
  // 물어보기(챗봇) — 떠 있는 버튼이 쓴다. 이모지 대신 선 아이콘인 이유는 다른
  // 조작들과 같은 굵기·같은 색으로 그려져야 "버튼"으로 읽히기 때문이다
  chat: (
    <>
      <path d="M20.5 12.5c0 3.9-3.8 7-8.5 7-1 0-2-.15-2.9-.42L4 20.5l1.5-3.7A6.6 6.6 0 0 1 3.5 12.5c0-3.9 3.8-7 8.5-7s8.5 3.1 8.5 7Z" />
      <path d="M8.8 12.3h.01M12 12.3h.01M15.2 12.3h.01" />
    </>
  ),
}

/**
 * 크기는 **둘뿐이다** (2026-08-13 정리).
 * 예전에는 부르는 곳마다 14·15·16·17·20·22 를 손으로 적었다 — 글자 사다리와 똑같은 병이다.
 * 15 와 16 은 눈으로 못 가르는데 화면마다 다른 값이 섞이면 리듬만 깨진다.
 *   `sm`(12) — 글자 옆에 붙는 표식(체브론·닫기)
 *   `md`(16) — 메뉴·버튼·목록 등 거의 전부
 *   `lg`(20) — 떠 있는 버튼처럼 혼자 서는 자리
 *   `xl`(28) — 빈 자리 안내처럼 그림이 말을 대신하는 자리
 */
const SIZES = { sm: 12, md: 16, lg: 20, xl: 28 } as const

export function Icon({ name, size = 'md' }: { name: IconName; size?: keyof typeof SIZES }) {
  const px = SIZES[size]
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      /* ⚠⚠ **획 굵기를 크기에서 떼어 낸다.** `strokeWidth` 는 viewBox 단위라 24 칸을 몇 px 로
         그리느냐에 따라 화면 굵기가 달라진다 — 예전 값(1.7)으로 재면 14px 아이콘은 0.99px,
         22px 아이콘은 1.56px 였다(**57% 차이**). 같은 세트인데 자리마다 다른 펜으로 그린 셈이다.
         `non-scaling-stroke` 는 획을 **화면 픽셀**로 고정한다 — 크기를 바꿔도 굵기가 같다.
         ⚠ 이 속성은 상속이 보장되지 않아 styles.css 에서 `[data-icon] *` 로 건다. */
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      data-icon=""
      aria-hidden
      className="shrink-0"
    >
      {iconPaths[name]}
    </svg>
  )
}
