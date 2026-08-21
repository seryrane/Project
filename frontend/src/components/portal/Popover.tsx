import { useEffect, useLayoutEffect, useRef, useState } from 'react'

/**
 * 팝오버 관문 — 규약(docs/화면_공통규칙.md) §1 '팝오버' 절을 **여기 한 곳**이 지킨다.
 *
 * - **연 조작에 매달린다.** 자리는 anchor 의 사각형에서 잰다 — 화면 끝에서 손으로 잰
 *   `right-24` 는 GNB 에 버튼이 하나 늘어나는 날 어긋나고, 그 어긋남은 버튼을 늘린
 *   사람 눈에는 안 보인다(자기가 안 여는 팝오버라서). 실제로 벨·계정이 그 상태였다.
 * - **배경막이 없다.** 잠깐 훑어보는 것에 화면을 어둡게 덮지 않는다. 바깥을 누르면
 *   닫히는 **투명막**만 둔다.
 * - **뒤 화면을 잠그지 않는다.** 덮개가 아니다(useCover 를 쓰지 않는 이유).
 * - **좁은 화면에서는 아래에서 올라오는 시트**가 된다.
 * - Esc 로 닫히고, 닫으면 **연 버튼으로 포커스가 돌아간다.**
 *
 * ⚠⚠ **`backdrop-filter` 를 가진 조상 안에서 렌더하지 않는다.** `position: fixed` 는
 * transform·filter·backdrop-filter 를 가진 조상이 있으면 **화면이 아니라 그 조상** 기준이
 * 된다. 우리 GNB 헤더는 글라스(`backdrop-blur-md`)라, 팝오버를 헤더 안에 넣으면 자리가
 * 조용히 헤더 기준으로 바뀐다. AppShell 이 팝오버를 헤더 **밖**(셸 루트)에서 여는 이유다.
 */
export function Popover({
  anchor,
  onClose,
  label,
  width = 340,
  children,
}: {
  /** 이 팝오버를 연 조작 — 자리를 여기서 잰다 */
  anchor: React.RefObject<HTMLElement | null>
  onClose: () => void
  /** 스크린리더가 읽을 이름 (제목이 안 보이는 팝오버도 있다) */
  label: string
  /** 넓은 화면에서의 폭. 좁은 화면에서는 무시된다(시트라 폭이 화면 전체) */
  width?: number
  children: React.ReactNode
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  /** null 이면 아직 못 쟀다 — 좁은 화면(시트)에서도 null 로 둔다 */
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const [wide, setWide] = useState(false)

  // 자리 재기 — 여는 순간, 그리고 창 크기·스크롤이 바뀔 때마다.
  // ⚠ 페인트 전에 재야 한다(useLayoutEffect) — useEffect 로 하면 한 프레임 동안
  //    좌상단(0,0)에 그려졌다가 튀어 들어간다.
  useLayoutEffect(() => {
    const mq = window.matchMedia('(min-width: 45rem)') // --breakpoint-pc
    const place = () => {
      const isWide = mq.matches
      setWide(isWide)
      const el = anchor.current
      if (!isWide || !el) {
        setPos(null)
        return
      }
      const r = el.getBoundingClientRect()
      const GAP = 8
      const EDGE = 12 // 화면 가장자리에서 이만큼은 띄운다
      // ⚠⚠ **`right` 가 아니라 `left` 로 앉힌다** (2026-08-13, 두 번 데고 얻은 결론).
      //    `right` 는 "화면 오른쪽 끝에서 얼마"라서 **그 끝이 어디냐**를 알아야 하는데,
      //    세로 스크롤바가 있으면 `innerWidth`(스크롤바 포함)와 `clientWidth`(제외)가
      //    갈리고, 어느 쪽이 기준인지가 루트의 overflow 설정에 따라 또 달라진다.
      //    처음엔 innerWidth 로 재서 10px 밀렸고, clientWidth 로 고쳤더니 루트에
      //    `overflow-y: scroll` 을 건 뒤 다시 10px 밀렸다.
      //    `left` 는 **화면 왼쪽 끝 기준**이라 스크롤바가 끼어들 자리가 없다 — 연 버튼의
      //    오른쪽 끝(`r.right`)에서 폭을 빼면 그만이고, 어떤 설정에서도 안 흔들린다.
      const vw = document.documentElement.clientWidth
      // 오른쪽 끝을 연 조작의 오른쪽 끝에 맞춘다 — GNB 조작은 오른쪽에 몰려 있어
      // 왼쪽 정렬하면 팝오버가 화면 밖으로 나간다
      let left = r.right - width
      // 화면 밖으로 나가면 되민다 (왼쪽 먼저, 그다음 오른쪽)
      if (left < EDGE) left = EDGE
      if (left + width > vw - EDGE) left = Math.max(EDGE, vw - width - EDGE)
      setPos({ top: r.bottom + GAP, left })
    }
    place()
    window.addEventListener('resize', place)
    // 헤더는 sticky 라 스크롤해도 자리가 안 변하지만, 본문 안에서 연 팝오버는 따라가야 한다
    window.addEventListener('scroll', place, true)
    mq.addEventListener('change', place)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
      mq.removeEventListener('change', place)
    }
  }, [anchor, width])

  // 여는 순간 팝오버 자신에게 포커스를 준다 — 스크린리더가 이름(label)부터 읽는다.
  // 닫을 때는 연 버튼으로 돌려보낸다: 안 그러면 포커스가 문서 맨 앞으로 튕겨
  // "방금 뭘 눌렀더라"를 다시 찾아가야 한다.
  useEffect(() => {
    const opener = anchor.current
    panelRef.current?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      if (opener?.isConnected) opener.focus({ preventScroll: true })
    }
  }, [anchor, onClose])

  return (
    <>
      {/*
        투명막 — 바깥을 누르면 닫힌다. **버튼이 아니다**: `<button class="fixed inset-0">`
        로 두면 탭 순서에 "메뉴 닫기"라는 유령 버튼이 끼고, 스크린리더는 화면 전체를
        덮는 정체불명의 버튼을 읽는다(예전 상태). 닫는 길은 Esc 와 안쪽 항목이 이미 준다.
      */}
      <div aria-hidden className="fixed inset-0 z-popover" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-label={label}
        tabIndex={-1}
        /** 전역 포커스 링의 예외 — 덮개와 같은 취급 (styles.css `[data-cover]`) */
        data-cover=""
        // 좁은 화면: 아래에서 올라오는 시트(위 모서리만 둥글다) · 넓은 화면: 연 조작 아래
        className={`fixed z-popover overflow-hidden border border-hairline bg-cover-glass shadow-[var(--shadow-cover)] backdrop-blur-xl ${
          wide
            ? 'anim-scale-in rounded-xl'
            : 'anim-sheet-in inset-x-0 bottom-0 rounded-t-2xl pb-[env(safe-area-inset-bottom,0px)]'
        }`}
        style={
          wide && pos
            ? { top: pos.top, left: pos.left, width, maxHeight: 'calc(100dvh - 5rem)' }
            : wide
              ? // 아직 못 잰 한 프레임 — 화면 밖에 두어 좌상단 깜빡임을 막는다
                { top: -9999, left: 0, width }
              : { maxHeight: '70dvh' }
        }
      >
        {children}
      </div>
    </>
  )
}
