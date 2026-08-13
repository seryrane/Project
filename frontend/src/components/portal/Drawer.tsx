import { useCallback, useEffect, useId, useState } from 'react'

import { m } from './motion'
import { coverProps, useCover } from './useCover'

/**
 * 우측 슬라이드 오버(RIGHT) — **본문과 대조하며 보는 자리**다 (규약 §1).
 *
 * ⚠⚠ 2026-08-13 이전에는 이 관문이 모달처럼 굴었다: 까만 배경막(`black/60 + blur`)을 깔고
 * 뒤 화면 스크롤을 잠갔다. 규약은 정반대를 말한다 — **"가리개는 두지 않는다. 뒤가 읽혀야
 * 대조다"**(§1), **"넓은 화면의 RIGHT 패널만 예외로 안 잠근다"**(§7). 목록을 훑으며 상세를
 * 보라고 만든 패널이 정작 목록을 가리고 굴리지도 못하게 하고 있었다.
 *
 * 왜 그렇게 됐었나 — **모달감을 이 자리에 두었기 때문이다.** 물어보기·개인 설정·내 권한은
 * "끝내고 닫는 것"이라 MODAL 인데 RIGHT 로 열려 있었고, 그것들을 감당하려니 배경막이
 * 필요했다. 셋을 Modal 로 옮기고(같은 날) 이 관문은 제 일로 돌아왔다.
 *
 * - 배경막이 **없다.** 그래서 **바깥을 눌러도 안 닫힌다** — 뒤를 만지는 것이 목적이라
 *   대조하다 실수로 닫히면 안 된다. 닫는 길은 ✕ 와 Esc.
 * - 넓은 화면에서는 뒤 화면을 **안 잠근다**. 좁은 화면에서는 패널이 화면을 다 덮으므로
 *   잠근다(뒤를 볼 수 없는데 굴러가면 닫았을 때 읽던 자리를 잃는다).
 *
 * 닫을 때는 부모의 `onClose` 가 아니라 render-prop 으로 받은 `close` 를 부른다 —
 * 그래야 퇴장 애니메이션이 돌고 나서 언마운트된다.
 */
export function Drawer({
  title,
  onClose,
  children,
  footer,
}: {
  title: React.ReactNode
  onClose: () => void
  children: (close: () => void) => React.ReactNode
  /**
   * 발 — 저장·닫기 같은 마무리 조작 (규약 §7 "발은 붙박이. 몸에 두면 밀려서 사라진다").
   * Modal 과 **같은 모양의 슬롯**이다 — 관문 둘이 다르게 생기면 화면을 이쪽에서 저쪽으로
   * 옮길 때마다 액션 줄을 다시 짜게 된다(작업 규율 5 "감싸던 상자가 주던 것이 사라진다").
   */
  footer?: React.ReactNode | ((close: () => void) => React.ReactNode)
}) {
  const [closing, setClosing] = useState(false)
  const titleId = useId()
  // 첫 렌더부터 제대로 잡는다 — useState(false) 로 시작하면 넓은 화면에서도 한 순간
  // 잠갔다 푸는 깜빡임이 생긴다 (SSR 에서는 window 가 없으므로 좁은 화면으로 본다)
  const [wide, setWide] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 45rem)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 45rem)') // --breakpoint-pc
    const sync = () => setWide(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const close = useCallback(() => setClosing(true), [])
  // Esc · 포커스 이동/가둠/복귀는 관문 하나가 지킨다. 잠금은 **좁은 화면에서만** (규약 §7)
  const panelRef = useCover(close, !wide)

  return (
    /* 배경막이 아니다 — 자리를 잡아 주는 상자일 뿐이라 **클릭을 먹지 않는다**.
       pointer-events-none 이 없으면 투명한 판이 화면 전체를 덮어, 뒤를 만질 수 있어야
       하는 대조 화면에서 아무것도 안 눌린다(가리개를 뺀 의미가 사라진다). */
    <div className="pointer-events-none fixed inset-0 z-modal">
      <m.div
        ref={panelRef}
        {...coverProps(titleId)}
        /* ⚠ **좁은 화면에서 앱 헤더를 덮지 않는다** (규약 §8: 헤더까지 덮으면 지금 어디인지와
           나가는 길이 동시에 사라져 사람이 브라우저 뒤로가기를 누른다 — 앱을 벗어난다).
           헤더 높이(h-14 = 3.5rem)만큼 내려서 시작한다. 넓은 화면은 패널이 오른쪽 520px
           띠라 헤더가 그대로 보이므로 위까지 채운다. 모달도 같은 값으로 비켜서 있다
           (`max-h-[calc(100dvh-3.5rem)]`) — 두 관문이 같은 선을 지켜야 한 벌로 읽힌다. */
        className="pointer-events-auto absolute inset-x-0 bottom-0 top-14 flex w-full flex-col border-l border-hairline bg-cover-glass shadow-[var(--shadow-cover)] backdrop-blur-2xl pc:inset-y-0 pc:left-auto pc:right-0 pc:max-w-[520px]"
        initial={{ x: '100%' }}
        animate={{ x: closing ? '100%' : 0 }}
        // 등장은 스프링(살짝 눌러앉는 감), 퇴장은 짧은 트윈 — 퇴장 스프링은 굼떠 보인다
        transition={
          closing
            ? { duration: 0.2, ease: [0.4, 0, 1, 1] }
            : { type: 'spring', stiffness: 380, damping: 40 }
        }
        // 퇴장 애니메이션이 끝난 뒤 언마운트 — setTimeout 으로 어림잡지 않는다
        onAnimationComplete={() => {
          if (closing) onClose()
        }}
      >
        {/* 머리는 **면 + 아래 선** 둘 다 (규약 §7 해부 그림 — Modal.tsx 머리 주석과 같은 근거) */}
        <div className="flex shrink-0 items-center justify-between border-b border-hairline surface-head px-6 py-4">
          <h2 id={titleId} className="min-w-0 truncate text-lg font-semibold">
            {title}
          </h2>
          {/* ⚠ 36×36 — 규약 §7 "모든 표면에서 같은 모습(36×36 이상)". 여기만 32 였다:
              같은 ✕ 가 모달에서는 36, 패널에서는 32 라 손가락이 표면마다 다른 크기를
              만났다(2026-08-13 실측). 좁은 화면 터치 타깃 최소선(§8)도 36 이다. */}
          <button
            type="button"
            onClick={close}
            aria-label="닫기"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-subtle transition-colors hover:bg-chip hover:text-ink"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        {/* 몸 — 여기만 스크롤된다 */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5">
          {children(close)}
        </div>
        {/* 발 — 몸 밖이라 스크롤에 안 밀린다. **머리와 같은 면**을 깔아 3단을 눈에 보이게
            한다(Modal 과 같은 손 — 관문 둘이 다르게 생기면 한 벌로 안 읽힌다).
            좁은 화면에서는 홈 인디케이터만큼 더 띄운다 */}
        {footer != null && (
          <div className="shrink-0 border-t border-hairline surface-head px-6 py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
            {typeof footer === 'function' ? footer(close) : footer}
          </div>
        )}
      </m.div>
    </div>
  )
}
