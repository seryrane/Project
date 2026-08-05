/** 권한 관리 mock — 역할(등급) × 메뉴 × 액션 매트릭스.
 *  ⚠ 본개발에서 서버 RBAC 로 교체 — 화면은 이 구조만 그린다. */

export const ACTIONS = ['조회', '생성', '수정', '삭제', '업로드', '다운로드', '승인'] as const
export type Action = (typeof ACTIONS)[number]

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

export interface RoleDef {
  key: string
  name: string
  desc: string
  /** 시스템 기본 역할 — 삭제 불가 */
  system: boolean
  assigned: number
  matrix: Record<string, Array<Action>>
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
  },
]

/** 카드 미리보기 축 — 대표 메뉴 4 × 대표 액션 3 (전체는 편집 매트릭스에서) */
export const PREVIEW_MENUS = ['사양서 관리', '승인 관리', '배포 관리', '회원 관리'] as const
export const PREVIEW_ACTIONS: Array<Action> = ['조회', '수정', '승인']
