/** 관리·KPI 화면 사전 — 회원·권한·메뉴·통계·KPI·가입. lib/i18n.tsx 의 DICT 로 합쳐진다. */
import type { Entry } from './i18n'

export const ADMIN_DICT: Record<string, Entry> = {
  // ── 대시보드 본문 위젯 (카드 액션 버튼 — 머리는 CORE 의 dash.* 가 맡는다) ──
  'dash.action.results': { ko: '검증 결과', en: 'Results' },
  'dash.action.viewAll': { ko: '전체 보기', en: 'View all' },

  // ── 센터 KPI 대시보드 (analytics) ────────────────────────────────
  'analytics.action.kpi': { ko: 'KPI 관리', en: 'Manage KPIs' },
  'analytics.action.kpiDetail': { ko: 'KPI 상세', en: 'KPI details' },
  'analytics.action.orgKpi': { ko: '조직 KPI', en: 'Org KPIs' },

  // ── 회원 관리 (members) ──────────────────────────────────────────
  'members.add': { ko: '회원 등록', en: 'Add member' },
  'members.searchPlaceholder': { ko: '이름, 이메일, 부서 검색...', en: 'Search name, email, dept...' },
  'members.filter.allStatus': { ko: '전체 상태', en: 'All statuses' },
  'members.filter.allGrades': { ko: '전체 등급', en: 'All grades' },
  'members.tab.info': { ko: '기본 정보', en: 'Profile' },
  'members.tab.activity': { ko: '활동 이력', en: 'Activity' },
  'members.tab.perm': { ko: '권한', en: 'Permissions' },
  'members.lock': { ko: '계정 잠금', en: 'Lock account' },
  'members.unlock': { ko: '잠금 해제', en: 'Unlock' },
  'members.unlockShort': { ko: '해제', en: 'Unlock' },
  'members.resetPw': { ko: '비밀번호 초기화', en: 'Reset password' },
  'members.submit': { ko: '변경 상신', en: 'Submit changes' },
  'members.defineRoles': { ko: '권한 관리에서 역할 정의 →', en: 'Edit role definitions →' },
  'members.removeException': { ko: '예외 제거', en: 'Remove exception' },
  'members.allow': { ko: '허용', en: 'Allow' },
  'members.block': { ko: '차단', en: 'Block' },
  'members.register': { ko: '등록', en: 'Register' },
  'members.ph.name': { ko: '홍길동', en: 'Full name' },
  'members.ph.dept': { ko: 'IT 전략팀', en: 'IT Strategy Team' },

  // ── 권한 관리 (roles) ────────────────────────────────────────────
  'roles.add': { ko: '역할 추가', en: 'Add role' },
  'roles.assigned': { ko: '{n}명 배정', en: '{n} assigned' },
  'roles.editPerms': { ko: '권한 편집', en: 'Edit permissions' },
  'roles.delete': { ko: '역할 삭제', en: 'Delete role' },
  'roles.viewMembers': { ko: '회원 관리에서 보기 →', en: 'View in Members →' },
  'roles.matrixShow': { ko: '전체 매트릭스 보기', en: 'Show full matrix' },
  'roles.matrixHide': { ko: '전체 매트릭스 접기', en: 'Hide full matrix' },
  'roles.fromScratch': { ko: '처음부터 시작', en: 'Start from scratch' },
  'roles.copy': { ko: '{name} 복사', en: 'Copy of {name}' },
  'roles.namePlaceholder': { ko: '예: 시니어 편집자', en: 'e.g. Senior Editor' },
  'roles.descPlaceholder': { ko: '역할에 대한 설명을 입력하세요', en: 'Describe this role' },
  'roles.create': { ko: '생성', en: 'Create' },
  'roles.submit': { ko: '변경 상신', en: 'Submit changes' },
  'roles.submitting': { ko: '상신 중…', en: 'Submitting…' },

  // ── 인포 IVI KPI (kpi-ivi) ───────────────────────────────────────
  'kpi-ivi.mode.tableau': { ko: 'Tableau 임베딩', en: 'Tableau embed' },
  'kpi-ivi.mode.native': { ko: '자체 UI', en: 'Native UI' },
  'kpi-ivi.addWorkbook': { ko: '워크북 등록', en: 'Add workbook' },
  'kpi-ivi.removeWorkbook': { ko: '이 워크북 내리기', en: 'Remove this workbook' },
  'kpi-ivi.titlePlaceholder': { ko: '예: IVI 주간 사용성 워크북', en: 'e.g. IVI weekly usage workbook' },
  'kpi-ivi.register': { ko: '등록', en: 'Register' },
  'kpi-ivi.registering': { ko: '등록 중…', en: 'Registering…' },

  // ── 지표 관리 (kpi-metrics) ──────────────────────────────────────
  'kpi-metrics.addMetric': { ko: '지표 추가', en: 'Add metric' },
  'kpi-metrics.submitApproval': { ko: '산식 승인 상신', en: 'Submit formula for approval' },
  'kpi-metrics.submitting': { ko: '상신 중…', en: 'Submitting…' },

  // ── 가입 신청 (signup — 로그인 자매 화면, 어휘는 login.* 과 맞춘다) ──
  'signup.name': { ko: '이름', en: 'Name' },
  'signup.email': { ko: '회사 이메일', en: 'Company email' },
  'signup.dept': { ko: '소속 (회사·팀)', en: 'Company · team' },
  'signup.pw2': { ko: '비밀번호 확인', en: 'Confirm password' },
  'signup.ph.name': { ko: '홍길동', en: 'Full name' },
  'signup.ph.dept': { ko: '예: LG전자 인포테인먼트팀', en: 'e.g. LG Electronics IVI team' },
  'signup.ph.pw2': { ko: '한 번 더', en: 'Once more' },
  'signup.emailHint': { ko: '이메일 형식이 아닙니다', en: 'Not a valid email address' },
  'signup.pwHint': { ko: '8자 이상이어야 합니다', en: 'Must be 8+ characters' },
  'signup.pw2Hint': { ko: '비밀번호가 서로 다릅니다', en: 'Passwords do not match' },
  'signup.submitting': { ko: '접수 중…', en: 'Submitting…' },
  'signup.haveAccount': { ko: '이미 계정이 있으신가요?', en: 'Already have an account?' },
}
