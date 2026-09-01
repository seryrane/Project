/** LNB 정본 — 셸(AppShell)과 커맨드 팔레트가 **같은 목록**을 본다.
 *  팔레트에 페이지를 손으로 다시 적으면 새 화면이 생길 때마다 어긋난다.
 *  ⚠ 본개발에서는 서버 `GET /api/me/menu` 응답으로 교체 — 소비처는 이 모양만 안다. */

import { menuVisible } from '#/lib/offline'

/** 그림 이름 — 무엇으로 그릴지는 AppShell 의 iconPaths 가 정한다 */
export type IconName =
  | 'board'
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
  | 'chat'
  // 조작 아이콘 — 이모지를 걷어내고 같은 세트의 획으로 그린다 (규약 §22 선 아이콘)
  | 'unlock'
  | 'trash'
  | 'edit'
  | 'bolt'
  | 'calendar'
  | 'print'
  | 'download'
  | 'upload'
  | 'thumbsUp'
  | 'info'
  // 관문 밖에서 손으로 그려지던 모양들 — 화면마다 굵기가 1.5~2.2 로 갈렸다(2026-08-18)
  | 'close'
  | 'chevronDown'
  | 'eye'
  | 'eyeOff'
  | 'sun'
  | 'moon'
  /* 상태를 말하는 모양 — ⚠ **색만으로 가르지 않는다**(규약 §16): 완료·대기·되돌림은
     색이 아니라 **모양**이 먼저 다르다. 그래서 뜻마다 이름이 따로 있다. */
  | 'check'
  | 'clock'
  | 'undo'
  | 'alert'

export interface NavItem {
  key: string
  label: string
  /** 영문명 — 메뉴 관리에서 관리자가 넣는다(서버 nav 정본). 없으면 사전(nav.<key>)이 입힌다 */
  labelEn?: string
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
const navAll: Array<NavSection> = [
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
      // 상태 보드 — 정의서 밖 **제안** 화면(칸반 보기, 2026-08-26 사용자 요청). 채택되면 추적표에 확장으로.
      { key: 'board', label: '상태 보드', icon: 'board', to: '/board' },
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
      // 2026-08-06 되살림: 실제 화면(/alerts)이 생겨 규약 15·17절 위반(갈 곳 없는 메뉴)이
      // 풀렸다 — 서버 자원 리포팅·알림 이력·알림 규칙을 보여준다. GNB 종은 "안 본 것"만
      // 모으고, 이 메뉴는 "지금 상태 + 지난 이력"을 보러 오는 자리라 역할이 다르다.
      { key: 'alerts', label: '시스템 알림', labelEn: 'System Alerts', icon: 'bell', to: '/alerts' },
      { key: 'privacy', label: '개인정보보호', icon: 'lock', to: '/privacy' },
    ],
  },
]

/** LNB·팔레트가 보는 정본.
 *  오프라인 전달본에서는 **핵심 메뉴만** 남긴다 — 항목이 다 빠진 섹션은 제목도 걷는다(§17).
 *  평소 빌드에서는 `menuVisible()` 이 늘 true 라 `navAll` 그대로다. */
export const nav: Array<NavSection> = navAll
  .map((s) => ({ ...s, items: s.items.filter((it) => menuVisible(it.to)) }))
  .filter((s) => s.items.length > 0)
