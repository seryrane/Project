import { useMemo, useState } from 'react'

import { Modal } from './Modal'
import { ChipSelect } from './Chips'
import { DataTable } from './DataTable'
import { Icon } from './Icon'
import { Select } from './Select'
import { useI18n } from '#/lib/i18n'
import { SPEC_CATEGORIES } from '#/data/specs'
import {
  FIELD_TYPES,
  TEMPLATE,
  issuesToCsv,
  parseCsv,
  parseGrid,
  planIssuesToCsv,
  planSheet,
  planWorkbook,
  plansToSpecs,
  rejectFile,
  templateWorkbook,
  validatePlans,
} from '#/lib/specImport'
import type {
  FieldType,
  ImportKind,
  ImportReport,
  PlannedSpec,
  RejectReason,
  RowIssue,
  SheetPlan,
} from '#/lib/specImport'
import { XlsxError, readWorkbook } from '#/lib/xlsx'
import { buildXlsx } from '#/lib/xlsxWrite'
import type { SheetGrid } from '#/lib/xlsx'

/**
 * 엑셀 사양서 이관 — **네 걸음** (FR-115 · `docs/엑셀_마이그레이션_설계.md` §6).
 *
 *   ① 고르기 → ② 매핑/확인 → ③ 검증 → ④ 반영
 *
 * ⚠ **두 갈래를 연다**(2026-08-19 사용자). 실물 사양서 엑셀은 우리 템플릿이 아니라
 * **시트 하나가 사양서 하나**이고 첫 행이 컬럼명이다 — 템플릿을 강요하면 사람이 시트마다
 * 손으로 옮겨 적어야 한다. 그래서 파일을 그대로 받고 **화면에서 매핑**한다(설계 §1-1).
 *   · 원본 엑셀 — 시트 고르기 · 머리 행 지정 · 열 → 필드(이름·타입·제외)
 *   · 템플릿    — 우리 열 이름을 그대로 쓴 파일(CSV / xlsx 첫 시트)
 *
 * ⚠ 되돌릴 수 없는 걸음은 **④ 하나뿐**이고, 그 앞에서 무엇이 들어갈지 숫자로 보여 준다
 * (규약 §2). 걸음마다 뒤로 갈 수 있다 — 파일을 다시 고르는 것이 가장 흔한 일이다.
 * ⚠ 판단(파싱·검증·추론)은 전부 `lib/specImport.ts` 가 한다. 이 파일은 **걸음만 그린다** —
 * 규칙이 화면에 흩어지면 "왜 이것이 오류인지"가 화면마다 달라진다.
 */
type Mode = 'raw' | 'template'

/** 한 번에 그리는 열 수 — 열이 수백 개인 시트가 온다(2026-08-19 사용자). 나머지는 찾기로 만난다 */
const COLS_SHOWN = 60

export interface ImportOutcome {
  applied: number
  skipped: number
  failed: number
}

