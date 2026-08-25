import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { AppShell } from '#/components/portal/AppShell'
import { ChipSelect, Switch } from '#/components/portal/Chips'
import { DataTable } from '#/components/portal/DataTable'
import { Drawer } from '#/components/portal/Drawer'
import { ListFoot, usePaged } from '#/components/portal/ListFoot'
import { useToast } from '#/components/portal/toast'
import { mergeAudit, recordAudit, useLocalAudit } from '#/data/auditStore'
import { members } from '#/data/members'
import type { Member } from '#/data/members'
import { useApi } from '#/lib/api'
import { useI18n } from '#/lib/i18n'

/** 위험 액션은 **반출 계열만** — 로그인 이력(요구사항: 5년 보관)까지 ⚠ 로 칠하면 신호가 죽는다.
 *  좁은 화면 카드와 넓은 화면 표가 **같은 저울**을 쓰도록 한 곳에 둔다. */
const isDanger = (action: string) => action === '다운로드' || action === '마스킹 해제'

/* ⚠ 감사 축이 넓어졌다(2026-08-20): 결재 상신·승인·반려·회수, 배포 요청, 엑셀 업로드가
   같은 표에 쌓인다. 그런데 이 화면의 이름은 **접속·반출** 감사 로그다 — 섞어만 두면
   화면의 뜻이 흐려진다. 그래서 저장은 한 곳, **보기는 구분**으로 가른다.
   가르는 기준은 이 화면이 원래 보던 것 — 반출·열람·로그인과, 그것을 좌우하는 정책이다.
   ⚠ 토글의 켜기·끄기가 서로 다른 칸으로 갈리면 같은 줄이 사라졌다 나타나 보인다. */
const AUDIT_KINDS = ['전체', '접속·반출', '업무 처리'] as const
const ACCESS_ACTIONS = ['다운로드', '마스킹 해제', '마스킹 적용', '보존 정책 변경', '열람', '로그인']
const kindOf = (action: string) => (ACCESS_ACTIONS.includes(action) ? '접속·반출' : '업무 처리')

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

/* 보존 기간 옵션 — 상태값은 한국어 상수 그대로, 라벨만 렌더 자리에서 사전을 입힌다 (규약 §4) */
const RETENTION_OPTIONS = ['90일', '180일', '365일'] as const

