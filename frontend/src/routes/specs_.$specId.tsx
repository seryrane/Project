import { useEffect, useMemo, useState } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'

import { AppShell } from '#/components/portal/AppShell'
import { ChipSelect, Switch } from '#/components/portal/Chips'
import { CtaButton, simulate } from '#/components/portal/Skeleton'
import { DataTable } from '#/components/portal/DataTable'
import { Drawer } from '#/components/portal/Drawer'
import { ListFoot } from '#/components/portal/ListFoot'
import { Modal } from '#/components/portal/Modal'
import { StatusBadge } from '#/components/portal/StatusBadge'
import { VersionCompareModal } from '#/components/portal/VersionCompareModal'
import { useToast } from '#/components/portal/toast'
import { useI18n } from '#/lib/i18n'
import { TEMPLATE, rowToFieldDef } from '#/lib/specImport'
import { buildXlsx } from '#/lib/xlsxWrite'
import { SpecImportModal } from '#/components/portal/SpecImportModal'
import { currentVersion } from '#/data/specs'
import { useSpecList } from '#/data/specStore'
import { mergeSpecFields, setSpecFields, useSpecFields } from '#/data/specFieldStore'
import { recordAudit } from '#/data/auditStore'
import {
  activeRequestOfSpec,
  requestsOfSpec,
  unsettledRequestsOfSpec,
  useApprovalLine,
  useApprovalList,
} from '#/data/approvalStore'
import { submitSpec, withdrawSpecRequest } from '#/data/workflow'
import type { ApprovalStep } from '#/data/approvals'
import { SERVICE_ROLE_LABEL } from '#/data/members'
import {
  FIELD_CATEGORIES,
  FIELD_STATUS_CLS,
  WORKFLOW_STEPS,
  workflowIndex,
} from '#/data/specFields'
import type { FieldDef, FieldStatus, FieldType } from '#/data/specFields'

/** 데모 로그인 계정 — 본개발에서는 `GET /api/me` 가 준다 (규약 §4-2) */
const ME = '김현대'

export const Route = createFileRoute('/specs_/$specId')({
  component: SpecDetailPage,
  // 목록 카드 [승인 요청]이 이 문으로 들어온다 — 상신 판단(모달·결재선)은 상세 한 곳에만 산다
  validateSearch: (search: Record<string, unknown>): { request?: string } => ({
    request: search.request === '1' || search.request === 1 || search.request === true ? '1' : undefined,
  }),
})

