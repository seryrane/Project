import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'

import type { IconName, NavSection } from '#/data/nav'
import { specs } from '#/data/specs'
import { useI18n } from '#/lib/i18n'

import { Icon } from './Icon'
import { m } from './motion'
import { coverProps, useCover } from './useCover'

interface Command {
  group: string
  label: string
  hint?: string
  to?: string
  /**
   * LNB 와 **같은 아이콘**. 글자만 스무 줄 늘어놓으면 눈이 한 줄씩 읽어야 한다 —
   * 아이콘이 있으면 이미 아는 메뉴는 모양으로 먼저 걸린다(2026-08-13 시각 정리).
   * 같은 화면이 사이드바와 검색에서 다른 모양이면 그 이점이 사라지므로 정본을 공유한다.
   */
  icon?: IconName
  /** 페이지 이동이 아니라 그 자리에서 뭔가 여는 명령 (예: 물어보기 패널) */
  action?: () => void
}

export function CommandPalette({
  nav,
  onClose,
  onAsk,
}: {
  /**
   * ⚠⚠ **권한으로 걸러진 메뉴를 받는다** (2026-08-13). 예전에는 이 파일이 정적
   * `data/nav` 를 직접 읽었다 — AppShell 의 LNB 는 서버(`/me/menu`)가 걸러 준 메뉴를
   * 그리는데 팔레트만 전체 목록을 알고 있었다. 그래서 **권한이 없어 LNB 에 안 보이는
   * 화면이 ⌘K 검색에는 그대로 떴다.** 눌러 봐야 막히는 것이 아니라, 있는지조차 몰라야
   * 할 화면의 **이름이 새어 나가는 것**이 문제다.
   * 정본은 하나여야 한다 — 셸이 받은 그 목록을 그대로 내려받는다.
   */
  nav: Array<NavSection>
  onClose: () => void
  onAsk: () => void
}) {
  const navigate = useNavigate()
  const { locale, t } = useI18n()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [closing, setClosing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  const close = useCallback(() => setClosing(true), [])
  // ⚠ 덮개 관문을 **지난다** — 예전에는 팔레트만 이 관문을 안 지나서 `role="dialog"` 도,
  //   포커스 가둠·복귀도, 뒤 화면 잠금도 없었다(2026-08-13 실측: role·aria-modal 둘 다 없음).
  //   Esc 도 여기서 온다 — 아래 onKey 에서 다시 잡지 않는다.
  const panelRef = useCover(close)

  // 관문이 몸통에 포커스를 준 **뒤**에 검색칸으로 옮긴다 — 팔레트는 열자마자 타는 물건이다.
  // (훅 호출이 먼저라 관문의 효과가 먼저 돈다. 순서를 바꾸면 포커스가 몸통에 남는다)
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // 페이지 명령은 LNB 와 **같은 목록**에서 파생한다 — 손으로 다시 적으면 새 화면이
  // 생길 때마다 팔레트만 모르는 화면이 남는다(실제로 두 개만 알고 있었다).
  // 라벨은 LNB 와 같은 규칙으로 언어를 입힌다 (EN: labelEn → 사전 → ko).
  const commands = useMemo<Array<Command>>(
    () => [
      // 챗봇도 ⌘K 로 닿는다 — GNB 💬 와 같은 자리를 여는 명령일 뿐, 화면 이동이 아니다
      { group: t('palette.actions'), label: t('ask.title'), hint: t('palette.open'), icon: 'chat', action: onAsk },
      ...nav.flatMap((section) =>
        section.items.flatMap((item) =>
          item.to == null
            ? []
            : [{
                group: section.title
                  ? t(`nav.section.${section.id}`, section.title)
                  : t('palette.pages'),
                label:
                  locale === 'en'
                    ? (item.labelEn ?? t(`nav.${item.key}`, item.label))
                    : item.label,
                hint: t('palette.go'),
                icon: item.icon,
                to: item.to,
              }],
        ),
      ),
      // TODO(본개발): 사양서도 서버에서 받는다 — 지금은 목데이터라 권한 축이 없다.
      //   메뉴와 같은 이유로 여기도 걸러진 목록이어야 한다.
      ...specs.map((s) => ({
        group: t('palette.specs'),
        label: s.name,
        hint: s.id,
        icon: 'doc' as const,
        to: '/specs',
      })),
    ],
    [locale, t, onAsk, nav],
  )

  const q = query.trim().toLowerCase()
  const filtered = commands.filter(
    (c) => q === '' || c.label.toLowerCase().includes(q) || c.hint?.toLowerCase().includes(q),
  )

  useEffect(() => setActive(0), [q])

  // 키보드로 내려가면 **보이는 자리까지 따라 내려간다.** 없으면 목록이 길 때 선택은
  // 움직이는데 화면은 그대로라, 엔터를 치고 나서야 어디로 갔는지 안다(2026-08-13)
  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const run = (cmd: Command) => {
    // ⚠ 명령을 먼저 실행하고 닫으면, 이동한 화면 위에 팔레트 퇴장 애니메이션이 겹친다.
    //   닫기를 걸어 두고(퇴장 시작) 실행한다 — 관문이 끝난 뒤 언마운트한다.
    close()
    if (cmd.action) {
      cmd.action()
      return
    }
    if (cmd.to) navigate({ to: cmd.to })
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(filtered.length - 1, a + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(0, a - 1))
    } else if (e.key === 'Enter' && filtered[active]) {
      run(filtered[active])
    }
    // Esc 는 관문(useCover)이 잡는다 — 여기서 또 잡으면 나중에 한쪽만 고치게 된다
  }

  let lastGroup = ''

  return (
    <m.div
      className="fixed inset-0 z-modal bg-black/55 backdrop-blur-[2px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: closing ? 0 : 1 }}
      transition={{ duration: closing ? 0.14 : 0.16 }}
      onClick={close}
    >
      <m.div
        ref={panelRef}
        {...coverProps(titleId)}
        className="mx-auto mt-[14vh] w-full max-w-lg overflow-hidden rounded-2xl border border-hairline bg-cover-glass shadow-[var(--shadow-cover)] backdrop-blur-2xl"
        // 모달과 같은 값 — 관문마다 다른 곡선을 쓰면 같은 앱에서 물건마다 무게가 달라진다
        initial={{ opacity: 0, y: 10, scale: 0.97 }}
        animate={closing ? { opacity: 0, y: 8, scale: 0.97 } : { opacity: 1, y: 0, scale: 1 }}
        transition={closing ? { duration: 0.14 } : { type: 'spring', stiffness: 460, damping: 36 }}
        // 퇴장이 끝난 뒤 언마운트 — 예전에는 퇴장 자체가 없어 팔레트만 툭 사라졌다
        onAnimationComplete={() => {
          if (closing) onClose()
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/*
          머리 = 검색 행 (규약 §7 3단 해부). 여기가 이 덮개의 **일하는 칸**이다.

          ⚠⚠ **활성 표시가 없었다** (2026-08-13 사용자 지적: "인풋창 활성화 표현이 너무
          어색하고 이상하다"). 원인이 둘이다:
          ① 입력칸에 **면도 테두리도 없어서** 그냥 글자가 떠 있는 것으로 보였다 — 타이핑하는
             자리라는 신호가 placeholder 하나뿐이었다.
          ② 전역 포커스 링(`:focus-visible`, outline-offset 2px)이 걸리기는 하는데, 이 입력이
             `overflow-hidden` 상자의 가장자리까지 꽉 차 있어서 **링이 잘려 나갔다.** 남은 것은
             어정쩡한 선 조각이라 "이상한" 표현이 된다.
          → 링을 입력 하나에 그리지 않고 **머리 줄 전체가 focus-within 으로 반응**하게 했다.
             면이 한 단계 밝아지고 아래 선이 포인트 색으로 물든다 — 잘릴 여지가 없다.
        */}
        {/* 활성 신호는 **아래 선 + 옅은 면 + 아이콘 색** 셋이 함께 만든다. 하나만으로는
            약하다 — 라이트 테마의 primary 는 아주 어두운 남색이라 6% 면은 흰 바탕에서
            거의 안 보이고(사용자가 그렇게 봤다), 선 하나는 원래 있던 hairline 과 헷갈린다. */}
        <div className="surface-head flex items-center gap-3 border-b border-hairline px-4 transition-colors focus-within:border-primary focus-within:bg-primary/[0.08] focus-within:[&>span:first-child]:text-primary">
          <span className="text-ink-subtle transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden>
              <circle cx="10.5" cy="10.5" r="6" />
              <path d="M20 20l-5-5" />
            </svg>
          </span>
          {/* 검색칸 자체가 이 덮개의 이름표다 — 보이는 제목이 없으므로 */}
          <input
            id={titleId}
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKey}
            placeholder={t('palette.placeholder')}
            aria-label={t('palette.placeholder')}
            /* ⚠ 링 면제는 **styles.css 의 `[data-ring-none]`** 이 준다. 여기에
               `focus-visible:outline-none` 유틸을 붙이는 것으로는 안 된다 — 전역 포커스
               규칙이 레이어 밖이라 유틸을 이긴다(그렇게 고쳤다가 링이 그대로 남았다). */
            data-ring-none=""
            className="h-12 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-subtle"
          />
          {/* 지운 것을 다시 지우러 뒤로 가지 않게 — 글자가 있을 때만 나온다 */}
          {query !== '' && (
            <button
              type="button"
              onClick={() => {
                setQuery('')
                inputRef.current?.focus()
              }}
              aria-label={t('common.close', '지우기')}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-ink-subtle transition-colors hover:bg-chip hover:text-ink"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
        <div ref={listRef} className="max-h-72 overflow-y-auto overscroll-contain p-2">
          {filtered.length === 0 && (
            <div className="px-3 py-8 text-center text-sm text-ink-subtle">
              {t('palette.empty')}
            </div>
          )}
          {filtered.map((c, i) => {
            const header = c.group !== lastGroup ? c.group : null
            lastGroup = c.group
            return (
              <div key={`${c.group}-${c.label}`}>
                {/* 갈래 이름 — 정본은 styles.css `.section-label` 하나다(손으로 적으면 갈린다) */}
                {header && (
                  <div className="section-label px-3 pb-1.5 pt-3 first:pt-1">{header}</div>
                )}
                {/* ⚠ 고른 줄은 **면 + 왼쪽 기둥**으로 말한다(규약 §16 "고른 것은 면으로").
                    옅은 보라 면 하나만으로는 어두운 배경에서 거의 안 보였다 —
                    특히 키보드로 훑을 때 지금 어디인지가 흐렸다 */}
                <button
                  type="button"
                  data-active={i === active}
                  onClick={() => run(c)}
                  onPointerEnter={() => setActive(i)}
                  className={`relative flex w-full items-center gap-2.5 rounded-lg py-2.5 pl-3 pr-3 text-left text-[13px] transition-colors ${
                    i === active ? 'bg-primary/15 text-ink' : 'text-ink-muted hover:bg-chip'
                  }`}
                >
                  {i === active && (
                    <span aria-hidden className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-primary" />
                  )}
                  <span className={`shrink-0 ${i === active ? 'text-primary' : 'text-ink-subtle'}`}>
                    <Icon name={c.icon ?? 'search'} size={15} />
                  </span>
                  {/* 이름 칸 — 긴 사양서 제목이 힌트를 밀어내지 않게 넷을 다 갖춘다(§8) */}
                  <span className="min-w-0 flex-1 truncate">{c.label}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    {c.hint && (
                      <span className="font-mono text-[11px] text-ink-subtle">{c.hint}</span>
                    )}
                    {i === active && (
                      <kbd className="rounded-md border border-hairline bg-chip px-1.5 py-0.5 text-[10px] text-ink-subtle">
                        ↵
                      </kbd>
                    )}
                  </span>
                </button>
              </div>
            )
          })}
        </div>
        {/* 발 — 3단 해부를 완성한다(규약 §7). ESC 하나가 머리 오른쪽에 떠 있던 것을 여기로
            내렸다: 머리는 **일하는 칸**(검색)이고, 키 안내는 마무리 줄에 모이는 게 맞다.
            ⚠ 좁은 화면에는 물리 키가 없다 — 안내를 지우고 발도 세우지 않는다 */}
        <div className="hidden items-center gap-3 border-t border-hairline px-4 py-2 text-[11px] text-ink-subtle pc:flex">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-hairline bg-chip px-1 py-px">↑</kbd>
            <kbd className="rounded border border-hairline bg-chip px-1 py-px">↓</kbd>
            {t('palette.hint.move', '이동')}
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-hairline bg-chip px-1 py-px">↵</kbd>
            {t('palette.hint.run', '열기')}
          </span>
          <span className="ml-auto flex items-center gap-1">
            <kbd className="rounded border border-hairline bg-chip px-1 py-px">ESC</kbd>
            {t('palette.hint.close', '닫기')}
          </span>
        </div>
      </m.div>
    </m.div>
  )
}
