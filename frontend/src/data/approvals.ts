/** 승인 관리 시안용 결정적 mock — IDMS 결재: 신규/수정/삭제 요청 · 최대 N단계 */

export type RequestType = '신규' | '수정' | '삭제'

export interface ApprovalRequest {
  id: string
  specId: string
  specName: string
  version: string
  type: RequestType
  requester: string
  requestedAt: string
  waitingDays: number
  /** 결재 단계 — [현재 단계, 전체 단계] */
  step: [number, number]
  /** 지금 내 차례인가 */
  myTurn: boolean
  summary: string
}

export const approvalRequests: Array<ApprovalRequest> = [
  {
    id: 'REQ-101',
    specId: 'SP-001',
    specName: 'VN7 엔진 사양서',
    version: 'v2.3',
    type: '수정',
    requester: '김민준',
    requestedAt: '2026.08.02',
    waitingDays: 3,
    step: [2, 3],
    myTurn: true,
    summary: '최대 토크 측정 조건 변경 (1,450~4,000 rpm) 및 배기량 표기 정정',
  },
  {
    id: 'REQ-102',
    specId: 'SP-002',
    specName: '전기차 배터리 규격서',
    version: 'v1.5',
    type: '수정',
    requester: '이서연',
    requestedAt: '2026.08.03',
    waitingDays: 2,
    step: [1, 3],
    myTurn: true,
    summary: '최대 충전 전력 350kW 급속 조건 추가, 공칭 전압 각주 보강',
  },
  {
    id: 'REQ-103',
    specId: 'SP-004',
    specName: '차체 구조 안전 기준서',
    version: 'v4.0',
    type: '신규',
    requester: '최수진',
    requestedAt: '2026.08.04',
    waitingDays: 1,
    step: [1, 2],
    myTurn: false,
    summary: 'EURO NCAP 2026 기준 반영 신규 제정 — 1차 검토자 확인 대기',
  },
  {
    id: 'REQ-104',
    specId: 'SP-003',
    specName: '자율주행 센서 통합 규격 (구판)',
    version: 'v2.9',
    type: '삭제',
    requester: '박준혁',
    requestedAt: '2026.08.01',
    waitingDays: 4,
    step: [2, 2],
    myTurn: true,
    summary: 'v3.1 배포 완료에 따른 구판 폐기 — 참조 문서 3건 링크 이관 확인됨',
  },
]

export const processedRequests = [
  {
    id: 'REQ-097',
    specName: '충돌 센서 임계값 정의서',
    version: 'v1.7',
    type: '수정' as RequestType,
    result: '승인' as const,
    by: '김현대',
    at: '어제',
  },
  {
    id: 'REQ-095',
    specName: 'IVI 데이터 수집 항목',
    version: 'v3.9',
    type: '수정' as RequestType,
    result: '반려' as const,
    by: '김현대',
    at: '2일 전',
    reason: '수집 주기 근거 자료 누락 — 첨부 보완 후 재상신 요청',
  },
]
