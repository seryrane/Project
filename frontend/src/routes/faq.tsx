import { useMemo, useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'

import { AppShell } from '#/components/portal/AppShell'
import { Icon } from '#/components/portal/Icon'
import { ChipSelect } from '#/components/portal/Chips'
import { ListFoot } from '#/components/portal/ListFoot'
import { Modal } from '#/components/portal/Modal'
import { CtaButton } from '#/components/portal/Skeleton'
import { useToast } from '#/components/portal/toast'
import { FAQ_CATEGORIES, faqs } from '#/data/community'
import type { Faq } from '#/data/community'
import { apiSend, useApi } from '#/lib/api'
import { useI18n } from '#/lib/i18n'

export const Route = createFileRoute('/faq')({ component: FaqPage })

function FaqPage() {
  const toast = useToast()
  const { t } = useI18n()
  const [category, setCategory] = useState('전체')
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const [voted, setVoted] = useState<Record<string, boolean>>({})
  const [adding, setAdding] = useState(false)
  const [newCat, setNewCat] = useState<(typeof FAQ_CATEGORIES)[number]>('계정·권한')
  const [newQ, setNewQ] = useState('')
  const [newA, setNewA] = useState('')

  // 정본은 서버 — 서버가 없으면 mock 으로 돌아간다 (관문 lib/api.ts)
  const { data: faqList, reload } = useApi<Array<Faq>>('/faqs', faqs)

  const filtered = useMemo(
    () =>
      faqList.filter(
        (f) =>
          (category === '전체' || f.category === category) &&
          (query === '' ||
            f.q.toLowerCase().includes(query.toLowerCase()) ||
            f.a.toLowerCase().includes(query.toLowerCase())),
      ),
    [faqList, category, query],
  )

  return (
    // 커뮤니티 5개는 폭을 통일한다 (사용자 결정 2026-08-13 — guide.tsx 주석 참고)
    <AppShell active="faq" title="FAQ">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('nav.faq', 'FAQ')}</h1>
          <p className="mt-1 text-[13px] text-ink-subtle">
            {t('page.faq.subtitle', '자주 묻는 질문 — 여기 없는 질문은')}{' '}
            <Link to="/qna" className="font-medium text-primary hover:underline">
              {t('page.faq.goQna', 'Q&A 에 남겨 주세요 →')}
            </Link>
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="h-9 rounded-lg border border-control bg-chip px-4 text-[13px] font-medium text-ink-muted transition-colors hover:border-primary/40 hover:text-ink"
        >
          + {t('faq.add', 'FAQ 추가')}
        </button>
      </div>

      <div className="mt-5 flex flex-col gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('faq.searchPh', '질문·답변 검색...')}
          className="h-10 rounded-lg border border-hairline bg-surface px-3 text-[13px] outline-none placeholder:text-ink-subtle focus:border-primary/60 pc:w-96"
        />
        {/* '전체'만 UI 어휘라 번역 — 카테고리 이름은 데이터 값이라 그대로 (규약 §4-4) */}
        <ChipSelect
          options={[t('common.all'), ...FAQ_CATEGORIES]}
          value={category === '전체' ? t('common.all') : category}
          onChange={(v) => setCategory(v === t('common.all') ? '전체' : v)}
        />
      </div>

      {/* 아코디언 — 펼침은 reveal-grid, 답 끝은 도움됨 투표로 끝난다 */}
      <div className="mt-5 space-y-2.5">
        {filtered.map((f) => {
          const isOpen = open === f.id
          /* scroll-in — 로드 stagger 는 접힌 화면 밑 카드에서 이미 끝나 있었다. 스크롤로
             들어올 때 떠오른다(위쪽 카드는 즉시 보인다 — §23 강도 절약과도 맞다). */
          return (
            <section
              key={f.id}
              className={`card-spotlight scroll-in rounded-2xl border bg-surface transition-colors ${
                isOpen ? 'border-primary/40' : 'border-hairline hover:border-primary/30'
              }`}
            >
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : f.id)}
                className="flex w-full items-center gap-3 px-5 py-3.5 text-left"
              >
                <span className="shrink-0 rounded-full border border-hairline px-1.5 py-0.5 text-[10px] text-ink-subtle">
                  {f.category}
                </span>
                <span className="min-w-0 flex-1 text-[13px] font-medium text-ink">{f.q}</span>
                <span
                  aria-hidden
                  className={`shrink-0 text-ink-subtle transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                >
                  <Icon name="chevronDown" size="sm" />
                </span>
              </button>
              <div className={`reveal-grid ${isOpen ? 'open' : ''}`}>
                <div>
                  <div className="reveal-inner border-t border-hairline/60 px-5 py-4">
                    <p className="text-[13px] leading-relaxed text-ink-muted">{f.a}</p>
                    <div className="mt-3 flex items-center gap-2 text-xs text-ink-subtle">
                      {t('faq.helpfulQuestion', '도움이 되었나요?')}
                      <button
                        type="button"
                        disabled={voted[f.id]}
                        onClick={() => {
                          setVoted((v) => ({ ...v, [f.id]: true }))
                          void apiSend('POST', `/faqs/${f.id}/helpful`)
                          toast(t('faq.toast.helpful', '의견 감사합니다 — 도움됨으로 기록했습니다'))
                        }}
                        className={`rounded-full border px-2 py-0.5 font-medium transition-all active:scale-95 ${
                          voted[f.id]
                            ? 'border-primary/50 bg-primary/15 text-primary'
                            : 'border-hairline text-ink-muted hover:border-primary/30 hover:text-ink'
                        }`}
                      >
                        <span className="inline-flex items-center gap-1">
                          <Icon name="thumbsUp" />
                          {t('faq.helpful', '도움됨')} {f.helpful + (voted[f.id] ? 1 : 0)}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )
        })}
        {filtered.length === 0 && (
          <p className="rounded-2xl border border-hairline bg-surface px-5 py-10 text-center text-[13px] text-ink-subtle">
            {t('faq.empty', '검색 결과가 없습니다 —')}{' '}
            <Link to="/qna" className="font-medium text-primary hover:underline">
              {t('faq.emptyCta', 'Q&A 에 질문을 남겨 주세요')}
            </Link>
            .
          </p>
        )}
        {/* 접혀 있어도 목록은 목록이다 — 거르면 몇 건 중 몇 건인지 말한다 (규약 §9) */}
        {filtered.length > 0 && <ListFoot total={faqList.length} shown={filtered.length} />}
      </div>

      {/* FAQ 추가 — 운영진용. 짧게 적고 닫는 일이라 모달 */}
      {adding && (
        <Modal
          title={t('faq.add', 'FAQ 추가')}
          onClose={() => setAdding(false)}
          footer={
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAdding(false)}
                className="h-9 rounded-lg border border-control bg-chip px-4 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
              >
                {t('common.cancel')}
              </button>
              <CtaButton
                disabled={newQ.trim() === '' || newA.trim() === ''}
                busyLabel={t('faq.adding', '추가 중…')}
                onAction={async () => {
                  await apiSend('POST', '/faqs', { q: newQ, a: newA, category: newCat })
                  setAdding(false)
                  setNewQ('')
                  setNewA('')
                  reload()
                  toast(t('faq.toast.added', 'FAQ 를 추가했습니다'))
                }}
              >
                {t('common.add')}
              </CtaButton>
            </div>
          }
        >
          <div>
            <span className="text-xs font-medium text-ink-subtle">{t('faq.label.category', '카테고리')}</span>
            <div className="mt-1.5">
              <ChipSelect options={FAQ_CATEGORIES} value={newCat} onChange={setNewCat} />
            </div>
          </div>
          <label className="mt-3 block">
            <span className="text-xs font-medium text-ink-subtle">
              {t('faq.label.q', '질문')} <b className="text-danger-ink">*</b>
            </span>
            <input
              value={newQ}
              onChange={(e) => setNewQ(e.target.value)}
              placeholder={t('faq.qPh', '사용자 말로 적습니다 — 예: 로그인이 안 됩니다')}
              className="mt-1 h-10 w-full rounded-lg border border-hairline bg-canvas/60 px-3 text-[13px] outline-none focus:border-primary/60"
            />
          </label>
          <label className="mt-3 block">
            <span className="text-xs font-medium text-ink-subtle">
              {t('faq.label.a', '답변')} <b className="text-danger-ink">*</b>
            </span>
            <textarea
              rows={4}
              value={newA}
              onChange={(e) => setNewA(e.target.value)}
              placeholder={t('faq.aPh', '해결 순서대로 — 어디를 눌러 무엇을 하는지')}
              className="min-h-24 mt-1 w-full rounded-lg border border-hairline bg-canvas/60 px-3 py-2.5 text-[13px] outline-none focus:border-primary/60"
            />
          </label>
        </Modal>
      )}
    </AppShell>
  )
}
