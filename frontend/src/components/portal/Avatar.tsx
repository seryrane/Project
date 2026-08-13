const palette = ['#635bff', '#0e9384', '#d6409f', '#b54708', '#175cd3']

function hue(name: string): string {
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % palette.length
  return palette[h]
}

export function Avatar({ name, size = 24 }: { name: string; size?: number }) {
  /* ⚠⚠ **글자에 바닥을 둔다.** 예전에는 `size * 0.44` 하나였는데, 18px 아바타에서는
     **7.04px** 가 나왔다 — 한글은 그 크기에서 획이 뭉개져 아무것도 안 읽힌다(2026-08-13
     화면 전수 측정에서 가장 작은 글자로 잡혔다. 계산으로 나오는 값이라 코드를 훑어서는
     안 보이고, 토큰 목록에도 안 남는다).
     10px 아래로는 안 내려간다 — 그 아래는 '작은 글자'가 아니라 '없는 글자'다. */
  const fontSize = Math.max(10, Math.round(size * 0.44))
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, fontSize, backgroundColor: hue(name) }}
      /* 이름은 옆 글자가 이미 말한다 — 스크린리더가 이니셜을 한 번 더 읽지 않게 한다 */
      aria-hidden
    >
      {name.slice(0, 1)}
    </span>
  )
}
