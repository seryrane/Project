import { useState } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'

import { MotionRoot, m } from '#/components/portal/motion'
import { CtaButton } from '#/components/portal/Skeleton'
import { ToastProvider, useToast } from '#/components/portal/toast'
import { apiPost } from '#/lib/api'
import { useI18n } from '#/lib/i18n'

export const Route = createFileRoute('/signup')({ component: SignupShell })

/**
 * 가입 신청 — 회의록 근거: 로그인 범위가 협력사(모비스·오토에버·해외 연구소,
 * LG전자는 HMG-SSO 미커버)까지라 SSO 밖 계정의 일반 가입 경로가 필요하다.
 * 결재선이 미확정이라 **접수만** 하고 관리자 승인 후 활성화된다 —
 * 신규 계정은 Viewer 로 시작한다(넓은 권한은 신청이 아니라 부여로 받는다 — RBAC 정합).
 */
function SignupShell() {
  return (
    <ToastProvider>
      <MotionRoot>
        <SignupPage />
      </MotionRoot>
    </ToastProvider>
  )
}

function SignupPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const toast = useToast()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [dept, setDept] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [error, setError] = useState('')

  // 실시간 유효성 — 제출 전에 알 수 있는 것은 그 자리에서
  const emailHint = email !== '' && !/.+@.+\..+/.test(email) ? t('signup.emailHint') : ''
  const pwHint = pw !== '' && pw.length < 8 ? t('signup.pwHint') : ''
  const pw2Hint = pw2 !== '' && pw2 !== pw ? t('signup.pw2Hint') : ''
  const canSubmit =
    name.trim() !== '' && /.+@.+\..+/.test(email) && pw.length >= 8 && pw === pw2

  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas px-4 py-10 text-ink">
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 34 }}
        className="w-full max-w-md"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent2 text-sm font-bold text-white">
          H
        </span>
        <h1 className="mt-4 text-2xl font-bold">{t('login.signup', '가입 신청')}</h1>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-subtle">
          {t('signup.intro', '협력사·외부 계정용입니다 (HMG 임직원은 SSO 로 바로 로그인).')}
          <br />
          {t('signup.startAs', '관리자 승인 후')}{' '}
          <b className="text-ink-muted">{t('signup.viewerGrade', 'Viewer 등급')}</b>
          {t('signup.startAsTail', '으로 시작합니다 — 필요한 권한은 승인 뒤 요청하세요.')}
        </p>

        <form
          onSubmit={(e) => e.preventDefault()}
          className="mt-6 space-y-3.5 rounded-2xl border border-hairline bg-surface p-5"
        >
          <label className="block">
            <span className="text-xs font-medium text-ink-subtle">{t('signup.name')} <b className="text-danger-ink">*</b></span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('signup.ph.name')}
              className="mt-1 h-11 w-full rounded-xl border border-hairline bg-canvas/60 px-3.5 text-[13px] outline-none focus:border-primary/60"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-ink-subtle">{t('signup.email')} <b className="text-danger-ink">*</b></span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="name@partner.com"
              className={`mt-1 h-11 w-full rounded-xl border bg-canvas/60 px-3.5 text-[13px] outline-none focus:border-primary/60 ${
                emailHint ? 'border-danger-ink/50' : 'border-hairline'
              }`}
            />
            {emailHint && <span className="mt-1 block text-xs text-danger-ink">{emailHint}</span>}
          </label>
          <label className="block">
            <span className="text-xs font-medium text-ink-subtle">{t('signup.dept')}</span>
            <input
              value={dept}
              onChange={(e) => setDept(e.target.value)}
              placeholder={t('signup.ph.dept')}
              className="mt-1 h-11 w-full rounded-xl border border-hairline bg-canvas/60 px-3.5 text-[13px] outline-none focus:border-primary/60"
            />
          </label>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium text-ink-subtle">{t('login.password')} <b className="text-danger-ink">*</b></span>
              <input
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                autoComplete="new-password"
                placeholder={t('login.pwPlaceholder')}
                className={`mt-1 h-11 w-full rounded-xl border bg-canvas/60 px-3.5 text-[13px] outline-none focus:border-primary/60 ${
                  pwHint ? 'border-danger-ink/50' : 'border-hairline'
                }`}
              />
              {pwHint && <span className="mt-1 block text-xs text-danger-ink">{pwHint}</span>}
            </label>
            <label className="block">
              <span className="text-xs font-medium text-ink-subtle">{t('signup.pw2')} <b className="text-danger-ink">*</b></span>
              <input
                type="password"
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                autoComplete="new-password"
                placeholder={t('signup.ph.pw2')}
                className={`mt-1 h-11 w-full rounded-xl border bg-canvas/60 px-3.5 text-[13px] outline-none focus:border-primary/60 ${
                  pw2Hint ? 'border-danger-ink/50' : 'border-hairline'
                }`}
              />
              {pw2Hint && <span className="mt-1 block text-xs text-danger-ink">{pw2Hint}</span>}
            </label>
          </div>

          {error && (
            <p className="rounded-xl border border-danger-ink/30 bg-danger-bg px-3.5 py-2.5 text-xs leading-relaxed text-danger-ink">
              {error}
            </p>
          )}

          <CtaButton
            disabled={!canSubmit}
            busyLabel={t('signup.submitting')}
            className="h-11 w-full"
            onAction={async () => {
              setError('')
              const res = await apiPost<{ message: string }>('/auth/signup', {
                name,
                email,
                dept,
                password: pw,
              })
              if (!res.ok) {
                setError(res.detail || t('signup.error', '가입 신청에 실패했습니다.'))
                return
              }
              toast(res.data?.message ?? t('signup.toast.submitted', '가입 신청을 접수했습니다 — 관리자 승인 후 안내됩니다.'))
              void navigate({ to: '/login' })
            }}
          >
            {t('login.signup')}
          </CtaButton>
        </form>

        <p className="mt-4 text-center text-xs text-ink-subtle">
          {t('signup.haveAccount')}{' '}
          <Link to="/login" className="inline-flex min-h-10 items-center px-2 font-medium text-primary hover:underline">
            {t('login.title')}
          </Link>
        </p>
      </m.div>
    </div>
  )
}
