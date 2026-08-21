import { useEffect, useRef } from 'react'

/**
 * 덮개(Modal·Drawer) 공통 몸가짐 — 규약(docs/화면_공통규칙.md) §7 을 **여기 한 곳**이 지킨다.
 * Esc · 뒤 화면 스크롤 잠금 · **포커스 이동·가둠·복귀**.
 *
 * ⚠⚠ 2026-08-11 이전에는 Esc 와 스크롤 잠금만 있었다. 그래서 서랍이 열려도 **포커스는 뒤
 * 화면에 그대로 남아** Tab 이 덮개 뒤를 돌아다녔다 — 화면은 덮여 있는데 손은 뒤에 있는
 * 상태라, 키보드로 쓰면 "닫히지 않는 화면"이 된다(WCAG 2.4.3·2.1.2).
 *
 * ⚠ 네이티브 `<dialog>` 로 갈면 top-layer·inert·::backdrop 이 공짜지만, 이 프로젝트의
 * 덮개는 **퇴장 애니메이션이 끝난 뒤 언마운트**하는 motion presence 구조라(`onAnimationComplete`)
 * `showModal()`/`close()` 시점과 두 번 싸운다. 지금은 훅으로 같은 보장을 만들고,
 * dialog 전환은 presence 를 관문으로 감싼 뒤 따로 판단한다 (DESIGN.md 효과 검토 표).
 */

/** 지금 눌러 볼 수 있는 것들 — 숨김·비활성은 뺀다(hidden 속성·disabled·tabindex="-1") */
function focusables(root: HTMLElement): Array<HTMLElement> {
  const sel =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  return [...root.querySelectorAll<HTMLElement>(sel)].filter(
    (el) => el.offsetParent !== null || el === document.activeElement,
  )
}

export function useCover(
  close: () => void,
  /**
   * 뒤 화면을 잠글까. 기본은 잠근다(모달·좁은 화면 시트).
   *
   * ⚠ **넓은 화면의 RIGHT 패널은 잠그지 않는다**(규약 §7) — 본문과 **대조**하려고 연
   * 패널인데 뒤가 안 굴러가면 대조가 안 된다. 예전에는 관문이 무조건 잠가서, 사양서
   * 상세를 열면 뒤 목록을 못 훑었다(2026-08-13 정정).
   */
  lockScroll = true,
) {
  /** 덮개 몸통 — 여기에 ref 를 걸고 `tabIndex={-1}` 을 준다 */
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const panel = panelRef.current
    /** 덮개를 연 사람(버튼) — 닫을 때 여기로 돌려보낸다. 안 그러면 포커스가 문서
     *  맨 앞으로 튕겨 "방금 뭘 눌렀더라"를 다시 찾아가야 한다 */
    const opener = document.activeElement as HTMLElement | null

    // 첫 자리는 **몸통 자신**이다. 안쪽 첫 조작(닫기 ✕)으로 보내면 여는 순간 손이
    // "닫기" 위에 놓이고, 스크린리더도 제목(aria-labelledby)을 건너뛴다.
    panel?.focus({ preventScroll: true })

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close()
        return
      }
      if (e.key !== 'Tab' || !panel) return
      const items = focusables(panel)
      if (items.length === 0) {
        e.preventDefault()
        panel.focus({ preventScroll: true })
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      if (!panel.contains(active)) {
        // 뒤 화면으로 새어 나간 포커스를 도로 데려온다
        e.preventDefault()
        ;(e.shiftKey ? last : first).focus()
      } else if (e.shiftKey && (active === first || active === panel)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)

    // 뒤 화면 잠금 — overscroll 만으로는 안 구르는 자리(배경막·머리)를 잡고 끌 때 뒤가 구른다.
    // ⚠ 스크롤바는 html 에 붙어 있어서 body 만 잠그면 12px 트랙이 남아 시트가 화면 폭에
    // 못 미친다(모바일 스모크가 실측으로 잡음) — html 까지 함께 잠근다
    const prevBody = document.body.style.overflow
    const prevHtml = document.documentElement.style.overflow
    if (lockScroll) {
      // ⚠ **여기서 스크롤바 폭을 보정하지 않는다.** 잠그면 스크롤바가 사라져 뒤 화면이
      //   그 폭만큼 넓어지는 게 보통이지만, 이 앱은 `styles.css` 에서 루트에
      //   `overflow-y: scroll` + `scrollbar-gutter: stable` 을 걸어 **자리를 늘 잡아 둔다** —
      //   잠근 동안에도 gutter 가 유지되어 폭이 안 변한다(2026-08-13 실측: 밀림 0).
      //   여기에 padding 보정을 얹었더니 오히려 **10px 을 두 번 빼서 -10 으로 밀렸다.**
      //   보정을 되살리고 싶어지면 먼저 재 볼 것.
      document.body.style.overflow = 'hidden'
      document.documentElement.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', onKey)
      if (lockScroll) {
        document.body.style.overflow = prevBody
        document.documentElement.style.overflow = prevHtml
      }
      // 언마운트는 퇴장 애니메이션이 끝난 뒤라(관문의 onAnimationComplete) 여기서 돌려보내면
      // 사람 눈에는 "덮개가 사라지자 원래 자리로"로 보인다.
      // ⚠ 연 버튼이 덮개 안의 일로 사라졌을 수 있다(삭제·이동) — 그때는 그냥 둔다
      if (opener?.isConnected) opener.focus({ preventScroll: true })
    }
  }, [close, lockScroll])

  return panelRef
}

/** 덮개 몸통에 그대로 펴 넣는 접근성 속성 묶음 — 관문마다 손으로 적지 않는다 */
export function coverProps(titleId: string) {
  return {
    role: 'dialog' as const,
    'aria-modal': true,
    'aria-labelledby': titleId,
    tabIndex: -1,
    /** 전역 포커스 링의 예외 — 아래 styles.css `[data-cover]` 절 참고 */
    'data-cover': '',
  }
}