/* 배포 워크플로우 스테퍼 — 지금 어디까지 왔는지가 헤더에서 한눈에 보인다 */
function WorkflowStepper({
  current,
  label,
}: {
  current: number
  /** 단계 이름은 값(한국어 정본)을 그대로 두고 표시만 옮긴다 (규약 §4-7) */
  label: (s: string) => string
}) {
  return (
    <div className="overflow-x-auto">
      <ol className="flex min-w-max items-center gap-1 text-xs">
        {WORKFLOW_STEPS.map((s, i) => (
          <li key={s} className="flex items-center gap-1">
            {i > 0 && <span className="text-ink-subtle">→</span>}
            <span
              className={`rounded-full px-2 py-0.5 font-medium ${
                i < current
                  ? 'bg-chip text-ink-muted'
                  : i === current
                    ? 'bg-primary/15 font-semibold text-primary ring-1 ring-primary/40'
                    : 'text-ink-subtle'
              }`}
            >
              {label(s)}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}

/* 결재선 — 누가 · 몇 번째 · 지금 누구 차례. 정본은 data/approvals.ts 한 곳이다.
   ⚠ 예전엔 상신 모달 안에만, 그것도 글자로 박혀 있었다 — 결재에 올라간 뒤에는
   화면 어디서도 "지금 누구에게 가 있는지" 알 수 없었다(2026-08-18). */
function ApprovalLine({
  line,
  step,
  roleLabel,
  stepLabel,
}: {
  /** ⚠ 결재선은 **설정으로 바뀐다**(FR-114 ②) — 상수를 직접 읽으면 바꾼 선이 안 보인다 */
  line: Array<ApprovalStep>
  /** 지금 몇 번째 결재가 진행 중인가 (1부터) — 결재함이 알려 준다 */
  step: number
  roleLabel: (code: string) => string
  /** 단계 이름(검토·최종 승인) — 값은 정본 그대로, 표시만 사전이 옮긴다 */
  stepLabel: (label: string) => string
}) {
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs">
      {line.map((a, i) => {
        const done = a.seq < step
        const now = a.seq === step
        return (
          <li key={a.seq} className="flex items-center gap-2">
            {i > 0 && <span className="text-ink-subtle">→</span>}
            <span
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 ${
                now
                  ? 'bg-pending-bg font-semibold text-pending-ink ring-1 ring-pending-ink/30'
                  : done
                    ? 'bg-chip text-ink-muted'
                    : 'text-ink-subtle'
              }`}
            >
              {/* 색만으로 가르지 않는다 — 끝난 단계는 체크, 지금 차례는 채운 점 (규약 §2) */}
              <span aria-hidden>{done ? '✓' : now ? '●' : '○'}</span>
              {a.name}
              <span className="font-normal opacity-70">
                {stepLabel(a.label)} · {roleLabel(a.role)}
              </span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}

const TYPE_OPTIONS: Array<FieldType> = ['string', 'number', 'select', 'text', 'boolean', 'date']
const STATUS_OPTIONS: Array<FieldStatus> = ['완료', '진행중', '검토중', '미완료']

function SpecDetailPage() {
  const { t, tf } = useI18n()
  const { specId } = Route.useParams()
  const { request } = Route.useSearch()
  const navigate = useNavigate()
  const toast = useToast()
  const specList = useSpecList()
  const spec = specList.find((s) => s.id === specId)

  // 필드 정의 편집 상태 — 프로토타입: 화면 상태 + 임시저장(localStorage)
  const draftKey = `spec-fields-draft.${specId}`
  // ⚠ 시드 4건만 mock 필드표를 갖는다 — 방금 등록한 사양서는 **빈 표**로 시작한다
  //   (안 그러면 "필드 정의를 채워 주세요" 토스트 옆에 남의 필드 32개가 서 있다)
  /* ⚠ 정본은 **스토어**다(`data/specFieldStore.ts`). 예전엔 이 화면의 useState 가 정본이라
     엑셀의 '필드 정의' 시트를 올려도 붙일 곳이 없었다 — 업로드 화면은 검증만 하고
     "n건 반영했습니다"라고 말했다(2026-08-19). 화면은 편집 중인 사본을 들고, 저장할 때
     정본에 넣는다. 정본이 밖에서 바뀌면(엑셀 이관) 사본을 다시 맞춘다. */
  const saved = useSpecFields(specId)
  const [fields, setFields] = useState<Array<FieldDef>>(saved)
  useEffect(() => {
    setFields(saved)
    setDirty(0)
  }, [saved])
  const [dirty, setDirty] = useState(0)
  const [draftInfo, setDraftInfo] = useState<string | null>(null) // 임시저장본 안내 배너
  const [cat, setCat] = useState<string>('전체')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<FieldDef | null>(null)
  const [history, setHistory] = useState(false)
  const [importing, setImporting] = useState(false)
  const [compare, setCompare] = useState(false)
  // 승인 요청 흐름 — 상신하면 **스토어 상태가 실제로 바뀐다** (specStore).
  // 예전엔 이 화면의 useState 로만 움직여서, 목록으로 돌아가면 카드가 여전히
  // '검토 중'이었다 — 상신했다는 화면과 안 했다는 화면이 공존했다(2026-08-18).
  const [requesting, setRequesting] = useState(false)
  const [withdrawing, setWithdrawing] = useState(false)

  /* ── 결재 중 잠금 (규약 §2 되돌릴 수 없는 것은 묻는다 · §17 못 하면 이유를 적는다) ──
     ⚠ 결재에 올라간 문서를 그 자리에서 계속 고칠 수 있었다. 승인자가 본 것과 다른
     문서가 승인되는 길이 열려 있었던 셈이다(2026-08-18). 잠그되 **왜 잠겼는지**와
     **언제 풀리는지**를 함께 적는다 — 회색 버튼만 있으면 고장으로 읽힌다. */
  const locked = spec ? currentVersion(spec).status === '승인 대기' : false
  /* 결재함을 구독한다 — 승인 관리에서 누가 처리하면 이 화면의 결재선·잠금이 함께 움직인다.
     ⚠ `useApprovalList()` 의 결과를 안 쓰더라도 **구독은 해야** 다시 그린다. */
  useApprovalList()
  const approval = activeRequestOfSpec(specId)
  /* 겹침 — 같은 사양서를 보는 진행 중 요청. 둘 이상이면 "누구 것으로 갈지"가 아직 안 정해진
     문서다(2026-07-20 회의). ⚠ 세는 자리는 결재함이지 이 화면이 아니다. */
  const overlapping = unsettledRequestsOfSpec(specId)
  const approvalHistory = requestsOfSpec(specId)
  const line = useApprovalLine()
  /** 결재자의 Role 코드를 사람 말로 — 회원 화면과 같은 사전을 쓴다 (규약 §4-7) */
  const roleLabel = (code: string) =>
    t(`role.${code}`, (SERVICE_ROLE_LABEL as Record<string, string | undefined>)[code] ?? code)
  const stepLabel = (label: string) => t(`approvalStep.${label}`, label)

  // 목록 카드 [승인 요청]에서 ?request=1 로 들어오면 상신 모달을 열고 주소에서 지운다
  // (새로고침이 모달을 또 열지 않게 — specs.tsx 의 ?new=1 과 같은 규칙)
  useEffect(() => {
    if (!request) return
    setRequesting(true)
    void navigate({
      to: '/specs/$specId',
      params: { specId },
      search: { request: undefined },
      replace: true,
    })
  }, [request, navigate, specId])

  // 임시저장본은 묻는다 — 자동으로 덮지 않는다 (규약 §2 초안 규칙)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey)
      if (raw) {
        const parsed = JSON.parse(raw) as { at: string }
        setDraftInfo(parsed.at)
      }
    } catch {
      /* 깨진 초안은 무시 */
    }
  }, [draftKey])

  const counts = useMemo(() => {
    const c: Record<FieldStatus, number> = { 완료: 0, 진행중: 0, 검토중: 0, 미완료: 0 }
    for (const f of fields) c[f.status]++
    return c
  }, [fields])

  const visible = fields.filter((f) => {
    const inCat = cat === '전체' || f.category === cat
    const q = query.trim()
    const inQuery = q === '' || f.name.includes(q) || f.desc.includes(q)
    return inCat && inQuery
  })

  if (!spec) {
    return (
      <AppShell active="specs" title="사양서 관리">
        <p className="text-sm text-ink-subtle">
          {t('specDetail.notFound', '사양서를 찾을 수 없습니다.')}{' '}
          <Link to="/specs" className="text-primary underline">
            {t('specDetail.toList', '목록으로')}
          </Link>
        </p>
      </AppShell>
    )
  }

  const cur = currentVersion(spec)
  const deployed = spec.history.find((v) => v.status === '배포 완료')

  const saveField = (next: FieldDef) => {
    setFields((fs) => fs.map((f) => (f.no === next.no ? next : f)))
    setDirty((d) => d + 1)
    toast(tf('specDetail.toast.fieldUpdated', { name: next.name }, '{name} 필드를 수정했습니다'))
  }

  /** 필드표를 엑셀로 — **올릴 때 읽는 열 이름 그대로** 내보낸다(왕복이 성립하는 이유) */
  const downloadFields = () => {
    const cols = [...TEMPLATE.fields.required, ...TEMPLATE.fields.optional]
    const rows = [
      cols,
      ...fields.map((f) => [
        spec.name,
        f.name,
        f.type,
        [f.category, f.sub].filter(Boolean).join(' · '),
        f.required ? 'Y' : 'N',
        f.maxLen == null ? '' : String(f.maxLen),
        f.rule ?? '',
        f.status,
      ]),
    ]
    const url = URL.createObjectURL(
      buildXlsx([{ name: '필드 정의', rows, widths: [34, 18, 10, 24, 8, 10, 22, 10] }]),
    )
    const a = document.createElement('a')
    a.href = url
    a.download = `${spec.name}_필드정의.xlsx`
    a.click()
    URL.revokeObjectURL(url)
    // 반출은 감사에 남는다 (개인정보 처리방침 제4조와 같은 축 — 규약: 나간 것은 기록한다)
    recordAudit({ action: '다운로드', target: `${spec.name} 필드 정의 (${fields.length}건)`, reason: '엑셀 편집' })
    toast(tf('specDetail.toast.excelDownloaded', { n: fields.length }, '필드 {n}건을 엑셀로 내려받았습니다'))
  }

  const saveDraft = () => {
    const at = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    localStorage.setItem(draftKey, JSON.stringify({ at, fields }))
    setDraftInfo(null)
    toast(tf('specDetail.toast.draftSaved', { at }, '임시저장했습니다 ({at})'))
  }

  const restoreDraft = () => {
    try {
      const raw = localStorage.getItem(draftKey)
      if (raw) {
        const parsed = JSON.parse(raw) as { at: string; fields: Array<FieldDef> }
        setFields(parsed.fields)
        setDirty((d) => d + 1)
      }
    } finally {
      setDraftInfo(null)
    }
  }

  const discardDraft = () => {
    localStorage.removeItem(draftKey)
    setDraftInfo(null)
  }

  return (
    <AppShell active="specs" title={spec.name}>
      {/* 머리 — 사용자 관점 필수 정보: 무엇을 · 어느 버전 · 어디까지 왔나 */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            to="/specs"
            className="text-xs text-ink-subtle transition-colors hover:text-ink"
          >
            {t('specDetail.backToList', '← 사양서 목록')}
          </Link>
          <h1 className="mt-1 flex flex-wrap items-center gap-2.5 text-2xl font-bold">
            {spec.name}
            <StatusBadge status={cur.status} />
          </h1>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-subtle">
            <span>
              {t('page.specDetail.current', '현재')} <b className="font-mono text-ink">{cur.version}</b>
            </span>
            {deployed && (
              <span>
                {t('page.specDetail.deployed', '배포')}{' '}
                <b className="font-mono text-ink">{deployed.version}</b>
              </span>
            )}
            <span>{tf('page.specDetail.owner', { name: cur.author }, '담당 {name}')}</span>
            <span>{tf('page.specDetail.modified', { date: cur.date }, '{date} 수정')}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* 흐름 연결 — 이 문서가 결재 중이면 결재로, 아니면 승인 요청으로 가는 길 */}
          {cur.status === '승인 대기' ? (
            <>
              <button
                type="button"
                onClick={() => navigate({ to: '/approvals' })}
                className="h-9 rounded-lg border border-pending-ink/40 bg-pending-bg px-3.5 text-[13px] font-semibold text-pending-ink transition-opacity hover:opacity-85"
              >
                {t('specDetail.viewApproval', '결재 진행 보기 →')}
              </button>
              {/* 회수 — 한 단계라도 승인이 찍혔으면 버튼 자체를 안 낸다: 누를 수 없는 버튼을
                  두면 왜 안 되는지 묻게 되고, 여기서는 "이미 누가 판단했다"가 답이라
                  결재선이 그것을 말한다 (✔ 2026-08-19 채택) */}
              {approval && approval.trail.length === 0 && (
                <button
                  type="button"
                  onClick={() => setWithdrawing(true)}
                  className="h-9 rounded-lg border border-hairline bg-surface px-3.5 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
                >
                  {t('specDetail.withdraw', '요청 회수')}
                </button>
              )}
            </>
          ) : cur.status === '승인 완료' ? (
            /* ⚠ 승인이 끝난 문서에 [승인 요청]을 또 내밀면 **눌러도 아무 일이 없다**(스토어가
               초안·검토 중만 받는다) — 1판에서 고친 죽은 조작과 같은 부류다. 다음 행동은
               배포 요청이므로 길을 그쪽으로 낸다(규약 §10 카드는 다음 행동으로 끝난다). */
            <button
              type="button"
              onClick={() => navigate({ to: '/deploys' })}
              className="h-9 rounded-lg border border-approved-ink/40 bg-approved-bg px-3.5 text-[13px] font-semibold text-approved-ink transition-opacity hover:opacity-85"
            >
              {t('specDetail.goDeploy', '배포 요청하기 →')}
            </button>
          ) : cur.status === '배포 완료' ? (
            // 배포까지 끝난 문서에는 올릴 것이 없다 — 빈 자리로 두고 버튼을 만들지 않는다
            <span className="text-[13px] text-ink-subtle">
              {t('specDetail.alreadyDeployed', '배포까지 완료된 버전입니다')}
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setRequesting(true)}
              className="h-9 rounded-lg border border-hairline bg-surface px-3.5 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
            >
              {cur.rejection
                ? t('specDetail.resubmit', '재요청')
                : t('specDetail.requestApproval', '승인 요청')}
            </button>
          )}
          <button
            type="button"
            onClick={() => setCompare(true)}
            className="h-9 rounded-lg border border-hairline bg-surface px-3.5 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
          >
            {t('specDetail.compareVersions', '버전 비교')}
          </button>
          <button
            type="button"
            onClick={() => setHistory(true)}
            className="h-9 rounded-lg border border-hairline bg-surface px-3.5 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
          >
            {t('specDetail.history', '이력')}
          </button>
          <button
            type="button"
            onClick={saveDraft}
            disabled={dirty === 0 || locked}
            title={locked ? t('specDetail.lockedHint', '결재 중에는 고칠 수 없습니다') : undefined}
            className="h-9 rounded-lg border border-hairline bg-surface px-3.5 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink disabled:opacity-40"
          >
            {t('specDetail.saveDraft', '임시저장')}
            {dirty > 0 && <span className="ml-1 tabular-nums text-primary">{dirty}</span>}
          </button>
          <button
            type="button"
            onClick={() => {
              // ⚠ 예전엔 dirty 만 0 으로 되돌리고 **아무 데도 안 넣었다** — 다른 화면이 보는
              //   필드는 그대로였다. 정본에 넣는다(그래야 이관·상세가 같은 표를 본다).
              setSpecFields(specId, fields)
              setDirty(0)
              localStorage.removeItem(draftKey)
              toast(
                t(
                  'specDetail.toast.savedAll',
                  '사양서에 반영했습니다 — 승인 요청은 워크플로우에서 진행합니다',
                ),
              )
            }}
            disabled={dirty === 0 || locked}
            title={locked ? t('specDetail.lockedHint', '결재 중에는 고칠 수 없습니다') : undefined}
            className="h-9 rounded-lg bg-gradient-to-r from-primary to-accent2 px-4 text-[13px] font-semibold text-white shadow-[0_2px_10px_var(--color-glow)] transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {t('specDetail.saveAll', '전체 저장')}
          </button>
        </div>
      </div>

      {/* 임시저장본 안내 — 자동 복원하지 않고 묻는다 */}
      {draftInfo && (
        <div className="anim-fade-in mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-review-ink/30 bg-review-bg px-4 py-3 text-[13px] text-review-ink">
          <span>
            {tf(
              'specDetail.draftBanner',
              { at: draftInfo },
              '임시저장본이 있습니다 ({at}). 이어서 작업할까요? 지금 화면은 마지막 반영본입니다.',
            )}
          </span>
          <span className="flex gap-2">
            <button
              type="button"
              onClick={restoreDraft}
              className="rounded-lg bg-review-ink/15 px-3 py-1.5 font-semibold transition-opacity hover:opacity-80"
            >
              {t('specDetail.resumeDraft', '이어서 작업')}
            </button>
            <button
              type="button"
              onClick={discardDraft}
              className="rounded-lg px-3 py-1.5 transition-opacity hover:opacity-70"
            >
              {t('specDetail.discardDraft', '버리기')}
            </button>
          </span>
        </div>
      )}

      {/* 배포 워크플로우 */}
      <div className="mt-4 rounded-xl border border-hairline bg-surface px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="text-xs font-medium text-ink-subtle">
            {t('specDetail.workflowLabel', '배포 워크플로우')}
          </span>
          <WorkflowStepper current={workflowIndex(cur.status)} label={(w) => t(`workflow.${w}`, w)} />
        </div>

        {/* 결재 중일 때만 — 지금 누구 차례인지가 이 화면에서 보여야 한다 (⑦) */}
        {locked && (
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-hairline pt-3">
            <span className="text-xs font-medium text-ink-subtle">
              {t('specDetail.approvalLineLabel', '결재선')}
            </span>
            <ApprovalLine line={approval?.line ?? line} step={approval?.step[0] ?? 1} roleLabel={roleLabel} stepLabel={stepLabel} />
            {approval && (
              <span className="text-xs text-ink-subtle">
                {tf(
                  'specDetail.approvalWaiting',
                  { days: approval.waitingDays, at: approval.deadline },
                  '{days}일째 대기 · 기한 {at}',
                )}
              </span>
            )}
          </div>
        )}
      </div>

      {/* 반려 자국 — 결재에서 밀려난 문서는 **왜** 밀렸는지를 안고 돌아온다(규약 §17).
          이것이 없으면 요청자는 초안으로 돌아온 문서를 보고 무엇을 고칠지 모른 채 다시 올린다. */}
      {cur.rejection && (
        <div className="anim-fade-in mt-4 rounded-xl border border-danger-ink/30 bg-danger-bg px-4 py-3 text-[13px] text-danger-ink">
          <div className="font-semibold">
            {tf(
              'specDetail.rejectedTitle',
              { by: cur.rejection.by, at: cur.rejection.at },
              '{by} 님이 반려했습니다 · {at}',
            )}
          </div>
          <p className="mt-1 leading-relaxed">{cur.rejection.reason}</p>
          <p className="mt-1.5 text-xs opacity-80">
            {t('specDetail.rejectedHint', '고친 뒤 [재요청]을 누르면 같은 결재선으로 다시 올라갑니다.')}
          </p>
        </div>
      )}

      {/* 잠근 이유와 풀리는 조건을 함께 적는다 — 회색 버튼만 있으면 고장으로 읽힌다 (⑧) */}
      {locked && (
        <div className="anim-fade-in mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-pending-ink/30 bg-pending-bg px-4 py-3 text-[13px] text-pending-ink">
          <span>
            {t(
              'specDetail.lockedBanner',
              '결재 중이라 필드를 고칠 수 없습니다 — 승인자가 본 문서가 그대로 승인되어야 합니다. 반려되거나 승인이 끝나면 다시 열립니다.',
            )}
          </span>
          <button
            type="button"
            onClick={() => navigate({ to: '/approvals' })}
            className="rounded-lg bg-pending-ink/15 px-3 py-1.5 font-semibold transition-opacity hover:opacity-80"
          >
            {t('specDetail.viewApproval', '결재 진행 보기 →')}
          </button>
          {/* ⚠⚠ **잠근 것은 '내용'이지 '요청'이 아니다**(2026-07-20 고객): "권한이 있는 사람이
              둘 다 같은 사양을 수정하고 싶으면 둘 다 신청할 수 있어야 한다 — 누가 먼저 했다고
              다른 사람 걸 막는 건 안 될 것 같다." 예전엔 이 자리에 길이 아예 없어서, 두 번째
              사람의 변경 요청이 **갈 곳 없이 사라졌다**. */}
          <button
            type="button"
            onClick={() => setRequesting(true)}
            className="rounded-lg border border-pending-ink/40 px-3 py-1.5 font-semibold transition-opacity hover:opacity-80"
          >
            {t('specDetail.addChangeRequest', '변경 요청 추가')}
          </button>
        </div>
      )}

      {/* 겹침 — 막지 않고 **말해 준다**. 정리는 승인 관리에서 사람이 한다 */}
      {overlapping.length > 1 && (
        <div className="anim-fade-in mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-danger-ink/30 bg-danger-bg px-4 py-3 text-[13px] text-danger-ink">
          <span>
            {tf(
              'specDetail.conflictBanner',
              { n: overlapping.length },
              '이 사양서에 변경 요청이 {n}건 겹쳐 있습니다 — 하나를 고르고 나머지는 사유를 내고 취소해야 배포할 수 있습니다.',
            )}
          </span>
          <span className="font-mono text-xs opacity-80">{overlapping.map((r) => r.id).join(' · ')}</span>
          <button
            type="button"
            onClick={() => navigate({ to: '/approvals' })}
            className="ml-auto rounded-lg bg-danger-ink/15 px-3 py-1.5 font-semibold transition-opacity hover:opacity-80"
          >
            {t('specDetail.resolveConflict', '겹침 정리하러 가기 →')}
          </button>
        </div>
      )}

      {/* 필드 목록 — 엑셀 시트(카테고리) = 탭, 표가 정본, 행을 누르면 우측에서 편집 */}
      <section className="mt-5 card-spotlight rounded-2xl border border-hairline bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-ink">
              {tf('specDetail.fieldListTitle', { n: fields.length }, '필드 목록 ({n}개)')}
            </h2>
            <p className="mt-0.5 text-xs text-ink-subtle">
              {t(
                'specDetail.fieldListHint',
                '행을 누르면 우측에서 편집합니다 · 표는 자기 상자 안에서만 가로로 흐릅니다',
              )}
            </p>
          </div>
          {/* 필드가 하나도 없으면 0 네 개짜리 칩 줄은 자리만 먹는다 — 셀 것이 있을 때만 센다 */}
          {fields.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {STATUS_OPTIONS.map((s) => (
                <span key={s} className={`rounded-full px-2 py-0.5 font-semibold tabular-nums ${FIELD_STATUS_CLS[s]}`}>
                  {t(`fieldStatus.${s}`, s)} {counts[s]}
                </span>
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {/* ⚠ 둘 다 토스트만 띄우던 자리다 — 이제 **내려받아 엑셀에서 고쳐 다시 올리는**
                왕복이 화면에서 실제로 돈다(FR-115). 내려받는 열 이름은 올릴 때 읽는 열
                이름과 **같은 정본**(`TEMPLATE.fields`)이라 그대로 되돌아올 수 있다. */}
            <button
              type="button"
              onClick={() => downloadFields()}
              className="h-8 rounded-lg border border-hairline bg-chip px-3 text-xs font-medium text-ink-muted transition-colors hover:text-ink"
            >
              {t('specDetail.excelDownload', 'Excel 다운로드')}
            </button>
            <button
              type="button"
              onClick={() => setImporting(true)}
              disabled={locked}
              title={locked ? t('specDetail.lockedHint', '결재 중에는 고칠 수 없습니다') : undefined}
              className="h-8 rounded-lg border border-hairline bg-chip px-3 text-xs font-medium text-ink-muted transition-colors hover:text-ink disabled:opacity-40"
            >
              {t('specDetail.excelUpload', '엑셀 업로드')}
            </button>
            <button
              type="button"
              onClick={() => toast(t('specDetail.toast.addField', '필드 추가 — 본개발에서 연결됩니다'))}
              disabled={locked}
              title={locked ? t('specDetail.lockedHint', '결재 중에는 고칠 수 없습니다') : undefined}
              className="h-8 rounded-lg bg-gradient-to-r from-primary to-accent2 px-3 text-xs font-semibold text-white shadow-[0_2px_10px_var(--color-glow)] transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {t('specDetail.addField', '+ 필드 추가')}
            </button>
          </div>
        </div>

        {/* 카테고리 탭 = 엑셀 하단 시트 — 거를 것이 없으면 거르는 줄도 없다 */}
        <div className={`mt-4 flex flex-wrap items-center gap-2 ${fields.length === 0 ? 'hidden' : ''}`}>
          {['전체', ...FIELD_CATEGORIES].map((c) => {
            const n = c === '전체' ? fields.length : fields.filter((f) => f.category === c).length
            const on = cat === c
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCat(c)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                  on
                    ? 'border-primary/50 bg-primary/15 text-primary'
                    : 'border-hairline bg-surface text-ink-muted hover:border-primary/30 hover:text-ink'
                }`}
              >
                {c === '전체' ? t('common.all', '전체') : c}{' '}
                <span className={on ? 'text-primary/80' : 'text-ink-subtle'}>{n}</span>
              </button>
            )
          })}
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('specDetail.searchFields', '필드명·설명 검색...')}
            className="ml-auto h-9 w-full rounded-lg border border-hairline bg-canvas/60 px-3 text-[13px] outline-none placeholder:text-ink-subtle focus:border-primary/60 pc:w-56"
          />
        </div>

        {/* 시트성 표 — 카드로 펴면 열 비교가 죽는다. 자기 상자 스크롤 + 가장자리 그림자 */}
        <DataTable
          className="mt-4"
          rows={visible}
          rowKey={(f) => String(f.no)}
          // 결재 중에는 행을 눌러도 편집 서랍이 열리지 않는다 — 커서도 안 바뀐다
          onRowClick={locked ? undefined : setEditing}
          minWidth={880}
          empty={
            // 빈 자리에는 **이유**를 적는다(규약 §17): 아직 안 만든 것과 걸러진 것은 다른 말이다
            fields.length === 0
              ? {
                  title: t('specDetail.fieldsNone', '아직 필드가 없습니다.'),
                  hint: t('specDetail.fieldsNoneHint', '[+ 필드 추가]로 첫 필드를 정의하세요'),
                }
              : {
                  title: t('specDetail.fieldsEmpty', '조건에 맞는 필드가 없습니다.'),
                  hint: t('specDetail.fieldsEmptyHint', '카테고리 칩을 [전체]로 두거나 검색어를 지워 보세요'),
                }
          }
          columns={[
            { header: '#', cellClassName: 'font-mono text-xs text-ink-subtle', cell: (f) => f.no },
            {
              header: t('specDetail.th.category', '카테고리'),
              cell: (f) => (
                <span className="whitespace-nowrap text-xs text-ink-muted">
                  {f.category}
                  <span className="text-ink-subtle"> · {f.sub}</span>
                </span>
              ),
            },
            {
              header: t('specDetail.th.name', '필드명'),
              cellClassName: 'whitespace-nowrap font-medium text-ink',
              cell: (f) => f.name,
            },
            {
              header: t('specDetail.th.type', '타입'),
              cell: (f) => (
                <span className="rounded-md bg-chip px-1.5 py-0.5 font-mono text-xs text-ink-muted">{f.type}</span>
              ),
            },
            {
              header: t('specDetail.th.required', '필수'),
              cellClassName: 'text-xs',
              cell: (f) => (f.required ? <b className="text-primary">Y</b> : <span className="text-ink-subtle">N</span>),
            },
            {
              header: t('specDetail.th.maxLen', '최대길이'),
              numeric: true,
              cellClassName: 'font-mono text-xs text-ink-muted',
              /* 빈 값은 `—` (규약 §9) */
              cell: (f) => f.maxLen ?? '—',
            },
            {
              header: t('specDetail.th.desc', '설명'),
              cellClassName: 'max-w-[260px] truncate text-ink-muted',
              cell: (f) => f.desc,
            },
            {
              header: t('specDetail.th.rule', '유효성'),
              cellClassName: 'max-w-[150px] truncate font-mono text-xs text-primary/80',
              cell: (f) => f.rule ?? '—',
            },
            {
              header: t('specDetail.th.owner', '담당자'),
              cellClassName: 'whitespace-nowrap text-xs text-ink-muted',
              cell: (f) => f.owner,
            },
            {
              header: t('specDetail.th.status', '상태'),
              cell: (f) => (
                <span
                  className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${FIELD_STATUS_CLS[f.status]}`}
                >
                  {t(`fieldStatus.${f.status}`, f.status)}
                </span>
              ),
            },
          ]}
        />
        <ListFoot total={fields.length} shown={visible.length} unit="개" />
      </section>

      {/* 행 편집 — 목록을 훑다가 한 필드에 집중한다 (규약 §1 목록→상세 짝) */}
      {editing && (
        <Drawer
          title={tf('specDetail.editFieldTitle', { name: editing.name }, '필드 편집 — {name}')}
          onClose={() => setEditing(null)}
        >
          {(close) => (
            <FieldEditor
              field={editing}
              onCancel={close}
              onSave={(next) => {
                saveField(next)
                close()
              }}
            />
          )}
        </Drawer>
      )}

      {/* 버전 이력 — 타임라인 */}
      {/* 이 사양서의 **필드 시트만** 받는다 — 사양서명 열이 없어도 여기서 올린 것은 이 사양서다 */}
      {importing && (
        <SpecImportModal
          knownSpecNames={specList.map((sp) => sp.name)}
          knownMemberNames={[]}
          lockToSpec={spec.name}
          lockedSpecNames={locked ? [spec.name] : []}
          onApply={(_kind, rows) => {
            const done = mergeSpecFields(
              spec.id,
              rows.map((r) => rowToFieldDef(r, '김현대')),
            )
            recordAudit({
              action: '업로드',
              target: `${spec.name} 필드 정의 (${done}건 반영)`,
              reason: '사양서 엑셀 이관',
            })
            return done
          }}
          /* 원본 길(시트=사양서)은 여기서 안 쓴다 — 이 화면은 사양서가 이미 정해져 있다 */
          onApplyPlans={() => 0}
          onClose={() => setImporting(false)}
        />
      )}

      {history && (
        <Modal
          title={tf('specDetail.historyTitle', { name: spec.name }, '버전 이력 — {name}')}
          onClose={() => setHistory(false)}
        >
          <ol className="space-y-2.5">
            {spec.history.map((v, i) => (
              <li
                key={v.version}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-hairline bg-canvas/50 px-4 py-3"
              >
                <span className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-ink">{v.version}</span>
                  <StatusBadge status={v.status} />
                  {i === 0 && (
                    <span className="rounded-full bg-primary/12 px-2 py-0.5 text-xs font-semibold text-primary">
                      {t('specDetail.currentBadge', '현재')}
                    </span>
                  )}
                  <span className="w-full text-xs text-ink-muted">{v.summary}</span>
                  <span className="w-full text-xs text-ink-subtle">
                    {tf('specDetail.authoredBy', { author: v.author, date: v.date }, '작성 {author} · {date}')}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setHistory(false)
                    if (i > 0) setCompare(true)
                  }}
                  className="h-8 rounded-lg border border-hairline bg-chip px-3 text-xs font-medium text-ink-muted transition-colors hover:text-ink"
                >
                  {i === 0 ? t('specDetail.viewing', '보는 중') : t('specDetail.compare', '비교')}
                </button>
              </li>
            ))}
          </ol>

          {/* 결재 이력 — FR-114 ④ "승인 이력이 사후 조회된다".
              ⚠ 4판에서 단계별 처리 자국(trail)을 쌓아 두고 **보여 줄 자리가 없었다**:
              누가 언제 무슨 의견으로 승인/반려했는지 화면 어디에서도 못 봤다.
              버전 이력 옆이 제자리다 — 사람은 "이 버전이 왜 이렇게 됐나"를 함께 묻는다. */}
          <h3 className="mt-6 text-sm font-semibold text-ink">
            {t('specDetail.approvalHistoryTitle', '결재 이력')}
          </h3>
          {approvalHistory.length === 0 ? (
            <p className="mt-2 rounded-xl border border-hairline bg-canvas/50 px-4 py-3 text-xs text-ink-subtle">
              {t('specDetail.approvalHistoryEmpty', '아직 결재에 올라간 적이 없습니다.')}
            </p>
          ) : (
            <ol className="mt-2 space-y-2.5">
              {approvalHistory.map((r) => (
                <li key={r.id} className="rounded-xl border border-hairline bg-canvas/50 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-ink-subtle">{r.id}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        r.state === '승인 완료'
                          ? 'bg-deployed-bg text-deployed-ink'
                          : r.state === '반려'
                            ? 'bg-danger-bg text-danger-ink'
                            : r.state === '회수'
                              ? 'bg-chip text-ink-subtle'
                              : 'bg-review-bg text-review-ink'
                      }`}
                    >
                      {r.state}
                    </span>
                    <span className="text-xs text-ink-subtle">
                      {tf(
                        'specDetail.requestedOn',
                        { by: r.requester, at: r.requestedAt },
                        '{by} 상신 · {at}',
                      )}
                    </span>
                  </div>
                  {/* 단계별 자국 — 아무도 판단하기 전이면 "아직 아무도 처리하지 않았다"고 적는다 */}
                  {r.trail.length === 0 ? (
                    <p className="mt-1.5 text-xs text-ink-subtle">
                      {t('specDetail.trailEmpty', '아직 처리된 단계가 없습니다.')}
                    </p>
                  ) : (
                    <ol className="mt-2 space-y-1.5">
                      {r.trail.map((e, i) => (
                        <li key={`${r.id}.${i}`} className="flex flex-wrap items-baseline gap-x-2 text-xs">
                          <span className="text-ink-subtle">
                            {tf('specDetail.trailStep', { n: e.seq }, '{n}차')}
                          </span>
                          <span className="font-medium text-ink">{e.approver}</span>
                          {/* ⚠ 값은 정본(한국어), 표시만 사전이 옮긴다 — 승인·반려·취소 세 갈래 */}
                          <span
                            className={e.action === '승인' ? 'text-deployed-ink' : 'text-danger-ink'}
                          >
                            {t(`trailAction.${e.action}`, e.action)}
                          </span>
                          <span className="tabular-nums text-ink-subtle">{e.at}</span>
                          {e.opinion && <span className="w-full text-ink-muted">— {e.opinion}</span>}
                        </li>
                      ))}
                    </ol>
                  )}
                </li>
              ))}
            </ol>
          )}
        </Modal>
      )}

      {compare && (
        <VersionCompareModal
          spec={spec}
          base={spec.history.find((v, i) => i > 0 && v.status === '배포 완료') ?? spec.history[1]}
          onClose={() => setCompare(false)}
        />
      )}

      {/* 승인 요청 상신 — 무엇이 올라가는지 확인시키고 상신한다 (사양서 → 승인 관리 연결) */}
      {requesting && (
        <Modal
          title={t('specDetail.approvalModalTitle', '승인 요청 상신')}
          onClose={() => setRequesting(false)}
          footer={
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRequesting(false)}
                className="h-9 rounded-lg border border-hairline bg-chip px-4 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
              >
                {t('common.cancel', '취소')}
              </button>
              {/* 누른 그 버튼이 변한다 + 두 번 안 눌린다 (규약 §3 — 상신은 되돌리기 어렵다) */}
              <CtaButton
                busyLabel={t('specDetail.submitting', '상신 중…')}
                onAction={async () => {
                  await simulate()
                  setRequesting(false)
                  // 사양서 상태와 **결재함**이 함께 움직인다 (workflow.ts) — 예전엔 상태만
                  // 바뀌고 결재함엔 안 생겨서, 승인 관리에 가면 그 건이 없었다
                  const overlapped = overlapping.length
                  /* ⚠ 겹친 요청은 **다른 사람이 올린 것**이라야 뜻이 선다 — 요청자를 문서
                     담당자(`cur.author`)로 적으면 "김민준이 자기 문서에 두 번 올렸다"가 되어
                     겹침 화면이 거짓말을 한다. 겹칠 때는 **지금 로그인한 사람**이 요청자다.
                     (본개발에서는 둘 다 `GET /api/me` 가 준다 — 규약 §4-2) */
                  submitSpec(spec, overlapped > 0 ? ME : cur.author)
                  toast(
                    overlapped > 0
                      ? tf(
                          'specDetail.toast.submittedOverlap',
                          { n: overlapped + 1 },
                          '변경 요청을 올렸습니다 — 이 사양서의 요청이 {n}건이 되었습니다. 승인 관리에서 하나를 고릅니다',
                        )
                      : t(
                          'specDetail.toast.submitted',
                          '승인 요청을 상신했습니다 — 승인 관리 [내 요청]에서 진행을 확인하세요',
                        ),
                  )
                }}
              >
                {t('specDetail.submit', '상신')}
              </CtaButton>
            </div>
          }
        >
          <div className="rounded-xl border border-hairline bg-canvas/50 px-4 py-3.5 text-[13px]">
            <b className="text-ink">
              {spec.name} {cur.version}
            </b>
            <span className="ml-2 text-ink-subtle">
              {tf(
                'specDetail.approvalSummary',
                { n: fields.length, m: dirty },
                '필드 {n}개 · 수정 {m}건 포함',
              )}
            </span>
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-ink-muted">
            {t(
              'specDetail.approvalDesc',
              '상신하면 결재선(검토 → 최종 승인)을 따라 승인 관리에 등록되고, 승인 완료 전까지 배포에 포함할 수 없습니다.',
            )}
          </p>
          {/* 겹칠 것을 **누르기 전에** 말한다 — 올리고 나서 알면 늦다 (규약 §0 예측 가능성).
              막지는 않는다: 막는 자리는 반영 하나뿐이다 */}
          {overlapping.length > 0 && (
            <p className="mt-2 rounded-xl border border-danger-ink/30 bg-danger-bg px-4 py-3 text-[13px] leading-relaxed text-danger-ink">
              {tf(
                'specDetail.approvalOverlapWarn',
                { n: overlapping.length },
                '이미 심사 중인 변경 요청이 {n}건 있습니다. 올릴 수는 있지만, 겹친 채로는 배포하지 못합니다 — 승인 관리에서 하나를 고르고 나머지는 사유를 내고 취소해야 합니다.',
              )}
            </p>
          )}
          <div className="mt-3 rounded-xl border border-hairline px-4 py-3 text-[13px]">
            <div className="text-xs text-ink-subtle">{t('specDetail.approverLabel', '승인자')}</div>
            {/* ⚠ 이름이 글자로 박혀 있었다 — 상신 모달과 상세의 결재선이 갈라질 수 있었다.
                둘 다 결재함 정본(approvalStore)의 결재선을 읽는다 (규약 §10) */}
            <div className="mt-1.5">
              <ApprovalLine line={line} step={1} roleLabel={roleLabel} stepLabel={stepLabel} />
            </div>
          </div>
        </Modal>
      )}

      {/* 회수 확인 — 되돌릴 수 있는 일이지만 **결재자가 이미 본 것을 치우는** 일이라 묻는다 */}
      {withdrawing && (
        <Modal
          title={t('specDetail.withdrawTitle', '요청 회수')}
          onClose={() => setWithdrawing(false)}
          footer={
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setWithdrawing(false)}
                className="h-9 rounded-lg border border-hairline bg-chip px-4 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
              >
                {t('common.cancel', '취소')}
              </button>
              <CtaButton
                busyLabel={t('specDetail.withdrawing', '회수 중…')}
                onAction={async () => {
                  await simulate()
                  setWithdrawing(false)
                  const ok = withdrawSpecRequest(spec.id, cur.author)
                  toast(
                    ok
                      ? t('specDetail.toast.withdrawn', '요청을 회수했습니다 — 초안으로 돌아왔습니다')
                      : t('specDetail.toast.withdrawFailed', '이미 결재가 진행되어 회수할 수 없습니다'),
                  )
                }}
              >
                {t('specDetail.withdrawSubmit', '회수')}
              </CtaButton>
            </div>
          }
        >
          <p className="text-[13px] leading-relaxed text-ink-muted">
            {t(
              'specDetail.withdrawDesc',
              '결재함에서 이 요청을 내리고 사양서를 초안으로 되돌립니다. 고친 뒤 다시 상신할 수 있습니다.',
            )}
          </p>
        </Modal>
      )}
    </AppShell>
  )
}

