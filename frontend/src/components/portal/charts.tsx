import { useId, useRef, useState } from 'react'

/* Chart primitives following the dataviz mark specs:
   2px lines, ≥8px markers with 2px surface rings, ≤24px bars with 4px rounded
   data-ends (square at the baseline), 2px surface gaps between stacked segments,
   hairline solid gridlines, text in ink tokens (never the series color).
   비교(이전 기간) 선은 중립 회색 점선 — 계열 색과 상태 색을 섞지 않는다. */

export function ChartCard({
  title,
  subtitle,
  action,
  children,
  className = '',
}: {
  title: string
  subtitle?: string
  /** 카드는 다음 행동으로 끝난다 (규약 §10) — 우상단 링크 */
  action?: { label: string; onClick?: () => void }
  children: React.ReactNode
  className?: string
}) {
  return (
    <section
      className={`card-spotlight overflow-hidden rounded-2xl border border-hairline bg-surface ${className}`}
    >
      {/* 머리는 면(배경)+선으로 가른다 — 덮개(Modal·Drawer)와 **같은 해부**다(규약 §7).
          카드도 머리·몸이 있는 물건인데 지금까지 한 상자에 이어 붙어 있었다: 제목이 숫자
          위에 그냥 얹혀 있으면 카드가 여럿 늘어선 대시보드에서 "어디부터가 다음 카드인지"와
          "이 숫자가 무엇에 대한 것인지"가 함께 흐려진다 (2026-08-06 사용자 지적).
          ⚠ 머리 면이 모서리를 넘지 않도록 overflow-hidden 이 함께 간다. */}
      <div className="flex items-start justify-between gap-3 surface-head px-5 py-3.5">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-ink-subtle">{subtitle}</p>}
        </div>
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-ink-muted transition-colors hover:bg-chip hover:text-ink focus-visible:text-ink"
          >
            {action.label} →
          </button>
        )}
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

