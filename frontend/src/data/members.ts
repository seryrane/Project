/** 회원 관리 mock — 등급 4종 + 서비스별 Role(겸직 가능), 사용자 예외 정책. */

export type MemberStatus = '활성' | '비활성' | '잠금'
export type Grade = 'Super Admin' | 'Admin' | 'Editor' | 'Viewer'

export interface Member {
  id: string
  name: string
  email: string
  dept: string
  grade: Grade
  /** 서비스별 Role — 겸직이 있으므로 다중 */
  roles: Array<string>
  status: MemberStatus
  fido: boolean
  lastLogin: string
  joined: string
  phone: string
  activity: Array<{ text: string; at: string; kind: 'auth' | 'spec' | 'approve' | 'admin' }>
}

export const members: Array<Member> = [
  {
    id: 'U-001',
    name: '김현대',
    email: 'hyundae.kim@hmg.com',
    dept: 'IT 전략팀',
    grade: 'Super Admin',
    roles: ['KPI_ADMIN', 'IBD_ADMIN'],
    status: '활성',
    fido: true,
    lastLogin: '2026.08.05 09:23',
    joined: '2022.03.15',
    phone: '010-1234-5678',
    activity: [
      { text: 'VN7 엔진 사양서 v2.3 승인 처리', at: '오늘 09:23', kind: 'approve' },
      { text: '시스템 로그인 (FIDO)', at: '오늘 08:45', kind: 'auth' },
      { text: '회원 권한 변경 (정다은)', at: '어제 11:05', kind: 'admin' },
    ],
  },
  {
    id: 'U-002',
    name: '김민준',
    email: 'minjun.kim@hmg.com',
    dept: 'IT 전략팀',
    grade: 'Editor',
    roles: ['IBD_EDITOR'],
    status: '활성',
    fido: true,
    lastLogin: '2026.08.05 09:10',
    joined: '2023.01.09',
    phone: '010-2345-6789',
    activity: [
      { text: '사양서 VN7 v2.3 승인 요청 상신', at: '오늘 09:10', kind: 'spec' },
      { text: '사양서 필드 12건 수정', at: '어제 16:30', kind: 'spec' },
    ],
  },
  {
    id: 'U-003',
    name: '이서연',
    email: 'seoyeon.lee@hmg.com',
    dept: '전동화기술팀',
    grade: 'Editor',
    roles: ['IBD_EDITOR', 'KPI_EDITOR'],
    status: '활성',
    fido: false,
    lastLogin: '2026.08.05 08:45',
    joined: '2023.05.22',
    phone: '010-3456-7890',
    activity: [{ text: '전기차 배터리 규격서 v1.5 검토 의견 등록', at: '오늘 08:45', kind: 'spec' }],
  },
  {
    id: 'U-004',
    name: '박준혁',
    email: 'junhyuk.park@hmg.com',
    dept: '플랫폼운영팀',
    grade: 'Admin',
    roles: ['DEPLOY_MANAGER'],
    status: '활성',
    fido: true,
    lastLogin: '2026.08.04 17:32',
    joined: '2022.11.01',
    phone: '010-4567-8901',
    activity: [
      { text: 'Release v3.1.1 배포 승인 요청', at: '어제 17:32', kind: 'approve' },
      { text: 'v3.1.0 운영 배포 실행', at: '07.28 10:00', kind: 'admin' },
    ],
  },
  {
    id: 'U-005',
    name: '한동현',
    email: 'donghyun.han@hmg.com',
    dept: '법무팀',
    grade: 'Viewer',
    roles: ['IBD_APPROVER'],
    status: '활성',
    fido: true,
    lastLogin: '2026.08.05 07:58',
    joined: '2022.08.17',
    phone: '010-5678-9012',
    activity: [{ text: '차체 구조 안전 기준서 1차 검토', at: '오늘 07:58', kind: 'approve' }],
  },
  {
    id: 'U-006',
    name: '최수진',
    email: 'sujin.choi@hmg.com',
    dept: '마케팅팀',
    grade: 'Viewer',
    roles: [],
    status: '비활성',
    fido: false,
    lastLogin: '2026.06.20 14:11',
    joined: '2024.02.05',
    phone: '010-6789-0123',
    activity: [{ text: '시스템 로그인', at: '06.20 14:11', kind: 'auth' }],
  },
  {
    id: 'U-007',
    name: '정다은',
    email: 'daeun.jung@hmg.com',
    dept: '연구개발팀',
    grade: 'Viewer',
    roles: [],
    status: '활성',
    fido: false,
    lastLogin: '2026.08.05 10:05',
    joined: '2025.03.02',
    phone: '010-7890-1234',
    activity: [
      { text: '사양서 편집 권한 상향 요청됨 (결재 진행 중)', at: '어제 09:00', kind: 'admin' },
    ],
  },
  {
    id: 'U-008',
    name: '오지원',
    email: 'jiwon.oh@hmg.com',
    dept: '디자인팀',
    grade: 'Viewer',
    roles: [],
    status: '잠금',
    fido: false,
    lastLogin: '2026.07.10 16:45',
    joined: '2024.09.12',
    phone: '010-8901-2345',
    activity: [{ text: '로그인 5회 실패 — 계정 잠금', at: '07.10 16:45', kind: 'auth' }],
  },
  {
    id: 'U-009',
    name: '윤성민',
    email: 'sungmin.yoon@hmg.com',
    dept: '연구개발팀',
    grade: 'Editor',
    roles: ['IBD_EDITOR'],
    status: '활성',
    fido: true,
    lastLogin: '2026.08.05 09:00',
    joined: '2023.07.19',
    phone: '010-9012-3456',
    activity: [{ text: '권한 상향 요청 상신 (정다은)', at: '어제 09:00', kind: 'admin' }],
  },
  {
    id: 'U-010',
    name: '한지민',
    email: 'jimin.han@hmg.com',
    dept: '검증기술팀',
    grade: 'Editor',
    roles: ['VALIDATION_MANAGER'],
    status: '활성',
    fido: true,
    lastLogin: '2026.08.05 06:30',
    joined: '2022.05.30',
    phone: '010-0123-4567',
    activity: [{ text: '검증엔진 스케줄 변경 (NULL 값 검증)', at: '오늘 06:30', kind: 'admin' }],
  },
]

