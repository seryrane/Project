/** LNB 정본 — 셸(AppShell)과 커맨드 팔레트가 **같은 목록**을 본다.
 *  팔레트에 페이지를 손으로 다시 적으면 새 화면이 생길 때마다 어긋난다.
 *  ⚠ 본개발에서는 서버 `GET /api/me/menu` 응답으로 교체 — 소비처는 이 모양만 안다. */

/** 그림 이름 — 무엇으로 그릴지는 AppShell 의 iconPaths 가 정한다 */
export type IconName =
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

export interface NavItem {
  key: string
  label: string
  icon: IconName
  to?: string
  badge?: number
}

export interface NavSection {
  id: string
  title?: string
  items: Array<NavItem>
}

/** ⚠ 이 포털은 두 프로젝트(센터 KPI 품질 ICDAP + IBD 사양서 IDMS)의 합본이다 —
 *  프로젝트는 하나지만 **메뉴가 두 프로젝트를 가른다**. 어느 한쪽 낱말로 전체를
 *  부르지 않는다 (2026-08-06 사용자 교정). */
export const nav: Array<NavSection> = [
  {
    id: 'main',
    items: [
      { key: 'dashboard', label: '대시보드', icon: 'dashboard', to: '/dashboard' },
    ],
  },
  {
    id: 'kpi',
    title: '센터 KPI (ICDAP)',
    items: [
      // FR-074 센터 KPI 대시보드 · FR-075 IVI(임베딩+자체 병행) · FR-070 지표 정의서
      { key: 'analytics', label: '센터 KPI 대시보드', icon: 'stats', to: '/analytics' },
      { key: 'kpi-ivi', label: '인포 IVI KPI', icon: 'report', to: '/kpi-ivi' },
      { key: 'kpi-metrics', label: '지표 관리', icon: 'doc', to: '/kpi-metrics' },
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
    title: '사양서 (IDMS)',
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
      { key: 'notice', label: '공지사항', icon: 'bell', to: '/notice' },
      { key: 'qna', label: 'Q&A', icon: 'message', to: '/qna' },
      { key: 'faq', label: 'FAQ', icon: 'help', to: '/faq' },
      { key: 'guide', label: '사용자 가이드', icon: 'book', to: '/guide' },
    ],
  },
  {
    id: 'system',
    title: '시스템',
    items: [
      { key: 'alerts', label: '시스템 알림', icon: 'bell', badge: 3 },
      { key: 'privacy', label: '개인정보보호', icon: 'lock', to: '/privacy' },
    ],
  },
]
