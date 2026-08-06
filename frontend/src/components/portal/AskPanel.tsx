import { useEffect, useRef, useState } from 'react'

import { apiGet, apiPost } from '#/lib/api'
import { useI18n } from '#/lib/i18n'

import { CtaButton, Skeleton } from './Skeleton'

/**
 * 대화형 챗봇 패널 — 우측 Drawer 한 벌(GNB 💬 · 커맨드 팔레트 · Esc 와 같은 층).
 * 정본: docs/챗봇_표준질의_설계.md — 자리(§1)·답의 칸 순서(§4)·"0을 평온함으로
 * 읽지 않기"(§4)가 거기 있다. 질의를 늘리거나 답의 칸을 바꿀 때는 코드보다 그 문서를
 * 먼저 고친다.
 *
 * ⚠ 답의 숫자는 서버가 센다(정본 0절) — 화면은 받은 칸을 정해진 순서로 채울 뿐,
 *   자유 문장을 지어 붙이거나 다시 계산하지 않는다.
 * ⚠ 표준 질의 밖 자유 입력도 받지만, 답 못 하는 질문에 이상한 답을 받은 사람은
 *   그 뒤로 안 쓴다(정본 0절) — 그래서 열자마자 "물어도 되는 것"부터 보여 준다.
 */

interface AskCatalogCategory {
  key: string
  label: string
  questions: Array<string>
}

interface AskCatalog {
  categories: Array<AskCatalogCategory>
}

interface AskPoint {
  label: string
  value: number
}

interface AskItem {
  title: string
  context?: string
  hint?: string
}

interface AskResponse {
  understood: string
  notes: Array<string>
  unit: string
  total: number
  points: Array<AskPoint>
  items: Array<AskItem>
  headline: string
  evidence: Array<string>
  anomalies: Array<string>
  nextStep: string
  nextMenuKey: string | null
  followUps: Array<string>
}

type TurnStatus = 'loading' | 'ok' | 'error'

interface AskTurn {
  id: number
  question: string
  status: TurnStatus
  response?: AskResponse
  errorDetail?: string
}

type CatalogStatus = 'loading' | 'ok' | 'error'

/** 한 답의 칸 — 순서는 정본 §4 고정: 무엇으로 알아들었나(+총계) → 못 알아들은 것
 *  → 숫자(막대/목록) → 결론 → 근거 → 특이사항 → 다음에(+버튼) → 이어 물을 것 */
