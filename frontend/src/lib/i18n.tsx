/**
 * 다국어 관문 (규약 §4 — 이 프로젝트에서는 처음부터 지킨다).
 *
 * - 사람마다 고른다: locale 은 사용자 설정(서버 kv + localStorage 백업).
 * - 서버는 재료를 준다: 메뉴는 key(코드)가 재료 — 라벨은 이 사전이 언어별로 입힌다.
 * - 숫자가 낀 문구는 파라미터로: tf('bell.todo', { n }) → "해야 할 일 {n}" / "{n} to-dos".
 * - 번역하지 않는 것: 사용자가 입력한 값(사양서 제목·태그)과 감사 로그 문장.
 *
 * ⚠ 사전은 셸(LNB·GNB)·로그인·대시보드 머리부터 채웠다 — 나머지 화면 문구는
 *   본개발에서 이 사전으로 옮긴다(키가 없으면 fallback 을 그대로 보여 화면이 안 깨진다).
 */
import { createContext, useCallback, useContext, useEffect, useState } from 'react'

import { apiSend } from './api'
import { ADMIN_DICT } from './i18n-dict-admin'
import { COMMUNITY_DICT } from './i18n-dict-community'
import { PAGE_DICT } from './i18n-dict-page'
import { WORK_DICT } from './i18n-dict-work'

export type Locale = 'ko' | 'en'

const STORAGE_KEY = 'locale'

export type Entry = { ko: string; en: string }

