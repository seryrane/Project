import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { AppShell } from '#/components/portal/AppShell'
import { ChipSelect, Switch } from '#/components/portal/Chips'
import { CtaButton, simulate } from '#/components/portal/Skeleton'
import { Drawer } from '#/components/portal/Drawer'
import { Modal } from '#/components/portal/Modal'
import { useToast } from '#/components/portal/toast'
import { NOTICE_CATEGORIES, notices } from '#/data/community'
import type { Notice } from '#/data/community'

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
  const [category, setCategory] = useState('전체')
  const [query, setQuery] = useState('')
  const [reading, setReading] = useState<Notice | null>(null)
  const [writing, setWriting] = useState(false)
  const [newCat, setNewCat] = useState<(typeof NOTICE_CATEGORIES)[number]>('시스템')
  const [newPinned, setNewPinned] = useState(false)

  const filtered = useMemo(
    () =>
      notices.filter(
        (n) =>
          (category === '전체' || n.category === category) &&
          (query === '' || n.title.toLowerCase().includes(query.toLowerCase())),
      ),
    [category, query],
  )
  const pinned = filtered.filter((n) => n.pinned)
  const rest = filtered.filter((n) => !n.pinned)

  return (
    <AppShell active="notice" title="공지사항">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">공지사항</h1>
          <p className="mt-1 text-[13px] text-ink-subtle">
            시스템·배포·정책 공지 — 최소 메뉴라 모든 역할에게 보입니다
          </p>
        </div>
        {/* 작성은 커뮤니티 생성 권한 — 보이는 것과 되는 것 분리 (지금 사용자는 Super Admin) */}
        <button
          type="button"
          onClick={() => setWriting(true)}
          className="h-9 rounded-lg bg-gradient-to-r from-primary to-accent2 px-4 text-[13px] font-semibold text-white shadow-[0_2px_10px_var(--color-glow)] transition-opacity hover:opacity-90"
        >
          + 공지 작성
        </button>
      </div>

      <div className="mt-5 flex flex-col gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="제목 검색..."
          className="h-10 rounded-lg border border-hairline bg-surface px-3 text-[13px] outline-none placeholder:text-ink-subtle focus:border-primary/60 pc:w-96"
        />
        <ChipSelect options={['전체', ...NOTICE_CATEGORIES]} value={category} onChange={setCategory} />
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
              <span className="flex items-center gap-2 text-[11px] font-semibold text-primary">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M16 3l5 5-6 2-4 4 1 5-4-4-5 4 4-5-4-4 5 1 4-4 2-6z" />
                </svg>
                고정 공지
              </span>
              <span className="mt-1.5 block truncate text-[14px] font-semibold text-ink">{n.title}</span>
              <span className="mt-1.5 flex items-center gap-2 text-xs text-ink-subtle">
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${CAT_CLS[n.category]}`}>
                  {n.category}
                </span>
                {n.author} · {n.date} · 조회 {n.views}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* 목록 — 표는 자기 상자 안에서만 흐른다 */}
      <section className="anim-fade-up card-spotlight mt-5 rounded-2xl border border-hairline bg-surface [animation-delay:120ms]">
        <div className="flex items-center justify-between border-b border-hairline bg-canvas/50 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-ink">전체 공지 ({filtered.length}건)</h2>
        </div>
        <ol>
          {rest.map((n) => (
            <li key={n.id} className="border-b border-hairline/60 last:border-0">
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
                    <span className="ml-1.5 rounded bg-danger-bg px-1 py-0.5 text-[9px] font-bold text-danger-ink">
                      NEW
                    </span>
                  )}
                </span>
                <span className="hidden shrink-0 text-xs text-ink-subtle sm:block">{n.author}</span>
                <span className="shrink-0 font-mono text-[11px] tabular-nums text-ink-subtle">{n.date}</span>
                <span className="hidden w-14 shrink-0 text-right text-[11px] tabular-nums text-ink-subtle sm:block">
                  조회 {n.views}
                </span>
              </button>
            </li>
          ))}
          {rest.length === 0 && pinned.length === 0 && (
            <li className="px-5 py-10 text-center text-[13px] text-ink-subtle">
              조건에 맞는 공지가 없습니다 — 검색어나 카테고리를 바꿔 보세요.
            </li>
          )}
        </ol>
      </section>

      {/* 상세 — 읽고 닫는 것이라 우측 서랍 (본문 목록을 유지한 채) */}
      {reading && (
        <Drawer title={`공지 — ${reading.id}`} onClose={() => setReading(null)}>
          {(close) => (
            <div className="flex h-full flex-col">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${CAT_CLS[reading.category]}`}>
                    {reading.category}
                  </span>
                  {reading.pinned && <span className="text-[11px] font-semibold text-primary">고정 공지</span>}
                </div>
                <h3 className="mt-2 text-[15px] font-bold leading-snug text-ink">{reading.title}</h3>
                <p className="mt-1.5 text-xs text-ink-subtle">
                  {reading.author} · {reading.date} · 조회 {reading.views}
                </p>
                <div className="mt-4 space-y-3 border-t border-hairline pt-4">
                  {reading.body.map((p) => (
                    <p key={p} className="text-[13px] leading-relaxed text-ink-muted">
                      {p}
                    </p>
                  ))}
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2 border-t border-hairline pt-3.5">
                <button
                  type="button"
                  onClick={close}
                  className="h-9 rounded-lg border border-hairline bg-chip px-4 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
                >
                  닫기
                </button>
              </div>
            </div>
          )}
        </Drawer>
      )}

      {/* 작성 — 짧게 적고 닫는 일이라 모달 */}
      {writing && (
        <Modal title="공지 작성" onClose={() => setWriting(false)}>
          <label className="block">
            <span className="text-xs font-medium text-ink-subtle">제목 <b className="text-danger-ink">*</b></span>
            <input
              placeholder="공지 제목"
              className="mt-1 h-10 w-full rounded-lg border border-hairline bg-canvas/60 px-3 text-[13px] outline-none focus:border-primary/60"
            />
          </label>
          <div className="mt-3">
            <span className="text-xs font-medium text-ink-subtle">카테고리</span>
            <div className="mt-1.5">
              <ChipSelect options={NOTICE_CATEGORIES} value={newCat} onChange={setNewCat} />
            </div>
          </div>
          <label className="mt-3 block">
            <span className="text-xs font-medium text-ink-subtle">본문 <b className="text-danger-ink">*</b></span>
            <textarea
              rows={5}
              placeholder="공지 내용을 입력하세요"
              className="mt-1 w-full rounded-lg border border-hairline bg-canvas/60 px-3 py-2.5 text-[13px] outline-none focus:border-primary/60"
            />
          </label>
          <div className="mt-3 flex items-center justify-between rounded-xl bg-chip px-3.5 py-2.5">
            <span className="text-[13px]">
              <b className="font-medium text-ink">상단 고정</b>
              <span className="block text-[11px] text-ink-subtle">목록 위 고정 카드로 노출됩니다</span>
            </span>
            <Switch checked={newPinned} onChange={setNewPinned} label="상단 고정" />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setWriting(false)}
              className="h-9 rounded-lg border border-hairline bg-chip px-4 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
            >
              취소
            </button>
            {/* 누른 그 버튼이 변한다 + 두 번 안 눌린다 (규약 §3) */}
            <CtaButton
              busyLabel="등록 중…"
              onAction={async () => {
                await simulate()
                setWriting(false)
                toast('공지를 등록했습니다 — 전체 알림으로도 발송됩니다')
              }}
            >
              등록
            </CtaButton>
          </div>
        </Modal>
      )}
    </AppShell>
  )
}
