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
  /** 영문명 — EN 화면의 LNB·팔레트가 쓴다. 비우면 기본 번역(사전)으로 나간다 */
  nameEn?: string
  path: string
  icon: string
  active: boolean
  /** 접근 가능 역할 — 권한 관리의 역할과 같은 낱말을 쓴다 */
  roles: Array<string>
  parent?: string
  /** 이 메뉴가 여는 화면의 템플릿 */
  template: TemplateKey
  /** 최소 메뉴 — 권한 없이 모든 역할에 보인다. 권한으로만 가리면 Viewer 의 LNB 가
   *  텅 비어 "로그인해서 볼 게 없는 포털"이 된다. 특히 가이드는 권한이 없는
   *  사람일수록 필요하므로 여기서 가리면 안 된다. */
  minimal?: boolean
  /** 관리자가 화면에서 만든 메뉴 — **이런 메뉴만 템플릿·화면 구성을 편집한다.**
   *  시스템 메뉴(코드로 만든 화면)에 템플릿을 노출하면 실제 화면과 어긋난다
   *  (2026-08-06 사용자 지적). */
  custom?: boolean
  /** 신규 메뉴의 화면 구성 — 템플릿에 따라 쓰는 칸이 다르다 */
  config?: MenuConfig
}

export interface MenuConfig {
  /** 목록+상세형: 표 컬럼 */
  columns?: Array<string>
  /** 목록+상세형: 검색칸 사용 */
  searchable?: boolean
  /** 목록+상세형: 상세가 열리는 표시 영역 (규약 §1) */
  detailSurface?: '우측 패널' | '모달' | '본문 페이지'
  /** 대시보드형: 배치할 위젯 */
  widgets?: Array<string>
  /** 게시판형: 카테고리 (콤마 구분) */
  categories?: string
  /** 게시판형: 작성 가능 등급 */
  writeGrade?: 'Viewer 이상' | 'Editor 이상' | 'Admin 이상'
  /** 문서형: 제목에서 목차 자동 생성 */
  autoToc?: boolean
  /** 빈 화면: 외부 시스템 URL (동적 URL 편입 — 요구사항 "신규 시스템 편입") */
  embedUrl?: string
}

/** 목록+상세형 컬럼 후보 — 신규 메뉴가 고르는 재료 */
export const COLUMN_OPTIONS = ['이름', '상태', '담당자', '수정일', '버전', '카테고리', '태그'] as const

