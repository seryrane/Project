/** 권한 관리 mock — 역할(등급) × 메뉴 × 액션 × 조회 범위 매트릭스.
 *  ⚠ 본개발에서 서버 RBAC 로 교체 — 화면은 이 구조만 그린다.
 *  설계 배경: docs/RBAC_설계노트.md (acrofuture 이식분) */

export const ACTIONS = ['조회', '생성', '수정', '삭제', '업로드', '다운로드', '승인'] as const
export type Action = (typeof ACTIONS)[number]

/** 액션의 사람 말 — 체크칸에 권한 이름만 뜨면 아무도 못 고른다.
 *  danger 는 되돌리기 어렵거나 밖으로 나가는 액션 — 화면이 ⚠ 를 붙인다. */
export const ACTION_SPECS: Record<Action, { hint: string; danger?: boolean }> = {
  조회: { hint: '화면과 데이터를 봅니다 — 어디까지는 [조회 범위]가 정합니다' },
  생성: { hint: '새 항목을 만듭니다' },
  수정: { hint: '기존 항목을 고칩니다' },
  삭제: { hint: '항목을 지웁니다 — 되돌릴 수 없는 경우가 있습니다', danger: true },
  업로드: { hint: '파일을 올려 데이터를 반영합니다 (엑셀 등)' },
  다운로드: { hint: '데이터를 파일로 내려받습니다 — 반출 경로가 됩니다', danger: true },
  승인: { hint: '실제 승인·배포가 여기서 처리됩니다 — 되돌리기 어렵습니다', danger: true },
}

/** 조회 범위 — 화면에 들어갈 수 있는가와 무엇까지 보이는가는 다른 문제다.
 *  넓은 것이 좁은 것을 포함한다: own < team < all (따로 여러 칸 켜게 하지 않는다). */
export const SCOPES = ['own', 'team', 'all'] as const
export type ScopeKey = (typeof SCOPES)[number]
export const SCOPE_LABEL: Record<ScopeKey, string> = { own: '내 것만', team: '우리 팀', all: '전체' }
/** 매트릭스 칸에 들어가는 짧은 말 */
export const SCOPE_SHORT: Record<ScopeKey, string> = { own: '내', team: '팀', all: '전' }

export const MENUS = [
  '대시보드',
  '통계 & 분석',
  '회원 관리',
  '권한 관리',
  '메뉴 관리',
  '사양서 관리',
  '승인 관리',
  '배포 관리',
  '검증엔진',
  '커뮤니티',
] as const

/** 역할에 붙은 사람 한 줄 — 어느 범위인지가 함께 와야 뜻이 있다 ("팀장"은 어느 팀의 팀장인가) */
export interface RoleHolder {
  name: string
  scopeLabel: string
}

export interface RoleDef {
  key: string
  name: string
  desc: string
  /** 시스템 기본 역할 — 삭제 불가 */
  system: boolean
  assigned: number
  matrix: Record<string, Array<Action>>
  /** 메뉴별 조회 범위 — 조회가 켜진 메뉴에만 뜻이 있다. 없으면 '전체' */
  scope?: Partial<Record<string, ScopeKey>>
  /** 대표 보유자 — assigned 가 이보다 크면 화면이 "외 N명"을 붙인다 */
  holders: Array<RoleHolder>
}

/** 조회 범위를 읽는 유일한 길 — 기본값 판단이 화면마다 흩어지면 언젠가 어긋난다 */
export function scopeOf(role: RoleDef, menu: string): ScopeKey {
  return role.scope?.[menu] ?? 'all'
}

const ALL: Array<Action> = ['조회', '생성', '수정', '삭제', '업로드', '다운로드', '승인']

export const roleDefs: Array<RoleDef> = [
  {
    key: 'super',
    name: 'Super Admin',
    desc: '전체 시스템 관리 권한 — 회원·권한·메뉴 관리 포함',
    system: true,
    assigned: 2,
    matrix: {
      대시보드: ['조회'],
      '통계 & 분석': ['조회', '다운로드'],
      '회원 관리': ['조회', '생성', '수정', '삭제'],
      '권한 관리': ['조회', '생성', '수정', '삭제'],
      '메뉴 관리': ['조회', '생성', '수정', '삭제'],
      '사양서 관리': ALL,
      '승인 관리': ['조회', '승인'],
      '배포 관리': ['조회', '생성', '승인'],
      검증엔진: ['조회', '생성', '수정', '삭제'],
      커뮤니티: ['조회', '생성', '수정', '삭제'],
    },
    holders: [
      { name: '김현대', scopeLabel: '전체' },
      { name: '박서준', scopeLabel: '전체' },
    ],
  },
  {
    key: 'admin',
    name: 'Admin',
    desc: '서비스 운영 및 모니터링 권한 — 배포·검증 운영',
    system: true,
    assigned: 5,
    matrix: {
      대시보드: ['조회'],
      '통계 & 분석': ['조회', '다운로드'],
      '회원 관리': ['조회'],
      '권한 관리': ['조회'],
      '메뉴 관리': ['조회'],
      '사양서 관리': ['조회', '생성', '수정', '업로드', '다운로드'],
      '승인 관리': ['조회', '승인'],
      '배포 관리': ['조회', '생성', '승인'],
      검증엔진: ['조회', '생성', '수정'],
      커뮤니티: ['조회', '생성'],
    },
    holders: [
      { name: '박준혁', scopeLabel: '플랫폼운영팀' },
      { name: '이수진', scopeLabel: '전동화기술팀' },
      { name: '정민호', scopeLabel: 'IT 전략팀' },
    ],
  },
  {
    key: 'editor',
    name: 'Editor',
    desc: '사양서 작성·수정 권한, 승인 요청 가능',
    system: true,
    assigned: 18,
    matrix: {
      대시보드: ['조회'],
      '통계 & 분석': ['조회'],
      '사양서 관리': ['조회', '생성', '수정', '업로드', '다운로드'],
      '승인 관리': ['조회'],
      '배포 관리': ['조회'],
      검증엔진: ['조회'],
      커뮤니티: ['조회', '생성'],
    },
    scope: {
      '통계 & 분석': 'team',
      '사양서 관리': 'team',
      '승인 관리': 'own',
      '배포 관리': 'team',
      검증엔진: 'team',
    },
    holders: [
      { name: '김민준', scopeLabel: 'IT 전략팀' },
      { name: '이서연', scopeLabel: '전동화기술팀' },
    ],
  },
  {
    key: 'viewer',
    name: 'Viewer',
    desc: '사양서·지표 조회 전용 권한',
    system: true,
    assigned: 41,
    matrix: {
      대시보드: ['조회'],
      '통계 & 분석': ['조회'],
      '사양서 관리': ['조회', '다운로드'],
      커뮤니티: ['조회'],
    },
    scope: {
      '통계 & 분석': 'team',
      '사양서 관리': 'team',
    },
    holders: [
      { name: '한동현', scopeLabel: '법무팀' },
      { name: '최수진', scopeLabel: '마케팅팀' },
    ],
  },
]

/** 카드 미리보기 축 — 대표 메뉴 4 × 대표 액션 3 (전체는 편집 매트릭스에서) */
export const PREVIEW_MENUS = ['사양서 관리', '승인 관리', '배포 관리', '회원 관리'] as const
export const PREVIEW_ACTIONS: Array<Action> = ['조회', '수정', '승인']
