import { useEffect, useMemo, useState } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'

import { AppShell } from '#/components/portal/AppShell'
import { ChipSelect, Switch } from '#/components/portal/Chips'
import { CtaButton, simulate } from '#/components/portal/Skeleton'
import { Drawer } from '#/components/portal/Drawer'
import { Modal } from '#/components/portal/Modal'
import { StatusBadge } from '#/components/portal/StatusBadge'
import { VersionCompareModal } from '#/components/portal/VersionCompareModal'
import { useToast } from '#/components/portal/toast'
import { useI18n } from '#/lib/i18n'
import { currentVersion, specs } from '#/data/specs'
import {
  FIELD_CATEGORIES,
  FIELD_STATUS_CLS,
  WORKFLOW_STEPS,
  specFieldDefs,
  workflowIndex,
} from '#/data/specFields'
import type { FieldDef, FieldStatus, FieldType } from '#/data/specFields'

export const Route = createFileRoute('/specs_/$specId')({ component: SpecDetailPage })

/* 배포 워크플로우 스테퍼 — 지금 어디까지 왔는지가 헤더에서 한눈에 보인다 */
function WorkflowStepper({ current }: { current: number }) {
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
              {s}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}

const TYPE_OPTIONS: Array<FieldType> = ['string', 'number', 'select', 'text', 'boolean', 'date']
const STATUS_OPTIONS: Array<FieldStatus> = ['완료', '진행중', '검토중', '미완료']

