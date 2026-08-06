const palette = ['#635bff', '#0e9384', '#d6409f', '#b54708', '#175cd3']

function hue(name: string): string {
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % palette.length
  return palette[h]
}

export function Avatar({ name, size = 24 }: { name: string; size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, fontSize: size * 0.44, backgroundColor: hue(name) }}
    >
      {name.slice(0, 1)}
    </span>
  )
}
