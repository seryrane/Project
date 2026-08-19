import { useMemo, useState } from 'react'

import { Modal } from './Modal'
import { ChipSelect } from './Chips'
import { DataTable } from './DataTable'
import { Icon } from './Icon'
import { useI18n } from '#/lib/i18n'
import {
  TEMPLATE,
  issuesToCsv,
  parseCsv,
  rejectFile,
  templateCsv,
} from '#/lib/specImport'
import type { ImportKind, ImportReport, RejectReason, RowIssue } from '#/lib/specImport'

/**
 * 엑셀(CSV) 사양서 이관 — **네 걸음** (FR-115 · `docs/엑셀_마이그레이션_설계.md` §6).
 *
 *   ① 고르기 → ② 확인 → ③ 검증 → ④ 반영
 *
 * ⚠ 되돌릴 수 없는 걸음은 **④ 하나뿐**이고, 그 앞에서 무엇이 들어갈지 숫자로 보여 준다
 * (규약 §2). 걸음마다 뒤로 갈 수 있다 — 파일을 다시 고르는 것이 가장 흔한 일이다.
 * ⚠ 판단(파싱·검증)은 전부 `lib/specImport.ts` 가 한다. 이 파일은 **걸음만 그린다** —
 * 규칙이 화면에 흩어지면 "왜 이 행이 오류인지"가 화면마다 달라진다.
 */
const STEPS = ['고르기', '확인', '검증', '반영'] as const

export interface ImportOutcome {
  kind: ImportKind
  applied: number
  skipped: number
  failed: number
}