/* ---- 증감 칩: 색만으로 말하지 않는다 — 화살표 + 숫자 (규약 §10) ---- */
function DeltaChip({ delta, good }: { delta: string; good: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold tabular-nums ${
        good ? 'bg-deployed-bg text-deployed-ink' : 'bg-danger-bg text-danger-ink'
      }`}
    >
      <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden>
        {delta.startsWith('-') ? (
          <path d="M1 2.5h6L4 6.5z" fill="currentColor" />
        ) : (
          <path d="M1 5.5h6L4 1.5z" fill="currentColor" />
        )}
      </svg>
      {delta}
    </span>
  )
}

/* ---- 스파크라인: 타일 숫자와 같은 이야기를 하는 미니 추이 ---- */
/** ⚠ viewBox 가 좁으면(110) 넓은 카드에서 svg 는 채워져도 그림은 가운데 조각으로
 *  축소된다(preserveAspectRatio 기본 meet — 모바일 실기기에서 "차트가 너무 작아").
 *  넓은 비율(260×40)로 그리고 h-auto 로 두면 카드 폭을 그대로 채운다 */
function Sparkline({ points, width = 260, height = 40 }: { points: Array<number>; width?: number; height?: number }) {
  const gid = useId()
  const min = Math.min(...points)
  const max = Math.max(...points)
  const span = max - min || 1
  const x = (i: number) => (i / (points.length - 1)) * (width - 4) + 2
  const y = (v: number) => 3 + (1 - (v - min) / span) * (height - 8)
  const line = points.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('')
  const area = `${line}L${x(points.length - 1).toFixed(1)},${height - 1}L${x(0).toFixed(1)},${height - 1}Z`
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="block h-auto w-full" aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke="var(--color-primary)" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(points.length - 1)} cy={y(points[points.length - 1])} r="3" fill="var(--color-primary)" stroke="var(--color-surface)" strokeWidth="1.5" />
    </svg>
  )
}

export function StatTile({
  label,
  value,
  delta,
  deltaGood,
  caption,
  spark,
}: {
  label: string
  value: string
  delta?: string
  deltaGood?: boolean
  caption?: string
  spark?: Array<number>
}) {
  return (
    /* ⚠⚠ **요약 타일에서는 선을 걷었다** (2026-08-13). 카드마다 1px 선이 있으면 화면이
       격자로 읽힌다 — 실측으로 본문에 테두리를 가진 요소가 16개였다. 맨 위 네 칸은
       "담는 상자"가 아니라 **떠 있는 요약**이라, 면과 그림자만으로 띄우면 아래 카드들과
       위계가 생긴다(표식에서 테두리 조건을 뺀 이유 — styles.css '유리와 깊이' 절).
       호버는 선 대신 한 단계 더 뜨는 것으로 답한다. */
    <div className="card-spotlight card-hover rounded-2xl bg-surface p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-ink-subtle">{label}</span>
        {delta && <DeltaChip delta={delta} good={deltaGood ?? true} />}
      </div>
      {/* ⚠ 숫자가 이 타일의 **주인공**이다. 예전 26px 은 페이지 제목(24px)과 2px 차이라
          주인공이 없었다 — 무엇을 먼저 봐야 할지 화면이 말해 주지 않았다(참고로 잰
          shadcn 대시보드는 30 대 24 로 6px 를 벌린다). 표준 단(text-3xl=30px)을 쓴다. */}
      <div className="mt-1.5 text-3xl font-semibold leading-none tabular-nums text-ink">{value}</div>
      {spark && (
        <div className="mt-3">
          <Sparkline points={spark} />
        </div>
      )}
      {/* ⚠ 캡션은 **스파크라인이 못 하는 말**만 담는다 — "최근 14일 추이"처럼 그림이 이미
          하고 있는 말을 글로 또 적으면 한 칸에 같은 이야기가 두 번 선다. 다만 그 판단은
          **부르는 쪽**이 한다: 관문이 내용을 조용히 감추면 왜 안 나오는지 아무도 모른다
          (대시보드에서 중복 캡션 셋을 걷었다. "vs 이전 동일 기간"은 다른 말이라 남겼다). */}
      {caption && <div className="mt-2 text-xs text-ink-subtle">{caption}</div>}
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
  // 10의 거듭제곱으로만 올리면 105 가 200 이 되어 차트 절반이 빈다 —
  // 1.2/1.5/2/2.5/3/4/5/6/8/10 단계로 올린다 (달성률 % 축에서 실측한 문제)
  const step = Math.pow(10, Math.floor(Math.log10(v)))
  const frac = v / step
  const nice =
    frac <= 1.2 ? 1.2 : frac <= 1.5 ? 1.5 : frac <= 2 ? 2 : frac <= 2.5 ? 2.5
    : frac <= 3 ? 3 : frac <= 4 ? 4 : frac <= 5 ? 5 : frac <= 6 ? 6 : frac <= 8 ? 8 : 10
  return nice * step
}

/** 시계열은 선. compare(이전 동일 기간)를 주면 중립 점선 + 범례가 함께 선다 —
 *  숫자는 전과 견줘야 판단이 된다 (규약 §10). */
export function TrendLineChart({
  data,
  compare,
  unit = 'K',
  labels = { main: '현재 기간', compare: '이전 기간' },
}: {
  data: Array<TrendPoint>
  compare?: Array<TrendPoint>
  unit?: string
  labels?: { main: string; compare: string }
}) {
  const ref = useRef<HTMLDivElement>(null)
  const gid = useId()
  const [hover, setHover] = useState<number | null>(null)

  const cmp = compare && compare.length === data.length ? compare : undefined
  const peak = Math.max(...data.map((d) => d.value), ...(cmp?.map((d) => d.value) ?? [0]))
  const max = niceMax(peak * 1.08)
  const ticks = [0, max / 4, max / 2, (max * 3) / 4, max]
  const x = (i: number) => PAD.l + (i / (data.length - 1)) * (W - PAD.l - PAD.r)
  const y = (v: number) => PAD.t + (1 - v / max) * (H - PAD.t - PAD.b)

  const path = (s: Array<TrendPoint>) =>
    s.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join('')
  const line = path(data)
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
    <div>
      {cmp && (
        <div className="mb-2 flex items-center gap-4 text-xs text-ink-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded-full bg-primary" /> {labels.main}
          </span>
          <span className="flex items-center gap-1.5">
            <svg width="16" height="2" aria-hidden>
              <line x1="0" y1="1" x2="16" y2="1" stroke="var(--color-ink-subtle)" strokeWidth="2" strokeDasharray="3 3" />
            </svg>
            {labels.compare}
          </span>
        </div>
      )}
      <div ref={ref} className="relative" onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label="검증 처리량 추이">
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.22" />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="var(--color-hairline)" strokeWidth="1" />
              <text x={PAD.l - 8} y={y(t) + 3.5} textAnchor="end" fontSize="10" fill="var(--color-ink-subtle)">
                {t}
                {t > 0 ? unit : ''}
              </text>
            </g>
          ))}
          {data.map((d, i) =>
            i % labelEvery === 0 && i !== data.length - 1 ? (
              <text key={d.date} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--color-ink-subtle)">
                {d.date}
              </text>
            ) : null,
          )}
          {cmp && (
            <path
              d={path(cmp)}
              fill="none"
              stroke="var(--color-ink-subtle)"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              strokeLinejoin="round"
            />
          )}
          <path d={area} fill={`url(#${gid})`} />
          <path d={line} fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          {hover != null && (
            <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={H - PAD.b} stroke="var(--color-ink-subtle)" strokeWidth="1" />
          )}
          {(hover != null ? [hover, data.length - 1] : [data.length - 1]).map((i) => (
            <circle key={i} cx={x(i)} cy={y(data[i].value)} r="4" fill="var(--color-primary)" stroke="var(--color-surface)" strokeWidth="2" />
          ))}
          <text x={x(data.length - 1) - 6} y={y(last.value) - 9} textAnchor="end" fontSize="11" fontWeight="600" fill="var(--color-ink)">
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
            <span className="font-semibold tabular-nums text-ink">
              {data[hover].value}
              {unit}
            </span>
            {cmp && (
              <span className="ml-1.5 tabular-nums text-ink-subtle">({labels.compare} {cmp[hover].value}{unit})</span>
            )}
            <span className="ml-1.5 text-ink-subtle">{data[hover].date}</span>
          </div>
        )}
      </div>
    </div>
  )
}

