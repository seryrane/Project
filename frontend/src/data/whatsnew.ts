/** 새 기능 정본 (규약 19절) — 기능을 배포하면 여기에 같이 적는다.
 *  안 적으면 또 아무도 모르는 기능이 된다. 최신이 맨 위. */

export interface WhatsNewEntry {
  date: string
  title: string
  desc: string
  /** 갈 곳 — "생겼대요"만 알리고 어디 있는지 안 알려 주면 안내가 아니다 */
  to: string
  toLabel: string
}

export const WHATSNEW: Array<WhatsNewEntry> = [
  {
    date: '2026.08.05',
    title: '커뮤니티가 열렸습니다 — 공지·Q&A·FAQ',
    desc: '모든 역할이 볼 수 있습니다. 막히면 FAQ 먼저, 없으면 Q&A 에 질문을 남기세요.',
    to: '/notice',
    toLabel: '공지사항 열기',
  },
  {
    date: '2026.08.05',
    title: '내 권한을 사람 말로 — [내가 할 수 있는 것]',
    desc: '우측 상단 아바타 메뉴에서 내가 지금 무엇을 할 수 있는지 확인합니다.',
    to: '/guide',
    toLabel: '역할과 권한 안내',
  },
  {
    date: '2026.08.04',
    title: '권한에 조회 범위가 생겼습니다',
    desc: '같은 조회 권한이라도 내 것만 · 우리 팀 · 전체가 갈립니다. 회원 상세 권한 탭에서 파생 표시를 확인하세요.',
    to: '/roles',
    toLabel: '권한 관리 열기',
  },
  {
    date: '2026.08.03',
    title: '메뉴에 화면 템플릿 — 추가할 화면을 그림으로 고릅니다',
    desc: '새 메뉴를 만들 때 대시보드형·목록형 등 와이어프레임으로 UI 를 미리 구상합니다.',
    to: '/menus',
    toLabel: '메뉴 관리 열기',
  },
  {
    date: '2026.08.02',
    title: '대시보드 위젯을 역할 프리셋으로',
    desc: '역할에 기능이 붙거나 떨어지면 추천 배치가 따라 바뀝니다. 크기·위치는 [위젯 편집]에서.',
    to: '/dashboard',
    toLabel: '대시보드 열기',
  },
]

const SEEN_KEY = 'whatsnew.seen.v1'

/** 안 본 새 기능 수 — 배지는 가장 최근 날짜 하나로 센다(항목별 읽음 표시를 두지 않는다:
 *  "다 읽었는데 배지가 남았다"를 만들지 않기 위해). */
export function unseenCount(): number {
  try {
    const seen = localStorage.getItem(SEEN_KEY) ?? ''
    return WHATSNEW.filter((e) => e.date > seen).length
  } catch {
    return 0
  }
}

/** 목록을 한 번 열면 배지가 내려간다 */
export function markSeen() {
  try {
    localStorage.setItem(SEEN_KEY, WHATSNEW[0].date)
  } catch {
    // localStorage 없는 환경(SSR)에서는 조용히 지나간다 — 배지도 0으로 계산된다
  }
}
