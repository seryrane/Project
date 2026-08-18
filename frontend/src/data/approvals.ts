/** 승인 관리 시안용 결정적 mock — 결재 대상은 사양서만이 아니다(배포·메뉴·권한). */

export type RequestKind = '사양서' | '배포' | '메뉴' | '권한'
export type RequestType = '신규' | '수정' | '삭제'

export interface ChangeRow {
  item: string
  before: string | null
  after: string
}

export interface ApprovalRequest {
  id: string
  kind: RequestKind
  /** 사양서 결재일 때만 — 누르면 그 사양서로 간다 */
  specId?: string
  /** 배포 결재일 때만 — 승인되면 이 배포가 시작된다 (FR-114 뒷단) */
  deployId?: string
  title: string
  version?: string
  type: RequestType
  urgent: boolean
  requester: string
  requesterTeam: string
  approver: string
  requestedAt: string
  deadline: string
  waitingDays: number
  step: [number, number]
  myTurn: boolean
  summary: string
  changes: Array<ChangeRow>
}

/**
 * 사양서 결재선 **정본** — 검토(1차) → 최종 승인.
 *
 * ⚠ 결재선이 상신 모달 안에 '한동현 (1차) → 김현대 (최종)' 글자로 박혀 있었다.
 * 상세 화면은 결재선을 아예 안 보여 줬고, 승인 관리는 자기 mock 의 approver 를
 * 따로 들고 있었다 — 같은 결재선을 세 화면이 제각기 말할 수 있는 모양이었다
 * (규약 §10 같은 것은 한 곳에서 · 2026-08-18).
 *
 * 본개발에서는 조직·문서 종류로 파생된다(결재선 엔진). 지금은 한 벌 고정이라
 * 이 배열이 정본이고, 화면은 여기만 읽는다.
 */
export interface ApprovalStep {
  /** 몇 번째 결재인가 — 화면의 단계 점이 이 순서로 선다 */
  seq: number
  name: string
  /** 결재자의 서비스 Role 코드 — 라벨은 화면이 사전으로 입힌다 (규약 §4-7) */
  role: string
  /** 이 단계가 하는 일 */
  label: string
}

export const SPEC_APPROVAL_LINE: Array<ApprovalStep> = [
  { seq: 1, name: '한동현', role: 'IBD_APPROVER', label: '검토' },
  { seq: 2, name: '김현대', role: 'IBD_ADMIN', label: '최종 승인' },
]

/** 지금 이 사양서가 결재 어디까지 왔나 — 결재함에서 찾는다(없으면 아직 안 올라간 것). */
export function approvalOf(specId: string): ApprovalRequest | undefined {
  return approvalRequests.find((r) => r.specId === specId)
}

