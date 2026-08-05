import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { AppShell } from '#/components/portal/AppShell'
import { Avatar } from '#/components/portal/Avatar'
import { ChipSelect } from '#/components/portal/Chips'
import { Drawer } from '#/components/portal/Drawer'
import { Modal } from '#/components/portal/Modal'
import { useToast } from '#/components/portal/toast'
import { QNA_CATEGORIES, questions } from '#/data/community'
import type { Question } from '#/data/community'

export const Route = createFileRoute('/qna')({ component: QnaPage })

const FILTERS = ['전체', '답변 대기', '답변 완료'] as const

function QnaPage() {
  const toast = useToast()
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('전체')
  const [query, setQuery] = useState('')
  const [reading, setReading] = useState<Question | null>(null)
  const [writing, setWriting] = useState(false)
  const [newCat, setNewCat] = useState<(typeof QNA_CATEGORIES)[number]>('사양서')
  const [answerDraft, setAnswerDraft] = useState('')

  const filtered = useMemo(
    () =>
      questions.filter((q) => {
        const st = q.answers.length > 0 ? '답변 완료' : '답변 대기'
        return (
          (filter === '전체' || st === filter) &&
          (query === '' || q.title.toLowerCase().includes(query.toLowerCase()))
        )
      }),
    [filter, query],
  )
  const waiting = questions.filter((q) => q.answers.length === 0).length

  return (
    <AppShell active="qna" title="Q&A">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Q&A</h1>
          <p className="mt-1 text-[13px] text-ink-subtle">
            묻고 답하기 — 답변 대기 <b className="tabular-nums text-pending-ink">{waiting}건</b>
          </p>
        </div>
        <button
          type="button"
          onClick={() => setWriting(true)}
          className="h-9 rounded-lg bg-gradient-to-r from-primary to-accent2 px-4 text-[13px] font-semibold text-white shadow-[0_2px_10px_var(--color-glow)] transition-opacity hover:opacity-90"
        >
          + 질문하기
        </button>
      </div>

      <div className="mt-5 flex flex-col gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="질문 검색..."
          className="h-10 rounded-lg border border-hairline bg-surface px-3 text-[13px] outline-none placeholder:text-ink-subtle focus:border-primary/60 pc:w-96"
        />
        <ChipSelect options={FILTERS} value={filter} onChange={setFilter} />
      </div>

      <section className="anim-fade-up card-spotlight mt-5 rounded-2xl border border-hairline bg-surface">
        <div className="border-b border-hairline bg-canvas/50 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-ink">질문 목록 ({filtered.length}건)</h2>
        </div>
        <ol>
          {filtered.map((q) => {
            const answered = q.answers.length > 0
            return (
              <li key={q.id} className="border-b border-hairline/60 last:border-0">
                <button
                  type="button"
                  onClick={() => setReading(q)}
                  className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-chip"
                >
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      answered ? 'bg-deployed-bg text-deployed-ink' : 'bg-pending-bg text-pending-ink'
                    }`}
                  >
                    {answered ? '답변 완료' : '답변 대기'}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{q.title}</span>
                  <span className="hidden shrink-0 rounded-full border border-hairline px-1.5 py-0.5 text-[10px] text-ink-subtle sm:block">
                    {q.category}
                  </span>
                  <span className="hidden shrink-0 text-xs text-ink-subtle sm:block">{q.author}</span>
                  <span className="shrink-0 font-mono text-[11px] tabular-nums text-ink-subtle">{q.date}</span>
                  {answered && (
                    <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-primary">
                      답변 {q.answers.length}
                    </span>
                  )}
                </button>
              </li>
            )
          })}
          {filtered.length === 0 && (
            <li className="px-5 py-10 text-center text-[13px] text-ink-subtle">
              조건에 맞는 질문이 없습니다.
            </li>
          )}
        </ol>
      </section>

      {/* 상세 — 질문 + 답변 스레드. 답변 입력은 커뮤니티 생성 권한(운영진) */}
      {reading && (
        <Drawer title={`질문 — ${reading.id}`} onClose={() => setReading(null)}>
          {(close) => (
            <div className="flex h-full flex-col">
              <div className="flex-1 space-y-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        reading.answers.length > 0
                          ? 'bg-deployed-bg text-deployed-ink'
                          : 'bg-pending-bg text-pending-ink'
                      }`}
                    >
                      {reading.answers.length > 0 ? '답변 완료' : '답변 대기'}
                    </span>
                    <span className="rounded-full border border-hairline px-1.5 py-0.5 text-[10px] text-ink-subtle">
                      {reading.category}
                    </span>
                  </div>
                  <h3 className="mt-2 text-[15px] font-bold leading-snug text-ink">{reading.title}</h3>
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-ink-subtle">
                    <Avatar name={reading.author} size={18} />
                    {reading.author} · {reading.date}
                  </p>
                  <p className="mt-3 rounded-xl border border-hairline bg-canvas/40 px-3.5 py-3 text-[13px] leading-relaxed text-ink-muted">
                    {reading.body}
                  </p>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-ink">
                    답변 <span className="tabular-nums text-ink-subtle">{reading.answers.length}</span>
                  </h4>
                  {reading.answers.length === 0 ? (
                    <p className="mt-2 text-xs text-ink-subtle">
                      아직 답변이 없습니다 — 운영진에게 알림이 가 있습니다.
                    </p>
                  ) : (
                    <ol className="mt-2 space-y-2.5">
                      {reading.answers.map((a) => (
                        <li key={`${a.author}.${a.date}`} className="rounded-xl border border-hairline p-3.5">
                          <div className="flex items-center gap-1.5 text-xs">
                            <Avatar name={a.author} size={18} />
                            <b className="font-medium text-ink">{a.author}</b>
                            <span className="rounded bg-primary/10 px-1 py-0.5 text-[9px] font-medium text-primary">
                              {a.role}
                            </span>
                            <span className="ml-auto text-[11px] text-ink-subtle">{a.date}</span>
                          </div>
                          <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">{a.body}</p>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </div>

              {/* 답변 달기 — 등록으로 끝난다 (카드는 다음 행동으로 끝난다) */}
              <div className="mt-4 border-t border-hairline pt-3.5">
                <textarea
                  rows={2}
                  value={answerDraft}
                  onChange={(e) => setAnswerDraft(e.target.value)}
                  placeholder="답변을 입력하세요 (운영진)"
                  className="w-full rounded-lg border border-hairline bg-canvas/60 px-3 py-2.5 text-[13px] outline-none focus:border-primary/60"
                />
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    disabled={answerDraft.trim() === ''}
                    onClick={() => {
                      setAnswerDraft('')
                      close()
                      toast('답변을 등록했습니다 — 질문자에게 알림이 갑니다')
                    }}
                    className="h-9 rounded-lg bg-gradient-to-r from-primary to-accent2 px-4 text-[13px] font-semibold text-white shadow-[0_2px_10px_var(--color-glow)] transition-opacity hover:opacity-90 disabled:opacity-40"
                  >
                    답변 등록
                  </button>
                </div>
              </div>
            </div>
          )}
        </Drawer>
      )}

      {/* 질문 작성 */}
      {writing && (
        <Modal title="질문하기" onClose={() => setWriting(false)}>
          <label className="block">
            <span className="text-xs font-medium text-ink-subtle">제목 <b className="text-danger-ink">*</b></span>
            <input
              placeholder="무엇이 궁금한가요?"
              className="mt-1 h-10 w-full rounded-lg border border-hairline bg-canvas/60 px-3 text-[13px] outline-none focus:border-primary/60"
            />
          </label>
          <div className="mt-3">
            <span className="text-xs font-medium text-ink-subtle">카테고리</span>
            <div className="mt-1.5">
              <ChipSelect options={QNA_CATEGORIES} value={newCat} onChange={setNewCat} />
            </div>
          </div>
          <label className="mt-3 block">
            <span className="text-xs font-medium text-ink-subtle">내용 <b className="text-danger-ink">*</b></span>
            <textarea
              rows={4}
              placeholder="상황을 구체적으로 적을수록 답이 빨라집니다 — 화면·시각·메시지"
              className="mt-1 w-full rounded-lg border border-hairline bg-canvas/60 px-3 py-2.5 text-[13px] outline-none focus:border-primary/60"
            />
          </label>
          <p className="mt-3 rounded-xl border border-hairline bg-canvas/50 px-3.5 py-2.5 text-[11px] leading-relaxed text-ink-subtle">
            비슷한 질문이 FAQ 에 있을 수 있습니다 — 등록 전에 FAQ 를 한 번 확인해 보세요.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setWriting(false)}
              className="h-9 rounded-lg border border-hairline bg-chip px-4 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
            >
              취소
            </button>
            <button
              type="button"
              onClick={() => {
                setWriting(false)
                toast('질문을 등록했습니다 — 답변이 달리면 알림으로 알려 드립니다')
              }}
              className="h-9 rounded-lg bg-gradient-to-r from-primary to-accent2 px-4 text-[13px] font-semibold text-white shadow-[0_2px_10px_var(--color-glow)] transition-opacity hover:opacity-90"
            >
              등록
            </button>
          </div>
        </Modal>
      )}
    </AppShell>
  )
}
