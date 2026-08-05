/** 메뉴 관리 mock — 메뉴 동적 등록 + Role 연결 (요구사항 §2).
 *  정본은 서버 메뉴 정의 — LNB·팔레트·권한이 전부 이 목록을 본다. */

/** 화면 템플릿 — 새 메뉴가 어떤 UI 로 열릴지 관리자가 미리 구상한다 */
export type TemplateKey = 'dashboard' | 'list-detail' | 'board' | 'document' | 'blank'

export const TEMPLATES: Array<{ key: TemplateKey; name: string; desc: string }> = [
  { key: 'dashboard', name: '대시보드형', desc: 'KPI 타일 + 차트 위젯 격자' },
  { key: 'list-detail', name: '목록+상세형', desc: '표·필터 + 행 클릭 시 우측 상세' },
  { key: 'board', name: '게시판형', desc: '글 목록 + 검색 + 작성 버튼' },
  { key: 'document', name: '문서형', desc: '목차 + 본문 (가이드·정책 문서)' },
  { key: 'blank', name: '빈 화면', desc: '직접 구성 (외부 URL 임베드 포함)' },
]

export interface MenuItem {
  id: string
  order: number
  name: string
  path: string
  icon: string
  active: boolean
  /** 접근 가능 역할 — 권한 관리의 역할과 같은 낱말을 쓴다 */
  roles: Array<string>
  parent?: string
  /** 이 메뉴가 여는 화면의 템플릿 */
  template: TemplateKey
}

export const menuItems: Array<MenuItem> = [
  { id: 'm-dash', order: 1, name: '대시보드', path: '/dashboard', icon: 'dashboard', active: true, roles: ['Super Admin', 'Admin', 'Editor', 'Viewer'] , template: 'dashboard' },
  { id: 'm-stats', order: 2, name: '통계 & 분석', path: '/analytics', icon: 'stats', active: true, roles: ['Super Admin', 'Admin', 'Editor', 'Viewer'] , template: 'dashboard' },
  { id: 'm-members', order: 3, name: '회원 관리', path: '/members', icon: 'users', active: true, roles: ['Super Admin', 'Admin'] , template: 'list-detail' },
  { id: 'm-roles', order: 4, name: '권한 관리', path: '/roles', icon: 'shield', active: true, roles: ['Super Admin'] , template: 'list-detail' },
  { id: 'm-menus', order: 5, name: '메뉴 관리', path: '/menus', icon: 'menu', active: true, roles: ['Super Admin'] , template: 'list-detail' },
  { id: 'm-specs', order: 6, name: '사양서 관리', path: '/specs', icon: 'doc', active: true, roles: ['Super Admin', 'Admin', 'Editor', 'Viewer'] , template: 'list-detail' },
  { id: 'm-specs-list', order: 7, name: '사양서 목록', path: '/specs', icon: 'doc', active: true, roles: ['Super Admin', 'Admin', 'Editor', 'Viewer'], parent: 'm-specs' , template: 'list-detail' },
  { id: 'm-specs-detail', order: 8, name: '사양서 상세', path: '/specs/:id', icon: 'doc', active: true, roles: ['Super Admin', 'Admin', 'Editor', 'Viewer'], parent: 'm-specs' , template: 'document' },
  { id: 'm-approvals', order: 9, name: '승인 관리', path: '/approvals', icon: 'approve', active: true, roles: ['Super Admin', 'Admin', 'Editor'] , template: 'list-detail' },
  { id: 'm-deploys', order: 10, name: '배포 관리', path: '/deploys', icon: 'deploy', active: true, roles: ['Super Admin', 'Admin'] , template: 'list-detail' },
  { id: 'm-engine', order: 11, name: '검증엔진 관리', path: '/validation-engine', icon: 'engine', active: true, roles: ['Super Admin', 'Admin'] , template: 'list-detail' },
  { id: 'm-results', order: 12, name: '검증 결과 조회', path: '/validation-results', icon: 'search', active: true, roles: ['Super Admin', 'Admin', 'Editor'] , template: 'list-detail' },
  { id: 'm-reports', order: 13, name: '검증 리포트', path: '/validation-reports', icon: 'report', active: true, roles: ['Super Admin', 'Admin', 'Editor'] , template: 'board' },
  { id: 'm-notice', order: 14, name: '공지사항', path: '/notice', icon: 'bell', active: true, roles: ['Super Admin', 'Admin', 'Editor', 'Viewer'] , template: 'board' },
  { id: 'm-qna', order: 15, name: 'Q&A', path: '/qna', icon: 'message', active: true, roles: ['Super Admin', 'Admin', 'Editor', 'Viewer'] , template: 'board' },
  { id: 'm-faq', order: 16, name: 'FAQ', path: '/faq', icon: 'help', active: false, roles: ['Super Admin', 'Admin', 'Editor', 'Viewer'] , template: 'board' },
  { id: 'm-privacy', order: 17, name: '개인정보보호', path: '/privacy', icon: 'lock', active: true, roles: ['Super Admin'] , template: 'document' },
]

// 접근 역할 목록은 여기 두지 않는다 — 권한 관리 정본(data/roles.ts)에서 파생한다