export function SpecImportModal({
  knownSpecNames,
  knownMemberNames,
  lockedSpecNames,
  lockToSpec,
  onApply,
  onApplyPlans,
  onClose,
  onSeeResult,
}: {
  knownSpecNames: Array<string>
  knownMemberNames: Array<string>
  /** 결재 중이라 필드를 못 고치는 사양서 — 검증이 막는다(API 설계 §1) */
  lockedSpecNames?: Array<string>
  /** 사양서 상세에서 열었을 때 — 그 사양서의 **필드만** 받는다(사양서명 열이 없어도 된다) */
  lockToSpec?: string
  /** 템플릿 길 — 정상 행만 넘긴다. 반영 자체는 부르는 쪽(스토어)이 한다 */
  onApply: (kind: ImportKind, rows: Array<Record<string, string>>) => number
  /** 원본 길 — 시트에서 굳힌 사양서(필드까지)를 넘긴다 */
  onApplyPlans: (specs: Array<PlannedSpec>) => number
  onClose: () => void
  /** 반영 뒤의 **다음 행동** — 들어간 것을 보러 간다(규약 §10) */
  onSeeResult?: () => void
}) {
  const { t, tf } = useI18n()
  const known = { specNames: knownSpecNames, memberNames: knownMemberNames, lockedSpecNames, lockToSpec }
  const [step, setStep] = useState(0)
  // 상세에서 열면 길이 정해져 있다 — 그 사양서의 **필드 시트**를 받는 화면이다
  const [mode, setMode] = useState<Mode>(lockToSpec == null ? 'raw' : 'template')
  const [kind, setKind] = useState<ImportKind>(lockToSpec == null ? 'catalog' : 'fields')
  const [fileName, setFileName] = useState('')
  const [note, setNote] = useState('')
  const [reject, setReject] = useState<RejectReason | null>(null)
  const [report, setReport] = useState<ImportReport | null>(null)
  const [sheets, setSheets] = useState<Array<SheetGrid>>([])
  const [plans, setPlans] = useState<Array<SheetPlan>>([])
  const [outcome, setOutcome] = useState<ImportOutcome | null>(null)
  /* ⚠ 큰 파일은 읽는 데 몇 초가 걸린다 — 아무 말 없이 멈춰 있으면 사람이 다시 누른다 */
  const [reading, setReading] = useState(false)
  /* ⚠ 열이 수백 개·시트가 여러 개면 한 화면에 다 그릴 수 없다 — 한 시트씩 펼친다 */
  const [openSheet, setOpenSheet] = useState('')
  const [colQuery, setColQuery] = useState<Record<string, string>>({})

  const steps =
    mode === 'raw' ? (['고르기', '매핑', '검증', '반영'] as const) : (['고르기', '확인', '검증', '반영'] as const)

  /* ── 템플릿 길의 셈 ─────────────────────────────────────────── */
  const issues: Array<RowIssue> = useMemo(() => (report ? report.rows.flatMap((r) => r.issues) : []), [report])
  const errorRows = report ? report.rows.filter((r) => r.issues.some((i) => i.level === '오류')) : []
  const warnOnlyRows = report
    ? report.rows.filter((r) => !r.issues.some((i) => i.level === '오류') && r.issues.some((i) => i.level === '경고'))
    : []

  /* ── 원본 길의 셈 — 화면이 세는 숫자와 실제로 들어가는 것이 **같은 함수**에서 나온다 ── */
  const planIssues = useMemo(
    () => (plans.length > 0 ? validatePlans(plans, known) : []),
    // ⚠ `known` 자체는 매 렌더 새 객체라 의존성으로 못 쓴다 — **안의 값들**이 축이다
    [plans, knownSpecNames, knownMemberNames, lockedSpecNames, lockToSpec],
  )
  const planned = useMemo(
    () => (plans.length > 0 ? plansToSpecs(plans, sheets, planIssues) : []),
    [plans, sheets, planIssues],
  )
  const badSheets = new Set(planIssues.filter((i) => i.level === '오류').map((i) => i.sheet)).size
  const warnSheets = new Set(planIssues.filter((i) => i.level === '경고').map((i) => i.sheet)).size

  /** 우리 **표준 양식(초안)** — 대장·필드·읽어보기 세 시트를 한 통합문서로 준다 */
  const downloadTemplate = () => {
    const url = URL.createObjectURL(buildXlsx(templateWorkbook()))
    const a = document.createElement('a')
    a.href = url
    a.download = 'HMG_사양서_이관_표준양식_초안.xlsx'
    a.click()
    URL.revokeObjectURL(url)
  }

  const download = (name: string, text: string) => {
    /* ⚠ 브라우저가 파일을 만들어 준다 — 서버 왕복이 없다. 본개발에서 서버 리포트로 옮기면
       이 함수만 바뀐다(화면은 "리포트를 받는다"만 안다). */
    // ⚠ 맨 앞의 BOM(U+FEFF)이 없으면 **엑셀이 한글을 깨서 연다** — 리포트를 엑셀로 고칠 사람에게 필요하다
    const url = URL.createObjectURL(new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    URL.revokeObjectURL(url)
  }

  const clear = () => {
    setReport(null)
    setPlans([])
    setSheets([])
  }

  const useTemplateText = (text: string) => {
    const res = parseCsv(kind, text, known)
    setReject(res.reject ?? null)
    setReport(res.report ?? null)
    if (res.report) setStep(1)
  }

  const pickFile = async (file: File) => {
    setFileName(file.name)
    setNote('')
    clear()
    const bad = rejectFile(file)
    if (bad) {
      // 형식 위반은 **사전 차단** — 한 행도 읽지 않는다 (AC ①)
      setReject(bad)
      return
    }
    setReject(null)

    if (/\.csv$/i.test(file.name)) {
      // ⚠ CSV 에는 시트가 없다 — "시트 = 사양서"를 표현할 방법이 아예 없으므로 템플릿 길로 간다
      if (mode === 'raw') {
        setMode('template')
        setNote(
          t('import.csvNoSheets', 'CSV 에는 시트가 없어 템플릿 길로 읽었습니다 (시트 = 사양서는 xlsx 에서만 됩니다)'),
        )
      }
      useTemplateText(await file.text())
      return
    }

    let read: Array<SheetGrid>
    setReading(true)
    try {
      read = await readWorkbook(file)
    } catch (e) {
      setReject({ code: 'ext', message: e instanceof XlsxError ? e.message : '엑셀을 읽지 못했습니다' })
      return
    } finally {
      setReading(false)
    }
    if (mode === 'template') {
      // 템플릿을 xlsx 로 준 경우 — 첫 시트를 쓴다. **어느 시트를 썼는지 말한다**
      setNote(tf('import.usedFirstSheet', { sheet: read[0].name }, "첫 시트 '{sheet}' 를 읽었습니다"))
      const res = parseGrid(kind, read[0].rows, known)
      setReject(res.reject ?? null)
      setReport(res.report ?? null)
      if (res.report) setStep(1)
      return
    }
    setSheets(read)
    const next = planWorkbook(read)
    setPlans(next)
    setColQuery({})
    // 첫 번째로 가져올 시트만 펼친다 — 나머지는 접어 둔다(열 수백 개 × 시트 여러 개)
    setOpenSheet(next.find((x) => x.include)?.sheet ?? '')
    setStep(1)
  }

  const patch = (sheet: string, next: Partial<SheetPlan>) =>
    setPlans((ps) => ps.map((p) => (p.sheet === sheet ? { ...p, ...next } : p)))

  const patchColumn = (sheet: string, index: number, next: Partial<SheetPlan['columns'][number]>) =>
    setPlans((ps) =>
      ps.map((p) =>
        p.sheet === sheet ? { ...p, columns: p.columns.map((c) => (c.index === index ? { ...c, ...next } : c)) } : p,
      ),
    )

  /** 지금 보이는 열들만 한꺼번에 켜고 끈다(찾기로 좁힌 뒤 쓰면 "이 묶음만"이 된다) */
  const setAllColumns = (sheet: string, targets: Array<{ index: number }>, include: boolean) => {
    const ids = new Set(targets.map((c) => c.index))
    setPlans((ps) =>
      ps.map((p) =>
        p.sheet === sheet ? { ...p, columns: p.columns.map((c) => (ids.has(c.index) ? { ...c, include } : c)) } : p,
      ),
    )
  }

  const canGoNext = mode === 'raw' ? plans.some((p) => p.include) : report != null
  const applyCount = mode === 'raw' ? planned.length : (report?.ok ?? 0)

  return (
    <Modal
      title={t('import.title', '엑셀 사양서 올리기')}
      onClose={onClose}
      wide
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="mr-auto text-xs text-ink-subtle">
            {tf('import.stepOf', { n: step + 1, total: steps.length, name: steps[step] }, '{n}/{total} · {name}')}
          </span>
          {step > 0 && step < 3 && (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="h-9 rounded-lg border border-hairline bg-chip px-4 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
            >
              {t('import.back', '뒤로')}
            </button>
          )}
          {step === 1 && (
            <button
              type="button"
              disabled={!canGoNext}
              onClick={() => setStep(2)}
              className="h-9 rounded-lg bg-gradient-to-r from-primary to-accent2 px-4 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {t('import.toValidate', '검증 결과 보기')}
            </button>
          )}
          {step === 2 && (
            <button
              type="button"
              disabled={applyCount === 0}
              onClick={() => {
                if (mode === 'raw') {
                  const applied = onApplyPlans(planned)
                  setOutcome({ applied, skipped: planned.length - applied, failed: badSheets })
                } else if (report) {
                  const good = report.rows.filter((r) => !r.issues.some((i) => i.level === '오류'))
                  const applied = onApply(
                    kind,
                    good.map((r) => r.values),
                  )
                  // 정상인데 안 들어간 것 = 이미 있어서 건너뛴 것(경고)
                  setOutcome({ applied, skipped: good.length - applied, failed: errorRows.length })
                }
                setStep(3)
              }}
              className="h-9 rounded-lg bg-gradient-to-r from-primary to-accent2 px-4 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              title={applyCount === 0 ? t('import.nothingToApply', '반영할 정상 행이 없습니다') : undefined}
            >
              {mode === 'raw'
                ? tf('import.applySheets', { n: applyCount }, '사양서 {n}건 반영')
                : tf('import.apply', { n: applyCount }, '정상 {n}건 반영')}
            </button>
          )}
          {step === 3 && (
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-lg bg-gradient-to-r from-primary to-accent2 px-4 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
            >
              {t('common.close', '닫기')}
            </button>
          )}
        </div>
      }
    >
      {/* 걸음 표시 — 지금 어디고 무엇이 남았는지 (규약 §21) */}
      <ol className="flex flex-wrap items-center gap-1.5 text-xs">
        {steps.map((s, i) => (
          <li key={s} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-ink-subtle">→</span>}
            <span
              className={`rounded-full px-2.5 py-1 ${
                i === step
                  ? 'bg-primary/15 font-semibold text-primary ring-1 ring-primary/40'
                  : i < step
                    ? 'bg-chip text-ink-muted'
                    : 'text-ink-subtle'
              }`}
            >
              {i < step && '✓ '}
              {t(`import.step.${s}`, s)}
            </span>
          </li>
        ))}
      </ol>

      {/* ── ① 고르기 ─────────────────────────────────────────────── */}
      {step === 0 && (
        <div className="mt-4 space-y-4">
          {/* 사양서가 이미 정해진 화면(상세)에서는 **고를 것이 없다** — 고르는 시늉을 내면
              "다른 사양서도 올릴 수 있나" 하고 헷갈린다 */}
          {lockToSpec != null ? (
            <p className="rounded-xl border border-hairline bg-canvas/50 px-4 py-3 text-[13px] text-ink-muted">
              {tf('import.scoped', { name: lockToSpec }, "'{name}' 의 필드 정의를 올립니다 — 사양서명 열은 없어도 됩니다.")}
            </p>
          ) : (
          <div>
            <span className="text-xs font-medium text-ink-subtle">{t('import.whichWay', '어떤 파일인가요')}</span>
            <div className="mt-1.5">
              <ChipSelect
                options={['raw', 'template'] as const}
                value={mode}
                onChange={(v) => {
                  setMode(v)
                  clear()
                  setReject(null)
                  setNote('')
                }}
                label={(m) =>
                  m === 'raw'
                    ? t('import.mode.raw', '지금 쓰는 엑셀 (시트 = 사양서)')
                    : t('import.mode.template', '우리 템플릿 (한 행 = 사양서)')
                }
              />
            </div>
          </div>
          )}

          {mode === 'raw' ? (
            <div className="rounded-xl border border-hairline bg-canvas/50 px-4 py-3 text-[13px]">
              <div className="font-medium text-ink">{t('import.rawHow', '이렇게 읽습니다')}</div>
              {/* ⚠ 무엇이 무엇이 되는지 **먼저** 말한다 — 올린 뒤에 알면 되돌리는 일이 된다 */}
              <ul className="mt-1.5 space-y-1 text-xs text-ink-muted">
                <li>· {t('import.rawSheet', '시트 이름 → 사양서 명')}</li>
                <li>· {t('import.rawHeader', '맨 위 행 → 컬럼명(필드)')}</li>
                <li>· {t('import.rawBody', '나머지 행 → 자료')}</li>
              </ul>
              <p className="mt-2 text-xs text-ink-subtle">
                {t(
                  'import.rawMapHint',
                  '다음 걸음에서 시트·머리 행·열을 고칠 수 있습니다 — 목차·이력 시트는 빼면 됩니다.',
                )}
              </p>
              {/* 초안 양식을 여기서도 준다 — "이 열은 우리 쪽에 없다" 같은 반론이 실물을 당긴다 */}
              <button
                type="button"
                onClick={downloadTemplate}
                className="mt-2.5 inline-flex h-8 items-center gap-1.5 rounded-lg border border-hairline bg-chip px-3 text-xs font-medium text-ink-muted transition-colors hover:text-ink"
              >
                <Icon name="download" />
                {t('import.templateDraft', '우리 표준 양식(초안) 받기')}
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-hairline bg-canvas/50 px-4 py-3 text-[13px]">
              {/* ⚠ 한 파일에 대장과 필드가 섞여 오면 "행 하나가 무엇인지"가 흔들린다 —
                  한 번에 하나만 받는다(설계 §1) */}
              {lockToSpec == null && (
              <ChipSelect
                options={['catalog', 'fields'] as const}
                value={kind}
                onChange={(v) => {
                  setKind(v)
                  clear()
                  setReject(null)
                }}
                label={(k) =>
                  k === 'catalog'
                    ? t('import.kind.catalog', '사양서 대장 (한 행 = 사양서)')
                    : t('import.kind.fields', '필드 정의 (한 행 = 필드)')
                }
              />
              )}
              <div className="mt-2.5 font-medium text-ink">{t('import.needCols', '필요한 열')}</div>
              <p className="mt-1 text-xs text-ink-muted">
                <b className="text-ink">{TEMPLATE[kind].required.join(' · ')}</b>{' '}
                <span className="text-ink-subtle">
                  ({t('import.optional', '선택')}: {TEMPLATE[kind].optional.join(' · ')})
                </span>
              </p>
              <button
                type="button"
                onClick={downloadTemplate}
                className="mt-2.5 inline-flex h-8 items-center gap-1.5 rounded-lg border border-hairline bg-chip px-3 text-xs font-medium text-ink-muted transition-colors hover:text-ink"
              >
                <Icon name="download" />
                {t('import.template', '표준 양식 받기 (xlsx)')}
              </button>
            </div>
          )}

          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-hairline px-4 py-8 text-center transition-colors hover:border-primary/40">
            <Icon name="upload" size="xl" />
            <span className="text-[13px] font-medium text-ink">
              {reading ? t('import.reading', '읽는 중… (큰 파일은 몇 초 걸립니다)') : t('import.pick', '파일 고르기')}
            </span>
            <span className="text-xs text-ink-subtle">
              {t('import.pickHint2', '.xlsx 또는 .csv · 10MB 이하 (구형 .xls 는 xlsx 로 한 번 저장해 주세요)')}
            </span>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void pickFile(f)
              }}
            />
          </label>

          {reject && (
            /* 막았으면 **왜** 막았는지 적는다 (규약 §17) */
            <p className="rounded-xl border border-danger-ink/30 bg-danger-bg px-4 py-3 text-[13px] text-danger-ink">
              {fileName !== '' && <b className="mr-1">{fileName}</b>}
              {reject.message}
            </p>
          )}
        </div>
      )}

      {/* ── ② 매핑 (원본 길) ─────────────────────────────────────── */}
      {step === 1 && mode === 'raw' && (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[13px] text-ink-muted">
              {tf('import.sheetsRead', { file: fileName, n: sheets.length }, '{file} — 시트 {n}개를 읽었습니다')}
            </p>
            {/* 카테고리는 엑셀에 없다 — 시트마다 고르는 대신 한 번에 정할 길을 준다 */}
            <label className="ml-auto flex items-center gap-2 text-xs text-ink-subtle">
              {t('import.categoryAll', '카테고리 일괄')}
              <Select
                value=""
                onChange={(e) => {
                  const v = e.target.value
                  if (v !== '') setPlans((ps) => ps.map((p) => ({ ...p, category: v })))
                }}
              >
                <option value="">{t('import.choose', '고르기')}</option>
                {SPEC_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {t(`specCategory.${c}`, c)}
                  </option>
                ))}
              </Select>
            </label>
          </div>

          {plans.map((p) => {
            const grid = sheets.find((g) => g.name === p.sheet)
            const open = openSheet === p.sheet
            const on = p.columns.filter((c) => c.include)
            const q = (colQuery[p.sheet] ?? '').trim()
            // ⚠ 열이 200개면 표를 다 그려도 사람이 못 읽는다 — 찾아서 좁히고, 화면은 앞쪽만 그린다
            const matched = q === '' ? p.columns : p.columns.filter((c) => c.field.includes(q) || c.source.includes(q))
            const shown = matched.slice(0, COLS_SHOWN)
            return (
              <section
                key={p.sheet}
                className={`rounded-xl border px-4 py-3.5 ${
                  p.include ? 'border-hairline bg-surface' : 'border-hairline/60 bg-canvas/40 opacity-60'
                }`}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-[13px] font-semibold text-ink">
                    <input
                      type="checkbox"
                      checked={p.include}
                      onChange={(e) => patch(p.sheet, { include: e.target.checked })}
                      className="size-4 accent-[var(--color-primary)]"
                    />
                    {p.sheet}
                  </label>
                  {/* 자료 행 수는 **파일 전체**를 센 값이다 — 격자는 앞부분만 담고 있어도 그렇다 */}
                  <span className="text-xs text-ink-subtle">
                    {tf('import.rowsOf', { n: p.dataRows.toLocaleString() }, '자료 {n}행')} ·{' '}
                    {tf('import.colsOf', { n: p.columns.length, on: on.length }, '열 {n}개 중 {on}개')}
                  </span>
                  {p.include && (
                    <button
                      type="button"
                      onClick={() => setOpenSheet(open ? '' : p.sheet)}
                      className="ml-auto inline-flex h-8 items-center gap-1 rounded-lg border border-hairline bg-chip px-3 text-xs font-medium text-ink-muted transition-colors hover:text-ink"
                    >
                      {open ? t('import.collapse', '접기') : t('import.expand', '열 매핑 펼치기')}
                    </button>
                  )}
                </div>

                {p.include && open && (
                  <>
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      <label className="text-xs text-ink-subtle">
                        {t('import.specName', '사양서 명')}
                        <input
                          value={p.specName}
                          onChange={(e) => patch(p.sheet, { specName: e.target.value })}
                          className="mt-1 h-10 w-full rounded-lg border border-hairline bg-surface px-3 text-[13px] text-ink outline-none focus:border-primary/60"
                        />
                      </label>
                      <label className="text-xs text-ink-subtle">
                        {t('import.category', '카테고리')}
                        <Select
                          className="mt-1 w-full"
                          value={p.category}
                          onChange={(e) => patch(p.sheet, { category: e.target.value })}
                        >
                          <option value="">{t('import.choose', '고르기')}</option>
                          {SPEC_CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                              {t(`specCategory.${c}`, c)}
                            </option>
                          ))}
                        </Select>
                      </label>
                      <label className="text-xs text-ink-subtle">
                        {t('import.headerRow', '머리 행')}
                        <Select
                          className="mt-1 w-full"
                          value={String(p.headerRow)}
                          onChange={(e) => {
                            // 머리 행이 바뀌면 **열도 다시 잡는다** — 이름·타입 제안이 함께 따라와야 한다
                            if (grid) patch(p.sheet, planSheet(grid, Number(e.target.value), p))
                          }}
                        >
                          {(grid?.rows ?? []).slice(0, 12).map((row, i) => (
                            <option key={i} value={String(i)}>
                              {tf('import.rowNo', { n: i + 1 }, '{n}행')} ·{' '}
                              {row
                                .filter((v) => v !== '')
                                .slice(0, 4)
                                .join(' | ') || '—'}
                            </option>
                          ))}
                        </Select>
                      </label>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <input
                        value={colQuery[p.sheet] ?? ''}
                        onChange={(e) => setColQuery((m) => ({ ...m, [p.sheet]: e.target.value }))}
                        placeholder={t('import.findColumn', '열 찾기')}
                        className="h-8 w-40 rounded-lg border border-hairline bg-surface px-2.5 text-xs text-ink outline-none focus:border-primary/60"
                      />
                      {/* 열이 많을수록 하나씩 끄는 것은 일이 된다 — 지금 보이는 것만 한 번에 켜고 끈다 */}
                      <button
                        type="button"
                        onClick={() => setAllColumns(p.sheet, matched, true)}
                        className="h-8 rounded-lg border border-hairline bg-chip px-3 text-xs font-medium text-ink-muted transition-colors hover:text-ink"
                      >
                        {t('import.allOn', '전체 켜기')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setAllColumns(p.sheet, matched, false)}
                        className="h-8 rounded-lg border border-hairline bg-chip px-3 text-xs font-medium text-ink-muted transition-colors hover:text-ink"
                      >
                        {t('import.allOff', '전체 끄기')}
                      </button>
                      {matched.length > shown.length && (
                        <span className="text-xs text-ink-subtle">
                          {tf(
                            'import.moreColumns',
                            { shown: shown.length, total: matched.length },
                            '{total}개 중 앞 {shown}개만 보입니다 — 찾기로 좁혀 주세요',
                          )}
                        </span>
                      )}
                    </div>

                    <div className="mt-3 max-h-96 overflow-y-auto">
                      <DataTable
                        rows={shown}
                        rowKey={(c) => String(c.index)}
                        minWidth={620}
                        empty={{ title: t('import.noColumns', '읽은 열이 없습니다.') }}
                        columns={[
                          {
                            header: t('import.th.include', '가져옴'),
                            cell: (c) => (
                              <input
                                type="checkbox"
                                checked={c.include}
                                onChange={(e) => patchColumn(p.sheet, c.index, { include: e.target.checked })}
                                className="size-4 accent-[var(--color-primary)]"
                                aria-label={`${p.sheet} ${c.field}`}
                              />
                            ),
                          },
                          {
                            header: t('import.th.source', '엑셀 열'),
                            cellClassName: 'whitespace-nowrap text-ink-subtle',
                            cell: (c) => c.source || '—',
                          },
                          {
                            header: t('import.th.field', '필드명'),
                            cell: (c) => (
                              <input
                                value={c.field}
                                onChange={(e) => patchColumn(p.sheet, c.index, { field: e.target.value })}
                                className="h-9 w-full min-w-32 rounded-lg border border-hairline bg-surface px-2.5 text-[13px] text-ink outline-none focus:border-primary/60"
                              />
                            ),
                          },
                          {
                            header: t('import.th.type', '타입'),
                            cell: (c) => (
                              <Select
                                value={c.type}
                                onChange={(e) => patchColumn(p.sheet, c.index, { type: e.target.value as FieldType })}
                              >
                                {FIELD_TYPES.map((ft) => (
                                  <option key={ft} value={ft}>
                                    {ft}
                                  </option>
                                ))}
                              </Select>
                            ),
                          },
                        ]}
                      />
                    </div>
                  </>
                )}
              </section>
            )
          })}
          <p className="text-xs text-ink-subtle">
            {/* ⚠ 추론은 제안이지 판단이 아니다 (설계 §1-1) */}
            {t(
              'import.inferHint',
              '타입은 값에서 짐작한 제안입니다 — 다르면 고쳐 주세요. 날짜는 엑셀이 숫자로 저장해 숫자로 보일 수 있습니다.',
            )}
          </p>
        </div>
      )}

      {/* ── ② 확인 (템플릿 길) ───────────────────────────────────── */}
      {step === 1 && mode === 'template' && report && (
        <div className="mt-4">
          {note !== '' && (
            <p className="mb-2 rounded-lg border border-hairline bg-canvas/50 px-3 py-2 text-xs text-ink-muted">
              {note}
            </p>
          )}
          <p className="text-[13px] text-ink-muted">
            {tf('import.readAs', { file: fileName, n: report.rows.length }, '{file} 을 이렇게 읽었습니다 — 자료 {n}행')}
          </p>
          <div className="mt-3">
            <DataTable
              rows={report.rows.slice(0, 5)}
              rowKey={(r) => String(r.row)}
              minWidth={640}
              empty={{ title: t('import.noRows', '읽은 행이 없습니다.') }}
              columns={[
                { header: '#', cellClassName: 'font-mono text-xs text-ink-subtle', cell: (r) => r.row },
                ...report.headers.map((h) => ({
                  header: h,
                  cellClassName: 'text-ink-muted',
                  cell: (r: (typeof report.rows)[number]) => r.values[h] || '—',
                })),
              ]}
            />
          </div>
          <p className="mt-2 text-xs text-ink-subtle">
            {t('import.previewHint', '앞 5행만 보여 줍니다 — 열이 밀렸으면 뒤로 가서 파일을 다시 고르세요')}
          </p>
        </div>
      )}

      {/* ── ③ 검증 ───────────────────────────────────────────────── */}
      {step === 2 && (
        <div className="mt-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-deployed-bg px-2.5 py-1 font-semibold text-deployed-ink">
              {mode === 'raw'
                ? tf('import.okSheets', { n: planned.length }, '반영할 사양서 {n}건')
                : tf('import.okCount', { n: report?.ok ?? 0 }, '정상 {n}건')}
            </span>
            <span className="rounded-full bg-review-bg px-2.5 py-1 font-semibold text-review-ink">
              {tf('import.warnCount', { n: mode === 'raw' ? warnSheets : warnOnlyRows.length }, '경고 {n}건')}
            </span>
            <span className="rounded-full bg-danger-bg px-2.5 py-1 font-semibold text-danger-ink">
              {tf('import.errCount', { n: mode === 'raw' ? badSheets : errorRows.length }, '오류 {n}건')}
            </span>
            {(mode === 'raw' ? planIssues.length : issues.length) > 0 && (
              <button
                type="button"
                onClick={() =>
                  download(
                    `업로드_오류리포트_${fileName.replace(/\.[^.]+$/, '')}.csv`,
                    mode === 'raw' ? planIssuesToCsv(planIssues) : issuesToCsv(issues),
                  )
                }
                className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-lg border border-hairline bg-chip px-3 font-medium text-ink-muted transition-colors hover:text-ink"
              >
                <Icon name="download" />
                {t('import.report', '오류 리포트 받기')}
              </button>
            )}
          </div>

          {(mode === 'raw' ? planIssues.length : issues.length) === 0 ? (
            <p className="mt-3 rounded-xl border border-hairline bg-canvas/50 px-4 py-6 text-center text-[13px] text-ink-subtle">
              {t('import.clean', '고칠 것이 없습니다 — 그대로 반영할 수 있습니다.')}
            </p>
          ) : mode === 'raw' ? (
            <div className="mt-3">
              {/* 시트·열·사유를 함께 — 원본 길에서는 **시트가 사양서**다 (설계 §4) */}
              <DataTable
                rows={planIssues}
                rowKey={(i, idx) => `${i.sheet}.${i.column}.${idx}`}
                rowTone={(i) => (i.level === '오류' ? 'bg-danger-bg/20' : undefined)}
                minWidth={620}
                empty={{ title: t('import.noIssues', '걸린 행이 없습니다.') }}
                columns={[
                  {
                    header: t('import.th.sheet', '시트'),
                    cellClassName: 'whitespace-nowrap font-medium text-ink',
                    cell: (i) => i.sheet,
                  },
                  {
                    header: t('import.th.column', '열'),
                    cellClassName: 'whitespace-nowrap text-ink-muted',
                    cell: (i) => i.column,
                  },
                  {
                    header: t('import.th.level', '수준'),
                    cell: (i) => (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          i.level === '오류' ? 'bg-danger-bg text-danger-ink' : 'bg-review-bg text-review-ink'
                        }`}
                      >
                        {i.level}
                      </span>
                    ),
                  },
                  { header: t('import.th.reason', '사유'), cellClassName: 'text-ink-muted', cell: (i) => i.message },
                ]}
              />
            </div>
          ) : (
            <div className="mt-3">
              {/* 행 번호·열·사유를 함께 — "형식이 잘못됐습니다"는 리포트가 아니다 (설계 §4) */}
              <DataTable
                rows={issues}
                rowKey={(i, idx) => `${i.row}.${i.column}.${idx}`}
                rowTone={(i) => (i.level === '오류' ? 'bg-danger-bg/20' : undefined)}
                minWidth={620}
                empty={{ title: t('import.noIssues', '걸린 행이 없습니다.') }}
                columns={[
                  {
                    header: t('import.th.row', '행'),
                    numeric: true,
                    cellClassName: 'font-mono text-xs',
                    cell: (i) => i.row,
                  },
                  {
                    header: t('import.th.column', '열'),
                    cellClassName: 'whitespace-nowrap text-ink-muted',
                    cell: (i) => i.column,
                  },
                  {
                    header: t('import.th.level', '수준'),
                    cell: (i) => (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          i.level === '오류' ? 'bg-danger-bg text-danger-ink' : 'bg-review-bg text-review-ink'
                        }`}
                      >
                        {i.level}
                      </span>
                    ),
                  },
                  { header: t('import.th.reason', '사유'), cellClassName: 'text-ink-muted', cell: (i) => i.message },
                ]}
              />
            </div>
          )}

          {mode === 'raw' && planned.length > 0 && (
            <p className="mt-2 text-xs text-ink-muted">
              {tf(
                'import.willApply',
                { list: planned.map((s) => `${s.name}(${s.fields.length})`).join(' · ') },
                '들어갈 사양서(필드 수): {list}',
              )}
            </p>
          )}
          <p className="mt-2 text-xs text-ink-subtle">
            {t(
              'import.partialHint',
              '오류 행은 빼고 정상 행만 반영합니다 — 고친 뒤 같은 파일을 다시 올려도 안전합니다.',
            )}
          </p>
        </div>
      )}

      {/* ── ④ 반영 ───────────────────────────────────────────────── */}
      {step === 3 && outcome && (
        <div className="mt-4 space-y-3">
          <div className="rounded-xl border border-deployed-ink/30 bg-deployed-bg px-4 py-3.5 text-[13px] text-deployed-ink">
            {tf(
              'import.result',
              { applied: outcome.applied, skipped: outcome.skipped, failed: outcome.failed },
              '{applied}건 반영했습니다 · 이미 있어 건너뜀 {skipped}건 · 오류로 빠짐 {failed}건',
            )}
          </div>
          {/* ⚠ 여기는 [닫기] 하나로 끝나 있었다 — 반영이 끝난 자리는 **다음 행동**으로 끝나야
              한다(규약 §10). 들어간 것을 보러 가거나, 고쳐서 다시 올리거나. */}
          <div className="flex flex-wrap gap-2">
            {outcome.applied > 0 && onSeeResult != null && (
              <button
                type="button"
                onClick={() => {
                  onSeeResult()
                  onClose()
                }}
                className="h-9 rounded-lg border border-hairline bg-chip px-3.5 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
              >
                {t('import.seeResult', '들어간 것 보기')}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                // 같은 걸음을 처음부터 — 고친 파일을 다시 올리는 것이 가장 흔한 다음 행동이다
                setOutcome(null)
                setReport(null)
                setPlans([])
                setSheets([])
                setFileName('')
                setStep(0)
              }}
              className="h-9 rounded-lg border border-hairline bg-chip px-3.5 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
            >
              {t('import.again', '다른 파일 올리기')}
            </button>
          </div>
          {outcome.failed > 0 && (
            <p className="text-[13px] text-ink-muted">
              {t(
                'import.nextStep',
                '오류 행은 리포트를 받아 고친 뒤 다시 올려 주세요 — 이미 반영된 건은 중복으로 들어가지 않습니다.',
              )}{' '}
              <button
                type="button"
                onClick={() =>
                  download(
                    `업로드_오류리포트_${fileName.replace(/\.[^.]+$/, '')}.csv`,
                    mode === 'raw' ? planIssuesToCsv(planIssues) : issuesToCsv(issues),
                  )
                }
                className="font-medium text-primary underline"
              >
                {t('import.report', '오류 리포트 받기')}
              </button>
            </p>
          )}
          <p className="text-xs text-ink-subtle">
            {t(
              'import.auditHint',
              '업로드 사실이 감사 로그에 남았습니다 — 개인정보 관리 화면에서 확인할 수 있습니다 (배치 단위 되돌리기는 본개발).',
            )}
          </p>
        </div>
      )}
    </Modal>
  )
}