function PrivacyPage() {
  const toast = useToast()
  const { t, tf } = useI18n()
  const retentionLabel = (d: string) => t(`privacy.days.${d.replace('일', '')}`, d)
  const [policyOpen, setPolicyOpen] = useState(false)
  const [maskPhone, setMaskPhone] = useState(true)
  const [maskEmail, setMaskEmail] = useState(false)
  const [retention, setRetention] = useState('365일')
  const [auditKind, setAuditKind] = useState<(typeof AUDIT_KINDS)[number]>('전체')

  /* ⚠ 이 화면은 발치에 "정책 변경 이력도 감사 대상입니다"라고 적어 두고 **아무 데도
     안 남기고** 있었다(2026-08-20). 엑셀 업로드에서 잡았던 병과 같은 부류다 —
     화면이 약속한 것은 화면이 지킨다.
     ⚠ 되돌리기도 이 자리를 지난다: 되돌린 것도 일어난 일이라 한 줄로 남아야 한다.
        (여기서 안 남기면 "껐다"만 있고 "다시 켰다"가 없는 로그가 된다) */
  const setMask = (which: 'phone' | 'email', v: boolean) => {
    ;(which === 'phone' ? setMaskPhone : setMaskEmail)(v)
    recordAudit({
      action: v ? '마스킹 적용' : '마스킹 해제',
      target: which === 'phone' ? '연락처 마스킹 정책' : '이메일 마스킹 정책',
      reason: '개인정보 화면에서 정책 변경',
    })
  }

  // 감사 로그 정본은 서버 — 잠금 처리 등 실제 행위가 쌓인다 (없으면 mock)
  const { data: serverAudit } = useApi<typeof AUDIT_LOG>('/audit', AUDIT_LOG)
  /* ⚠ 이 화면에서 일어나지 않은 행위도 여기 보여야 한다 — 엑셀 업로드처럼 **다른 화면이
     남긴 것**이 안 보이면, 화면이 "감사 로그에 남습니다"라고 한 약속이 거짓이 된다
     (2026-08-19 신설 `data/auditStore.ts`). 서버가 살아 있으면 같은 줄이 겹치므로 걷어낸다. */
  const localAudit = useLocalAudit()
  const auditList = mergeAudit(serverAudit, localAudit)
  // 회원 명단은 **회원 관리와 같은 소스**로 읽는다 — 다르게 읽으면 두 화면이 갈라진다
  const { data: memberList } = useApi<Array<Member>>('/members', members)

  /* ⚠ 감사 로그는 **서버가 계속 적는** 목록이다 — mock 시드는 열댓 줄이었지만 회원 잠금
     한 번마다 줄이 늘어 이미 스무 줄을 넘었다(2026-08-18 실측 24건). 규약 §9 는 21줄부터
     쪽을 나누라고 하는데 이 화면만 안 나누고 있었다: 목록이 자라는 화면일수록 발이
     "몇 건인지"만 말하고 끝나면 화면이 한없이 길어진다. 카드(좁은 화면)와 표(넓은 화면)는
     **같은 쪽**을 본다 — 갈리면 같은 자리에서 다른 줄이 보인다. */
  const shownAudit = auditKind === '전체' ? auditList : auditList.filter((l) => kindOf(l.action) === auditKind)
  const { page, pageCount, pageRows, setPage } = usePaged(shownAudit)

  const downloads30d = auditList.filter((l) => l.action === '다운로드').length
  /** 파기 대상 — 비활성이면서 마지막 접속이 90일을 넘긴 계정 (처리방침 제3조) */
  const purgeScheduled = memberList.filter(
    (m) =>
      m.status === '비활성' &&
      (Date.now() - new Date(m.lastLogin.slice(0, 10).replaceAll('.', '-')).getTime()) / 86400000 > 90,
  ).length

  return (
    // 커뮤니티 5개는 폭을 통일한다 (사용자 결정 2026-08-13 — guide.tsx 주석 참고)
    <AppShell active="privacy" title={t('nav.privacy', '개인정보보호')}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('nav.privacy', '개인정보보호')}</h1>
          <p className="mt-1 text-[13px] text-ink-subtle">
            {t('page.privacy.subtitle', '처리방침 · 반출 감사 · 마스킹 정책 — Super Admin 전용 화면')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setPolicyOpen(true)}
          className="h-9 rounded-lg border border-hairline bg-chip px-4 text-[13px] font-medium text-ink-muted transition-colors hover:border-primary/40 hover:text-ink"
        >
          {t('privacy.viewPolicy', '처리방침 전문 보기')}
        </button>
      </div>

      {/* 현황 타일 — 0을 평온함으로 읽지 않는다: 대기 건이 있으면 색으로 말한다 */}
      <div className="mt-5 grid grid-cols-2 gap-3 pc:grid-cols-4">
        {(
          [
            { id: 'policyVersion', label: '현행 처리방침', value: 'v3.2', sub: '2026.08.01 시행' },
            { id: 'exports30d', label: '반출(다운로드) · 30일', value: downloads30d, sub: '전 건 사유 기록됨' },
            { id: 'pendingAccess', label: '열람 요청 대기', value: 1, sub: '기한 10일 — 8/12 까지', warn: true },
            /* ⚠⚠ 손으로 적은 **3** 이었다 — 회원 관리가 같은 잣대로 세면 0명인데 이 화면은
               3건이라 말했다(2026-08-18, 회원 카드를 채우다 드러남). 방침 제3조가 "비활성
               90일"이라고 못 박았으니 **명단에서 그 조건으로 센다**(규약 §10). */
            { id: 'purgeScheduled', label: '파기 예정 계정', value: purgeScheduled, sub: '비활성 90일 경과' },
          ] as const
        ).map((tile, i) => (
          <div
            key={tile.id}
            style={{ animationDelay: `${i * 60}ms` }}
            className="card-spotlight card-hover anim-fade-up rounded-2xl border border-hairline bg-surface p-4"
          >
            <div className="text-xs text-ink-subtle">{t(`privacy.tile.${tile.id}.label`, tile.label)}</div>
            <div
              className={`mt-1 text-xl font-bold tabular-nums ${'warn' in tile ? 'text-pending-ink' : 'text-ink'}`}
            >
              {typeof tile.value === 'number'
                ? tf(`privacy.tile.${tile.id}.value`, { n: tile.value }, `${tile.value}건`)
                : tile.value}
            </div>
            <div className="mt-0.5 text-xs text-ink-subtle">{t(`privacy.tile.${tile.id}.sub`, tile.sub)}</div>
          </div>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_340px]">
        {/* 감사 로그 — 표는 자기 상자 안에서만 흐른다.
            ⚠ 좁은 화면은 order 로 정책 카드를 앞세운다 — 로그 20건 아래(6천px)에 토글이
            묻히면 Super Admin 이 마스킹 하나 바꾸러 끝까지 긁어야 한다(2026-08-25 모바일
            실사). 넓은 화면은 우측 열이라 원래 순서 그대로. */}
        <section className="anim-fade-up card-spotlight order-2 rounded-2xl border border-hairline bg-surface [animation-delay:120ms] xl:order-1">
          <div className="flex flex-wrap items-center justify-between gap-2 surface-head px-5 py-3.5">
            <h2 className="text-sm font-semibold text-ink">{t('privacy.auditLogTitle', '감사 로그')}</h2>
            <ChipSelect
              options={AUDIT_KINDS}
              value={auditKind}
              onChange={(v) => {
                setAuditKind(v)
                setPage(1) // ⚠ 걸러 놓고 3쪽에 서 있으면 빈 표가 보인다
              }}
              label={(k) => t(`privacy.auditKind.${k}`, k)}
            />
          </div>
          {/* 좁은 화면: 카드 — 로그 한 건이 독립 개체라 열 비교가 필요 없다 */}
          <ol className="space-y-2 p-4 pc:hidden">
            {pageRows.map((l, i) => {
              const danger = isDanger(l.action)
              return (
                <li
                  key={`${l.at}.${l.target}.${i}`}
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
                  <div className="mt-0.5 text-xs text-ink-subtle">
                    {t('privacy.label.reason', '사유')}: {l.reason}
                  </div>
                </li>
              )
            })}
          </ol>

          {/* ⚠ 줄 틴트는 **반투명**으로만 준다 — 불투명하면 관문의 가장자리 그림자를
              덮어서 "오른쪽에 열이 더 있다"는 신호가 사라진다. 그리고 색만으로 말하지
              않는다(§16): 위험은 액션 칩의 색과 ⚠ 글자가 이미 말하고, 줄 색은 긴 로그를
              훑을 때의 보조다. */}
          <div className="hidden px-4 pb-4 pc:block">
            <DataTable
              rows={pageRows}
              /* ⚠⚠ 키에 **자리(index)를 함께** 넣는다 — 감사 로그에는 같은 시각·같은 대상
                 줄이 여러 개 쌓인다(잠금/해제를 연달아 누르면 초 단위로 같다). 키가
                 겹치면 React 가 줄을 못 가려서, 쪽을 넘겨도 첫 줄이 이전 쪽 것으로
                 남았다(2026-08-18 e2e 가 잡음: 2쪽인데 1쪽의 맨 윗줄이 그대로). */
              rowKey={(l, i) => `${l.at}.${l.target}.${i}`}
              rowTone={(l) => (isDanger(l.action) ? 'bg-pending-bg/20' : undefined)}
              minWidth={560}
              empty={{ title: t('privacy.auditEmpty', '기록된 접근이 없습니다.') }}
              columns={[
                {
                  header: t('privacy.th.at', '시각'),
                  cellClassName: 'whitespace-nowrap font-mono text-xs tabular-nums text-ink-subtle',
                  cell: (l) => l.at,
                },
                {
                  header: t('privacy.th.user', '사용자'),
                  cellClassName: 'whitespace-nowrap text-ink',
                  cell: (l) => l.user,
                },
                {
                  header: t('privacy.th.action', '액션'),
                  cellClassName: 'whitespace-nowrap',
                  cell: (l) => (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        isDanger(l.action) ? 'bg-pending-bg text-pending-ink' : 'bg-chip text-ink-muted'
                      }`}
                    >
                      {l.action}
                      {isDanger(l.action) && ' ⚠'}
                    </span>
                  ),
                },
                { header: t('privacy.th.target', '대상'), cellClassName: 'text-ink-muted', cell: (l) => l.target },
                { header: t('privacy.label.reason', '사유'), cellClassName: 'text-ink-subtle', cell: (l) => l.reason },
              ]}
            />
          </div>
          {/* ⚠ 발은 **표 상자 밖**에 둔다 — 넓은 화면 전용 상자(`hidden pc:block`) 안에
              있어서 좁은 화면에서는 목록이 몇 건인지도, 쪽도 통째로 사라져 있었다
              (2026-08-18 e2e 가 잡음: 카드 목록만 스무 줄 나오고 끝났다). 카드와 표는
              같은 쪽을 보므로 발도 하나다. */}
          <div className="px-4 pb-4 pc:px-4">
            <ListFoot
              total={shownAudit.length}
              shown={pageRows.length}
              unit="건"
              page={page}
              pageCount={pageCount}
              onPage={setPage}
            />
          </div>
          <div className="border-t border-hairline px-5 py-2.5 text-xs text-ink-subtle">
            {tf(
              'privacy.retentionNote',
              { retention: retentionLabel(retention) },
              `로그는 ${retention} 보존 후 자동 파기됩니다 — 보존 기간은 우측 정책에서 바꿉니다.`,
            )}
          </div>
        </section>

        {/* 마스킹·보존 정책 — 되돌릴 수 있는 것은 묻지 않고 즉시 저장 */}
        <section className="anim-fade-up card-spotlight order-1 self-start rounded-2xl border border-hairline bg-surface [animation-delay:180ms] xl:order-2">
          <div className="surface-head px-5 py-3.5">
            <h2 className="text-sm font-semibold text-ink">{t('privacy.maskPolicyTitle', '마스킹 · 보존 정책')}</h2>
          </div>
          <div className="space-y-3 p-5">
            <div className="flex items-center justify-between gap-2.5 rounded-xl bg-chip px-3.5 py-2.5">
              <span className="text-[13px]">
                <b className="font-medium text-ink">{t('privacy.label.maskPhone', '연락처 마스킹')}</b>
                <span className="block text-xs text-ink-subtle">
                  {t('privacy.maskPhoneDesc', '010-****-5678 로 표시')}
                </span>
              </span>
              <Switch
                checked={maskPhone}
                onChange={(v) => {
                  setMask('phone', v)
                  toast(
                    tf(
                      'privacy.toast.maskToggle',
                      {
                        field: t('privacy.label.maskPhone', '연락처 마스킹'),
                        state: v ? t('privacy.state.on', '켰습니다') : t('privacy.state.off', '껐습니다'),
                      },
                      `연락처 마스킹을 ${v ? '켰습니다' : '껐습니다'}`,
                    ),
                    { onUndo: () => setMask('phone', !v) },
                  )
                }}
                label={t('privacy.label.maskPhone', '연락처 마스킹')}
              />
            </div>
            <div className="flex items-center justify-between gap-2.5 rounded-xl bg-chip px-3.5 py-2.5">
              <span className="text-[13px]">
                <b className="font-medium text-ink">{t('privacy.label.maskEmail', '이메일 마스킹')}</b>
                <span className="block text-xs text-ink-subtle">
                  {t('privacy.maskEmailDesc', 'hy****@hmg.com 로 표시')}
                </span>
              </span>
              <Switch
                checked={maskEmail}
                onChange={(v) => {
                  setMask('email', v)
                  toast(
                    tf(
                      'privacy.toast.maskToggle',
                      {
                        field: t('privacy.label.maskEmail', '이메일 마스킹'),
                        state: v ? t('privacy.state.on', '켰습니다') : t('privacy.state.off', '껐습니다'),
                      },
                      `이메일 마스킹을 ${v ? '켰습니다' : '껐습니다'}`,
                    ),
                    { onUndo: () => setMask('email', !v) },
                  )
                }}
                label={t('privacy.label.maskEmail', '이메일 마스킹')}
              />
            </div>
            <div>
              <span className="text-xs font-medium text-ink-subtle">
                {t('privacy.label.retention', '접속기록 보존 기간')}
              </span>
              <div className="mt-1.5">
                <ChipSelect
                  options={RETENTION_OPTIONS.map(retentionLabel)}
                  value={retentionLabel(retention)}
                  onChange={(v) => {
                    const raw = RETENTION_OPTIONS.find((d) => retentionLabel(d) === v) ?? '365일'
                    const before = retention
                    setRetention(raw)
                    /* ⚠ 보존 기간을 줄이는 것은 **기록을 지우는 결정**이다 — 무엇에서
                       무엇으로 갔는지가 없으면 나중에 되짚을 수 없다(값은 한국어 원문). */
                    recordAudit({
                      action: '보존 정책 변경',
                      target: `접속기록 보존 기간 ${before} → ${raw}`,
                      reason: '개인정보 화면에서 정책 변경',
                    })
                    toast(
                      tf(
                        'privacy.toast.retentionSaved',
                        { retention: retentionLabel(raw) },
                        `보존 기간을 ${raw}로 저장했습니다`,
                      ),
                    )
                  }}
                />
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-ink-subtle">
                {t(
                  'privacy.retentionPolicyNote',
                  '처리방침 v3.2 는 365일을 기준으로 합니다 — 줄이면 방침 개정이 함께 필요합니다.',
                )}
              </p>
            </div>
            <p className="rounded-xl border border-hairline bg-canvas/40 px-3.5 py-2.5 text-xs leading-relaxed text-ink-subtle">
              {t(
                'privacy.auditFootnote',
                '마스킹을 해제한 화면 조회는 전 건 감사 로그에 남습니다. 정책 변경 이력도 감사 대상입니다.',
              )}
            </p>
          </div>
        </section>
      </div>

      {/* 처리방침 전문 — 읽고 닫는 것이라 우측 서랍 */}
      {policyOpen && (
        <Drawer
          title={t('privacy.policyDrawerTitle', '개인정보 처리방침 v3.2')}
          onClose={() => setPolicyOpen(false)}
          /* 발은 관문 슬롯으로 (규약 §7). 방침 전문은 특히 길어서, 몸 안에 두면
             닫기 버튼을 보려고 전문을 끝까지 내려야 했다 */
          footer={(close) => (
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={close}
                className="h-9 rounded-lg border border-hairline bg-chip px-4 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
              >
                {t('common.close')}
              </button>
            </div>
          )}
        >
          {() => (
            <div>
              <div>
                <p className="text-xs text-ink-subtle">
                  {tf(
                    'privacy.policyMeta',
                    { date: '2026.08.01', approver: '김현대', doc: 'PP-2026-03' },
                    '시행 2026.08.01 · 승인 김현대 · 문서 PP-2026-03',
                  )}
                </p>
                <div className="mt-3 space-y-3 border-t border-hairline pt-3.5">
                  {POLICY_BODY.map((p) => (
                    <p key={p} className="text-[13px] leading-relaxed text-ink-muted">
                      {p}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Drawer>
      )}
    </AppShell>
  )
}
