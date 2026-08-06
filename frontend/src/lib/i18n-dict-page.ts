/** 화면 제목·부제 사전 — h1 은 nav.* 를 재사용하고, 부제(h1 바로 아래 한 줄 설명)만 여기 모은다. */
import type { Entry } from './i18n'

export const PAGE_DICT: Record<string, Entry> = {
  // ── 센터 KPI (ICDAP) ─────────────────────────────────────────────
  'page.analytics.subtitle': {
    ko: 'ICDAP KPI 시안 (Mock 데이터) · 범위: 전사 · 마지막 집계 오늘 06:00',
    en: 'ICDAP KPI draft (mock data) · Scope: company-wide · Last refresh 06:00 today',
  },
  'page.kpi-ivi.subtitle': {
    ko: 'IVI 지표 — Tableau 임베딩과 자체 UI 를 병행 제공 (FR-075) · SSO 연계 전에는 공개·티켓 링크만 표출됩니다',
    en: 'IVI metrics — Tableau embed and native UI side by side (FR-075) · Only public/ticket links show before SSO is linked',
  },
  'page.kpi-metrics.subtitle': {
    ko: '센터 KPI 지표 정의서 — 산식·원천·주기 (FR-070) · 승인 {approved}/{total}',
    en: 'Center KPI metric definitions — formula, source, cycle (FR-070) · Approved {approved}/{total}',
  },

  // ── 관리 ─────────────────────────────────────────────────────────
  'page.members.subtitle': {
    ko: 'HMG-SSO 연동 계정 · 등급 4종 + 서비스별 Role (Mock 데이터)',
    en: 'HMG-SSO linked accounts · 4 grades + service roles (mock data)',
  },
  'page.roles.subtitle': {
    ko: '역할 기반 접근 제어(RBAC) · 메뉴 × 액션 7종 (Mock 데이터)',
    en: 'Role-based access control (RBAC) · 7 menu × action types (mock data)',
  },
  'page.menus.subtitle': {
    ko: '내비게이션 동적 구성 · 역할 연결 — 정본은 이 목록이다 (LNB·팔레트·권한이 함께 본다)',
    en: 'Dynamic navigation setup · Role linking — this list is the source of truth (shared by LNB, palette, and permissions)',
  },

  // ── 사양서 (IDMS) ────────────────────────────────────────────────
  'page.specs.subtitle': {
    ko: '총 {total}개 사양서 · {pending}개 승인 대기',
    en: '{total} specs total · {pending} awaiting approval',
  },
  'page.specDetail.current': { ko: '현재', en: 'Current' },
  'page.specDetail.deployed': { ko: '배포', en: 'Deployed' },
  'page.specDetail.owner': { ko: '담당 {name}', en: 'Owner {name}' },
  'page.specDetail.modified': { ko: '{date} 수정', en: 'Modified {date}' },
  'page.approvals.subtitle': {
    ko: '사양서·배포·메뉴·권한 결재 (Mock 데이터) · 내 차례 {n}건',
    en: 'Spec, deploy, menu, and permission approvals (mock data) · My turn: {n}',
  },
  'page.deploys.subtitle': {
    ko: '사양서 통합 배포 · 승인 기반 릴리즈 관리 (Mock 데이터)',
    en: 'Unified spec deployment · Approval-based release management (mock data)',
  },

  // ── 검증엔진 ──────────────────────────────────────────────────────
  'page.validation-engine.subtitle': {
    ko: 'Python 함수 기반 검증엔진 등록 · 스케줄 관리 · 즉시 실행 (Mock 데이터)',
    en: 'Python-based validation engines · Scheduling and on-demand runs (mock data)',
  },
  'page.validation-results.subtitle': {
    ko: '배치·실시간 검증 실행과 오류 상세 (Mock 데이터) · 마지막 배치 오늘 06:00',
    en: 'Batch and real-time validation runs with error detail (mock data) · Last batch 06:00 today',
  },
  'page.validation-reports.subtitle': {
    ko: '검증 결과 기반 리포트 생성 및 조회 (Mock 데이터)',
    en: 'Generate and review reports from validation results (mock data)',
  },

  // ── 커뮤니티 ──────────────────────────────────────────────────────
  'page.notice.subtitle': {
    ko: '시스템·배포·정책 공지 — 최소 메뉴라 모든 역할에게 보입니다',
    en: 'System, deployment, and policy notices — a minimal menu visible to every role',
  },
  'page.qna.subtitle': {
    ko: '묻고 답하기 — 답변 대기 {n}건',
    en: 'Ask & answer — {n} awaiting reply',
  },
  'page.faq.subtitle': {
    ko: '자주 묻는 질문 — 여기 없는 질문은',
    en: 'Frequently asked questions — for anything else,',
  },
  'page.faq.goQna': { ko: 'Q&A 에 남겨 주세요 →', en: 'ask in Q&A →' },
  'page.guide.subtitle': {
    ko: '처음 온 사람과 권한이 새로 붙은 사람이 찾아오는 자리 — 그래서 권한 없이 모두에게 보입니다',
    en: 'Where newcomers and people with new permissions start — visible to everyone, no permission required',
  },

  // ── 시스템 ────────────────────────────────────────────────────────
  'page.privacy.subtitle': {
    ko: '처리방침 · 반출 감사 · 마스킹 정책 — Super Admin 전용 화면',
    en: 'Policy, export audit, and masking rules — Super Admin only',
  },
}
