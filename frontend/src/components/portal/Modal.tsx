import { useCallback, useId, useState } from 'react'

import { m } from './motion'
import { useI18n } from '#/lib/i18n'
import { Icon } from './Icon'
import { coverProps, useCover } from './useCover'

/**
 * 모달 관문 — 규약(docs/화면_공통규칙.md) §1·§7 을 이 한 곳이 지킨다.
 * - 좁은 화면(<720px)에서는 아래에서 올라오는 시트가 된다 (닫기가 엄지 자리에 온다)
 * - 덮은 것은 전부 Esc 로 닫힌다 · MODAL 만 배경막을 눌러 닫는다
 * - 열려 있는 동안 뒤 화면 스크롤을 잠그고, 안쪽 스크롤은 안에서 끝낸다(overscroll)
 * - motion 스프링 presence — 퇴장 애니메이션이 끝난 뒤 언마운트한다
 */
export function Modal({
  title,
  onClose,
  children,
  footer,
  wide,
}: {
  title: React.ReactNode
  onClose: () => void
  /**
   * 내용. **함수를 주면 `close` 를 받는다** — 안쪽에서 "저장하고 닫기"처럼 스스로 닫아야
   * 할 때 쓴다. 부모의 `onClose` 를 바로 부르면 퇴장 애니메이션이 안 돌고 즉시 사라진다
   * (Drawer 와 같은 규칙 — 관문 둘이 다르게 굴면 옮겨 붙일 때마다 사고가 난다).
   */
  children: React.ReactNode | ((close: () => void) => React.ReactNode)
  /**
   * 발 — 저장·취소 같은 마무리 조작 (규약 §7 "발은 붙박이. 몸에 두면 밀려서 사라진다").
   *
   * ⚠⚠ 이 슬롯은 **없었다.** 그래서 액션 줄을 `children` 안에 넣을 수밖에 없었고, 내용이
   * 긴 모달에서는 **[저장]·[취소]가 스크롤에 밀려 화면 밖으로 나갔다** — 사람은 다 채워
   * 놓고 저장 버튼을 찾으러 다시 내려가야 한다(2026-08-13 슬롯 신설).
   * 주 동작은 오른쪽 끝(엄지 자리), 취소는 그 왼쪽 — 자리는 부르는 쪽이 정한다.
   */
  footer?: React.ReactNode | ((close: () => void) => React.ReactNode)
  wide?: boolean
}) {
  const { t } = useI18n()
  const [closing, setClosing] = useState(false)
  const titleId = useId()

  const close = useCallback(() => setClosing(true), [])
  // Esc · 뒤 화면 잠금 · 포커스 이동/가둠/복귀는 관문 하나가 지킨다 (useCover)
  const panelRef = useCover(close)

  return (
    <m.div
      // 덮개는 뒤가 실제로 겹치는 몇 안 되는 자리라 **여기서는 진짜로 흐린다**
      // (카드에는 안 건다 — styles.css 의 '유리와 깊이' 절 참고)
      className="fixed inset-0 z-modal flex items-end justify-center bg-black/70 backdrop-blur-md pc:items-center pc:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: closing ? 0 : 1 }}
      transition={{ duration: closing ? 0.16 : 0.2 }}
      onClick={close}
    >
      <m.div
        ref={panelRef}
        {...coverProps(titleId)}
        /* ⚠ **`overflow-hidden` 이 없었다.** 규약 §7 이 못박은 것 — 머리·발에 면을 깔면
           그 면이 둥근 모서리를 넘어 **각지게 삐져나온다.** 머리에 `rounded-t-2xl` 을
           따로 붙여 위쪽만 가리고 있었는데, 발에도 면이 생기면서 아래쪽이 드러났다.
           상자 하나가 모서리를 책임지면 안쪽 조각들은 모서리를 몰라도 된다. */
        className={`flex max-h-[calc(100dvh-3.5rem)] w-full flex-col overflow-hidden rounded-t-2xl border border-hairline bg-cover-glass shadow-[var(--shadow-cover)] backdrop-blur-2xl pc:max-h-[85vh] pc:rounded-2xl ${
          wide ? 'pc:max-w-4xl' : 'pc:max-w-2xl'
        }`}
        // 데스크톱은 살짝 떠오르며 눌러앉고, 모바일 시트도 같은 값으로 자연스럽다.
        // 등장 스프링 · 퇴장은 짧은 트윈 (퇴장 스프링은 굼떠 보인다)
        initial={{ opacity: 0, y: 32, scale: 0.97 }}
        animate={closing ? { opacity: 0, y: 20, scale: 0.98 } : { opacity: 1, y: 0, scale: 1 }}
        transition={
          closing ? { duration: 0.15 } : { type: 'spring', stiffness: 460, damping: 36 }
        }
        // 퇴장이 끝난 뒤 언마운트 — setTimeout 으로 어림잡지 않는다
        onAnimationComplete={() => {
          if (closing) onClose()
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 머리는 **면 + 아래 선** 둘 다다 (규약 §7 해부 그림). 면만 있으면 스크롤 중에
            내용 첫 줄처럼 읽히고, 선만 있으면 옛날 관리자 화면의 패널 머리가 된다.
            ⚠ "머리에 선을 긋지 않는다"는 §7 의 **카드** 절 규칙이다 — 카드는 여럿 늘어서서
            선이 쌓이면 화면이 줄무늬가 되지만, 덮개는 한 번에 하나라 그 문제가 없다.
            덮개 머리는 **스크롤되는 몸을 이고 있어서** 경계가 더 또렷해야 한다. */}
        <div className="flex shrink-0 items-center justify-between rounded-t-2xl border-b border-hairline surface-head px-5 py-3.5 pc:px-6 pc:py-4">
          <h2 id={titleId} className="min-w-0 truncate text-lg font-semibold">
            {title}
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label={t('common.close', '닫기')}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-subtle transition-colors hover:bg-chip hover:text-ink"
          >
            {/* ⚠ 손으로 그리던 ✕ 였다 — 덮개마다 굵기가 1.8·2.2 로 갈렸다.
                모양은 뜻마다 하나, 정본은 관문 한 곳(규약 §22, 2026-08-18) */}
            <Icon name="close" />
          </button>
        </div>
        {/* 몸 — **여기만 스크롤된다.** 발이 있으면 아래 여백은 발이 갖는다 */}
        <div
          className={`overflow-y-auto overscroll-contain px-5 py-5 pc:px-6 ${
            footer ? '' : 'pb-[max(1.25rem,env(safe-area-inset-bottom))]'
          }`}
        >
          {typeof children === 'function' ? children(close) : children}
        </div>
        {/* 발 — 몸 **밖**에 있어서 스크롤에 안 밀린다. 위 선으로 가른다(규약 §7 3단 해부).
            ⚠ **머리와 같은 면을 깐다.** 선 하나만 있으면 발이 "몸의 마지막 줄"처럼 읽혀서,
            내용이 넘쳐 스크롤이 걸린 순간 어디까지가 몸인지 흐려진다. 머리·발이 같은 면을
            쓰면 3단이 눈에 보이고, 가운데(몸)만 굴러간다는 것도 함께 읽힌다.
            좁은 화면에서는 홈 인디케이터만큼 더 띄운다 — 안 그러면 주 동작이 그 밑에 깔린다 */}
        {footer != null && (
          <div className="shrink-0 border-t border-hairline surface-head px-5 py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] pc:px-6">
            {typeof footer === 'function' ? footer(close) : footer}
          </div>
        )}
      </m.div>
    </m.div>
  )
}