/* ---- 다계열 선 차트: 계열 색은 CVD 검증 fill 토큰에서만, 범례 필수 ---- */
export interface LineSeries {
  name: string
  color: string // var(--color-fill-*) — 검증 통과값만
  data: Array<TrendPoint>
}

export function MultiLineChart({ series, unit = '' }: { series: Array<LineSeries>; unit?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<number | null>(null)
  const n = series[0].data.length
  const peak = Math.max(...series.flatMap((s) => s.data.map((d) => d.value)))
  const max = niceMax(peak * 1.1)
  const ticks = [0, max / 4, max / 2, (max * 3) / 4, max]
  const x = (i: number) => PAD.l + (i / (n - 1)) * (W - PAD.l - PAD.r)
  const y = (v: number) => PAD.t + (1 - v / max) * (H - PAD.t - PAD.b)
  const path = (s: LineSeries) =>
    s.data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join('')
  const labelEvery = Math.max(1, Math.round(n / 6))

  const onMove = (e: React.PointerEvent) => {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    const px = ((e.clientX - rect.left) / rect.width) * W
    const i = Math.round(((px - PAD.l) / (W - PAD.l - PAD.r)) * (n - 1))
    setHover(Math.min(n - 1, Math.max(0, i)))
  }

  return (
    <div>
      {/* 2계열 이상이면 범례는 늘 있다 */}
      <div className="mb-2 flex flex-wrap items-center gap-4 text-xs text-ink-muted">
        {series.map((s) => (
          <span key={s.name} className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded-full" style={{ backgroundColor: s.color }} /> {s.name}
          </span>
        ))}
      </div>
      <div ref={ref} className="relative" onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label="다계열 추이">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="var(--color-hairline)" strokeWidth="1" />
              <text x={PAD.l - 8} y={y(t) + 3.5} textAnchor="end" fontSize="10" fill="var(--color-ink-subtle)">
                {Math.round(t)}
                {t > 0 ? unit : ''}
              </text>
            </g>
          ))}
          {series[0].data.map((d, i) =>
            i % labelEvery === 0 ? (
              <text key={d.date} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--color-ink-subtle)">
                {d.date}
              </text>
            ) : null,
          )}
          {series.map((s) => (
            <path key={s.name} d={path(s)} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          ))}
          {hover != null && (
            <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={H - PAD.b} stroke="var(--color-ink-subtle)" strokeWidth="1" />
          )}
          {hover != null &&
            series.map((s) => (
              <circle key={s.name} cx={x(hover)} cy={y(s.data[hover].value)} r="4" fill={s.color} stroke="var(--color-surface)" strokeWidth="2" />
            ))}
        </svg>
        {hover != null && (
          <div
            className="pointer-events-none absolute -translate-x-1/2 rounded-lg border border-hairline bg-raised px-3 py-1.5 text-xs shadow-lg"
            style={{ left: `${(x(hover) / W) * 100}%`, top: '0%' }}
          >
            <div className="mb-0.5 text-ink-subtle">{series[0].data[hover].date}</div>
            {series.map((s) => (
              <div key={s.name} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-ink-muted">{s.name}</span>
                <b className="ml-auto pl-2 tabular-nums text-ink">
                  {s.data[hover].value}
                  {unit}
                </b>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ---- 요일×시간 히트맵: 단일 색상 명도 램프 ---- */
export function TimeHeatmap({
  rows,
  cols,
  values,
  unit = '건',
}: {
  rows: Array<string>
  cols: Array<string>
  values: Array<Array<number>> // rows × cols
  unit?: string
}) {
  const [hover, setHover] = useState<[number, number] | null>(null)
  const flat = values.flat()
  const min = Math.min(...flat)
  const max = Math.max(...flat)
  const span = max - min || 1
  const CELL_W = 34
  const CELL_H = 17
  const GAP = 3
  const LEFT = 24
  const TOP = 4
  const width = LEFT + cols.length * (CELL_W + GAP)
  const height = TOP + rows.length * (CELL_H + GAP) + 16
  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="block w-full" role="img" aria-label="요일·시간 분포">
        {rows.map((r, ri) => (
          <text key={r} x={LEFT - 7} y={TOP + ri * (CELL_H + GAP) + CELL_H - 4} textAnchor="end" fontSize="10" fill="var(--color-ink-subtle)">
            {r}
          </text>
        ))}
        {cols.map((c, ci) => (
          <text key={c} x={LEFT + ci * (CELL_W + GAP) + CELL_W / 2} y={height - 4} textAnchor="middle" fontSize="10" fill="var(--color-ink-subtle)">
            {c}
          </text>
        ))}
        {values.map((row, ri) =>
          row.map((v, ci) => (
            <rect
              key={`${ri}-${ci}`}
              x={LEFT + ci * (CELL_W + GAP)}
              y={TOP + ri * (CELL_H + GAP)}
              width={CELL_W}
              height={CELL_H}
              rx="3"
              fill="var(--color-primary)"
              fillOpacity={0.08 + ((v - min) / span) * 0.86}
              stroke={hover?.[0] === ri && hover[1] === ci ? 'var(--color-ink)' : 'none'}
              strokeWidth="1.2"
              onPointerEnter={() => setHover([ri, ci])}
              onPointerLeave={() => setHover(null)}
            />
          )),
        )}
      </svg>
      <div className="mt-1.5 text-xs text-ink-subtle">
        {hover ? (
          <>
            <b className="tabular-nums text-ink">{values[hover[0]][hover[1]]}{unit}</b> · {rows[hover[0]]} {cols[hover[1]]}
          </>
        ) : (
          '칸에 올리면 값이 보입니다 · 짙을수록 많음'
        )}
      </div>
    </div>
  )
}

/* ---- GitHub 잔디 스타일 히트맵: 단일 색상 명도 램프 (sequential) ---- */
export interface HeatDay {
  date: string
  weekday: number // 0=일 … 6=토
  value: number
}

const HEAT_STEPS = [0.1, 0.28, 0.5, 0.75, 1]

export function ActivityHeatmap({ days }: { days: Array<HeatDay> }) {
  const [hover, setHover] = useState<HeatDay | null>(null)
  const min = Math.min(...days.map((d) => d.value))
  const max = Math.max(...days.map((d) => d.value))
  const span = max - min || 1
  const level = (v: number) => HEAT_STEPS[Math.min(4, Math.floor(((v - min) / span) * 5))]

  // (주, 요일) 격자로 편다 — 첫 주는 시작 요일 전까지 비워 둔다
  const weeks: Array<Array<HeatDay | null>> = []
  let week: Array<HeatDay | null> = Array.from({ length: days[0].weekday }, () => null)
  for (const d of days) {
    if (d.weekday === 0 && week.length > 0) {
      weeks.push(week)
      week = []
    }
    week.push(d)
  }
  if (week.length > 0) weeks.push(week)

  const CELL = 15
  const GAP = 3
  const LEFT = 26
  const TOP = 6
  const width = LEFT + weeks.length * (CELL + GAP)
  const height = TOP + 7 * (CELL + GAP)
  const weekdayLabels = [
    { row: 1, label: '월' },
    { row: 3, label: '수' },
    { row: 5, label: '금' },
  ]

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="block w-full" role="img" aria-label="일별 검증 실행 히트맵">
        {weekdayLabels.map((w) => (
          <text
            key={w.label}
            x={LEFT - 8}
            y={TOP + w.row * (CELL + GAP) + CELL - 4}
            textAnchor="end"
            fontSize="10"
            fill="var(--color-ink-subtle)"
          >
            {w.label}
          </text>
        ))}
        {weeks.map((wk, wi) =>
          wk.map((d, di) =>
            d ? (
              <rect
                key={d.date}
                x={LEFT + wi * (CELL + GAP)}
                y={TOP + d.weekday * (CELL + GAP)}
                width={CELL}
                height={CELL}
                rx="3.5"
                fill="var(--color-primary)"
                fillOpacity={level(d.value)}
                stroke={hover === d ? 'var(--color-ink)' : 'none'}
                strokeWidth="1.5"
                onPointerEnter={() => setHover(d)}
                onPointerLeave={() => setHover(null)}
              />
            ) : (
              <rect
                key={`empty-${wi}-${di}`}
                x={LEFT + wi * (CELL + GAP)}
                y={TOP + di * (CELL + GAP)}
                width={CELL}
                height={CELL}
                rx="3.5"
                fill="var(--color-chip)"
              />
            ),
          ),
        )}
      </svg>
      <div className="mt-2 flex items-center justify-between text-xs text-ink-subtle">
        <span>
          {hover ? (
            <>
              <span className="font-semibold tabular-nums text-ink">{hover.value}K건</span> · {hover.date}
            </>
          ) : (
            '칸에 올리면 일자별 처리량이 보입니다'
          )}
        </span>
        <span className="flex items-center gap-1">
          적음
          {HEAT_STEPS.map((o) => (
            <span
              key={o}
              className="h-2.5 w-2.5 rounded-[3px]"
              style={{ backgroundColor: 'var(--color-primary)', opacity: o }}
            />
          ))}
          많음
        </span>
      </div>
    </div>
  )
}

export interface BarDatum {
  label: string
  value: number
  prev?: number
}

export function ErrorBarChart({ data }: { data: Array<BarDatum> }) {
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(...data.map((d) => d.value))
  return (
    <div className="space-y-1">
      {data.map((d, i) => {
        const deltaPct = d.prev != null && d.prev > 0 ? ((d.value - d.prev) / d.prev) * 100 : null
        return (
          <div
            key={d.label}
            className="grid min-h-6 grid-cols-[96px_1fr_auto] items-center gap-3 py-0.5"
            onPointerEnter={() => setHover(i)}
            onPointerLeave={() => setHover(null)}
          >
            <span className="truncate text-xs text-ink-muted">{d.label}</span>
            <span className="flex items-center gap-2">
              <span
                className="h-4 rounded-r-[4px] transition-opacity"
                style={{
                  width: `${(d.value / max) * 88}%`,
                  backgroundColor: 'var(--color-primary)',
                  opacity: hover == null || hover === i ? 1 : 0.45,
                }}
              />
              <span className="text-xs font-semibold tabular-nums text-ink">{d.value}</span>
            </span>
            {deltaPct != null ? (
              // 오류는 내리면 좋다 — 좋은 방향은 지표마다 다르다 (규약 §10)
              <DeltaChip delta={`${deltaPct >= 0 ? '+' : ''}${deltaPct.toFixed(0)}%`} good={deltaPct < 0} />
            ) : (
              <span />
            )}
          </div>
        )
      })}
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
