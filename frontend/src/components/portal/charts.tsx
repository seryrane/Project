import { useRef, useState } from 'react'

/* Chart primitives following the dataviz mark specs:
   2px lines, ≥8px markers with 2px surface rings, ≤24px bars with 4px rounded
   data-ends (square at the baseline), 2px surface gaps between stacked segments,
   hairline solid gridlines, text in ink tokens (never the series color). */

export function ChartCard({
  title,
  subtitle,
  children,
  className = '',
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section
      className={`rounded-2xl border border-hairline bg-surface p-5 ${className}`}
    >
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {subtitle && <p className="mt-0.5 text-xs text-ink-subtle">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

export function StatTile({
  label,
  value,
  delta,
  deltaGood,
  caption,
}: {
  label: string
  value: string
  delta?: string
  deltaGood?: boolean
  caption?: string
}) {
  return (
    <div className="rounded-2xl border border-hairline bg-surface p-5">
      <div className="text-xs text-ink-subtle">{label}</div>
      <div className="mt-1.5 text-[26px] font-semibold leading-none text-ink">{value}</div>
      {(delta || caption) && (
        <div className="mt-2 flex items-baseline gap-1.5 text-xs">
          {delta && (
            <span
              className={`font-semibold ${deltaGood ? 'text-deployed-ink' : 'text-danger-ink'}`}
            >
              {delta}
            </span>
          )}
          {caption && <span className="text-ink-subtle">{caption}</span>}
        </div>
      )}
    </div>
  )
}

export interface TrendPoint {
  date: string
  value: number
}

const W = 640
const H = 232
const PAD = { l: 44, r: 20, t: 14, b: 26 }

function niceMax(v: number): number {
  const step = Math.pow(10, Math.floor(Math.log10(v)))
  return Math.ceil(v / step) * step
}

export function TrendLineChart({ data, unit = 'K' }: { data: Array<TrendPoint>; unit?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<number | null>(null)

  const max = niceMax(Math.max(...data.map((d) => d.value)) * 1.08)
  const ticks = [0, max / 4, max / 2, (max * 3) / 4, max]
  const x = (i: number) => PAD.l + (i / (data.length - 1)) * (W - PAD.l - PAD.r)
  const y = (v: number) => PAD.t + (1 - v / max) * (H - PAD.t - PAD.b)

  const line = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join('')
  const area = `${line}L${x(data.length - 1).toFixed(1)},${y(0)}L${x(0).toFixed(1)},${y(0)}Z`

  const labelEvery = Math.max(1, Math.round(data.length / 5))
  const last = data[data.length - 1]

  const onMove = (e: React.PointerEvent) => {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    const px = ((e.clientX - rect.left) / rect.width) * W
    const i = Math.round(((px - PAD.l) / (W - PAD.l - PAD.r)) * (data.length - 1))
    setHover(Math.min(data.length - 1, Math.max(0, i)))
  }

  return (
    <div ref={ref} className="relative" onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label="검증 처리량 추이">
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.l}
              x2={W - PAD.r}
              y1={y(t)}
              y2={y(t)}
              stroke="var(--color-hairline)"
              strokeWidth="1"
            />
            <text
              x={PAD.l - 8}
              y={y(t) + 3.5}
              textAnchor="end"
              fontSize="10"
              fill="var(--color-ink-subtle)"
            >
              {t}
              {t > 0 ? unit : ''}
            </text>
          </g>
        ))}
        {data.map((d, i) =>
          i % labelEvery === 0 && i !== data.length - 1 ? (
            <text
              key={d.date}
              x={x(i)}
              y={H - 8}
              textAnchor="middle"
              fontSize="10"
              fill="var(--color-ink-subtle)"
            >
              {d.date}
            </text>
          ) : null,
        )}
        <path d={area} fill="var(--color-primary)" fillOpacity="0.1" />
        <path d={line} fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {hover != null && (
          <line
            x1={x(hover)}
            x2={x(hover)}
            y1={PAD.t}
            y2={H - PAD.b}
            stroke="var(--color-ink-subtle)"
            strokeWidth="1"
          />
        )}
        {(hover != null ? [hover, data.length - 1] : [data.length - 1]).map((i) => (
          <circle
            key={i}
            cx={x(i)}
            cy={y(data[i].value)}
            r="4"
            fill="var(--color-primary)"
            stroke="var(--color-surface)"
            strokeWidth="2"
          />
        ))}
        <text
          x={x(data.length - 1) - 6}
          y={y(last.value) - 9}
          textAnchor="end"
          fontSize="11"
          fontWeight="600"
          fill="var(--color-ink)"
        >
          {last.value}
          {unit}
        </text>
      </svg>
      {hover != null && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 rounded-lg border border-hairline bg-raised px-3 py-1.5 text-xs shadow-lg"
          style={{
            left: `${(x(hover) / W) * 100}%`,
            top: `${(y(data[hover].value) / H) * 100 - 16}%`,
          }}
        >
          <span className="font-semibold text-ink">
            {data[hover].value}
            {unit} 건
          </span>
          <span className="ml-1.5 text-ink-subtle">{data[hover].date}</span>
        </div>
      )}
    </div>
  )
}

export interface BarDatum {
  label: string
  value: number
}

export function ErrorBarChart({ data }: { data: Array<BarDatum> }) {
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(...data.map((d) => d.value))
  return (
    <div className="space-y-1">
      {data.map((d, i) => (
        <div
          key={d.label}
          className="grid min-h-6 grid-cols-[96px_1fr] items-center gap-3 py-0.5"
          onPointerEnter={() => setHover(i)}
          onPointerLeave={() => setHover(null)}
        >
          <span className="truncate text-xs text-ink-muted">{d.label}</span>
          <span className="flex items-center gap-2">
            <span
              className="h-4 rounded-r-[4px] transition-opacity"
              style={{
                width: `${(d.value / max) * 78}%`,
                backgroundColor: 'var(--color-primary)',
                opacity: hover == null || hover === i ? 1 : 0.45,
              }}
            />
            <span className="text-xs font-semibold tabular-nums text-ink">{d.value}</span>
          </span>
        </div>
      ))}
    </div>
  )
}

export interface StackDatum {
  label: string
  value: number
  fill: string
}

export function StatusStackBar({ data }: { data: Array<StackDatum> }) {
  const [hover, setHover] = useState<number | null>(null)
  const total = data.reduce((a, d) => a + d.value, 0)
  return (
    <div>
      <div className="flex h-5 w-full gap-[2px]">
        {data.map((d, i) => (
          <div
            key={d.label}
            className={`transition-opacity ${i === 0 ? 'rounded-l-[4px]' : ''} ${
              i === data.length - 1 ? 'rounded-r-[4px]' : ''
            }`}
            style={{
              width: `${(d.value / total) * 100}%`,
              backgroundColor: d.fill,
              opacity: hover == null || hover === i ? 1 : 0.4,
            }}
            onPointerEnter={() => setHover(i)}
            onPointerLeave={() => setHover(null)}
          />
        ))}
      </div>
      <div className="mt-4 space-y-2">
        {data.map((d, i) => (
          <div
            key={d.label}
            className="flex items-center justify-between text-xs"
            onPointerEnter={() => setHover(i)}
            onPointerLeave={() => setHover(null)}
          >
            <span className="flex items-center gap-2 text-ink-muted">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: d.fill }} />
              {d.label}
            </span>
            <span className="font-semibold tabular-nums text-ink">
              {d.value}
              <span className="ml-1.5 font-normal text-ink-subtle">
                {Math.round((d.value / total) * 100)}%
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