/* 필드 편집 폼 — 저장을 눌러야 반영된다. 취소·Esc 는 버린다 */
function FieldEditor({
  field,
  onSave,
  onCancel,
}: {
  field: FieldDef
  onSave: (next: FieldDef) => void
  onCancel: () => void
}) {
  const { t } = useI18n()
  const [draft, setDraft] = useState<FieldDef>(field)
  const set = <TKey extends keyof FieldDef>(k: TKey, v: FieldDef[TKey]) =>
    setDraft((d) => ({ ...d, [k]: v }))

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4">
        <div className="flex items-center gap-2 text-xs text-ink-subtle">
          <span className="font-mono">#{field.no}</span>
          <span>
            {field.category} · {field.sub}
          </span>
        </div>
        <div>
          <span className="text-xs font-medium text-ink-subtle">{t('specDetail.label.type', '타입')}</span>
          <div className="mt-1.5">
            <ChipSelect options={TYPE_OPTIONS} value={draft.type} onChange={(v) => set('type', v)} mono />
          </div>
        </div>
        <div>
          <span className="text-xs font-medium text-ink-subtle">{t('specDetail.label.status', '상태')}</span>
          <div className="mt-1.5">
            <ChipSelect options={STATUS_OPTIONS} value={draft.status} onChange={(v) => set('status', v)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-medium text-ink-subtle">{t('specDetail.label.maxLen', '최대길이')}</span>
            <input
              type="number"
              value={draft.maxLen ?? ''}
              onChange={(e) => set('maxLen', e.target.value === '' ? null : Number(e.target.value))}
              placeholder="—"
              className="mt-1 h-10 w-full rounded-lg border border-hairline bg-canvas/60 px-3 text-[13px] tabular-nums outline-none focus:border-primary/60"
            />
          </label>
          <div className="mt-6 flex items-center justify-between gap-2.5 rounded-xl bg-chip px-3.5 py-2.5">
            <span className="text-[13px] text-ink">{t('specDetail.label.requiredInput', '필수 입력')}</span>
            <Switch
              checked={draft.required}
              onChange={(v) => set('required', v)}
              label={t('specDetail.label.requiredInput', '필수 입력')}
            />
          </div>
        </div>
        <label className="block">
          <span className="text-xs font-medium text-ink-subtle">{t('specDetail.label.desc', '설명')}</span>
          <textarea
            value={draft.desc}
            onChange={(e) => set('desc', e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-hairline bg-canvas/60 px-3 py-2.5 text-[13px] outline-none focus:border-primary/60"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-ink-subtle">
            {t('specDetail.label.rule', '유효성 규칙 (정규식)')}
          </span>
          <input
            value={draft.rule ?? ''}
            onChange={(e) => set('rule', e.target.value === '' ? null : e.target.value)}
            placeholder={t('specDetail.rulePlaceholder', '예: ^[A-Z]{2}\\d{4}$')}
            className="mt-1 h-10 w-full rounded-lg border border-hairline bg-canvas/60 px-3 font-mono text-xs outline-none placeholder:font-sans focus:border-primary/60"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-ink-subtle">{t('specDetail.label.owner', '담당자')}</span>
          <input
            value={draft.owner}
            onChange={(e) => set('owner', e.target.value)}
            className="mt-1 h-10 w-full rounded-lg border border-hairline bg-canvas/60 px-3 text-[13px] outline-none focus:border-primary/60"
          />
        </label>
      </div>
      {/* 발 — 주 동작은 오른쪽 끝 (규약 §7).
          ⚠ **붙박이로 붙든다.** 필드 편집기는 입력이 여덟 칸이라 몸이 늘 넘치는데, 예전에는
          그냥 마지막 요소라 [저장]이 스크롤 아래로 사라졌다. 서랍의 `footer` 슬롯 대신
          여기서 sticky 로 붙드는 이유는 초안(draft) 상태가 이 컴포넌트 안에 있어서다 —
          밖으로 빼면 상태를 위로 올려야 한다(AskPanel 과 같은 판단).
          ⚠ 음수 여백은 서랍 몸의 좌우 여백(px-6)과 같은 값이어야 한다 */}
      <div className="sticky bottom-0 -mx-6 -mb-5 mt-5 flex justify-end gap-2 border-t border-hairline bg-cover-glass px-6 py-4 backdrop-blur-xl">
        <button
          type="button"
          onClick={onCancel}
          className="h-9 rounded-lg border border-hairline bg-chip px-4 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
        >
          {t('common.cancel', '취소')}
        </button>
        <button
          type="button"
          onClick={() => onSave(draft)}
          className="h-9 rounded-lg bg-gradient-to-r from-primary to-accent2 px-4 text-[13px] font-semibold text-white shadow-[0_2px_10px_var(--color-glow)] transition-opacity hover:opacity-90"
        >
          {t('common.save', '저장')}
        </button>
      </div>
    </div>
  )
}
