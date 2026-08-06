/** 업무 흐름 화면 사전 — 사양서·승인·배포·검증 3종. lib/i18n.tsx 의 DICT 로 합쳐진다. */
import type { Entry } from './i18n'

export const WORK_DICT: Record<string, Entry> = {
  // ── 사양서 목록 (/specs) ──────────────────────────────────────────
  'specs.register': { ko: '+ 사양서 등록', en: '+ New spec' },
  'specs.searchPlaceholder': { ko: '사양서 명, ID, 태그 검색...', en: 'Search name, ID, tag...' },
  'specs.allCategories': { ko: '전체 카테고리', en: 'All categories' },

  // ── 사양서 상세 (/specs/$specId) ─────────────────────────────────
  'specDetail.toList': { ko: '목록으로', en: 'Back to list' },
  'specDetail.backToList': { ko: '← 사양서 목록', en: '← Spec list' },
  'specDetail.viewApproval': { ko: '결재 진행 보기 →', en: 'View approval →' },
  'specDetail.requestApproval': { ko: '승인 요청', en: 'Request approval' },
  'specDetail.compareVersions': { ko: '버전 비교', en: 'Compare versions' },
  'specDetail.history': { ko: '이력', en: 'History' },
  'specDetail.saveDraft': { ko: '임시저장', en: 'Save draft' },
  'specDetail.saveAll': { ko: '전체 저장', en: 'Save all' },
  'specDetail.resumeDraft': { ko: '이어서 작업', en: 'Resume draft' },
  'specDetail.discardDraft': { ko: '버리기', en: 'Discard' },
  'specDetail.excelDownload': { ko: 'Excel 다운로드', en: 'Download Excel' },
  'specDetail.excelUpload': { ko: '엑셀 업로드', en: 'Upload Excel' },
  'specDetail.addField': { ko: '+ 필드 추가', en: '+ Add field' },
  'specDetail.searchFields': { ko: '필드명·설명 검색...', en: 'Search field, description...' },
  'specDetail.rulePlaceholder': { ko: '예: ^[A-Z]{2}\\d{4}$', en: 'e.g. ^[A-Z]{2}\\d{4}$' },
  'specDetail.viewing': { ko: '보는 중', en: 'Viewing' },
  'specDetail.compare': { ko: '비교', en: 'Compare' },
  'specDetail.submit': { ko: '상신', en: 'Submit' },
  'specDetail.submitting': { ko: '상신 중…', en: 'Submitting…' },

  // ── 승인 관리 (/approvals) ───────────────────────────────────────
  'approvals.tab.mine': { ko: '내 차례', en: 'My turn' },
  'approvals.tab.all': { ko: '전체 대기', en: 'All pending' },
  'approvals.tab.requested': { ko: '내 요청', en: 'My requests' },
  'approvals.tab.done': { ko: '처리됨', en: 'Processed' },
  'approvals.searchPlaceholder': { ko: '제목, ID, 요청자 검색...', en: 'Search title, ID, requester...' },
  'approvals.openSpec': { ko: '사양서 열기 →', en: 'Open spec →' },
  'approvals.openDeploys': { ko: '배포 관리 열기 →', en: 'Open deployments →' },
  'approvals.opinionPlaceholder': {
    ko: '승인/반려 의견을 입력하세요...',
    en: 'Enter your approve/reject comment...',
  },

  // ── 배포 관리 (/deploys) ─────────────────────────────────────────
  'deploys.newRequest': { ko: '→ 새 배포 요청', en: '→ New deploy request' },
  'deploys.goApprovals': { ko: '승인 관리에서 처리 →', en: 'Process in Approvals →' },
  'deploys.submitRequest': { ko: '배포 승인 요청', en: 'Request deploy approval' },
  'deploys.submitting': { ko: '요청 보내는 중…', en: 'Sending request…' },

  // ── 검증엔진 관리 (/validation-engine) ───────────────────────────
  'engine.register': { ko: '+ 엔진 등록', en: '+ Register engine' },
  'engine.runNow': { ko: '⚡ 즉시 실행', en: '⚡ Run now' },
  'engine.editAria': { ko: '엔진 수정', en: 'Edit engine' },
  'engine.deleteAria': { ko: '엔진 삭제', en: 'Delete engine' },
  'engine.collapse': { ko: '접기', en: 'Collapse' },
  'engine.expand': { ko: '펼치기', en: 'Expand' },
  'engine.tab.code': { ko: '</> Python 함수', en: '</> Python function' },
  'engine.tab.schedule': { ko: '📅 스케줄', en: '📅 Schedule' },
  'engine.addSchedule': { ko: '+ 스케줄 추가', en: '+ Add schedule' },
  'engine.schedToggleAria': { ko: '스케줄 활성화', en: 'Enable schedule' },
  'engine.namePlaceholder': { ko: '예: NULL 값 검증 엔진', en: 'e.g. NULL value check engine' },
  'engine.descPlaceholder': { ko: '엔진 설명', en: 'Engine description' },
  'engine.fieldsPlaceholder': {
    ko: 'item_code, item_name (쉼표 구분)',
    en: 'item_code, item_name (comma-separated)',
  },
  'engine.status.active': { ko: '활성', en: 'Active' },
  'engine.status.inactive': { ko: '비활성', en: 'Inactive' },
  'engine.freq.daily': { ko: '일간 (매일)', en: 'Daily' },
  'engine.freq.weekly': { ko: '주간 (매주)', en: 'Weekly' },
  'engine.freq.hourly': { ko: '시간 (매시)', en: 'Hourly' },
  'engine.submitNew': { ko: '엔진 등록', en: 'Register engine' },
  'engine.submitEdit': { ko: '수정 저장', en: 'Save changes' },
  'engine.submitSchedule': { ko: '스케줄 등록', en: 'Add schedule' },

  // ── 검증 결과 조회 (/validation-results) ─────────────────────────
  'results.exportExcel': { ko: 'Excel 내보내기', en: 'Export Excel' },
  'results.searchPlaceholder': { ko: '실행 ID, 사양서, Rule 검색...', en: 'Search run ID, spec, rule...' },
  'results.openSpec': { ko: '사양서 열기 →', en: 'Open spec →' },
  'results.viewRule': { ko: 'Rule 보기 →', en: 'View rule →' },
  'results.revalidate': { ko: '재검증 실행', en: 'Re-run validation' },

  // ── 검증 리포트 (/validation-reports) ────────────────────────────
  'reports.create': { ko: '+ 리포트 생성', en: '+ New report' },
  'reports.view': { ko: '보기', en: 'View' },
  'reports.publish': { ko: '발행', en: 'Publish' },
  'reports.goResults': { ko: '실행 상세는 검증 결과 조회 →', en: 'Run details in Validation Results →' },
  'reports.print': { ko: '🖨 인쇄', en: '🖨 Print' },
  'reports.downloadPdf': { ko: '⬇ PDF 다운로드', en: '⬇ Download PDF' },
}