function AskAnswerCard({
  response,
  onOpenMenu,
  onFollowUp,
}: {
  response: AskResponse
  onOpenMenu: (key: string) => void
  onFollowUp: (question: string) => void
}) {
  const { t, tf } = useI18n()
  const {
    understood,
    notes,
    unit,
    total,
    points,
    items,
    headline,
    evidence,
    anomalies,
    nextStep,
    nextMenuKey,
    followUps,
  } = response
  // 막대는 새로 만들지 않고 폭 비율로만 — 최댓값이 0 이면 나눗셈이 깨지니 최소 1
  const max = points.length > 0 ? Math.max(...points.map((p) => p.value), 1) : 1

  return (
    <div className="space-y-3 rounded-xl border border-hairline bg-surface p-3.5">
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-subtle">
          {t('ask.understood')}
        </div>
        <div className="mt-0.5 text-[13px] text-ink">{understood}</div>
        {/* 0 을 평온함으로 읽지 않는다 — 값이 없어도 총계는 그대로 보여 준다(정본 §4) */}
        <div className="mt-1 text-[12px] font-semibold text-primary">
          {tf('ask.totalLine', { total: total.toLocaleString(), unit })}
        </div>
      </div>

      {notes.length > 0 && (
        <ul className="space-y-1 rounded-lg bg-pending-bg px-3 py-2 text-[11px] text-pending-ink">
          {notes.map((note) => (
            <li key={note}>※ {note}</li>
          ))}
        </ul>
      )}

      {points.length > 0 && (
        <div className="space-y-1.5">
          {points.map((p) => (
            <div key={p.label} className="flex items-center gap-2 text-[12px]">
              <span className="w-20 min-w-0 shrink-0 truncate text-ink-subtle" title={p.label}>
                {p.label}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-chip">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-accent2"
                  style={{ width: `${(Math.max(0, p.value) / max) * 100}%` }}
                />
              </div>
              <span className="w-16 shrink-0 text-right tabular-nums text-ink-muted">
                {p.value.toLocaleString()}
                {unit}
              </span>
            </div>
          ))}
        </div>
      )}

      {points.length === 0 && items.length > 0 && (
        <div className="space-y-1.5">
          {items.map((it, i) => (
            <div key={`${it.title}-${i}`} className="rounded-lg border border-hairline/70 px-3 py-2">
              <div className="min-w-0 truncate text-[13px] font-medium text-ink">{it.title}</div>
              {it.context && <div className="mt-0.5 text-[11px] text-ink-subtle">{it.context}</div>}
              {it.hint && <div className="mt-0.5 text-[11px] text-ink-muted">{it.hint}</div>}
            </div>
          ))}
        </div>
      )}

      {headline && <p className="text-[13px] font-semibold text-ink">{headline}</p>}

      {evidence.length > 0 && (
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-subtle">
            {t('ask.evidence')}
          </div>
          <ul className="mt-1 space-y-0.5 text-[12px] text-ink-muted">
            {evidence.map((e) => (
              <li key={e}>· {e}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 특이사항은 있을 때만 — 없다고 길게 적으면 다음부터 아무도 안 읽는다(정본 §4) */}
      {anomalies.length > 0 && (
        <div className="rounded-lg bg-danger-bg px-3 py-2">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-danger-ink">
            {t('ask.anomalies')}
          </div>
          <ul className="mt-1 space-y-0.5 text-[12px] text-danger-ink">
            {anomalies.map((a) => (
              <li key={a}>· {a}</li>
            ))}
          </ul>
        </div>
      )}

      {nextStep && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-hairline pt-2.5">
          <p className="min-w-0 flex-1 text-[12px] text-ink-muted">{nextStep}</p>
          {nextMenuKey && (
            <button
              type="button"
              onClick={() => onOpenMenu(nextMenuKey)}
              className="shrink-0 rounded-lg bg-gradient-to-r from-primary to-accent2 px-3 py-1.5 text-[12px] font-semibold text-white shadow-[0_2px_10px_var(--color-glow)] transition-opacity hover:opacity-90"
            >
              {t('ask.openScreen')}
            </button>
          )}
        </div>
      )}

      {/* 이어 물을 것 — 표준 질의 안에서 대화가 이어지게 칩으로(정본 §4) */}
      {followUps.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {followUps.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => onFollowUp(q)}
              className="min-w-0 max-w-full truncate rounded-full border border-hairline bg-canvas/40 px-2.5 py-1 text-[12px] text-ink-muted transition-colors hover:border-primary/40 hover:text-ink"
            >
              {q}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function AskTurnView({
  turn,
  onOpenMenu,
  onFollowUp,
}: {
  turn: AskTurn
  onOpenMenu: (key: string) => void
  onFollowUp: (question: string) => void
}) {
  const { t } = useI18n()
  return (
    <div className="space-y-2">
      {/* 물어본 말 — 오른쪽 말풍선. 대화 로그를 쌓아야 앞의 답과 견줘 뜻이 생긴다(정본 §1) */}
      <div className="flex justify-end">
        <div className="max-w-[85%] min-w-0 break-words rounded-2xl rounded-br-sm bg-primary/12 px-3 py-1.5 text-[13px] text-ink">
          {turn.question}
        </div>
      </div>

      {turn.status === 'loading' && (
        <div className="space-y-2 rounded-xl border border-hairline bg-surface p-3.5">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      )}

      {turn.status === 'error' && (
        <div className="rounded-xl border border-hairline bg-danger-bg px-3 py-2 text-[12px] text-danger-ink">
          {turn.errorDetail || t('ask.askError')}
        </div>
      )}

      {turn.status === 'ok' && turn.response && (
        <AskAnswerCard response={turn.response} onOpenMenu={onOpenMenu} onFollowUp={onFollowUp} />
      )}
    </div>
  )
}

export function AskPanel({ onOpenMenu }: { onOpenMenu: (key: string) => void }) {
  const { locale, t } = useI18n()
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [turns, setTurns] = useState<Array<AskTurn>>([])
  const [catalog, setCatalog] = useState<AskCatalog | null>(null)
  const [catalogStatus, setCatalogStatus] = useState<CatalogStatus>('loading')
  // 요청이 겹치는 것을 막는 잠금 — busy(state) 는 화면 그리기용이고, 이 ref 는
  // 함수가 불리는 그 순간 바로 읽을 수 있어(§3) Enter 로 버튼을 안 거치고 들어오는
  // 두 번째 호출도 막는다. state 만 믿으면 리렌더 전에 겹쳐 들어온다.
  const busyRef = useRef(false)
  const idRef = useRef(0)

  useEffect(() => {
    let cancelled = false
    setCatalogStatus('loading')
    void apiGet<AskCatalog>(`/ask/catalog?locale=${encodeURIComponent(locale)}`).then((c) => {
      if (cancelled) return
      if (c) {
        setCatalog(c)
        setCatalogStatus('ok')
      } else {
        // 못 불러온 것과 없는 것은 다르다(규약 §3) — 조용히 빈 화면으로 두지 않고
        // 그 사실을 적는다. 입력창은 그대로 열려 있어 자유 질문은 계속 받는다.
        setCatalogStatus('error')
      }
    })
    return () => {
      cancelled = true
    }
  }, [locale])

  const submitQuestion = async (raw: string) => {
    const question = raw.trim()
    if (!question || busyRef.current) return
    busyRef.current = true
    setBusy(true)
    const id = ++idRef.current
    setTurns((prev) => [...prev, { id, question, status: 'loading' }])
    setInput('')
    const res = await apiPost<AskResponse>('/ask', { question, locale })
    setTurns((prev) =>
      prev.map((turn) => {
        if (turn.id !== id) return turn
        if (res.ok && res.data) return { ...turn, status: 'ok' as const, response: res.data }
        return { ...turn, status: 'error' as const, errorDetail: res.detail }
      }),
    )
    busyRef.current = false
    setBusy(false)
  }

  return (
    <div className="space-y-4">
      <section>
        <h3 className="text-[11px] font-semibold text-ink-subtle">{t('ask.suggested')}</h3>
        {catalogStatus === 'loading' && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-7 w-24 rounded-full" />
            ))}
          </div>
        )}
        {catalogStatus === 'error' && <p className="mt-2 text-[12px] text-ink-subtle">{t('ask.catalogError')}</p>}
        {catalogStatus === 'ok' && catalog && catalog.categories.length === 0 && (
          <p className="mt-2 text-[12px] text-ink-subtle">{t('ask.catalogEmpty')}</p>
        )}
        {catalogStatus === 'ok' && catalog && catalog.categories.length > 0 && (
          <div className="mt-2 space-y-2.5">
            {catalog.categories.map((cat) => (
              <div key={cat.key}>
                <div className="text-[10px] text-ink-subtle">{cat.label}</div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {cat.questions.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => void submitQuestion(q)}
                      className="min-w-0 max-w-full truncate rounded-full border border-hairline bg-canvas/40 px-2.5 py-1 text-[12px] text-ink-muted transition-colors hover:border-primary/40 hover:text-ink"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {turns.length > 0 && (
        <section className="space-y-3 border-t border-hairline pt-3">
          {turns.map((turn) => (
            <AskTurnView
              key={turn.id}
              turn={turn}
              onOpenMenu={onOpenMenu}
              onFollowUp={(q) => void submitQuestion(q)}
            />
          ))}
        </section>
      )}

      <div className="flex items-center gap-2 border-t border-hairline pt-3">
        <input
          aria-label={t('ask.inputLabel')}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              void submitQuestion(input)
            }
          }}
          placeholder={t('ask.placeholder')}
          className="h-9 min-w-0 flex-1 rounded-lg border border-hairline bg-canvas/40 px-3 text-[13px] text-ink outline-none placeholder:text-ink-subtle focus:border-primary/40"
        />
        <CtaButton
          busyLabel={t('ask.sending')}
          disabled={busy || !input.trim()}
          onAction={() => submitQuestion(input)}
          className="h-9 shrink-0 px-4"
        >
          {t('ask.send')}
        </CtaButton>
      </div>
    </div>
  )
}