function SpecDetailPage() {
  const { t, tf } = useI18n()
  const { specId } = Route.useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const spec = specs.find((s) => s.id === specId)

  // 필드 정의 편집 상태 — 프로토타입: 화면 상태 + 임시저장(localStorage)
  const draftKey = `spec-fields-draft.${specId}`
  const [fields, setFields] = useState<Array<FieldDef>>(specFieldDefs)
  const [dirty, setDirty] = useState(0)
  const [draftInfo, setDraftInfo] = useState<string | null>(null) // 임시저장본 안내 배너
  const [cat, setCat] = useState<string>('전체')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<FieldDef | null>(null)
  const [history, setHistory] = useState(false)
  const [compare, setCompare] = useState(false)
  // 승인 요청 흐름 — 상신하면 워크플로우가 승인요청 단계로 이동한다 (화면 상태)
  const [requesting, setRequesting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

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
          {cur.status === '승인 대기' || submitted ? (
            <button
              type="button"
              onClick={() => navigate({ to: '/approvals' })}
              className="h-9 rounded-lg border border-pending-ink/40 bg-pending-bg px-3.5 text-[13px] font-semibold text-pending-ink transition-opacity hover:opacity-85"
            >
              {t('specDetail.viewApproval', '결재 진행 보기 →')}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setRequesting(true)}
              className="h-9 rounded-lg border border-hairline bg-surface px-3.5 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
            >
              {t('specDetail.requestApproval', '승인 요청')}
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
            disabled={dirty === 0}
            className="h-9 rounded-lg border border-hairline bg-surface px-3.5 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink disabled:opacity-40"
          >
            {t('specDetail.saveDraft', '임시저장')}
            {dirty > 0 && <span className="ml-1 tabular-nums text-primary">{dirty}</span>}
          </button>
          <button
            type="button"
            onClick={() => {
              setDirty(0)
              localStorage.removeItem(draftKey)
              toast(
                t(
                  'specDetail.toast.savedAll',
                  '사양서에 반영했습니다 — 승인 요청은 워크플로우에서 진행합니다',
                ),
              )
            }}
            disabled={dirty === 0}
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
          <WorkflowStepper current={submitted ? 4 : workflowIndex(cur.status)} />
        </div>
      </div>

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
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {STATUS_OPTIONS.map((s) => (
              <span key={s} className={`rounded-full px-2 py-0.5 font-semibold tabular-nums ${FIELD_STATUS_CLS[s]}`}>
                {s} {counts[s]}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                toast(t('specDetail.toast.excelDownload', 'Excel 다운로드 — 본개발에서 연결됩니다'))
              }
              className="h-8 rounded-lg border border-hairline bg-chip px-3 text-xs font-medium text-ink-muted transition-colors hover:text-ink"
            >
              {t('specDetail.excelDownload', 'Excel 다운로드')}
            </button>
            <button
              type="button"
              onClick={() =>
                toast(t('specDetail.toast.excelUpload', '엑셀 업로드(일괄 반영) — 본개발에서 연결됩니다'))
              }
              className="h-8 rounded-lg border border-hairline bg-chip px-3 text-xs font-medium text-ink-muted transition-colors hover:text-ink"
            >
              {t('specDetail.excelUpload', '엑셀 업로드')}
            </button>
            <button
              type="button"
              onClick={() => toast(t('specDetail.toast.addField', '필드 추가 — 본개발에서 연결됩니다'))}
              className="h-8 rounded-lg bg-gradient-to-r from-primary to-accent2 px-3 text-xs font-semibold text-white shadow-[0_2px_10px_var(--color-glow)] transition-opacity hover:opacity-90"
            >
              {t('specDetail.addField', '+ 필드 추가')}
            </button>
          </div>
        </div>

        {/* 카테고리 탭 = 엑셀 하단 시트 */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
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
        <div className="table-scroll mt-4 rounded-xl border border-hairline">
          <table className="w-full min-w-[880px] border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-hairline bg-canvas/60 text-left text-xs text-ink-subtle">
                <th className="px-3 py-2.5 font-medium">#</th>
                <th className="px-3 py-2.5 font-medium">{t('specDetail.th.category', '카테고리')}</th>
                <th className="px-3 py-2.5 font-medium">{t('specDetail.th.name', '필드명')}</th>
                <th className="px-3 py-2.5 font-medium">{t('specDetail.th.type', '타입')}</th>
                <th className="px-3 py-2.5 font-medium">{t('specDetail.th.required', '필수')}</th>
                <th className="px-3 py-2.5 text-right font-medium">{t('specDetail.th.maxLen', '최대길이')}</th>
                <th className="px-3 py-2.5 font-medium">{t('specDetail.th.desc', '설명')}</th>
                <th className="px-3 py-2.5 font-medium">{t('specDetail.th.rule', '유효성')}</th>
                <th className="px-3 py-2.5 font-medium">{t('specDetail.th.owner', '담당자')}</th>
                <th className="px-3 py-2.5 font-medium">{t('specDetail.th.status', '상태')}</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((f) => (
                <tr
                  key={f.no}
                  onClick={() => setEditing(f)}
                  className="cursor-pointer border-b border-hairline/60 transition-colors last:border-0 hover:bg-chip"
                >
                  <td className="px-3 py-2.5 font-mono text-xs text-ink-subtle">{f.no}</td>
                  <td className="px-3 py-2.5">
                    <span className="whitespace-nowrap text-xs text-ink-muted">
                      {f.category}
                      <span className="text-ink-subtle"> · {f.sub}</span>
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 font-medium text-ink">{f.name}</td>
                  <td className="px-3 py-2.5">
                    <span className="rounded-md bg-chip px-1.5 py-0.5 font-mono text-xs text-ink-muted">
                      {f.type}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    {f.required ? <b className="text-primary">Y</b> : <span className="text-ink-subtle">N</span>}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums text-ink-muted">
                    {f.maxLen ?? '—'}
                  </td>
                  <td className="max-w-[260px] truncate px-3 py-2.5 text-ink-muted">{f.desc}</td>
                  <td className="max-w-[150px] truncate px-3 py-2.5 font-mono text-xs text-primary/80">
                    {f.rule ?? '—'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs text-ink-muted">{f.owner}</td>
                  <td className="px-3 py-2.5">
                    <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${FIELD_STATUS_CLS[f.status]}`}>
                      {f.status}
                    </span>
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-3 py-8 text-center text-sm text-ink-subtle">
                    {t('specDetail.fieldsEmpty', '조건에 맞는 필드가 없습니다.')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
          <div className="mt-3 rounded-xl border border-hairline px-4 py-3 text-[13px]">
            <div className="text-xs text-ink-subtle">{t('specDetail.approverLabel', '승인자')}</div>
            <div className="mt-1 font-medium text-ink">
              {tf(
                'specDetail.approverChain',
                { primary: '한동현', final: '김현대' },
                '{primary} (1차) → {final} (최종)',
              )}
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
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
                setSubmitted(true)
                toast(
                  t(
                    'specDetail.toast.submitted',
                    '승인 요청을 상신했습니다 — 승인 관리 [내 요청]에서 진행을 확인하세요',
                  ),
                )
              }}
            >
              {t('specDetail.submit', '상신')}
            </CtaButton>
          </div>
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
