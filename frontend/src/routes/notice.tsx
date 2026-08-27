import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { AppShell } from '#/components/portal/AppShell'
import { ChipSelect, Switch } from '#/components/portal/Chips'
import { CtaButton, simulate } from '#/components/portal/Skeleton'
import { Drawer } from '#/components/portal/Drawer'
import { ListFoot } from '#/components/portal/ListFoot'
import { Modal } from '#/components/portal/Modal'
import { useToast } from '#/components/portal/toast'
import { NOTICE_CATEGORIES, notices } from '#/data/community'
import type { Notice } from '#/data/community'
import { apiSend, useApi } from '#/lib/api'
import { useI18n } from '#/lib/i18n'

export const Route = createFileRoute('/notice')({ component: NoticePage })

const CAT_CLS: Record<string, string> = {
  시스템: 'bg-pending-bg text-pending-ink',
  배포: 'bg-deployed-bg text-deployed-ink',
  정책: 'bg-draft-bg text-draft-ink',
  교육: 'bg-chip text-ink-muted',
}

/** 3일 안에 올라온 글 — 목록에서 NEW 로 말한다 (mock 이라 날짜 문자열 비교) */
const isNew = (date: string) => date >= '2026.08.03'

function NoticePage() {
  const toast = useToast()
  const { t, tf } = useI18n()
  const [category, setCategory] = useState('전체')
  const [query, setQuery] = useState('')
  const [reading, setReading] = useState<Notice | null>(null)
  const [writing, setWriting] = useState(false)
  const [newCat, setNewCat] = useState<(typeof NOTICE_CATEGORIES)[number]>('시스템')
  const [newPinned, setNewPinned] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newBody, setNewBody] = useState('')

  // 정본은 서버 — 서버가 없으면 mock 으로 돌아간다 (관문 lib/api.ts)
  const { data: noticeList, reload } = useApi<Array<Notice>>('/notices', notices)

  const filtered = useMemo(
    () =>
      noticeList.filter(
        (n) =>
          (category === '전체' || n.category === category) &&
          (query === '' || n.title.toLowerCase().includes(query.toLowerCase())),
      ),
    [noticeList, category, query],
  )
  const pinned = filtered.filter((n) => n.pinned)
  const rest = filtered.filter((n) => !n.pinned)

  return (
    <AppShell active="notice" title={t('nav.notice', '공지사항')}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('nav.notice', '공지사항')}</h1>
          <p className="mt-1 text-[13px] text-ink-subtle">
            {t('page.notice.subtitle', '시스템·배포·정책 공지 — 최소 메뉴라 모든 역할에게 보입니다')}
          </p>
        </div>
        {/* 작성은 커뮤니티 생성 권한 — 보이는 것과 되는 것 분리 (지금 사용자는 Super Admin) */}
        <button
          type="button"
          onClick={() => setWriting(true)}
          className="h-9 rounded-lg bg-gradient-to-r from-primary to-accent2 px-4 text-[13px] font-semibold text-white shadow-[0_2px_10px_var(--color-glow)] transition-opacity hover:opacity-90"
        >
          + {t('notice.write', '공지 작성')}
        </button>
      </div>

      <div className="mt-5 flex flex-col gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('notice.searchPh', '제목 검색...')}
          className="h-10 rounded-lg border border-control bg-surface px-3 text-[13px] outline-none placeholder:text-ink-subtle focus:border-primary/60 pc:w-96"
        />
        {/* '전체'만 UI 어휘라 번역 — 카테고리 이름은 데이터 값이라 그대로 (규약 §4-4) */}
        <ChipSelect
          options={[t('common.all'), ...NOTICE_CATEGORIES]}
          value={category === '전체' ? t('common.all') : category}
          onChange={(v) => setCategory(v === t('common.all') ? '전체' : v)}
        />
      </div>

      {/* 고정 공지 — 목록 위에 면으로 선다 */}
      {pinned.length > 0 && (
        <div className="mt-5 grid grid-cols-1 gap-3 pc:grid-cols-2">
          {pinned.map((n, i) => (
            <button
              key={n.id}
              type="button"
              onClick={() => setReading(n)}
              style={{ animationDelay: `${i * 60}ms` }}
              className="card-spotlight card-hover anim-fade-up rounded-2xl border border-primary/30 bg-surface p-4 text-left"
            >
              <span className="flex items-center gap-2 text-xs font-semibold text-primary">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M16 3l5 5-6 2-4 4 1 5-4-4-5 4 4-5-4-4 5 1 4-4 2-6z" />
                </svg>
                {t('notice.pinned', '고정 공지')}
              </span>
              <span className="mt-1.5 block truncate text-[14px] font-semibold text-ink">{n.title}</span>
              <span className="mt-1.5 flex items-center gap-2 text-xs text-ink-subtle">
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${CAT_CLS[n.category]}`}>
                  {n.category}
                </span>
                {n.author} · {n.date} · {tf('notice.views', { n: n.views })}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* 목록 — 표는 자기 상자 안에서만 흐른다 */}
      <section className="anim-fade-up card-spotlight mt-5 rounded-2xl border border-hairline bg-surface [animation-delay:120ms]">
        <div className="flex items-center justify-between surface-head px-5 py-3.5">
          <h2 className="text-sm font-semibold text-ink">{tf('notice.sectionTitle', { n: filtered.length })}</h2>
        </div>
        <ol>
          {rest.map((n) => (
            <li key={n.id} className="border-b border-divider last:border-0">
              <button
                type="button"
                onClick={() => setReading(n)}
                className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-chip"
              >
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${CAT_CLS[n.category]}`}>
                  {n.category}
                </span>
                <span className="min-w-0 flex-1 truncate text-[13px] text-ink">
                  {n.title}
                  {isNew(n.date) && (
                    <span className="ml-1.5 rounded bg-danger-bg px-1 py-0.5 text-[10px] font-bold text-danger-ink">
                      NEW
                    </span>
                  )}
                </span>
                <span className="hidden shrink-0 text-xs text-ink-subtle sm:block">{n.author}</span>
                <span className="shrink-0 font-mono text-xs tabular-nums text-ink-subtle">{n.date}</span>
                <span className="hidden w-14 shrink-0 text-right text-xs tabular-nums text-ink-subtle sm:block">
                  {tf('notice.views', { n: n.views })}
                </span>
              </button>
            </li>
          ))}
          {rest.length === 0 && pinned.length === 0 && (
            <li className="px-5 py-10 text-center text-[13px] text-ink-subtle">
              {t('notice.empty', '조건에 맞는 공지가 없습니다 — 검색어나 카테고리를 바꿔 보세요.')}
            </li>
          )}
        </ol>
        {/* ⚠ 고정/나머지로 나뉘어 그려지지만 **셈은 하나다** — 화면 사정으로 목록을 갈랐다고
            발이 둘이 되면 "6건 중 2건 · 6건 중 3건"처럼 읽는 사람이 더해야 한다 (규약 §9) */}
        {filtered.length > 0 && (
          <ListFoot className="px-5 pb-4" total={noticeList.length} shown={filtered.length} />
        )}
      </section>

      {/* 상세 — 읽고 닫는 것이라 우측 서랍 (본문 목록을 유지한 채) */}
      {reading && (
        <Drawer
          title={tf('notice.drawerTitle', { id: reading.id })}
          onClose={() => setReading(null)}
          /* 발은 관문 슬롯으로 (규약 §7). 예전에는 몸 안에서 `flex h-full flex-col` 로
             바닥에 붙이려 했는데, 그러면 **본문이 길 때 같이 밀려 올라간다** — 붙박이가
             아니라 "내용이 짧을 때만 바닥에 있는 것"이었다 */
          footer={(close) => (
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={close}
                className="h-9 rounded-lg border border-control bg-chip px-4 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
              >
                {t('common.close')}
              </button>
            </div>
          )}
        >
          {() => (
            <div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${CAT_CLS[reading.category]}`}>
                    {reading.category}
                  </span>
                  {reading.pinned && (
                    <span className="text-xs font-semibold text-primary">{t('notice.pinned', '고정 공지')}</span>
                  )}
                </div>
                <h3 className="mt-2 text-base font-bold leading-snug text-ink">{reading.title}</h3>
                <p className="mt-1.5 text-xs text-ink-subtle">
                  {reading.author} · {reading.date} · {tf('notice.views', { n: reading.views })}
                </p>
                <div className="mt-4 space-y-3 border-t border-hairline pt-4">
                  {reading.body.map((p) => (
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

      {/* 작성 — 짧게 적고 닫는 일이라 모달 */}
      {writing && (
        <Modal
          title={t('notice.write', '공지 작성')}
          onClose={() => setWriting(false)}
          /* 발은 **몸 밖**에 붙박이로 둔다 (규약 §7). 예전에는 이 줄이 내용 맨 끝에
             있어서, 본문을 길게 쓰면 [등록]이 스크롤에 밀려 화면 밖으로 나갔다 —
             다 채워 놓고 저장 버튼을 찾으러 다시 내려가야 했다.
             주 동작은 오른쪽 끝(엄지 자리), 취소는 그 왼쪽 */
          footer={
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setWriting(false)}
                className="h-9 rounded-lg border border-control bg-chip px-4 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
              >
                {t('common.cancel')}
              </button>
              {/* 누른 그 버튼이 변한다 + 두 번 안 눌린다 (규약 §3) */}
              <CtaButton
                disabled={newTitle.trim() === ''}
                busyLabel={t('notice.submitting', '등록 중…')}
                onAction={async () => {
                  const ok = await apiSend('POST', '/notices', {
                    title: newTitle,
                    category: newCat,
                    body: newBody,
                    pinned: newPinned,
                  })
                  if (!ok) await simulate() // 서버 없는 시연 모드 — 버튼 로딩 감각만 유지
                  setWriting(false)
                  setNewTitle('')
                  setNewBody('')
                  reload()
                  toast(t('notice.toast.posted', '공지를 등록했습니다 — 전체 알림으로도 발송됩니다'))
                }}
              >
                {t('notice.submit', '등록')}
              </CtaButton>
            </div>
          }
        >
          <label className="block">
            <span className="text-xs font-medium text-ink-subtle">
              {t('notice.label.title', '제목')} <b className="text-danger-ink">*</b>
            </span>
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder={t('notice.titlePh', '공지 제목')}
              className="mt-1 h-10 w-full rounded-lg border border-control bg-canvas/60 px-3 text-[13px] outline-none focus:border-primary/60"
            />
          </label>
          <div className="mt-3">
            <span className="text-xs font-medium text-ink-subtle">{t('notice.label.category', '카테고리')}</span>
            <div className="mt-1.5">
              <ChipSelect options={NOTICE_CATEGORIES} value={newCat} onChange={setNewCat} />
            </div>
          </div>
          <label className="mt-3 block">
            <span className="text-xs font-medium text-ink-subtle">
              {t('notice.label.body', '본문')} <b className="text-danger-ink">*</b>
            </span>
            <textarea
              rows={5}
              value={newBody}
              onChange={(e) => setNewBody(e.target.value)}
              placeholder={t('notice.bodyPh', '공지 내용을 입력하세요')}
              className="min-h-28 mt-1 w-full rounded-lg border border-control bg-canvas/60 px-3 py-2.5 text-[13px] outline-none focus:border-primary/60"
            />
          </label>
          <div className="mt-3 flex items-center justify-between rounded-xl bg-chip px-3.5 py-2.5">
            <span className="text-[13px]">
              <b className="font-medium text-ink">{t('notice.label.pinToTop', '상단 고정')}</b>
              <span className="block text-xs text-ink-subtle">
                {t('notice.pinToTopDesc', '목록 위 고정 카드로 노출됩니다')}
              </span>
            </span>
            <Switch checked={newPinned} onChange={setNewPinned} label={t('notice.label.pinToTop', '상단 고정')} />
          </div>
        </Modal>
      )}
    </AppShell>
  )
}