export const approvalRequests: Array<ApprovalRequest> = [
  {
    id: 'APR-2026-0115',
    kind: '사양서',
    specId: 'SP-001',
    title: 'VN7 엔진 사양서 v2.3',
    version: 'v2.3',
    type: '수정',
    urgent: true,
    requester: '김민준',
    requesterTeam: 'IT 전략팀',
    approver: '김현대',
    requestedAt: '2026.08.02',
    deadline: '2026.08.07',
    waitingDays: 3,
    step: [2, 3],
    myTurn: true,
    summary: '최대 출력 5hp 상향(285→290hp) 및 복합 연비 개선(10.8→11.2 km/L)에 대한 사양 변경 승인 요청입니다.',
    changes: [
      { item: '최대 출력', before: '285 hp @ 5,800 rpm', after: '290 hp @ 5,800 rpm' },
      { item: '복합 연비', before: '10.8 km/L', after: '11.2 km/L' },
    ],
  },
  {
    id: 'APR-2026-0114',
    kind: '배포',
    // ⚠ 매달지 않으면 승인해도 배포 목록은 '대기' 그대로다 — 결재와 대상은 짝이 있어야 한다
    deployId: 'DEP-2026-0115',
    title: 'Release v3.1.1 운영 배포',
    type: '신규',
    urgent: true,
    requester: '박준혁',
    requesterTeam: '플랫폼운영팀',
    approver: '김현대',
    requestedAt: '2026.08.03',
    deadline: '2026.08.06',
    waitingDays: 2,
    step: [1, 2],
    myTurn: true,
    summary: '긴급 버그 수정 및 성능 최적화를 포함한 패치 릴리즈 배포 승인 요청입니다.',
    changes: [
      { item: '배포 버전', before: 'v3.1.0', after: 'v3.1.1' },
      { item: '포함 사양서', before: null, after: 'VN7 엔진 사양서 v2.3 · 전기차 배터리 규격서 v1.5' },
    ],
  },
  {
    id: 'APR-2026-0113',
    kind: '사양서',
    specId: 'SP-002',
    title: '전기차 배터리 규격서 v1.5',
    version: 'v1.5',
    type: '수정',
    urgent: false,
    requester: '이서연',
    requesterTeam: '전동화기술팀',
    approver: '한동현',
    requestedAt: '2026.08.03',
    deadline: '2026.08.09',
    waitingDays: 2,
    step: [1, 3],
    myTurn: true,
    summary: '배터리 셀 용량 상향(94kWh→102kWh) 및 급속 충전 규격 업데이트',
    changes: [
      { item: '배터리 용량', before: '94 kWh', after: '102 kWh (usable 99 kWh)' },
      { item: '최대 충전 전력', before: '240 kW', after: '350 kW (급속)' },
    ],
  },
  {
    id: 'APR-2026-0112',
    kind: '권한',
    title: '정다은 편집 권한 상향',
    type: '수정',
    urgent: false,
    requester: '윤성민',
    requesterTeam: '연구개발팀',
    approver: '김현대',
    requestedAt: '2026.08.04',
    deadline: '2026.08.11',
    waitingDays: 1,
    step: [1, 1],
    myTurn: false,
    summary: '연구개발팀 정다은 사원의 사양서 편집 권한 부여 요청',
    changes: [{ item: '역할', before: 'Viewer', after: 'Editor (사양서 편집)' }],
  },
]

export const processedRequests = [
  {
    id: 'APR-2026-0110',
    kind: '메뉴' as RequestKind,
    title: 'FAQ 카테고리 구조 변경',
    type: '수정' as RequestType,
    result: '승인' as const,
    by: '김현대',
    at: '어제',
  },
  {
    id: 'APR-2026-0108',
    kind: '사양서' as RequestKind,
    title: 'IVI 데이터 수집 항목 v3.9',
    type: '수정' as RequestType,
    result: '반려' as const,
    by: '김현대',
    at: '2일 전',
    reason: '수집 주기 근거 자료 누락 — 첨부 보완 후 재상신 요청',
  },
]

/** 요청자 현황 관점 — 내가 상신한 요청 (mock: 김현대) */
export const myRequests = [
  {
    id: 'APR-2026-0111',
    kind: '배포' as RequestKind,
    title: 'Release v3.1.0 운영 배포',
    status: '승인' as const,
    approver: '한동현',
    requestedAt: '2026.07.28',
    deadline: '2026.08.01',
    summary: '분기 정기 릴리즈 배포 요청',
  },
  {
    id: 'APR-2026-0109',
    kind: '사양서' as RequestKind,
    title: '차체 구조 안전 기준서 v4.0 제정',
    status: '대기' as const,
    approver: '한동현',
    requestedAt: '2026.08.04',
    deadline: '2026.08.12',
    summary: 'EURO NCAP 2026 기준 반영 신규 제정 — 1차 검토 대기',
  },
]

export const KIND_CLS: Record<RequestKind, string> = {
  사양서: 'bg-draft-bg text-draft-ink',
  배포: 'bg-pending-bg text-pending-ink',
  메뉴: 'bg-review-bg text-review-ink',
  권한: 'bg-deployed-bg text-deployed-ink',
}
