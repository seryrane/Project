import { useEffect, useRef, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { AppShell } from '#/components/portal/AppShell'
import { ChipSelect, Switch } from '#/components/portal/Chips'
import { Modal } from '#/components/portal/Modal'
import { useToast } from '#/components/portal/toast'
import { useI18n } from '#/lib/i18n'
import {
  ENGINE_TEMPLATE,
  RESULT_CLS,
  engineSchedules,
  validationEngines,
} from '#/data/validationEngines'
import type { ValidationEngine } from '#/data/validationEngines'

export const Route = createFileRoute('/validation-engine')({ component: ValidationEnginePage })

/* 셀렉트 칩의 내부 값은 키 — 화면에 보일 때만 사전을 입힌다 (언어를 바꿔도 선택이 안 깨진다) */
const STATUS_KEYS = ['active', 'inactive'] as const
const FREQ_KEYS = ['daily', 'weekly', 'hourly'] as const

function ResultBadge({ result }: { result: ValidationEngine['lastResult'] }) {
  return (
    <span className={`flex items-center gap-1 text-xs font-medium ${RESULT_CLS[result]}`}>
      {result === '성공' ? '✓' : result === '부분성공' ? '⚠' : '✕'} {result}
    </span>
  )
}

function ValidationEnginePage() {
  const { t, tf } = useI18n()
  const toast = useToast()
  const [engines, setEngines] = useState(validationEngines)
  const [expanded, setExpanded] = useState<string | null>(validationEngines[0].id)
  const [tab, setTab] = useState<'code' | 'schedule'>('code')
  // 즉시 실행 진행률 — 누른 그 자리에서 게이지로 보여 준다 (규약 §3)
  const [progress, setProgress] = useState<Record<string, number>>({})
  const timers = useRef<Record<string, ReturnType<typeof setInterval>>>({})
  const [editing, setEditing] = useState<ValidationEngine | 'new' | null>(null)
  const [engineStatus, setEngineStatus] = useState<(typeof STATUS_KEYS)[number]>('active')
  const [scheduling, setScheduling] = useState(false)
  const [schedFreq, setSchedFreq] = useState<(typeof FREQ_KEYS)[number]>('daily')
  const [schedOn, setSchedOn] = useState(true)
  const [schedEngine, setSchedEngine] = useState(validationEngines[0].name)
  const [deleting, setDeleting] = useState<ValidationEngine | null>(null)
  const [schedActive, setSchedActive] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const tm = timers.current
    return () => Object.values(tm).forEach(clearInterval)
  }, [])

  const run = (e: ValidationEngine) => {
    if (e.id in progress) return // 두 번 눌리지 않게 막는다
    toast(tf('engine.toast.started', { name: e.name }, '{name} 즉시 검증을 시작합니다'))
    setProgress((p) => ({ ...p, [e.id]: 3 }))
    timers.current[e.id] = setInterval(() => {
      setProgress((p) => {
        const cur = p[e.id] ?? 0
        const next = cur + 7 + Math.round(Math.random() * 12)
        if (next >= 100) {
          clearInterval(timers.current[e.id])
          const errors = e.id === 'ENG-001' ? 12 : e.id === 'ENG-002' ? 4 : 0
          toast(
            errors > 0
              ? tf(
                  'engine.toast.doneWithErrors',
                  { name: e.name, n: errors },
                  '{name} 완료 — 오류 {n}건 검출 · 검증 결과 조회에서 확인하세요',
                )
              : tf('engine.toast.donePass', { name: e.name }, '{name} 완료 — 오류 없음 (통과)'),
          )
          setEngines((list) =>
            list.map((x) => (x.id === e.id ? { ...x, runs: x.runs + 1, lastRun: '방금' } : x)),
          )
          const { [e.id]: _done, ...rest } = p
          return rest
        }
        return { ...p, [e.id]: next }
      })
    }, 350)
  }

  const stats = [
    {
      label: t('engine.stat.total', '전체 엔진'),
      value: tf('engine.countUnit', { n: engines.length }, '{n}개'),
      sub: tf('engine.activeUnit', { n: engines.filter((e) => e.active).length }, '활성 {n}개'),
    },
    {
      label: t('engine.stat.schedules', '등록 스케줄'),
      value: tf('engine.countUnit', { n: Object.values(engineSchedules).flat().length }, '{n}개'),
      sub: tf(
        'engine.activeUnit',
        { n: Object.values(engineSchedules).flat().filter((s) => s.active).length },
        '활성 {n}개',
      ),
    },
    // '성공'/'부분성공'은 엔진 실행 결과 상태값이라 그대로 둔다 (규약)
    { label: t('engine.stat.todayRuns', '오늘 실행'), value: tf('engine.timesUnit', { n: 2 }, '{n}회'), sub: '성공 1 / 부분성공 1' },
    {
      label: t('engine.stat.cumulativeErrors', '누적 오류'),
      value: tf('engine.casesUnit', { n: 56 }, '{n}건'),
      sub: t('engine.last7days', '최근 7일 기준'),
      cls: 'text-danger-ink',
    },
  ]

  return (
    <AppShell active="engine" title="검증엔진 관리">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('nav.engine', '검증엔진 관리')}</h1>
          <p className="mt-1 text-[13px] text-ink-subtle">
            {t(
              'page.validation-engine.subtitle',
              'Python 함수 기반 검증엔진 등록 · 스케줄 관리 · 즉시 실행 (Mock 데이터)',
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing('new')}
          className="h-9 rounded-lg bg-gradient-to-r from-primary to-accent2 px-4 text-[13px] font-semibold text-white shadow-[0_2px_10px_var(--color-glow)] transition-opacity hover:opacity-90"
        >
          {t('engine.register', '+ 엔진 등록')}
        </button>
      </div>

      <div className="anim-fade-up mt-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card-spotlight rounded-2xl border border-hairline bg-surface px-5 py-4">
            <div className={`text-2xl font-semibold tabular-nums ${s.cls ?? 'text-ink'}`}>{s.value}</div>
            <div className="mt-0.5 text-xs text-ink-subtle">
              {s.label} · {s.sub}
            </div>
          </div>
        ))}
      </div>

      <ol className="mt-5 space-y-3">
        {engines.map((e, i) => {
          const open = expanded === e.id
          const running: number | null = e.id in progress ? progress[e.id] : null
          const schedules = engineSchedules[e.id] ?? []
          return (
            <li
              key={e.id}
              style={{ animationDelay: `${i * 60}ms` }}
              className={`card-hover card-spotlight anim-fade-up overflow-hidden rounded-2xl border bg-surface ${
                open ? 'border-primary/40' : 'border-hairline'
              } ${running != null ? 'card-loading' : ''}`}
            >
              {/* 머리 — 엔진이 무엇이고 지금 어떤 상태인가. 펼쳤을 때만 면으로 가른다:
                  ⚠ **접힌 카드는 머리만 있는 물건이라 가를 것이 없다** — 그때도 면을 깔면
                  카드가 통째로 회색이 되어 "일하는 면"이 사라진다. 아래를 가르는 선은
                  펼친 몸이 이미 border-t 로 갖고 있다 (규약 §7) */}
              <div className={`flex flex-wrap items-center gap-3 px-5 py-4 ${open ? 'bg-canvas/50' : ''}`}>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <rect x="7" y="7" width="10" height="10" rx="2" />
                    <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" />
                  </svg>
                </span>
                {/* basis 가 없으면 flex-wrap 줄에서 이 블록이 줄바꿈 대신 최소폭까지
                    짓눌린다 — 한 글자 세로줄(실기기 실증). 좁으면 액션이 다음 줄로 간다 */}
                <button type="button" onClick={() => setExpanded(open ? null : e.id)} className="min-w-0 flex-1 basis-64 text-left">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-[15px] font-semibold text-ink">{e.name}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        e.active ? 'bg-deployed-bg text-deployed-ink' : 'bg-chip text-ink-subtle'
                      }`}
                    >
                      {e.active ? t('engine.status.active', '활성') : t('engine.status.inactive', '비활성')}
                    </span>
                    <ResultBadge result={e.lastResult} />
                  </span>
                  <span className="mt-1 block text-[13px] text-ink-muted">{e.desc}</span>
                  <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-subtle">
                    <span>
                      {t('engine.label.target', '대상')}:{' '}
                      <code className="rounded bg-chip px-1.5 py-0.5 font-mono text-[11px]">{e.targetTable}</code>
                    </span>
                    <span className="tabular-nums">{tf('engine.totalRuns', { n: e.runs }, '총 실행: {n}회')}</span>
                    <span className="tabular-nums">
                      {t('engine.label.recent', '최근')}: {e.lastRun}
                    </span>
                    <span>
                      {tf(
                        'engine.scheduleActive',
                        { n: schedules.filter((s3) => schedActive[s3.id] ?? s3.active).length },
                        '스케줄: {n}개 활성',
                      )}
                    </span>
                  </span>
                </button>
                <span className="flex shrink-0 items-center gap-1.5">
                  {running != null ? (
                    /* 게이지바 — 스피너만 돌면 멈춘 것과 구별되지 않는다 (규약 §3) */
                    <span className="flex w-40 items-center gap-2">
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-chip">
                        <span
                          className="block h-full rounded-full bg-gradient-to-r from-primary to-accent2 transition-[width] duration-300"
                          style={{ width: `${running}%` }}
                        />
                      </span>
                      <span className="w-9 text-right text-xs font-semibold tabular-nums text-primary">{running}%</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => run(e)}
                      className="h-9 rounded-lg border border-hairline bg-chip px-3.5 text-[13px] font-medium text-ink-muted transition-colors hover:border-primary/40 hover:text-ink"
                    >
                      {t('engine.runNow', '⚡ 즉시 실행')}
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label={t('engine.editAria', '엔진 수정')}
                    onClick={() => setEditing(e)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-subtle transition-colors hover:bg-chip hover:text-ink"
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    aria-label={t('engine.deleteAria', '엔진 삭제')}
                    onClick={() => setDeleting(e)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-subtle transition-colors hover:bg-danger-bg hover:text-danger-ink"
                  >
                    🗑
                  </button>
                  <button
                    type="button"
                    aria-label={open ? t('engine.collapse', '접기') : t('engine.expand', '펼치기')}
                    onClick={() => setExpanded(open ? null : e.id)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-subtle transition-colors hover:bg-chip hover:text-ink"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${open ? 'rotate-90' : ''}`} aria-hidden>
                      <path d="m9 6 6 6-6 6" />
                    </svg>
                  </button>
                </span>
              </div>

              {open && (
                <div className="anim-fade-in border-t border-hairline px-5 pb-5">
                  <div className="mt-4 flex gap-1 rounded-lg border border-hairline bg-canvas/50 p-1 text-xs w-fit">
                    {(
                      [
                        { key: 'code', label: t('engine.tab.code', '</> Python 함수') },
                        { key: 'schedule', label: `${t('engine.tab.schedule', '📅 스케줄')} (${schedules.length})` },
                      ] as const
                    ).map((tb) => (
                      <button
                        key={tb.key}
                        type="button"
                        onClick={() => setTab(tb.key)}
                        className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                          tab === tb.key ? 'bg-primary/15 text-primary' : 'text-ink-muted hover:text-ink'
                        }`}
                      >
                        {tb.label}
                      </button>
                    ))}
                  </div>

                  {tab === 'code' ? (
                    <>
                      <div className="relative mt-3 overflow-x-auto rounded-xl bg-sidebar p-4">
                        <span className="absolute right-3 top-3 rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-sidebar-ink">
                          Python 3.x
                        </span>
                        <pre className="font-mono text-xs leading-relaxed text-sidebar-ink">{e.code}</pre>
                      </div>
                      <p className="mt-2 rounded-lg bg-chip px-3 py-2 text-xs text-ink-muted">
                        <b className="text-ink">{t('engine.codeHint.input', '입력')}:</b> records (list[dict]) —{' '}
                        {t('engine.codeHint.inputDesc', '검증 대상 레코드')} ·{' '}
                        <b className="text-ink">{t('engine.codeHint.output', '반환')}:</b> errors (list[dict]) —{' '}
                        {t('engine.codeHint.outputDesc', '오류 목록')}
                      </p>
                    </>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {schedules.map((s3) => {
                        const on = schedActive[s3.id] ?? s3.active
                        return (
                          <div
                            key={s3.id}
                            className="flex flex-wrap items-center gap-3 rounded-xl border border-hairline px-4 py-3 text-[13px]"
                          >
                            <span className="rounded-full bg-primary/12 px-2 py-0.5 text-[11px] font-semibold text-primary">
                              {s3.freq}
                            </span>
                            <span className="font-medium text-ink">{s3.time}</span>
                            <span className="text-xs text-ink-subtle">
                              {t('engine.label.nextRun', '다음 실행')}:{' '}
                              <b className="tabular-nums text-ink-muted">
                                {on ? s3.next : t('engine.inactiveDash', '— (비활성)')}
                              </b>{' '}
                              · {t('engine.label.recent', '최근')}:{' '}
                              <span className="tabular-nums">{s3.last}</span>
                            </span>
                            <span className="ml-auto flex items-center gap-2">
                              <button
                                type="button"
                                role="switch"
                                aria-checked={on}
                                aria-label={t('engine.schedToggleAria', '스케줄 활성화')}
                                onClick={() => {
                                  setSchedActive((m) => ({ ...m, [s3.id]: !on }))
                                  toast(
                                    on
                                      ? t(
                                          'engine.toast.scheduleStopped',
                                          '스케줄을 중지했습니다 — 자동 실행이 멈춥니다',
                                        )
                                      : tf(
                                          'engine.toast.scheduleActivated',
                                          { time: s3.time },
                                          '스케줄을 활성화했습니다 — {time}',
                                        ),
                                  )
                                }}
                                className={`h-6 w-11 rounded-full p-0.5 transition-colors ${on ? 'bg-primary' : 'bg-chip-strong'}`}
                              >
                                <span
                                  className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5' : ''}`}
                                />
                              </button>
                            </span>
                          </div>
                        )
                      })}
                      <button
                        type="button"
                        onClick={() => setScheduling(true)}
                        className="w-full rounded-xl border border-dashed border-hairline px-4 py-2.5 text-xs font-medium text-ink-muted transition-colors hover:border-primary/40 hover:text-ink"
                      >
                        {t('engine.addSchedule', '+ 스케줄 추가')}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ol>

      {/* 엔진 등록/수정 — 함수 시그니처 규칙을 화면이 미리 말한다 */}
      {editing && (
        <Modal
          title={
            editing === 'new'
              ? t('engine.modal.new', '검증 엔진 등록')
              : t('engine.modal.edit', '검증 엔진 수정')
          }
          onClose={() => setEditing(null)}
          wide
        >
          <div className="grid grid-cols-1 gap-3 pc:grid-cols-[1fr_180px]">
            <label className="block">
              <span className="text-xs font-medium text-ink-subtle">
                {t('engine.label.name', '엔진명')} <b className="text-danger-ink">*</b>
              </span>
              <input
                defaultValue={editing === 'new' ? '' : editing.name}
                placeholder={t('engine.namePlaceholder', '예: NULL 값 검증 엔진')}
                className="mt-1 h-10 w-full rounded-lg border border-hairline bg-canvas/60 px-3 text-[13px] outline-none focus:border-primary/60"
              />
            </label>
            <div>
              <span className="text-xs font-medium text-ink-subtle">{t('engine.label.status', '상태')}</span>
              <div className="mt-2">
                <ChipSelect
                  options={STATUS_KEYS.map((k) => t(`engine.status.${k}`))}
                  value={t(`engine.status.${engineStatus}`)}
                  onChange={(v) => {
                    const k = STATUS_KEYS.find((x) => t(`engine.status.${x}`) === v)
                    if (k) setEngineStatus(k)
                  }}
                />
              </div>
            </div>
          </div>
          <label className="mt-3 block">
            <span className="text-xs font-medium text-ink-subtle">{t('engine.label.desc', '설명')}</span>
            <input
              defaultValue={editing === 'new' ? '' : editing.desc}
              placeholder={t('engine.descPlaceholder', '엔진 설명')}
              className="mt-1 h-10 w-full rounded-lg border border-hairline bg-canvas/60 px-3 text-[13px] outline-none focus:border-primary/60"
            />
          </label>
          <div className="mt-3 grid grid-cols-1 gap-3 pc:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium text-ink-subtle">
                {t('engine.label.targetTable', '대상 테이블')}
              </span>
              <input
                defaultValue={editing === 'new' ? 'spec_fields' : editing.targetTable}
                className="mt-1 h-10 w-full rounded-lg border border-hairline bg-canvas/60 px-3 font-mono text-xs outline-none focus:border-primary/60"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-ink-subtle">
                {t('engine.label.targetFields', '대상 필드')} <b className="text-danger-ink">*</b>
              </span>
              <input
                defaultValue={editing === 'new' ? '' : editing.targetFields}
                placeholder={t('engine.fieldsPlaceholder', 'item_code, item_name (쉼표 구분)')}
                className="mt-1 h-10 w-full rounded-lg border border-hairline bg-canvas/60 px-3 font-mono text-xs outline-none focus:border-primary/60"
              />
            </label>
          </div>
          <label className="mt-3 block">
            <span className="flex items-center justify-between text-xs font-medium text-ink-subtle">
              <span>
                {t('engine.label.pyFunction', 'Python 검증 함수')} <b className="text-danger-ink">*</b>
              </span>
              <span className="rounded-full border border-hairline px-2 py-0.5 text-[10px]">
                {t('engine.pySyntaxBadge', 'Python 3.x 문법')}
              </span>
            </span>
            <textarea
              defaultValue={editing === 'new' ? ENGINE_TEMPLATE : editing.code}
              rows={12}
              spellCheck={false}
              className="mt-1 w-full rounded-lg border border-hairline bg-sidebar px-3 py-2.5 font-mono text-xs leading-relaxed text-sidebar-ink outline-none focus:border-primary/60"
            />
          </label>
          <p className="mt-2 rounded-lg border border-review-ink/30 bg-review-bg px-3 py-2 text-xs text-review-ink">
            {t(
              'engine.functionRuleHint',
              '⚠ 함수는 반드시 def validate_*(records) 형태이고 list를 반환해야 합니다.',
            )}
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="h-9 rounded-lg border border-hairline bg-chip px-4 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
            >
              {t('common.cancel', '취소')}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(null)
                toast(
                  editing === 'new'
                    ? t('engine.toast.registered', '엔진을 등록했습니다 — 스케줄을 추가해 자동 실행하세요')
                    : t('engine.toast.editSaved', '엔진 수정을 저장했습니다'),
                )
              }}
              className="h-9 rounded-lg bg-gradient-to-r from-primary to-accent2 px-4 text-[13px] font-semibold text-white shadow-[0_2px_10px_var(--color-glow)] transition-opacity hover:opacity-90"
            >
              {editing === 'new' ? t('engine.submitNew', '엔진 등록') : t('engine.submitEdit', '수정 저장')}
            </button>
          </div>
        </Modal>
      )}

      {/* 스케줄 추가 */}
      {scheduling && (
        <Modal title={t('engine.modal.addSchedule', '스케줄 추가')} onClose={() => setScheduling(false)}>
          <div>
            <span className="text-xs font-medium text-ink-subtle">
              {t('engine.label.engine', '검증 엔진')} <b className="text-danger-ink">*</b>
            </span>
            <div className="mt-1.5">
              <ChipSelect options={engines.map((e) => e.name)} value={schedEngine} onChange={setSchedEngine} />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xs font-medium text-ink-subtle">
              {t('engine.label.freq', '실행 주기')} <b className="text-danger-ink">*</b>
            </span>
            <div className="mt-1.5">
              <ChipSelect
                options={FREQ_KEYS.map((k) => t(`engine.freq.${k}`))}
                value={t(`engine.freq.${schedFreq}`)}
                onChange={(v) => {
                  const k = FREQ_KEYS.find((x) => t(`engine.freq.${x}`) === v)
                  if (k) setSchedFreq(k)
                }}
              />
            </div>
          </div>
          <label className="mt-3 block">
            <span className="text-xs font-medium text-ink-subtle">
              {t('engine.label.time', '실행 시각')} <b className="text-danger-ink">*</b>
            </span>
            <input
              type="time"
              defaultValue="02:00"
              className="mt-1 h-10 w-full rounded-lg border border-hairline bg-canvas/60 px-3 text-[13px] tabular-nums outline-none focus:border-primary/60"
            />
          </label>
          <div className="mt-4 flex items-center justify-between rounded-xl bg-chip px-3.5 py-3">
            <span className="text-[13px]">
              <b className="text-ink">{t('engine.schedToggleAria', '스케줄 활성화')}</b>
              <span className="block text-xs text-ink-subtle">
                {t('engine.scheduleOffHint', '비활성화 시 자동 실행이 중단됩니다')}
              </span>
            </span>
            <Switch checked={schedOn} onChange={setSchedOn} label={t('engine.schedToggleAria', '스케줄 활성화')} />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setScheduling(false)}
              className="h-9 rounded-lg border border-hairline bg-chip px-4 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
            >
              {t('common.cancel', '취소')}
            </button>
            <button
              type="button"
              onClick={() => {
                setScheduling(false)
                toast(
                  t(
                    'engine.toast.scheduleRegistered',
                    '스케줄을 등록했습니다 — 다음 실행 시각에 자동으로 검증합니다',
                  ),
                )
              }}
              className="h-9 rounded-lg bg-gradient-to-r from-primary to-accent2 px-4 text-[13px] font-semibold text-white shadow-[0_2px_10px_var(--color-glow)] transition-opacity hover:opacity-90"
            >
              {t('engine.submitSchedule', '스케줄 등록')}
            </button>
          </div>
        </Modal>
      )}

      {/* 삭제 확인 — 되돌릴 수 없는 것에만 묻는다 (규약 §2) */}
      {deleting && (
        <Modal title={t('engine.modal.delete', '엔진 삭제')} onClose={() => setDeleting(null)}>
          <p className="text-[13px] leading-relaxed text-ink-muted">
            {tf(
              'engine.deleteConfirm',
              { name: deleting.name, n: (engineSchedules[deleting.id] ?? []).length },
              '{name}을 삭제합니다. 연결된 스케줄 {n}개도 함께 삭제되고, 되돌릴 수 없습니다. 지난 검증 결과·리포트는 남습니다.',
            )}
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setDeleting(null)}
              className="h-9 rounded-lg border border-hairline bg-chip px-4 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
            >
              {t('common.cancel', '취소')}
            </button>
            <button
              type="button"
              onClick={() => {
                setEngines((list) => list.filter((x) => x.id !== deleting.id))
                setDeleting(null)
                toast(tf('engine.toast.deleted', { name: deleting.name }, '{name}을 삭제했습니다'))
              }}
              className="h-9 rounded-lg bg-danger-ink px-4 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
            >
              {t('common.delete', '삭제')}
            </button>
          </div>
        </Modal>
      )}
    </AppShell>
  )
}
