import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { AppShell } from '#/components/portal/AppShell'
import { ChipSelect, Switch } from '#/components/portal/Chips'
import { Drawer } from '#/components/portal/Drawer'
import { useToast } from '#/components/portal/toast'

export const Route = createFileRoute('/privacy')({ component: PrivacyPage })

/** 접속·반출 감사 로그 mock — 다운로드(반출)는 위험 액션이라 줄을 달리 칠한다 */
const AUDIT_LOG = [
  { at: '2026.08.05 09:41', user: '김현대', action: '다운로드', target: '회원 목록 (엑셀, 10건)', reason: '월간 계정 감사' },
  { at: '2026.08.05 09:12', user: '박준혁', action: '열람', target: '오지원 회원 상세', reason: '잠금 해제 처리' },
  { at: '2026.08.04 17:55', user: '이수진', action: '마스킹 해제', target: '한동현 연락처', reason: '긴급 배포 연락' },
  { at: '2026.08.04 14:20', user: '김현대', action: '다운로드', target: '검증 리포트 7월호', reason: '경영 보고 첨부' },
  { at: '2026.08.03 11:02', user: '정민호', action: '열람', target: '김민준 회원 상세', reason: '권한 예외 검토' },
  { at: '2026.08.02 16:44', user: '박준혁', action: '열람', target: '최수진 회원 상세', reason: '비활성 계정 정리' },
] as const

const POLICY_BODY = [
  '제1조 (목적) 본 방침은 HMG 통합 관리자 포털이 취급하는 개인정보의 처리 기준을 정한다.',
  '제2조 (수집 항목) 이름, 사내 이메일, 부서, 연락처, 접속 기록. 서비스 Role 배정 이력을 포함한다.',
  '제3조 (보존 기간) 접속 기록은 365일 보존 후 자동 파기한다. 퇴사자 계정은 비활성 90일 후 개인 식별 정보를 파기한다.',
  '제4조 (반출 통제) 개인정보가 포함된 다운로드는 사유 입력을 의무로 하며, 전 건이 감사 로그에 남는다.',
  '제5조 (열람 요청) 정보 주체의 열람·정정 요청은 접수 후 10일 이내 처리한다.',
] as const

