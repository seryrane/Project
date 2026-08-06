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

export type Locale = 'ko' | 'en'

const STORAGE_KEY = 'locale'

type Entry = { ko: string; en: string }

const DICT: Record<string, Entry> = {
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