const CORE_DICT: Record<string, Entry> = {
  // ── 브랜드 (플랫폼 이름·설명) — 이름 'HMG Admin' 은 고유명사라 안 바뀐다 ──
  'brand.tagline': { ko: '통합 관리자 포털', en: 'Unified Admin Portal' },
  'brand.footer': { ko: '프로토타입 v0.5 · 디자인 검토용', en: 'Prototype v0.5 · for design review' },
  'brand.loginFooter': { ko: '© HMG · 프로토타입 v0.5', en: '© HMG · Prototype v0.5' },

  // ── 공통 컨트롤 (버튼·칩에서 되풀이되는 낱말 — 화면 사전보다 이걸 먼저 쓴다) ──
  'common.save': { ko: '저장', en: 'Save' },
  'common.cancel': { ko: '취소', en: 'Cancel' },
  'common.close': { ko: '닫기', en: 'Close' },
  'common.confirm': { ko: '확인', en: 'OK' },
  'common.add': { ko: '추가', en: 'Add' },
  'common.delete': { ko: '삭제', en: 'Delete' },
  'common.edit': { ko: '편집', en: 'Edit' },
  'common.search': { ko: '검색', en: 'Search' },
  'common.all': { ko: '전체', en: 'All' },
  'common.approve': { ko: '승인', en: 'Approve' },
  'common.reject': { ko: '반려', en: 'Reject' },
  'common.reset': { ko: '초기화', en: 'Reset' },
  'common.apply': { ko: '적용', en: 'Apply' },
  'common.create': { ko: '만들기', en: 'Create' },
  'common.more': { ko: '더보기', en: 'More' },
  'common.download': { ko: '내려받기', en: 'Download' },
  'common.copy': { ko: '복사', en: 'Copy' },

  // 같은 토스트가 연달아 올 때 접는 꼬리표 (규약 §2 겹침·모임)
  'toast.more': { ko: '외 {n}건', en: '+{n} more' },

  // ── 사양서 카드 (공용 컴포넌트라 화면 사전이 아니라 여기) ──────────
  'specCard.detail': { ko: '상세 보기', en: 'View detail' },
  'specCard.compare': { ko: '버전 비교', en: 'Compare versions' },
  'specCard.request': { ko: '승인 요청', en: 'Request approval' },
  'specCard.updated': { ko: '{date} 수정', en: 'Updated {date}' },
  'specCard.requestedToast': {
    ko: '{name} 승인 요청이 전송되었습니다',
    en: 'Approval request sent for {name}',
  },

  /* ── 권한 매트릭스의 메뉴·액션 이름 ────────────────────────────────
     ⚠ 이 키들은 **한국어 낱말 자체가 키**다. 권한 정본(data/roles.ts)이 메뉴·액션을
     코드가 아니라 한국어 문자열로 들고 있고, 매트릭스가 그 값으로 맞춰 보기 때문이다
     (규약 §4-2 "서버는 재료를 준다" 를 아직 못 지킨 자리 — 본개발에서 code+label 로
     가른다). 값은 그대로 두고 **표시만** 이 사전으로 바꾼다. */
  'perm.대시보드': { ko: '대시보드', en: 'Dashboard' },
  'perm.통계 & 분석': { ko: '통계 & 분석', en: 'Analytics' },
  'perm.회원 관리': { ko: '회원 관리', en: 'Members' },
  'perm.권한 관리': { ko: '권한 관리', en: 'Roles' },
  'perm.메뉴 관리': { ko: '메뉴 관리', en: 'Menus' },
  'perm.사양서 관리': { ko: '사양서 관리', en: 'Specs' },
  'perm.승인 관리': { ko: '승인 관리', en: 'Approvals' },
  'perm.배포 관리': { ko: '배포 관리', en: 'Deployments' },
  'perm.검증엔진': { ko: '검증엔진', en: 'Validation' },
  'perm.커뮤니티': { ko: '커뮤니티', en: 'Community' },
  'perm.조회': { ko: '조회', en: 'View' },
  'perm.생성': { ko: '생성', en: 'Create' },
  'perm.수정': { ko: '수정', en: 'Edit' },
  'perm.삭제': { ko: '삭제', en: 'Delete' },
  'perm.업로드': { ko: '업로드', en: 'Upload' },
  'perm.다운로드': { ko: '다운로드', en: 'Download' },
  'perm.승인': { ko: '승인', en: 'Approve' },

  // ── 버전 비교 (공용 모달) ─────────────────────────────────────────
  'compare.before': { ko: '이전 버전', en: 'Previous' },
  'compare.after': { ko: '현재 버전', en: 'Current' },
  'compare.removed': { ko: '삭제/변경 전', en: 'Removed / before' },
  'compare.added': { ko: '추가/변경 후', en: 'Added / after' },

  // ── 커맨드 팔레트 ─────────────────────────────────────────────────
  'palette.pages': { ko: '페이지', en: 'Pages' },
  'palette.go': { ko: '이동', en: 'Go' },
  'palette.specs': { ko: '사양서', en: 'Specs' },
  'palette.actions': { ko: '기능', en: 'Actions' },
  'palette.open': { ko: '열기', en: 'Open' },

  // ── 대화형 챗봇 (정본: docs/챗봇_표준질의_설계.md) ───────────────────
  // ⚠ 답 본문(understood·headline·evidence 등)은 서버가 언어별로 만든다(정본 §5) —
  //   여기는 패널 껍데기 문구만.
  'ask.title': { ko: '물어보기', en: 'Ask' },
  'ask.placeholder': { ko: '무엇이든 물어보세요…', en: 'Ask anything…' },
  'ask.inputLabel': { ko: '질문 입력', en: 'Question' },
  'ask.send': { ko: '보내기', en: 'Send' },
  'ask.sending': { ko: '답변 준비 중…', en: 'Thinking…' },
  'ask.suggested': { ko: '표준 질의', en: 'Suggested questions' },
  'ask.catalogError': {
    ko: '표준 질의를 불러오지 못했습니다 — 아래에 직접 물어보셔도 됩니다.',
    en: 'Could not load suggested questions — you can still type your own below.',
  },
  'ask.catalogEmpty': { ko: '아직 표준 질의가 없습니다.', en: 'No suggested questions yet.' },
  'ask.askError': {
    ko: '답을 받아오지 못했습니다 — 네트워크를 확인해 주세요.',
    en: 'Could not get an answer — check your connection.',
  },
  'ask.understood': { ko: '이렇게 알아들었어요', en: "Here's what I understood" },
  'ask.totalLine': { ko: '총 {total}{unit}', en: 'Total {total}{unit}' },
  'ask.evidence': { ko: '근거', en: 'Evidence' },
  'ask.anomalies': { ko: '특이사항', en: 'Anomalies' },
  'ask.openScreen': { ko: '그 화면 열기', en: 'Open this screen' },

  // ── 개인 설정 ────────────────────────────────────────────────────
  'prefs.accent': { ko: '포인트 색상', en: 'Accent color' },
  'prefs.accent.desc': {
    ko: '버튼·강조·차트의 포인트 색이 함께 바뀝니다. 계정 설정이라 다른 기기에서도 같습니다.',
    en: 'Buttons, highlights and charts change together. Saved to your account, so it follows you across devices.',
  },
  'accent.navy': { ko: '현대 남색 (기본)', en: 'Hyundai navy (default)' },
  'accent.violet': { ko: '보라', en: 'Violet' },
  'accent.blue': { ko: '파랑', en: 'Blue' },
  'accent.green': { ko: '초록', en: 'Green' },
  'accent.amber': { ko: '호박', en: 'Amber' },
  'accent.rose': { ko: '장미', en: 'Rose' },
  'prefs.language': { ko: '언어', en: 'Language' },
  'prefs.theme': { ko: '테마', en: 'Theme' },
  'prefs.theme.dark': { ko: '다크', en: 'Dark' },
  'prefs.theme.light': { ko: '라이트', en: 'Light' },
  // ── LNB (key 가 서버 재료 — nav.<item.key>) ──────────────────────
  'nav.dashboard': { ko: '대시보드', en: 'Dashboard' },
  'nav.analytics': { ko: '센터 KPI 대시보드', en: 'Center KPI Dashboard' },
  'nav.kpi-ivi': { ko: '인포 IVI KPI', en: 'Info IVI KPI' },
  'nav.kpi-metrics': { ko: '지표 관리', en: 'KPI Metrics' },
  'nav.members': { ko: '회원 관리', en: 'Members' },
  'nav.roles': { ko: '권한 관리', en: 'Roles & Permissions' },
  'nav.menus': { ko: '메뉴 관리', en: 'Menus' },
  'nav.specs': { ko: '사양서 관리', en: 'Specifications' },
  'nav.approvals': { ko: '승인 관리', en: 'Approvals' },
  'nav.deploys': { ko: '배포 관리', en: 'Deployments' },
  'nav.engine': { ko: '검증엔진 관리', en: 'Validation Engines' },
  'nav.results': { ko: '검증 결과 조회', en: 'Validation Results' },
  'nav.reports': { ko: '검증 리포트', en: 'Validation Reports' },
  'nav.notice': { ko: '공지사항', en: 'Notices' },
  'nav.qna': { ko: 'Q&A', en: 'Q&A' },
  'nav.faq': { ko: 'FAQ', en: 'FAQ' },
  'nav.guide': { ko: '사용자 가이드', en: 'User Guide' },
  'nav.alerts': { ko: '시스템 알림', en: 'System Alerts' },
  'nav.privacy': { ko: '개인정보보호', en: 'Privacy' },
  // 섹션 제목 (nav.section.<id>)
  'nav.section.kpi': { ko: '센터 KPI (ICDAP)', en: 'Center KPI (ICDAP)' },
  'nav.section.admin': { ko: '관리', en: 'Administration' },
  'nav.section.idms': { ko: '사양서 (IDMS)', en: 'Specs (IDMS)' },
  'nav.section.validation': { ko: '검증엔진', en: 'Validation' },
  'nav.section.community': { ko: '커뮤니티', en: 'Community' },
  'nav.section.system': { ko: '시스템', en: 'System' },

  // ── GNB ──────────────────────────────────────────────────────────
  'gnb.newSpec': { ko: '새 사양서', en: 'New Spec' },
  'gnb.searchPlaceholder': { ko: '전체 검색...', en: 'Search everything...' },
  'gnb.notifications': { ko: '알림', en: 'Notifications' },
  'gnb.markAllRead': { ko: '모두 읽음', en: 'Mark all read' },
  'gnb.bell.all': { ko: '전체', en: 'All' },
  'gnb.bell.todo': { ko: '해야 할 일', en: 'To-dos' },
  'gnb.bell.footer': {
    ko: '알림 수신 설정은 마이페이지에서 바꿉니다',
    en: 'Notification preferences live in My Page',
  },
  'gnb.myAbilities': { ko: '내가 할 수 있는 것', en: 'What I can do' },
  'gnb.myPage': { ko: '마이페이지', en: 'My Page' },
  'gnb.settings': { ko: '개인 설정', en: 'Preferences' },
  'gnb.logout': { ko: '로그아웃', en: 'Sign out' },
  'gnb.notReady': { ko: '{label} — 본개발에서 연결됩니다', en: '{label} — wired up in production build' },

  // ── 로그인 ────────────────────────────────────────────────────────
  'login.brand.title': {
    ko: '센터 KPI 품질과 IBD 사양서,\n두 프로젝트가 만나는 하나의 포털.',
    en: 'Center KPI quality and IBD specs —\ntwo projects, one portal.',
  },
  'login.brand.desc': {
    ko: 'KPI 지표·품질 현황(ICDAP)과 수집 사양 관리(IDMS)를 한 곳에서 — 센터 구성원과 협력사(모비스·오토에버·해외 연구소)가 같은 문으로 들어옵니다.',
    en: 'KPI quality status (ICDAP) and collection spec management (IDMS) in one place — center staff and partners (Mobis, AutoEver, overseas labs) enter through the same door.',
  },
  'login.title': { ko: '로그인', en: 'Sign in' },
  'login.subtitle': {
    ko: 'HMG-SSO 간편 로그인 또는 일반 계정으로 들어옵니다',
    en: 'Use HMG-SSO single sign-on or a standard account',
  },
  'login.sso': { ko: 'HMG-SSO 로 간편 로그인', en: 'Continue with HMG-SSO' },
  'login.ssoPending': {
    ko: 'HMG-SSO 연동은 프로토콜 확정 후 연결됩니다 (OAuth2/OIDC/SAML/LDAP 미정)',
    en: 'HMG-SSO connects once the protocol is decided (OAuth2/OIDC/SAML/LDAP TBD)',
  },
  'login.or': { ko: '또는 일반 계정', en: 'or standard account' },
  'login.id': { ko: '이메일 또는 아이디', en: 'Email or ID' },
  'login.idPlaceholder': { ko: 'name@hmg.com 또는 name', en: 'name@hmg.com or name' },
  'login.idHint': {
    ko: '이메일 또는 이메일 아이디(@ 앞부분) 형식이 아닙니다',
    en: 'Enter an email or the part before @',
  },
  'login.password': { ko: '비밀번호', en: 'Password' },
  'login.pwPlaceholder': { ko: '8자 이상', en: '8+ characters' },
  'login.pwHint': { ko: '비밀번호는 8자 이상입니다', en: 'Password is 8+ characters' },
  'login.capsLock': { ko: '⇪ Caps Lock 이 켜져 있습니다', en: '⇪ Caps Lock is on' },
  'login.remember': { ko: '아이디 기억', en: 'Remember my ID' },
  'login.forgot': { ko: '비밀번호를 잊으셨나요?', en: 'Forgot password?' },
  'login.submit': { ko: '로그인', en: 'Sign in' },
  'login.submitting': { ko: '확인 중…', en: 'Checking…' },
  'login.welcome': { ko: '{name}님, 어서 오세요', en: 'Welcome back, {name}' },
  'login.partner': { ko: '협력사·외부 계정이신가요?', en: 'Partner or external account?' },
  'login.signup': { ko: '가입 신청', en: 'Request an account' },
  'login.afterApproval': { ko: '승인 후 이용할 수 있습니다', en: 'available after approval' },
  'login.fido.title': { ko: 'FIDO 2차 인증', en: 'FIDO second factor' },
  'login.fido.desc': {
    ko: '{name}님 계정에 보안 키가 등록되어 있습니다.\n기기의 지문·보안 키로 본인을 확인해 주세요. (약식 시뮬레이션)',
    en: 'A security key is registered for {name}.\nVerify with your fingerprint or security key. (simulated)',
  },
  'login.fido.verify': { ko: '지문 · 보안 키로 인증', en: 'Verify with fingerprint / key' },
  'login.fido.verifying': { ko: '인증 중…', en: 'Verifying…' },
  'login.fido.other': { ko: '다른 계정으로 로그인', en: 'Sign in with another account' },
  'login.demo.title': { ko: '데모 계정 (비밀번호 공통: {pw})', en: 'Demo accounts (shared password: {pw})' },
  'login.demo.hint': {
    ko: '역할이 다르면 로그인 후 메뉴가 다르게 파생됩니다 — Editor 로 들어오면 관리 메뉴가 보이지 않습니다.',
    en: 'Menus derive from the role — sign in as Editor and the admin section disappears.',
  },

  // ── 대시보드 머리 ─────────────────────────────────────────────────
  'dash.title': { ko: '대시보드', en: 'Dashboard' },
  'dash.subtitle': {
    ko: '센터 KPI(ICDAP) · 사양 관리(IDMS) 통합 현황 (Mock 데이터) · 마지막 집계 오늘 06:00',
    en: 'Center KPI (ICDAP) · Spec management (IDMS) overview (mock) · last refresh 06:00 today',
  },
  'dash.range.7': { ko: '최근 7일', en: 'Last 7 days' },
  'dash.range.30': { ko: '최근 30일', en: 'Last 30 days' },
  'dash.range.90': { ko: '최근 90일', en: 'Last 90 days' },
  'dash.editWidgets': { ko: '위젯 편집', en: 'Edit widgets' },
  'dash.done': { ko: '완료', en: 'Done' },
}