/** 기능 권한 카탈로그 — 등급이 주는 기본값. 개인 예외는 여기서 어긋난 것만 저장한다.
 *  ⚠ mock — 본개발에서 서버 RBAC(GET /api/roles/features)로 교체 */
export const FEATURES = [
  { key: 'spec.read', label: '사양서 조회', grades: ['Super Admin', 'Admin', 'Editor', 'Viewer'] },
  { key: 'spec.write', label: '사양서 수정', grades: ['Super Admin', 'Admin', 'Editor'] },
  { key: 'spec.submit', label: '사양서 승인 요청', grades: ['Super Admin', 'Admin', 'Editor'] },
  { key: 'deploy.approve', label: '배포 승인', grades: ['Super Admin', 'Admin'] },
  { key: 'member.manage', label: '회원 관리', grades: ['Super Admin', 'Admin'] },
  { key: 'system.config', label: '시스템 설정', grades: ['Super Admin'] },
] as const

export const GRADE_CLS: Record<Grade, string> = {
  'Super Admin': 'bg-danger-bg text-danger-ink',
  Admin: 'bg-pending-bg text-pending-ink',
  Editor: 'bg-draft-bg text-draft-ink',
  Viewer: 'bg-chip text-ink-muted',
}

export const STATUS_CLS: Record<MemberStatus, string> = {
  활성: 'bg-deployed-bg text-deployed-ink',
  비활성: 'bg-chip text-ink-subtle',
  잠금: 'bg-review-bg text-review-ink',
}
