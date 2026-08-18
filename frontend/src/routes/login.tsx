import { useEffect, useState } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'

import { Modal } from '#/components/portal/Modal'
import { Icon } from '#/components/portal/Icon'
import { MotionRoot, m } from '#/components/portal/motion'
import { CtaButton } from '#/components/portal/Skeleton'
import { ToastProvider, useToast } from '#/components/portal/toast'
import { apiPost, setToken } from '#/lib/api'
import { useI18n } from '#/lib/i18n'

export const Route = createFileRoute('/login')({ component: LoginShell })

/**
 * 로그인 — 회의록·요구사항 반영 지점:
 * - SSO 간편 로그인 + "일반 로그인도 할 수도 있겠다"(회의록) → 둘 다 자리를 만든다.
 *   협력사(LG전자 등)는 HMG-SSO 미커버라 일반 로그인·가입 승인이 필요하다.
 * - 로그인 이력은 서버가 감사 로그로 남긴다(요구사항: 5년 보관).
 * - FIDO 는 약식 2차(사용자 지시) — 등록 계정이면 인증 단계가 하나 더 선다.
 * 실패(401)는 그 자리에서 보여 준다 — 내보내면 입력이 날아간다(규약 21절 예외).
 */
const REMEMBER_KEY = 'auth.rememberId'

const DEMO_ACCOUNTS = [
  { id: 'hyundae.kim', name: '김현대', grade: 'Super Admin', fido: true },
  { id: 'seoyeon.lee', name: '이서연', grade: 'Editor', fido: false },
  { id: 'donghyun.han', name: '한동현', grade: 'Viewer', fido: true },
] as const

function LoginShell() {
  return (
    <ToastProvider>
      <MotionRoot>
        <LoginPage />
      </MotionRoot>
    </ToastProvider>
  )
}

function LoginPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { locale, setLocale, t, tf } = useI18n()
  const [id, setId] = useState('')
  const [pw, setPw] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [remember, setRemember] = useState(false)
  const [caps, setCaps] = useState(false)
  const [error, setError] = useState('')
  const [fidoTicket, setFidoTicket] = useState<{ ticket: string; name: string } | null>(null)
  const [forgotOpen, setForgotOpen] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')

  // ID 기억 — 켜고 로그인한 아이디를 다음 방문에 미리 채운다
  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_KEY)
    if (saved) {
      setId(saved)
      setRemember(true)
    }
  }, [])

  // 실시간 유효성 — 제출 전에 알 수 있는 것은 그 자리에서 말한다
  const idHint =
    id !== '' && !/^[\w.-]+(@[\w.-]+\.[a-z]{2,})?$/i.test(id.trim()) ? t('login.idHint') : ''
  const pwHint = pw !== '' && pw.length < 8 ? t('login.pwHint') : ''
  const canSubmit = id.trim() !== '' && pw.length >= 8 && idHint === ''

  const finish = (token: string, name: string) => {
    setToken(token)
    if (remember) localStorage.setItem(REMEMBER_KEY, id.trim())
    else localStorage.removeItem(REMEMBER_KEY)
    toast(tf('login.welcome', { name }))
    void navigate({ to: '/dashboard' })
  }

  const login = async () => {
    setError('')
    const res = await apiPost<
      { step: 'done'; token: string; user: { name: string } } | { step: 'fido'; ticket: string; name: string }
    >('/auth/login', { id: id.trim(), password: pw })
    if (!res.ok || !res.data) {
      setError(res.detail || t('login.error.generic', '로그인하지 못했습니다.'))
      return
    }
    if (res.data.step === 'fido') {
      setFidoTicket({ ticket: res.data.ticket, name: res.data.name })
      return
    }
    finish(res.data.token, res.data.user.name)
  }

  return (
    <div className="flex min-h-dvh bg-canvas text-ink">
      {/* 좌: 브랜드 패널 — 좁은 화면에서는 접는다 */}
      <div className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-sidebar p-10 pc:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 top-1/4 h-96 w-96 rounded-full bg-primary/20 blur-[120px]"
        />
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent2 text-sm font-bold text-white">
            H
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-semibold text-white">HMG Admin</span>
            <span className="block text-xs text-sidebar-ink/60">{t('brand.tagline')}</span>
          </span>
        </div>
        <m.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative"
        >
          {/* 두 프로젝트(센터 KPI 품질 + IBD 사양서)가 한 포털 — 어느 한쪽으로 기울지 않는다 */}
          <h2 className="whitespace-pre-line text-2xl font-bold leading-snug text-white">
            {t('login.brand.title')}
          </h2>
          <p className="mt-3 max-w-sm text-[13px] leading-relaxed text-sidebar-ink/70">
            {t('login.brand.desc')}
          </p>
        </m.div>
        <p className="text-xs text-sidebar-ink/50">{t('brand.loginFooter')}</p>
      </div>

      {/* 우: 로그인 카드 */}
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 34 }}
          className="w-full max-w-md"
        >
          <div className="mb-6 pc:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent2 text-sm font-bold text-white">
              H
            </span>
          </div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">{t('login.title')}</h1>
              <p className="mt-1 text-[13px] text-ink-subtle">{t('login.subtitle')}</p>
            </div>
            {/* 언어는 로그인 전에도 고른다 — 협력사 사용자에게 첫 화면부터 */}
            <button
              type="button"
              onClick={() => setLocale(locale === 'ko' ? 'en' : 'ko')}
              aria-label="언어 전환 / Switch language"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-hairline bg-surface text-xs font-bold text-ink-muted transition-colors hover:text-ink"
            >
              {locale === 'ko' ? '한' : 'EN'}
            </button>
          </div>

          {/* SSO — 프로토콜 미정(요구사항)이라 자리만. 협력사는 아래 일반 로그인 */}
          <button
            type="button"
            onClick={() => toast(t('login.ssoPending'))}
            className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-hairline bg-surface text-[13px] font-semibold transition-colors hover:border-primary/40"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded bg-gradient-to-br from-primary to-accent2 text-[10px] font-bold text-white">
              H
            </span>
            {t('login.sso')}
          </button>

          <div className="my-5 flex items-center gap-3 text-xs text-ink-subtle">
            <span className="h-px flex-1 bg-hairline" /> {t('login.or')}{' '}
            <span className="h-px flex-1 bg-hairline" />
          </div>

          {!fidoTicket ? (
            <form
              onSubmit={(e) => {
                e.preventDefault()
              }}
              className="space-y-3.5"
            >
              <label className="block">
                <span className="text-xs font-medium text-ink-subtle">{t('login.id')}</span>
                <input
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  autoComplete="username"
                  placeholder={t('login.idPlaceholder')}
                  className={`mt-1 h-11 w-full rounded-xl border bg-surface px-3.5 text-[13px] outline-none transition-colors placeholder:text-ink-subtle focus:border-primary/60 ${
                    idHint ? 'border-danger-ink/50' : 'border-hairline'
                  }`}
                />
                {idHint && <span className="mt-1 block text-xs text-danger-ink">{idHint}</span>}
              </label>
              <label className="block">
                <span className="text-xs font-medium text-ink-subtle">{t('login.password')}</span>
                <span className="relative mt-1 block">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={pw}
                    onChange={(e) => setPw(e.target.value)}
                    onKeyUp={(e) => setCaps(e.getModifierState('CapsLock'))}
                    autoComplete="current-password"
                    placeholder={t('login.pwPlaceholder')}
                    className={`h-11 w-full rounded-xl border bg-surface px-3.5 pr-11 text-[13px] outline-none transition-colors placeholder:text-ink-subtle focus:border-primary/60 ${
                      pwHint ? 'border-danger-ink/50' : 'border-hairline'
                    }`}
                  />
                  <button
                    type="button"
                    aria-label={showPw ? t('login.pwHide', '비밀번호 숨기기') : t('login.pwShow', '비밀번호 표시')}
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-ink-subtle transition-colors hover:text-ink"
                  >
                    {/* 눈·가린 눈도 관문에서 — 화면마다 다른 펜으로 그리지 않는다 */}
                  <Icon name={showPw ? 'eyeOff' : 'eye'} />
                  </button>
                </span>
                {pwHint && <span className="mt-1 block text-xs text-danger-ink">{pwHint}</span>}
                {caps && (
                  <span className="mt-1 block text-xs text-pending-ink">{t('login.capsLock')}</span>
                )}
              </label>

              <div className="flex items-center justify-between text-xs">
                <label className="flex cursor-pointer items-center gap-1.5 text-ink-muted">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-4 w-4 accent-[var(--color-primary)]"
                  />
                  {t('login.remember')}
                </label>
                <button
                  type="button"
                  onClick={() => setForgotOpen(true)}
                  className="text-primary hover:underline"
                >
                  {t('login.forgot')}
                </button>
              </div>

              {/* 실패는 그 자리에서 — 시도 횟수(n/5)와 잠금 안내가 서버에서 온다 */}
              {error && (
                <p className="rounded-xl border border-danger-ink/30 bg-danger-bg px-3.5 py-2.5 text-xs leading-relaxed text-danger-ink">
                  {error}
                </p>
              )}

              <CtaButton
                disabled={!canSubmit}
                busyLabel={t('login.submitting')}
                onAction={login}
                className="h-11 w-full"
              >
                {t('login.submit')}
              </CtaButton>
            </form>
          ) : (
            /* FIDO 2차 — 약식(사용자 지시). 본개발에서 WebAuthn 으로 교체 */
            <m.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-primary/30 bg-surface p-5 text-center"
            >
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/12 text-primary">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
                  <path d="M12 11v4M7 10.5V9a5 5 0 0 1 10 0v1.5M5.5 21h13a1.5 1.5 0 0 0 1.5-1.5v-6A1.5 1.5 0 0 0 18.5 12h-13A1.5 1.5 0 0 0 4 13.5v6A1.5 1.5 0 0 0 5.5 21Z" />
                </svg>
              </span>
              <h2 className="mt-3 text-base font-semibold">{t('login.fido.title')}</h2>
              <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-ink-subtle">
                {tf('login.fido.desc', { name: fidoTicket.name })}
              </p>
              <CtaButton
                busyLabel={t('login.fido.verifying')}
                className="mt-4 h-11 w-full"
                onAction={async () => {
                  const res = await apiPost<{ token: string; user: { name: string } }>('/auth/fido', {
                    ticket: fidoTicket.ticket,
                  })
                  if (!res.ok || !res.data) {
                    setFidoTicket(null)
                    setError(res.detail || t('login.error.fido', 'FIDO 인증에 실패했습니다 — 다시 로그인해 주세요.'))
                    return
                  }
                  finish(res.data.token, res.data.user.name)
                }}
              >
                {t('login.fido.verify')}
              </CtaButton>
              <button
                type="button"
                onClick={() => setFidoTicket(null)}
                className="mt-2 text-xs text-ink-subtle hover:text-ink"
              >
                {t('login.fido.other')}
              </button>
            </m.div>
          )}

          <p className="mt-5 text-center text-xs text-ink-subtle">
            {t('login.partner')}{' '}
            <Link to="/signup" className="font-medium text-primary hover:underline">
              {t('login.signup')}
            </Link>
            <span className="mx-1.5">·</span>
            {t('login.afterApproval')}
          </p>

          {/* 데모 계정 — 프로토타입 리뷰용. 역할별로 메뉴가 어떻게 갈리는지 바로 본다 */}
          <div className="mt-6 rounded-2xl border border-hairline/70 bg-surface/60 p-4">
            <p className="text-xs font-semibold text-ink-subtle">
              {tf('login.demo.title', { pw: 'hmg1234!' })}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {DEMO_ACCOUNTS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => {
                    setId(a.id)
                    setPw('hmg1234!')
                    setError('')
                  }}
                  className="rounded-full border border-hairline px-2.5 py-1 text-xs text-ink-muted transition-colors hover:border-primary/40 hover:text-ink"
                >
                  {a.name} · {a.grade}
                  {a.fido && ' · FIDO'}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-ink-subtle">{t('login.demo.hint')}</p>
          </div>
        </m.div>
      </div>

      {/* 비밀번호 찾기 — 계정 존재 여부를 노출하지 않는다 */}
      {forgotOpen && (
        <Modal
          title={t('login.forgotTitle', '비밀번호 찾기')}
          onClose={() => setForgotOpen(false)}
          footer={
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setForgotOpen(false)}
                className="h-9 rounded-lg border border-hairline bg-chip px-4 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
              >
                {t('common.cancel')}
              </button>
              <CtaButton
                disabled={!/.+@.+\..+/.test(forgotEmail)}
                busyLabel={t('login.forgotSending', '보내는 중…')}
                onAction={async () => {
                  const res = await apiPost<{ message: string }>('/auth/forgot', { email: forgotEmail })
                  setForgotOpen(false)
                  setForgotEmail('')
                  toast(res.data?.message ?? t('login.forgotSent', '가입된 이메일이라면 재설정 안내를 보냈습니다.'))
                }}
              >
                {t('login.forgotSubmit', '재설정 메일 보내기')}
              </CtaButton>
            </div>
          }
        >
          <p className="text-[13px] leading-relaxed text-ink-muted">
            {t('login.forgotDesc', '가입한 이메일을 입력하면 재설정 안내를 보냅니다.')}
          </p>
          <label className="mt-3 block">
            <span className="text-xs font-medium text-ink-subtle">{t('login.forgotEmail', '이메일')}</span>
            <input
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              placeholder="name@hmg.com"
              className="mt-1 h-11 w-full rounded-xl border border-hairline bg-canvas/60 px-3.5 text-[13px] outline-none focus:border-primary/60"
            />
          </label>
        </Modal>
      )}
    </div>
  )
}
