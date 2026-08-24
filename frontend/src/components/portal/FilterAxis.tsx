import { useId } from 'react'

/**
 * 거르는 축 관문 — **축마다 이름표를 달고 자기 줄에 세운다** (규약 §23-10).
 *
 * 거르는 축이 둘 이상인데 칩이 한 덩어리로 흐르면, 좁은 화면에서 줄이 접히는 순간
 * 축의 경계가 사라진다(2026-08-21 사양서 화면 393px 실측: 세 줄로 접혀 카테고리와
 * 상태가 한 덩어리로 읽혔다). 어느 칩이 무엇을 거르는지 보이지 않으면 필터는 있어도
 * 없는 것이다(규약 §15).
 *
 * ⚠ 이 규칙은 처음에 사양서 화면 **안에** 지역 함수로 있었다 — 문서에는 규칙이 있고
 * 코드에는 한 화면에만 있는 상태였다. 규칙은 **관문의 이름·타입으로** 옮겨야 지켜진다.
 *
 * ⚠ 바깥은 `flex`(줄바꿈 없음)이고 안쪽만 `flex-wrap` 이다 — 바깥까지 wrap 이면
 * `flex-1` 인 칩 칸이 줄을 바꾸지 않고 남은 폭만 쥐어, 이름표에 밀려 폭을 잃는다
 * (규약 §23-1 에서 알림 줄로 한 번 밟은 함정 — 같은 병이다).
 *
 * ⚠ 이름표 칸은 `w-16`(64px)이다. 처음엔 48px 이었는데 EN 'Category'(약 50px)가
 * 넘쳤다 — 이 span 에는 `overflow-hidden` 이 없어 넘치면 **잘리는 게 아니라 칩 칸을
 * 덮는다**. 축이 여럿이면 폭이 같아야 이름표 줄이 맞으므로 고정 폭을 쓴다(규약 §4-5).
 */
export function FilterAxes({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <div className={`flex flex-col gap-3 ${className}`}>{children}</div>
}

export function FilterAxis({
  label,
  wrap,
  children,
}: {
  label: string
  /** 칩을 관문(ChipSelect)이 아니라 화면이 직접 그릴 때 — 안쪽 줄바꿈을 관문이 맡는다 */
  wrap?: boolean
  children: React.ReactNode
}) {
  /* 축 하나는 **묶음**이다 — 눈에는 이름표가 보이고, 읽어 주는 기계에는 role+이름으로
     같은 것이 들린다. 이름표를 `aria-label` 로 한 번 더 적지 않고 `aria-labelledby` 로
     보이는 글자를 가리킨다(적으면 같은 말을 두 번 읽는다). 판(e2e)도 이 이름으로 집는다 —
     `getByRole('group', { name: '카테고리' })` 는 화면의 다른 '카테고리'와 안 겹친다. */
  const id = useId()
  return (
    <div role="group" aria-labelledby={id} className="flex items-start gap-3">
      <span id={id} className="mt-2 w-16 shrink-0 break-keep text-xs text-ink-subtle">
        {label}
      </span>
      <div className={`min-w-0 flex-1 ${wrap ? 'flex flex-wrap gap-2' : ''}`}>{children}</div>
    </div>
  )
}