export function SpecImportModal({
  knownSpecNames,
  knownMemberNames,
  onApply,
  onClose,
}: {
  knownSpecNames: Array<string>
  knownMemberNames: Array<string>
  /** 정상 행만 넘긴다 — 반영 자체는 부르는 쪽(스토어)이 한다 */
  onApply: (kind: ImportKind, rows: Array<Record<string, string>>) => number
  onClose: () => void
}) {
  const { t, tf } = useI18n()
  const [step, setStep] = useState(0)
  const [kind, setKind] = useState<ImportKind>('catalog')
  const [fileName, setFileName] = useState('')
  const [reject, setReject] = useState<RejectReason | null>(null)
  const [report, setReport] = useState<ImportReport | null>(null)
  const [outcome, setOutcome] = useState<ImportOutcome | null>(null)

  const issues: Array<RowIssue> = useMemo(
    () => (report ? report.rows.flatMap((r) => r.issues) : []),
    [report],
  )
  const errorRows = report ? report.rows.filter((r) => r.issues.some((i) => i.level === '오류')) : []
  const warnOnly = report
    ? report.rows.filter(
        (r) => !r.issues.some((i) => i.level === '오류') && r.issues.some((i) => i.level === '경고'),
      )
    : []

  const download = (name: string, text: string) => {
    /* ⚠ 브라우저가 파일을 만들어 준다 — 서버 왕복이 없다. 본개발에서 서버 리포트로 옮기면
       이 함수만 바뀐다(화면은 "리포트를 받는다"만 안다). */
    // ⚠ 맨 앞의 BOM()이 없으면 **엑셀이 한글을 깨서 연다** — 리포트를 엑셀로 고칠 사람에게 필요하다
    const url = URL.createObjectURL(new Blob(['' + text], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    URL.revokeObjectURL(url)
  }

  const pickFile = async (file: File) => {
    setFileName(file.name)
    const bad = rejectFile(file)
    if (bad) {
      // 형식 위반은 **사전 차단** — 한 행도 읽지 않는다 (AC ①)
      setReject(bad)
      setReport(null)
      return
    }
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setReject({
        code: 'ext',
        message: t(
          'import.xlsxHint',
          '지금은 CSV 만 읽습니다 — 엑셀에서 [다른 이름으로 저장 → CSV UTF-8] 로 저장해 올려 주세요',
        ),
      })
      setReport(null)
      return
    }
    const text = await file.text()
    const res = parseCsv(kind, text, { specNames: knownSpecNames, memberNames: knownMemberNames })
    setReject(res.reject ?? null)
    setReport(res.report ?? null)
    if (res.report) setStep(1)
  }

  return (
    <Modal
      title={t('import.title', '엑셀 사양서 올리기')}
      onClose={onClose}
      wide
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="mr-auto text-xs text-ink-subtle">
            {tf('import.stepOf', { n: step + 1, total: STEPS.length, name: STEPS[step] }, '{n}/{total} · {name}')}
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
              onClick={() => setStep(2)}
              className="h-9 rounded-lg bg-gradient-to-r from-primary to-accent2 px-4 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
            >
              {t('import.toValidate', '검증 결과 보기')}
            </button>
          )}
          {step === 2 && report && (
            <button
              type="button"
              disabled={report.ok === 0}
              onClick={() => {
                const good = report.rows.filter((r) => !r.issues.some((i) => i.level === '오류'))
                const applied = onApply(kind, good.map((r) => r.values))
                setOutcome({
                  kind,
                  applied,
                  // 정상인데 안 들어간 것 = 이미 있어서 건너뛴 것(경고)
                  skipped: good.length - applied,
                  failed: errorRows.length,
                })
                setStep(3)
              }}
              className="h-9 rounded-lg bg-gradient-to-r from-primary to-accent2 px-4 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              title={report.ok === 0 ? t('import.nothingToApply', '반영할 정상 행이 없습니다') : undefined}
            >
              {tf('import.apply', { n: report.ok }, '정상 {n}건 반영')}
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
        {STEPS.map((s, i) => (
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
          <div>
            <span className="text-xs font-medium text-ink-subtle">
              {t('import.whatKind', '무엇을 올리나요')}
            </span>
            {/* ⚠ 한 파일에 대장과 필드가 섞여 오면 "행 하나가 무엇인지"가 흔들린다 —
                한 번에 하나만 받는다(설계 §1) */}
            <div className="mt-1.5">
              <ChipSelect
                options={['catalog', 'fields'] as const}
                value={kind}
                onChange={(v) => {
                  setKind(v)
                  setReport(null)
                  setReject(null)
                }}
                label={(k) =>
                  k === 'catalog'
                    ? t('import.kind.catalog', '사양서 대장 (한 행 = 사양서)')
                    : t('import.kind.fields', '필드 정의 (한 행 = 필드)')
                }
              />
            </div>
          </div>

          <div className="rounded-xl border border-hairline bg-canvas/50 px-4 py-3 text-[13px]">
            <div className="font-medium text-ink">{t('import.needCols', '필요한 열')}</div>
            <p className="mt-1 text-xs text-ink-muted">
              <b className="text-ink">{TEMPLATE[kind].required.join(' · ')}</b>
              {TEMPLATE[kind].optional.length > 0 && (
                <>
                  {' '}
                  <span className="text-ink-subtle">
                    ({t('import.optional', '선택')}: {TEMPLATE[kind].optional.join(' · ')})
                  </span>
                </>
              )}
            </p>
            <button
              type="button"
              onClick={() => download(`사양서_${kind === 'catalog' ? '대장' : '필드'}_템플릿.csv`, templateCsv(kind))}
              className="mt-2.5 inline-flex h-8 items-center gap-1.5 rounded-lg border border-hairline bg-chip px-3 text-xs font-medium text-ink-muted transition-colors hover:text-ink"
            >
              <Icon name="download" />
              {t('import.template', '템플릿 내려받기')}
            </button>
          </div>

          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-hairline px-4 py-8 text-center transition-colors hover:border-primary/40">
            <Icon name="upload" size="xl" />
            <span className="text-[13px] font-medium text-ink">
              {t('import.pick', '파일 고르기 (CSV)')}
            </span>
            <span className="text-xs text-ink-subtle">
              {t('import.pickHint', '엑셀은 [다른 이름으로 저장 → CSV UTF-8] 로 저장해 주세요 · 10MB 이하')}
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
              {fileName && <b className="mr-1">{fileName}</b>}
              {reject.message}
            </p>
          )}
        </div>
      )}

      {/* ── ② 확인 ───────────────────────────────────────────────── */}
      {step === 1 && report && (
        <div className="mt-4">
          <p className="text-[13px] text-ink-muted">
            {tf(
              'import.readAs',
              { file: fileName, n: report.rows.length },
              '{file} 을 이렇게 읽었습니다 — 자료 {n}행',
            )}
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
      {step === 2 && report && (
        <div className="mt-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-deployed-bg px-2.5 py-1 font-semibold text-deployed-ink">
              {tf('import.okCount', { n: report.ok }, '정상 {n}건')}
            </span>
            <span className="rounded-full bg-review-bg px-2.5 py-1 font-semibold text-review-ink">
              {tf('import.warnCount', { n: warnOnly.length }, '경고 {n}건')}
            </span>
            <span className="rounded-full bg-danger-bg px-2.5 py-1 font-semibold text-danger-ink">
              {tf('import.errCount', { n: errorRows.length }, '오류 {n}건')}
            </span>
            {issues.length > 0 && (
              <button
                type="button"
                onClick={() => download(`업로드_오류리포트_${fileName.replace(/\.[^.]+$/, '')}.csv`, issuesToCsv(issues))}
                className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-lg border border-hairline bg-chip px-3 font-medium text-ink-muted transition-colors hover:text-ink"
              >
                <Icon name="download" />
                {t('import.report', '오류 리포트 받기')}
              </button>
            )}
          </div>

          {issues.length === 0 ? (
            <p className="mt-3 rounded-xl border border-hairline bg-canvas/50 px-4 py-6 text-center text-[13px] text-ink-subtle">
              {t('import.clean', '고칠 것이 없습니다 — 그대로 반영할 수 있습니다.')}
            </p>
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
                  { header: t('import.th.row', '행'), numeric: true, cellClassName: 'font-mono text-xs', cell: (i) => i.row },
                  { header: t('import.th.column', '열'), cellClassName: 'whitespace-nowrap text-ink-muted', cell: (i) => i.column },
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
          <p className="mt-2 text-xs text-ink-subtle">
            {t('import.partialHint', '오류 행은 빼고 정상 행만 반영합니다 — 고친 뒤 같은 파일을 다시 올려도 안전합니다.')}
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
          {outcome.failed > 0 && (
            <p className="text-[13px] text-ink-muted">
              {t(
                'import.nextStep',
                '오류 행은 리포트를 받아 고친 뒤 다시 올려 주세요 — 이미 반영된 건은 중복으로 들어가지 않습니다.',
              )}{' '}
              <button
                type="button"
                onClick={() => download(`업로드_오류리포트_${fileName.replace(/\.[^.]+$/, '')}.csv`, issuesToCsv(issues))}
                className="font-medium text-primary underline"
              >
                {t('import.report', '오류 리포트 받기')}
              </button>
            </p>
          )}
          <p className="text-xs text-ink-subtle">
            {t('import.auditHint', '업로드 사실은 감사 로그에 남습니다 (본개발에서 배치 단위로 되돌릴 수 있게 확장).')}
          </p>
        </div>
      )}
    </Modal>
  )
}