export const menuItems: Array<MenuItem> = [
  { id: 'm-dash', order: 1, name: '대시보드', nameEn: 'Dashboard', path: '/dashboard', icon: 'dashboard', active: true, roles: ['Super Admin', 'Admin', 'Editor', 'Viewer'] , template: 'dashboard' },
  { id: 'm-stats', order: 2, name: '통계 & 분석', nameEn: 'Center KPI Dashboard', path: '/analytics', icon: 'stats', active: true, roles: ['Super Admin', 'Admin', 'Editor', 'Viewer'] , template: 'dashboard' },
  // KPI 하위 두 화면도 메뉴 관리에 실려야 한다 — LNB(nav.ts)에는 있는데 여기 없으면
  // 관리자가 "있는 메뉴를 못 찾는" 화면이 된다 (2026-08-06 문서화 중 발견)
  { id: 'm-kpi-ivi', order: 3, name: '인포 IVI KPI', nameEn: 'Info IVI KPI', path: '/kpi-ivi', icon: 'report', active: true, roles: ['Super Admin', 'Admin', 'Editor', 'Viewer'], parent: 'm-stats', template: 'dashboard' },
  { id: 'm-kpi-metrics', order: 4, name: '지표 관리', nameEn: 'KPI Metrics', path: '/kpi-metrics', icon: 'doc', active: true, roles: ['Super Admin', 'Admin', 'Editor', 'Viewer'], parent: 'm-stats', template: 'list-detail' },
  { id: 'm-members', order: 5, name: '회원 관리', nameEn: 'Members', path: '/members', icon: 'users', active: true, roles: ['Super Admin', 'Admin'] , template: 'list-detail' },
  { id: 'm-roles', order: 6, name: '권한 관리', nameEn: 'Roles & Permissions', path: '/roles', icon: 'shield', active: true, roles: ['Super Admin'] , template: 'list-detail' },
  { id: 'm-menus', order: 7, name: '메뉴 관리', nameEn: 'Menus', path: '/menus', icon: 'menu', active: true, roles: ['Super Admin'] , template: 'list-detail' },
  { id: 'm-specs', order: 8, name: '사양서 관리', nameEn: 'Specifications', path: '/specs', icon: 'doc', active: true, roles: ['Super Admin', 'Admin', 'Editor', 'Viewer'] , template: 'list-detail' },
  { id: 'm-specs-list', order: 9, name: '사양서 목록', nameEn: 'Spec List', path: '/specs', icon: 'doc', active: true, roles: ['Super Admin', 'Admin', 'Editor', 'Viewer'], parent: 'm-specs' , template: 'list-detail' },
  { id: 'm-specs-detail', order: 10, name: '사양서 상세', nameEn: 'Spec Detail', path: '/specs/:id', icon: 'doc', active: true, roles: ['Super Admin', 'Admin', 'Editor', 'Viewer'], parent: 'm-specs' , template: 'document' },
  { id: 'm-approvals', order: 11, name: '승인 관리', nameEn: 'Approvals', path: '/approvals', icon: 'approve', active: true, roles: ['Super Admin', 'Admin', 'Editor'] , template: 'list-detail' },
  { id: 'm-deploys', order: 12, name: '배포 관리', nameEn: 'Deployments', path: '/deploys', icon: 'deploy', active: true, roles: ['Super Admin', 'Admin'] , template: 'list-detail' },
  { id: 'm-engine', order: 13, name: '검증엔진 관리', nameEn: 'Validation Engines', path: '/validation-engine', icon: 'engine', active: true, roles: ['Super Admin', 'Admin'] , template: 'list-detail' },
  { id: 'm-results', order: 14, name: '검증 결과 조회', nameEn: 'Validation Results', path: '/validation-results', icon: 'search', active: true, roles: ['Super Admin', 'Admin', 'Editor'] , template: 'list-detail' },
  { id: 'm-reports', order: 15, name: '검증 리포트', nameEn: 'Validation Reports', path: '/validation-reports', icon: 'report', active: true, roles: ['Super Admin', 'Admin', 'Editor'] , template: 'board' },
  { id: 'm-notice', order: 16, name: '공지사항', nameEn: 'Notices', path: '/notice', icon: 'bell', active: true, roles: [], minimal: true, template: 'board' },
  { id: 'm-qna', order: 17, name: 'Q&A', nameEn: 'Q&A', path: '/qna', icon: 'message', active: true, roles: [], minimal: true, template: 'board' },
  {
    id: 'm-faq',
    order: 18,
    name: 'FAQ',
    nameEn: 'FAQ',
    path: '/faq',
    icon: 'help',
    // ⚠ active:false 시드였다 — minimal(최소 메뉴: 권한 없이 모두에게)과 모순인 데다,
    // 관문(menuStore)이 생기면서 LNB 에서 FAQ 가 정말 사라진다. 끄기 시연은 화면 토글로.
    active: true,
    roles: [],
    minimal: true,
    template: 'board',
  },
  { id: 'm-guide', order: 19, name: '사용자 가이드', nameEn: 'User Guide', path: '/guide', icon: 'book', active: true, roles: [], minimal: true, template: 'document' },
  { id: 'm-privacy', order: 20, name: '개인정보보호', nameEn: 'Privacy', path: '/privacy', icon: 'lock', active: true, roles: ['Super Admin'] , template: 'document' },
  // 2026-08-06: LNB(nav.ts)에 되살린 '시스템 알림'도 메뉴 관리에 실어야 한다 — LNB 에는
  // 있는데 여기 없으면 관리자가 "있는 메뉴를 못 찾는" 화면이 된다 (m-kpi-ivi 와 같은 이유)
  { id: 'm-alerts', order: 21, name: '시스템 알림', nameEn: 'System Alerts', path: '/alerts', icon: 'bell', active: true, roles: ['Super Admin', 'Admin'] , template: 'dashboard' },
]

// 접근 역할 목록은 여기 두지 않는다 — 권한 관리 정본(data/roles.ts)에서 파생한다