function PrivacyPage() {
  const toast = useToast()
  const [policyOpen, setPolicyOpen] = useState(false)
  const [maskPhone, setMaskPhone] = useState(true)
  const [maskEmail, setMaskEmail] = useState(false)
  const [retention, setRetention] = useState('365일')

  const downloads30d = AUDIT_LOG.filter((l) => l.action === '다운로드').length

  return (
    <AppShell active="privacy" title="개인정보보호">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">개인정보보호</h1>
          <p className="mt-1 text-[13px] text-ink-subtle">
            처리방침 · 반출 감사 · 마스킹 정책 — Super Admin 전용 화면
          </p>
        </div>
        <button
          type="button"
          onClick={() => setPolicyOpen(true)}
          className="h-9 rounded-lg border border-hairline bg-chip px-4 text-[13px] font-medium text-ink-muted transition-colors hover:border-primary/40 hover:text-ink"
        >
          처리방침 전문 보기
        </button>
      </div>

      {/* 현황 타일 — 0을 평온함으로 읽지 않는다: 대기 건이 있으면 색으로 말한다 */}
      <div className="mt-5 grid grid-cols-2 gap-3 pc:grid-cols-4">
        {(
          [
            { label: '현행 처리방침', value: 'v3.2', sub: '2026.08.01 시행' },
            { label: '반출(다운로드) · 30일', value: `${downloads30d}건`, sub: '전 건 사유 기록됨' },
            { label: '열람 요청 대기', value: '1건', sub: '기한 10일 — 8/12 까지', warn: true },
            { label: '파기 예정 계정', value: '3건', sub: '비활성 90일 경과' },
          ] as const
        ).map((t, i) => (
          <div
            key={t.label}
            style={{ animationDelay: `${i * 60}ms` }}
            className="card-spotlight card-hover anim-fade-up rounded-2xl border border-hairline bg-surface p-4"
          >
            <div className="text-xs text-ink-subtle">{t.label}</div>
            <div
              className={`mt-1 text-xl font-bold tabular-nums ${'warn' in t ? 'text-pending-ink' : 'text-ink'}`}
            >
              {t.value}
            </div>
            <div className="mt-0.5 text-[11px] text-ink-subtle">{t.sub}</div>
          </div>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_340px]">
        {/* 감사 로그 — 표는 자기 상자 안에서만 흐른다 */}
        <section className="anim-fade-up card-spotlight rounded-2xl border border-hairline bg-surface [animation-delay:120ms]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline bg-canvas/50 px-5 py-3.5">
            <h2 className="text-sm font-semibold text-ink">접속·반출 감사 로그</h2>
            <span className="text-[11px] text-ink-subtle">
              다운로드·마스킹 해제는 사유가 필수로 남습니다
            </span>
          </div>
          {/* 좁은 화면: 카드 — 로그 한 건이 독립 개체라 열 비교가 필요 없다 */}
          <ol className="space-y-2 p-4 pc:hidden">
            {AUDIT_LOG.map((l) => {
              const danger = l.action !== '열람'
              return (
                <li
                  key={`${l.at}.${l.target}`}
                  className={`rounded-xl border border-hairline/70 p-3 ${danger ? 'bg-pending-bg/20' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        danger ? 'bg-pending-bg text-pending-ink' : 'bg-chip text-ink-muted'
                      }`}
                    >
                      {l.action}
                      {danger && ' ⚠'}
                    </span>
                    <b className="text-xs font-medium text-ink">{l.user}</b>
                    <span className="ml-auto font-mono text-[10px] tabular-nums text-ink-subtle">{l.at}</span>
                  </div>
                  <div className="mt-1.5 text-xs text-ink-muted">{l.target}</div>
                  <div className="mt-0.5 text-[11px] text-ink-subtle">사유: {l.reason}</div>
                </li>
              )
            })}
          </ol>

          <div className="hidden overflow-x-auto pc:block">
            <table className="w-full min-w-[560px] border-collapse text-xs">
              <thead>
                <tr className="border-b border-hairline bg-canvas/60 text-left text-ink-subtle">
                  <th className="px-4 py-2.5 font-medium">시각</th>
                  <th className="px-3 py-2.5 font-medium">사용자</th>
                  <th className="px-3 py-2.5 font-medium">액션</th>
                  <th className="px-3 py-2.5 font-medium">대상</th>
                  <th className="px-3 py-2.5 font-medium">사유</th>
                </tr>
              </thead>
              <tbody>
                {AUDIT_LOG.map((l) => {
                  const danger = l.action !== '열람'
                  return (
                    <tr
                      key={`${l.at}.${l.target}`}
                      className={`border-b border-hairline/50 transition-colors last:border-0 hover:bg-chip ${
                        danger ? 'bg-pending-bg/20' : ''
                      }`}
                    >
                      <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[11px] tabular-nums text-ink-subtle">
                        {l.at}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-ink">{l.user}</td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            danger ? 'bg-pending-bg text-pending-ink' : 'bg-chip text-ink-muted'
                          }`}
                        >
                          {l.action}
                          {danger && ' ⚠'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-ink-muted">{l.target}</td>
                      <td className="px-3 py-2.5 text-ink-subtle">{l.reason}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-hairline px-5 py-2.5 text-[11px] text-ink-subtle">
            로그는 {retention} 보존 후 자동 파기됩니다 — 보존 기간은 우측 정책에서 바꿉니다.
          </div>
        </section>

        {/* 마스킹·보존 정책 — 되돌릴 수 있는 것은 묻지 않고 즉시 저장 */}
        <section className="anim-fade-up card-spotlight self-start rounded-2xl border border-hairline bg-surface [animation-delay:180ms]">
          <div className="border-b border-hairline bg-canvas/50 px-5 py-3.5">
            <h2 className="text-sm font-semibold text-ink">마스킹 · 보존 정책</h2>
          </div>
          <div className="space-y-3 p-5">
            <div className="flex items-center justify-between gap-2.5 rounded-xl bg-chip px-3.5 py-2.5">
              <span className="text-[13px]">
                <b className="font-medium text-ink">연락처 마스킹</b>
                <span className="block text-[11px] text-ink-subtle">010-****-5678 로 표시</span>
              </span>
              <Switch
                checked={maskPhone}
                onChange={(v) => {
                  setMaskPhone(v)
                  toast(`연락처 마스킹을 ${v ? '켰습니다' : '껐습니다'} — 같은 토글로 되돌립니다`)
                }}
                label="연락처 마스킹"
              />
            </div>
            <div className="flex items-center justify-between gap-2.5 rounded-xl bg-chip px-3.5 py-2.5">
              <span className="text-[13px]">
                <b className="font-medium text-ink">이메일 마스킹</b>
                <span className="block text-[11px] text-ink-subtle">hy****@hmg.com 로 표시</span>
              </span>
              <Switch
                checked={maskEmail}
                onChange={(v) => {
                  setMaskEmail(v)
                  toast(`이메일 마스킹을 ${v ? '켰습니다' : '껐습니다'} — 같은 토글로 되돌립니다`)
                }}
                label="이메일 마스킹"
              />
            </div>
            <div>
              <span className="text-xs font-medium text-ink-subtle">접속기록 보존 기간</span>
              <div className="mt-1.5">
                <ChipSelect
                  options={['90일', '180일', '365일']}
                  value={retention}
                  onChange={(v) => {
                    setRetention(v)
                    toast(`보존 기간을 ${v}로 저장했습니다`)
                  }}
                />
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-ink-subtle">
                처리방침 v3.2 는 365일을 기준으로 합니다 — 줄이면 방침 개정이 함께 필요합니다.
              </p>
            </div>
            <p className="rounded-xl border border-hairline bg-canvas/40 px-3.5 py-2.5 text-[11px] leading-relaxed text-ink-subtle">
              마스킹을 해제한 화면 조회는 전 건 감사 로그에 남습니다. 정책 변경 이력도 감사
              대상입니다.
            </p>
          </div>
        </section>
      </div>

      {/* 처리방침 전문 — 읽고 닫는 것이라 우측 서랍 */}
      {policyOpen && (
        <Drawer title="개인정보 처리방침 v3.2" onClose={() => setPolicyOpen(false)}>
          {(close) => (
            <div className="flex h-full flex-col">
              <div className="flex-1">
                <p className="text-xs text-ink-subtle">시행 2026.08.01 · 승인 김현대 · 문서 PP-2026-03</p>
                <div className="mt-3 space-y-3 border-t border-hairline pt-3.5">
                  {POLICY_BODY.map((p) => (
                    <p key={p} className="text-[13px] leading-relaxed text-ink-muted">
                      {p}
                    </p>
                  ))}
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2 border-t border-hairline pt-3.5">
                <button
                  type="button"
                  onClick={close}
                  className="h-9 rounded-lg border border-hairline bg-chip px-4 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
                >
                  닫기
                </button>
              </div>
            </div>
          )}
        </Drawer>
      )}
    </AppShell>
  )
}