// 화면별 사전은 파일을 가른다 — 사전 하나가 수백 키로 크는 것을 막고,
// 화면 작업이 서로 다른 파일을 만지게 한다(충돌 방지). 키가 겹치면 화면 사전이 이긴다.
const DICT: Record<string, Entry> = {
  ...CORE_DICT,
  ...WORK_DICT,
  ...ADMIN_DICT,
  ...COMMUNITY_DICT,
  ...PAGE_DICT,
}

interface I18n {
  locale: Locale
  setLocale: (l: Locale) => void
  /** 사전에 없으면 fallback(한국어 원문)을 그대로 — 화면이 깨지지 않는다 */
  t: (key: string, fallback?: string) => string
  /** 숫자·이름이 낀 문구 — 파라미터로 (규약 §4-3) */
  tf: (key: string, params: Record<string, string | number>, fallback?: string) => string
}

const I18nContext = createContext<I18n | null>(null)

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('ko')

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'en' || saved === 'ko') setLocaleState(saved)
  }, [])

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l)
    localStorage.setItem(STORAGE_KEY, l)
    // 사용자 설정 정본은 서버 — 실패해도 localStorage 가 남는다
    void apiSend('PUT', '/me/locale', { locale: l })
  }, [])

  const t = useCallback(
    (key: string, fallback?: string) => {
      // Record 인덱싱은 타입상 항상 있다고 우기므로 없는 키를 정직하게 다룬다
      const entry = DICT[key] as Entry | undefined
      return entry?.[locale] ?? fallback ?? key
    },
    [locale],
  )
  const tf = useCallback(
    (key: string, params: Record<string, string | number>, fallback?: string) => {
      let out = t(key, fallback)
      for (const [name, value] of Object.entries(params)) {
        out = out.replaceAll(`{${name}}`, String(value))
      }
      return out
    },
    [t],
  )

  return <I18nContext.Provider value={{ locale, setLocale, t, tf }}>{children}</I18nContext.Provider>
}

export function useI18n(): I18n {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('I18nProvider 밖에서 useI18n 을 불렀습니다')
  return ctx
}
