/** 센터 KPI(ICDAP) mock — 요구사항정의서(02_요구사항정의서.docx) FR-070 기반.
 *  지표 정의서: 지표별 정의·산식·원천 테이블·갱신 주기 + 현업 승인 절차(AC②).
 *  ⚠ 지표 목록·산식은 OPN-008 확정에 종속 — 그래서 승인 상태 칸이 정본에 있다. */

export const KPI_AREAS = ['경로탐색', 'CCS', '검색', 'IVI'] as const
export type KpiArea = (typeof KPI_AREAS)[number]

export type MetricStatus = '승인' | '검토 중' | '초안'

export interface KpiMetric {
  id: string
  name: string
  area: KpiArea
  desc: string
  /** 산식 — 현업 승인의 대상 */
  formula: string
  sourceTable: string
  /** 갱신 주기 — FR-072 일 배치와 연결 */
  cycle: '일 1회' | '시간별' | '주 1회'
  status: MetricStatus
  owner: string
  /** 사양서–KPI 연계 (FR: 상호 참조 조회) — 연계 사양서 ID */
  linkedSpec?: string
}

export const kpiMetrics: Array<KpiMetric> = [
  { id: 'K-001', name: '경로탐색 성공률', area: '경로탐색', desc: '요청 대비 경로 산출 성공 비율',
    formula: '성공 응답 수 / 전체 요청 수 × 100', sourceTable: 'mart_route_daily', cycle: '일 1회',
    status: '승인', owner: '박지훈', linkedSpec: 'SP-003' },
  { id: 'K-002', name: '경로탐색 평균 응답시간', area: '경로탐색', desc: '경로 산출 API 평균 응답(ms)',
    formula: 'Σ응답시간 / 요청 수', sourceTable: 'mart_route_daily', cycle: '일 1회',
    status: '승인', owner: '박지훈' },
  { id: 'K-003', name: 'CCS 연결 성공률', area: 'CCS', desc: '커넥티드카 서비스 연결 성공 비율',
    formula: '연결 성공 수 / 연결 시도 수 × 100', sourceTable: 'mart_ccs_daily', cycle: '일 1회',
    status: '승인', owner: '오세훈', linkedSpec: 'SP-001' },
  { id: 'K-004', name: 'CCS 세션 유지율', area: 'CCS', desc: '10분 이상 세션 유지 비율',
    formula: '10분+ 세션 / 전체 세션 × 100', sourceTable: 'mart_ccs_session', cycle: '일 1회',
    status: '검토 중', owner: '오세훈' },
  { id: 'K-005', name: '검색 응답 정확도', area: '검색', desc: '상위 3건 내 목적지 선택 비율',
    formula: 'Top3 선택 수 / 검색 수 × 100', sourceTable: 'mart_search_daily', cycle: '일 1회',
    status: '승인', owner: '한지민', linkedSpec: 'SP-002' },
  { id: 'K-006', name: '검색 무결과율', area: '검색', desc: '결과 0건 검색 비율 — 낮을수록 좋다',
    formula: '0건 검색 수 / 전체 검색 수 × 100', sourceTable: 'mart_search_daily', cycle: '일 1회',
    status: '검토 중', owner: '한지민' },
  { id: 'K-007', name: 'IVI 앱 일 실행 수', area: 'IVI', desc: '인포테인먼트 앱 일별 실행 횟수',
    formula: 'COUNT(app_launch)', sourceTable: 'mart_ivi_usage', cycle: '일 1회',
    status: '승인', owner: '류현진' },
  { id: 'K-008', name: 'IVI OTA 업데이트 완료율', area: 'IVI', desc: '배포 대상 대비 업데이트 완료 비율',
    formula: '완료 대수 / 대상 대수 × 100', sourceTable: 'mart_ivi_ota', cycle: '주 1회',
    status: '초안', owner: '류현진' },
]

export const METRIC_STATUS_CLS: Record<MetricStatus, string> = {
  승인: 'bg-deployed-bg text-deployed-ink',
  '검토 중': 'bg-review-bg text-review-ink',
  초안: 'bg-draft-bg text-draft-ink',
}

/** IVI 자체 UI 표출용 mock 시계열 (FR-075 — 임베딩과 병행 제공) */
export const iviTrend = {
  days: ['07.30', '07.31', '08.01', '08.02', '08.03', '08.04', '08.05'],
  appLaunch: [812, 845, 790, 910, 1024, 998, 1062],
  otaRate: [91.2, 91.8, 92.1, 93.4, 94.0, 94.6, 95.1],
}
