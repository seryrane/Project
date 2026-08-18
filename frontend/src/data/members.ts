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
  /** 화면 전용 mock — 서버 정본에는 아직 없다(본개발에서 감사 로그 조회로 대체) */
  activity?: Array<{ text: string; at: string; kind: 'auth' | 'spec' | 'approve' | 'admin' }>
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

/** 서비스별 Role 카탈로그 — 겸직 가능 (요구사항: 서비스별 Role 분리) */
export const SERVICE_ROLES = [
  'KPI_ADMIN',
  'KPI_EDITOR',
  'IBD_ADMIN',
  'IBD_EDITOR',
  'IBD_APPROVER',
  'DEPLOY_MANAGER',
  'VALIDATION_MANAGER',
] as const

export type ServiceRole = (typeof SERVICE_ROLES)[number]

/**
 * Role **코드 ↔ 사람 말** 매핑 — 코드는 값이고 라벨은 표시다 (규약 §4-7).
 *
 * ⚠ 화면이 `KPI_ADMIN` 을 그대로 세우고 있었다. 만든 사람에게만 읽히는 글자다 —
 * 회원 표에서 "이 사람이 무엇을 할 수 있는가"를 묻는 자리인데, 답이 영문 코드였다
 * (규약 §15 이름 어긋남 · 2026-08-18). 값은 코드 그대로 두므로 필터·비교·서버
 * 전달은 흔들리지 않는다. EN 은 사전(`role.<코드>`)이 따로 입힌다.
 */
export const SERVICE_ROLE_LABEL: Record<ServiceRole, string> = {
  KPI_ADMIN: 'KPI 관리자',
  KPI_EDITOR: 'KPI 편집자',
  IBD_ADMIN: '사양서 관리자',
  IBD_EDITOR: '사양서 편집자',
  IBD_APPROVER: '사양서 승인자',
  DEPLOY_MANAGER: '배포 담당자',
  VALIDATION_MANAGER: '검증 담당자',
}

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

/** 권한별 회원 분포 — **명단에서 센다** (규약 §10 "같은 이름의 숫자는 한 곳에서").
 *  ⚠ 대시보드가 2/5/18/41(합 66명)을 손으로 들고 있던 동안 회원 관리는 10명을
 *    보여 줬다 — 같은 앱이 다른 조직을 말했다(2026-08-18). 인자를 받는 이유:
 *    회원 화면과 같은 소스(서버 있으면 서버, 없으면 이 mock)로 세야 한다.
 *  fill 토큰은 CVD·대비 검증 통과값(dashboard.ts 의 기존 배정 그대로). */
export const GRADES: Array<Grade> = ['Super Admin', 'Admin', 'Editor', 'Viewer']

const GRADE_FILL: Record<Grade, string> = {
  'Super Admin': 'var(--color-fill-draft)',
  Admin: 'var(--color-fill-review)',
  Editor: 'var(--color-fill-pending)',
  Viewer: 'var(--color-fill-deployed)',
}

export function gradeDistribution(list: Array<Member>) {
  return GRADES.map((label) => ({
    label,
    value: list.filter((m) => m.grade === label).length,
    fill: GRADE_FILL[label],
  }))
}
