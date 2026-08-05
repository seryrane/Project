/** 배포 관리 시안용 결정적 mock — 승인 기반 릴리즈. */

export type DeployEnv = 'Production' | 'Staging'
export type DeployStatus = '대기' | '진행중' | '완료' | '롤백'

export interface Deploy {
  id: string
  version: string
  env: DeployEnv
  status: DeployStatus
  changes: Array<string>
  specs: Array<{ id: string; name: string; version: string }>
  owner: string
  at: string
  scheduled?: boolean
  durationMin: number | null
  approver: string | null
  rollbackTo?: string
}

export const PIPELINE = [
  { key: 'dev', label: '개발', sub: 'Development' },
  { key: 'staging', label: '검증', sub: 'Staging' },
  { key: 'approval', label: '승인', sub: 'Approval' },
  { key: 'prod', label: '운영', sub: 'Production' },
] as const

export const deploys: Array<Deploy> = [
  {
    id: 'DEP-2026-0115',
    version: 'v3.1.1',
    env: 'Production',
    status: '대기',
    changes: ['API 응답 지연 수정', '메모리 누수 패치', '사양서 비교 UI 개선'],
    specs: [
      { id: 'SP-001', name: 'VN7 엔진 사양서', version: 'v2.3' },
      { id: 'SP-002', name: '전기차 배터리 규격서', version: 'v1.5' },
    ],
    owner: '박준혁',
    at: '2026.08.06 14:00',
    scheduled: true,
    durationMin: null,
    approver: null, // 미정 — 승인 후에만 배포가 시작된다
  },
  {
    id: 'DEP-2026-0110',
    version: 'v3.1.0',
    env: 'Production',
    status: '완료',
    changes: ['자율주행 사양서 업데이트 반영', 'FAQ 카테고리 재구성', '회원 권한 시스템 개선'],
    specs: [
      { id: 'SP-003', name: '자율주행 센서 통합 규격', version: 'v3.1' },
    ],
    owner: '박준혁',
    at: '2026.07.28 10:00',
    durationMin: 23,
    approver: '한동현',
  },
  {
    id: 'DEP-2026-0108',
    version: 'v3.1.0-rc2',
    env: 'Staging',
    status: '완료',
    changes: ['Staging 검증 배포'],
    specs: [{ id: 'SP-003', name: '자율주행 센서 통합 규격', version: 'v3.1' }],
    owner: '윤성민',
    at: '2026.07.24 15:30',
    durationMin: 18,
    approver: '박준혁',
  },
  {
    id: 'DEP-2026-0105',
    version: 'v3.0.2',
    env: 'Production',
    status: '완료',
    changes: ['보안 패치 적용', '성능 최적화'],
    specs: [],
    owner: '박준혁',
    at: '2026.07.15 09:00',
    durationMin: 31,
    approver: '한동현',
  },
  {
    id: 'DEP-2026-0102',
    version: 'v3.0.1',
    env: 'Production',
    status: '롤백',
    changes: ['크리티컬 버그 수정 (롤백됨)'],
    specs: [],
    owner: '박준혁',
    at: '2026.07.08 20:10',
    durationMin: 9,
    approver: '한동현',
    rollbackTo: 'v3.0.0',
  },
]
