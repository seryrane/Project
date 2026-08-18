import { Fragment, useId, useRef, useState } from 'react'

/* ⚠ 차트 관문은 **자기 말**(범례 '현재/이전 기간' · 요일 축 · "칸에 올리면…" · 적음/많음)을
   스스로 갖는다 — 그러니 그 말은 관문이 사전을 타야 한다. 부르는 쪽이 주는 말(열 이름·
   단위·도넛 가운데 캡션)은 이미 번역된 채로 온다(DataTable 과 같은 규칙).
   EN 실검수에서 대시보드의 차트 글자만 통째로 한국어로 남아 있었다(2026-08-18). */
import { useI18n } from '#/lib/i18n'

/* Chart primitives following the dataviz mark specs:
   2px lines, ≥8px markers with 2px surface rings, ≤24px bars with 4px rounded
   data-ends (square at the baseline), 2px surface gaps between stacked segments,
   hairline solid gridlines, text in ink tokens (never the series color).
   비교(이전 기간) 선은 중립 회색 점선 — 계열 색과 상태 색을 섞지 않는다. */

export interface ChartHero {
  /** 이 카드가 하는 **한마디**. 크게 선다 */
  value: string
  unit?: string
  delta?: string
  deltaGood?: boolean
  /** 숫자가 못 하는 말 한 줄 (기간·기준 등) */
  note?: string
}

export function ChartCard({
  title,
  subtitle,
  action,
  hero,
  children,
  className = '',
}: {
  title: string
  subtitle?: string
  /** 카드는 다음 행동으로 끝난다 (규약 §10) — 우상단 링크 */
  action?: { label: string; onClick?: () => void }
  hero?: ChartHero
  children: React.ReactNode
  className?: string
}) {
  return (
    /* ⚠⚠ **카드는 제 키를 다 쓴다** (2026-08-13 사용자 지적: "횡한 게 문제").
       실측: 같은 줄의 카드는 격자가 키를 맞춰 505px 인데 몸통은 215px 에서 끝나
       **283px 가 그냥 빈 흰 면**이었다. 그게 "횡하다"의 정체다.
       고침은 그림을 늘리는 게 아니라 **몸통이 카드를 채우고, 남는 자리를 위아래로
       가르는 것**이다(주인공 숫자는 위, 그림은 바닥에). 늘린 여백은 우연이 아니라
       숨 쉬는 자리로 읽힌다. */
    <section
      className={`card-spotlight flex h-full flex-col overflow-hidden rounded-2xl border border-hairline bg-surface ${className}`}
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
      <div className="flex flex-1 flex-col justify-between gap-4 p-5">
        {/* ⚠ **주인공 숫자**(dataviz `marks-and-anatomy.md` 의 hero number).
            사용자 지적: "차트가 대시보드에서 제일 중요한 요소인데 눈에 띄는 부분이 없음".
            선 세 가닥이 같은 무게로 놓이면 어디부터 봐야 할지 화면이 말해 주지 않는다.
            카드가 **한마디**를 먼저 하고, 그림은 그 한마디의 근거로 아래에 선다. */}
        {hero && (
          <div>
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="text-4xl font-semibold leading-none tracking-tight tabular-nums text-ink">
                {hero.value}
              </span>
              {hero.unit && <span className="text-sm font-medium text-ink-muted">{hero.unit}</span>}
              {hero.delta && <DeltaChip delta={hero.delta} good={hero.deltaGood ?? true} />}
            </div>
            {hero.note && <p className="mt-1.5 text-xs text-ink-subtle">{hero.note}</p>}
          </div>
        )}
        {children}
      </div>
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
      <path
        d={line}
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth="1.25"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={x(points.length - 1)} cy={y(points[points.length - 1])} r="3" fill="var(--color-primary)" stroke="var(--color-surface)" strokeWidth="1.25" vectorEffect="non-scaling-stroke" />
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

/** 눈금 간격을 사람이 읽는 수(1·1.5·2·2.5·3·4·5·10 × 10ⁿ)로 맞춘다 */
function niceStep(v: number): number {
  const p = Math.pow(10, Math.floor(Math.log10(v || 1)))
  const f = (v || 1) / p
  const n = f <= 1 ? 1 : f <= 1.5 ? 1.5 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 3 ? 3 : f <= 4 ? 4 : f <= 5 ? 5 : 10
  return n * p
}

/**
 * 선 차트의 **세로 범위**. 바닥을 무조건 0 으로 잡지 않는다.
 *
 * ⚠⚠ dataviz: "bars start at 0 / **lines need not**". 막대는 길이가 곧 양이라 0 을 자르면
 * 거짓말이 되지만, 선은 **변화**를 말하는 물건이라 0 을 강요하면 데이터가 위쪽에 눌린다.
 * 실측: KPI 달성률 84~97% 를 0~120 축에 그리니 선이 플롯의 위 30% 에만 붙고 아래
 * 70% 가 빈 그러데이션이었다 — 사용자가 "횡하다"고 한 화면의 절반이 이거다.
 * 데이터가 0 에서 멀면(최소/최대 > 0.35) 바닥을 **최소값 아래 눈금**으로 올린다.
 * 자른 사실은 축 글자가 그대로 말한다(0 이 아닌 숫자가 바닥에 찍힌다) — 숨기지 않는다.
 */
function axisRange(lo: number, hi: number): [number, number] {
  if (!(lo > 0) || lo / (hi || 1) < 0.35) return [0, niceMax((hi || 1) * 1.08)]
  const pad = (hi - lo || hi * 0.1) * 0.45
  const step = niceStep((hi - lo + pad * 1.6) / 2)
  const floor = Math.max(0, Math.floor((lo - pad) / step) * step)
  const top = floor + step * 2 >= hi ? floor + step * 2 : Math.ceil((hi + pad * 0.3) / step) * step
  return [floor, top]
}

/**
 * 도넛 — **부분-전체를 한눈에** 보는 자리에만.
 *
 * dataviz 규칙: "Part-to-whole at a glance only, ≤ 6 segments". 그리고 **값이 비슷하면
 * 쓰지 않는다** — 각도는 길이보다 견주기 어려워서, 24 와 26 을 도넛으로 그리면 어느 쪽이
 * 큰지 알 수 없다. 그런 데이터는 막대다.
 * 사양서 상태(79/24/18/7)는 한 조각이 확실히 커서 "대부분 배포 완료"가 한눈에 읽힌다 —
 * 도넛이 맞는 자리다.
 *
 * - 가운데는 비우고 **합계**를 넣는다(도넛의 구멍이 곧 숫자 자리다)
 * - 조각 사이 2px 면 색 틈 — 테두리를 그리지 않는다
 * - 범례에 값과 비율을 함께 — 각도로 못 읽는 것을 글이 말한다(툴팁만으로 가두지 않는다)
 *
 * ⚠⚠ **그림은 제 칸을 다 쓴다** (2026-08-14 사용자 지적 "도넛 차트 공백 문제" 2차).
 * 128px 로 못 박아 두면, 격자가 옆 카드에 키를 맞춘 만큼이 그대로 빈 면으로 남는다
 * (hero 를 얹어 위아래로 갈랐어도 총량은 그대로였다 — 142px 이 가운데로 옮겼을 뿐).
 * 그래서 세로는 **남는 자리가 정한다**: `flex-1` 로 자리를 받고 `h-full` 로 채운다.
 * - 바닥 `min-h-32`(128) — 안 늘어난 카드에서도 예전 크기는 지킨다
 * - 천장 `max-h-56`(224) — 1칸 카드에서 도넛만 커져 범례를 밀어내지 않게
 * - 폭은 `w-auto` — viewBox 가 1:1 이라 높이를 따라간다(직접 재지 않는다)
 * ⚠ 좁은 화면(줄바꿈)에서는 부모 키가 내용에서 오므로 h-full 이 접힌다 — min-h 가 바닥이다.
 */
export function DonutChart({
  data,
  centerLabel,
}: {
  data: Array<{ label: string; value: number; fill: string }>
  centerLabel?: string
}) {
  const { t } = useI18n()
  const [hover, setHover] = useState<number | null>(null)
  const total = data.reduce((s, d) => s + d.value, 0) || 1
  const R = 54
  const RI = 34
  const C = 2 * Math.PI * R
  /** 조각 사이 틈(면 색) — 각도가 아니라 길이로 준다(작은 조각도 같은 틈) */
  const GAP = 3
  let acc = 0
  return (
    <div className="flex min-h-0 flex-1 flex-wrap items-center gap-5">
      <svg
        viewBox="0 0 128 128"
        className="block h-full max-h-56 min-h-32 w-auto shrink-0"
        role="img"
        aria-label={t('chart.aria.donut', '구성비')}
      >
        <g transform="rotate(-90 64 64)">
          {data.map((d, i) => {
            const len = (d.value / total) * C
            const seg = Math.max(0, len - GAP)
            const el = (
              <circle
                key={d.label}
                cx="64"
                cy="64"
                r={R}
                fill="none"
                stroke={d.fill}
                strokeWidth={R - RI}
                strokeDasharray={`${seg} ${C - seg}`}
                strokeDashoffset={-acc}
                opacity={hover != null && hover !== i ? 0.35 : 1}
                className="donut-seg"
                onPointerEnter={() => setHover(i)}
                onPointerLeave={() => setHover(null)}
              />
            )
            acc += len
            return el
          })}
        </g>
        {/* 가운데 숫자 — 도넛의 구멍은 빈 자리가 아니라 합계가 앉는 자리다 */}
        <text x="64" y="62" textAnchor="middle" fontSize="20" fontWeight="600" fill="var(--color-ink)">
          {hover != null ? data[hover].value : total}
        </text>
        <text x="64" y="78" textAnchor="middle" fontSize="9" fill="var(--color-ink-subtle)">
          {hover != null ? data[hover].label : (centerLabel ?? t('common.all', '전체'))}
        </text>
      </svg>
      {/* 범례가 값을 말한다 — 각도로 못 읽는 것을 툴팁에만 가두지 않는다 */}
      <ul className="min-w-0 flex-1 space-y-1.5">
        {data.map((d, i) => (
          <li
            key={d.label}
            className="flex items-center gap-2 text-[13px]"
            onPointerEnter={() => setHover(i)}
            onPointerLeave={() => setHover(null)}
          >
            <span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ backgroundColor: d.fill }} />
            <span className="min-w-0 flex-1 truncate text-ink-muted">{d.label}</span>
            <span className="shrink-0 tabular-nums text-ink">{d.value}</span>
            <span className="w-10 shrink-0 text-right text-xs tabular-nums text-ink-subtle">
              {Math.round((d.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** 시계열은 선. compare(이전 동일 기간)를 주면 중립 점선 + 범례가 함께 선다 —
 *  숫자는 전과 견줘야 판단이 된다 (규약 §10). */
export function TrendLineChart({
  data,
  compare,
  unit = 'K',
  labels,
}: {
  data: Array<TrendPoint>
  compare?: Array<TrendPoint>
  unit?: string
  /** 안 주면 관문이 사전에서 채운다 — 부르는 쪽이 다른 말을 쓰고 싶을 때만 준다 */
  labels?: { main: string; compare: string }
}) {
  // ⚠ 이 안에서는 눈금 좌표가 `t` 라는 이름을 이미 쓴다 — 사전은 통째로 받아 쓴다
  const i18n = useI18n()
  const lbl = labels ?? {
    main: i18n.t('chart.legend.current', '현재 기간'),
    compare: i18n.t('chart.legend.previous', '이전 기간'),
  }
  const ref = useRef<HTMLDivElement>(null)
  const gid = useId()
  const [hover, setHover] = useState<number | null>(null)

  const cmp = compare && compare.length === data.length ? compare : undefined
  const all = [...data.map((d) => d.value), ...(cmp?.map((d) => d.value) ?? [])]
  const [floor, max] = axisRange(Math.min(...all), Math.max(...all))
  /* ⚠ 눈금 다섯 → **셋**(바닥·중간·최대). 격자가 다섯 줄이면 데이터보다 격자가 먼저 보인다 —
     참고로 잰 대시보드들은 격자를 아예 안 그리거나 한두 줄만 둔다. 다만 이건 운영 화면이라
     "얼마나 되나"를 읽어야 해서 눈금을 없애지는 않는다. 셋이면 위·가운데·아래로 읽힌다. */
  const ticks = [floor, (floor + max) / 2, max]
  const x = (i: number) => PAD.l + (i / (data.length - 1)) * (W - PAD.l - PAD.r)
  const y = (v: number) => PAD.t + (1 - (v - floor) / (max - floor)) * (H - PAD.t - PAD.b)

  const path = (s: Array<TrendPoint>) =>
    s.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join('')
  const line = path(data)
  const area = `${line}L${x(data.length - 1).toFixed(1)},${y(floor)}L${x(0).toFixed(1)},${y(floor)}Z`

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
            <span className="h-0.5 w-4 rounded-full bg-primary" /> {lbl.main}
          </span>
          <span className="flex items-center gap-1.5">
            <svg width="16" height="2" aria-hidden>
              <line x1="0" y1="1" x2="16" y2="1" stroke="var(--color-ink-subtle)" strokeWidth="2" strokeDasharray="3 3" />
            </svg>
            {lbl.compare}
          </span>
        </div>
      )}
      <div ref={ref} className="relative" onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label={i18n.t('chart.aria.trend', '검증 처리량 추이')}>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.22" />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {ticks.map((t) => (
            <g key={t}>
              {/* ⚠ 격자는 **나누는 선**(divider)이지 감싸는 선(hairline)이 아니다.
                  둘을 같은 값으로 쓰면 카드 테두리와 격자가 같은 무게로 보여 화면이 시끄럽다
                  (DESIGN.md "선은 두 단계다"를 차트에도 적용). */}
              <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="var(--color-divider)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
              <text x={PAD.l - 8} y={y(t) + 3.5} textAnchor="end" fontSize="10" fill="var(--color-ink-subtle)">
                {Math.round(t * 10) / 10}
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
              strokeWidth="1.25"
              vectorEffect="non-scaling-stroke"
              strokeDasharray="4 4"
              strokeLinejoin="round"
            />
          )}
          <path d={area} fill={`url(#${gid})`} />
          {/* ⚠⚠ **획은 viewBox 단위다.** 640 짜리 도화지가 카드 폭 1300 으로 늘면 굵기도 두 배가
              되어 화면에서는 4px 선이 그어진다 — 아이콘에서 이미 겪은 함정과 같은 병이다
              (Icon.tsx 주석). `non-scaling-stroke` 로 획을 화면 픽셀에 고정하고, 굵기는
              **화면에서 보이는 값**으로 다시 잡는다(2026-08-18 사용자 지적: "선이 너무 굵다"). */}
          <path
            d={line}
            pathLength="1"
            className="chart-line"
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth="1.4"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          {hover != null && (
            <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={H - PAD.b} stroke="var(--color-ink-subtle)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          )}
          {(hover != null ? [hover, data.length - 1] : [data.length - 1]).map((i) => (
            <circle key={i} cx={x(i)} cy={y(data[i].value)} r="4" fill="var(--color-primary)" stroke="var(--color-surface)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          ))}
          {/* ⚠ 끝값은 선 위에 놓이므로 **면 색 테두리**를 둘러 글자가 선을 이긴다
              (paint-order: stroke → 획을 먼저 칠하고 글자를 덮는다). 실측에서 비교
              점선과 겹쳐 읽히지 않았다. */}
          <text
            x={x(data.length - 1) - 6}
            y={y(last.value) - 11}
            textAnchor="end"
            fontSize="11"
            fontWeight="600"
            fill="var(--color-ink)"
            stroke="var(--color-surface)"
            strokeWidth="3.5"
            paintOrder="stroke"
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
            <span className="font-semibold tabular-nums text-ink">
              {data[hover].value}
              {unit}
            </span>
            {cmp && (
              <span className="ml-1.5 tabular-nums text-ink-subtle">({lbl.compare} {cmp[hover].value}{unit})</span>
            )}
            <span className="ml-1.5 text-ink-subtle">{data[hover].date}</span>
          </div>
        )}
      </div>
    </div>
  )
}

/* ---- 다계열 선 차트: 계열 색은 검증 통과한 series 토큰에서만, 범례 필수 ----
   ⚠ **선은 추세를 볼 때 쓴다.** 점이 대여섯 개뿐이면 읽는 사람의 일은 "흐름 보기"가 아니라
   "칸끼리 견주기"라서, 큰 도화지에 짧은 선 몇 가닥만 남고 공백이 화면을 먹는다
   (2026-08-13 사용자 지적: "너무 단순하고 공백도 많고"). 그 자리는 아래 GroupedBarChart 다. */
export interface LineSeries {
  name: string
  color: string // var(--color-series-*) — 검증 통과값만 (상태색 금지)
  data: Array<TrendPoint>
}

/**
 * 묶은 막대 — **적은 칸 × 여러 계열**을 견주는 자리.
 *
 * dataviz 규칙의 "Tell distinct series apart → grouped bar"에 해당한다. 5주 × 3계열 같은
 * 데이터는 선으로 그리면 점이 다섯 개라 흐름이 안 보이고 공백만 남는다 — 막대로 세우면
 * 주(週) 안에서 셋을 바로 견주고, 주끼리도 높이로 견준다.
 *
 * 마크 규격(dataviz):
 * - 데이터 끝만 4px 둥글게, **바닥은 직각** — 바닥이 둥글면 0 지점이 떠 보인다
 * - 이웃 막대 사이 2px 면 색 틈 — 테두리를 그리지 않고 틈으로 가른다
 * - 격자는 나누는 선(divider) 한 겹, 눈금 셋
 * - 값은 점마다 안 적는다 — 축과 툴팁이 나른다(범례는 늘 있다)
 */
export function GroupedBarChart({
  series,
  unit = '',
  height = 200,
}: {
  series: Array<LineSeries>
  unit?: string
  height?: number
}) {
  // ⚠ 눈금 좌표가 `t` 를 쓰는 자리라 사전은 통째로 받는다(위 TrendLineChart 와 같은 이유)
  const i18nBars = useI18n()
  const [hover, setHover] = useState<[number, number] | null>(null)
  const n = series[0].data.length
  const peak = Math.max(...series.flatMap((s) => s.data.map((d) => d.value)))
  const max = niceMax(peak * 1.1)
  // ⚠ 위 선 차트의 W/H 와 이름이 겹치지 않게 — 같은 파일에 두 좌표계가 산다
  const BW = 640
  const BH = height
  const PADB = { l: 40, r: 12, t: 10, b: 26 }
  const ticks = [0, max / 2, max]
  const y = (v: number) => PADB.t + (1 - v / max) * (BH - PADB.t - PADB.b)
  const bandW = (BW - PADB.l - PADB.r) / n
  /** 한 칸 안에서 계열이 나눠 갖는 폭 — 양 옆에 숨 쉴 자리를 남긴다(막대가 붙으면 벽이 된다) */
  const groupW = bandW * 0.66
  const barW = groupW / series.length

  return (
    <div>
      {/* 2계열 이상이면 범례는 늘 있다 (색만으로 정체를 말하지 않는다) */}
      <div className="mb-2 flex flex-wrap items-center gap-4 text-xs text-ink-muted">
        {series.map((s) => (
          <span key={s.name} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-[2px]" style={{ backgroundColor: s.color }} /> {s.name}
          </span>
        ))}
      </div>
      <div className="relative">
        <svg viewBox={`0 0 ${BW} ${BH}`} className="block w-full" role="img" aria-label={i18nBars.t('chart.aria.bars', '계열 비교')}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PADB.l} x2={BW - PADB.r} y1={y(t)} y2={y(t)} stroke="var(--color-divider)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
              <text x={PADB.l - 8} y={y(t) + 3.5} textAnchor="end" fontSize="10" fill="var(--color-ink-subtle)">
                {Math.round(t)}
                {t > 0 ? unit : ''}
              </text>
            </g>
          ))}
          {series[0].data.map((d, i) => (
            <text
              key={d.date}
              x={PADB.l + bandW * i + bandW / 2}
              y={BH - 8}
              textAnchor="middle"
              fontSize="10"
              fill="var(--color-ink-subtle)"
            >
              {d.date}
            </text>
          ))}
          {series.map((s, si) =>
            s.data.map((d, i) => {
              const x = PADB.l + bandW * i + (bandW - groupW) / 2 + barW * si
              const top = y(d.value)
              const h = Math.max(0, y(0) - top)
              const on = hover?.[0] === i && hover[1] === si
              return (
                <g key={`${s.name}-${d.date}`}>
                  {/* 이웃과 2px 면 색 틈 — 테두리 대신 틈이 가른다 */}
                  <rect
                    x={x + 1}
                    y={top}
                    width={Math.max(1, barW - 2)}
                    height={h}
                    rx="3"
                    fill={s.color}
                    /* ⚠ 바닥은 직각이어야 하는데 rx 는 네 모서리를 다 둥글린다 —
                       바닥을 덮는 사각형을 겹쳐 아래 두 모서리를 되돌린다 */
                    opacity={hover && !on ? 0.35 : 1}
                    className="chart-bar"
                    style={{ transformOrigin: `0 ${y(0)}px` }}
                  />
                  <rect
                    x={x + 1}
                    y={Math.max(top, y(0) - 3)}
                    width={Math.max(1, barW - 2)}
                    height={Math.min(3, h)}
                    fill={s.color}
                    opacity={hover && !on ? 0.35 : 1}
                    className="chart-bar"
                    style={{ transformOrigin: `0 ${y(0)}px` }}
                  />
                  {/* 히트 타깃은 마크보다 넉넉하게 — 얇은 막대를 정확히 겨누게 하지 않는다 */}
                  <rect
                    x={x}
                    y={PADB.t}
                    width={barW}
                    height={BH - PADB.t - PADB.b}
                    fill="transparent"
                    onPointerEnter={() => setHover([i, si])}
                    onPointerLeave={() => setHover(null)}
                  />
                </g>
              )
            }),
          )}
        </svg>
        {hover && (
          <div
            className="pointer-events-none absolute -translate-x-1/2 rounded-lg border border-hairline bg-raised px-3 py-1.5 text-xs shadow-lg"
            style={{
              left: `${((PADB.l + bandW * hover[0] + bandW / 2) / BW) * 100}%`,
              top: `${(y(series[hover[1]].data[hover[0]].value) / BH) * 100 - 18}%`,
            }}
          >
            <span className="font-semibold tabular-nums text-ink">
              {series[hover[1]].data[hover[0]].value}
              {unit}
            </span>
            <span className="ml-1.5 text-ink-subtle">
              {series[hover[1]].name} · {series[0].data[hover[0]].date}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export function MultiLineChart({ series, unit = '' }: { series: Array<LineSeries>; unit?: string }) {
  // ⚠ 이 안에서도 눈금 좌표가 `t` 라는 이름을 쓴다(TrendLineChart 와 같은 이유)
  const i18nMulti = useI18n()
  const ref = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<number | null>(null)
  /* ⚠⚠ **강조**(dataviz: "One series is the point, rest are context").
     사용자 지적: "눈에 띄는 부분이 없음". 같은 굵기·같은 채도의 선 셋은 서로를 지운다.
     범례를 **누르는 물건**으로 바꿔서, 하나를 고르면 나머지는 중립 회색으로 물러난다
     (감추지 않는다 — 맥락은 남아야 견줄 수 있다). 아무것도 고르지 않으면 지금과 같다. */
  const [focus, setFocus] = useState<string | null>(null)
  const n = series[0].data.length
  const flat = series.flatMap((s) => s.data.map((d) => d.value))
  const [floor, max] = axisRange(Math.min(...flat), Math.max(...flat))
  /* ⚠ 눈금 다섯 → **셋**(바닥·중간·최대). 격자가 다섯 줄이면 데이터보다 격자가 먼저 보인다 —
     참고로 잰 대시보드들은 격자를 아예 안 그리거나 한두 줄만 둔다. 다만 이건 운영 화면이라
     "얼마나 되나"를 읽어야 해서 눈금을 없애지는 않는다. 셋이면 위·가운데·아래로 읽힌다. */
  const ticks = [floor, (floor + max) / 2, max]
  const x = (i: number) => PAD.l + (i / (n - 1)) * (W - PAD.l - PAD.r)
  const y = (v: number) => PAD.t + (1 - (v - floor) / (max - floor)) * (H - PAD.t - PAD.b)
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
      {/* 2계열 이상이면 범례는 늘 있다 — 그리고 여기서는 **고르는 물건**이다 */}
      <div className="mb-2 flex flex-wrap items-center gap-1 text-xs">
        {series.map((s) => {
          const on = focus === s.name
          return (
            <button
              key={s.name}
              type="button"
              aria-pressed={on}
              onClick={() => setFocus(on ? null : s.name)}
              className={`flex items-center gap-1.5 rounded-full px-2 py-1 transition-colors hover:bg-chip ${
                on ? 'bg-chip font-semibold text-ink' : 'text-ink-muted'
              }`}
            >
              <span
                className="h-0.5 w-4 rounded-full"
                style={{ backgroundColor: focus && !on ? 'var(--color-ink-subtle)' : s.color }}
              />
              {s.name}
            </button>
          )
        })}
      </div>
      <div ref={ref} className="relative" onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label={i18nMulti.t('chart.aria.multiTrend', '다계열 추이')}>
          {ticks.map((t) => (
            <g key={t}>
              {/* ⚠ 격자는 **나누는 선**(divider)이지 감싸는 선(hairline)이 아니다.
                  둘을 같은 값으로 쓰면 카드 테두리와 격자가 같은 무게로 보여 화면이 시끄럽다
                  (DESIGN.md "선은 두 단계다"를 차트에도 적용). */}
              <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="var(--color-divider)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
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
          {/* 고른 선을 **맨 뒤에** 그려서 겹치는 자리에서 위로 온다 */}
          {[...series]
            .sort((a, b) => Number(a.name === focus) - Number(b.name === focus))
            .map((s) => {
              const dim = focus != null && s.name !== focus
              return (
                <path
                  key={s.name}
                  d={path(s)}
                  pathLength="1"
                  className="chart-line transition-[stroke,stroke-width,opacity] duration-200"
                  fill="none"
                  stroke={dim ? 'var(--color-ink-subtle)' : s.color}
                  strokeWidth={s.name === focus ? 1.9 : 1.25}
                  vectorEffect="non-scaling-stroke"
                  strokeOpacity={dim ? 0.4 : 1}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              )
            })}
          {hover != null && (
            <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={H - PAD.b} stroke="var(--color-ink-subtle)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          )}
          {hover != null &&
            series
              .filter((s) => focus == null || s.name === focus)
              .map((s) => (
                <circle key={s.name} cx={x(hover)} cy={y(s.data[hover].value)} r="4" fill={s.color} stroke="var(--color-surface)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
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

/**
 * **작은 배수** — 크기가 다른 계열을 한 축에 겹치지 않는다.
 *
 * ⚠⚠ 이게 dataviz 가 말하는 "#1 chart mistake" 의 정공법이다. `오늘 시스템 성능`을
 * 실측해 보니 세 계열이 350ms / 200ms / 20ms 라, 한 축에 겹치니 **스토리지 선이 192px
 * 플롯에서 2px** 만 썼다 — 선이 있는데 아무 말도 못 한다. 축을 둘로 나누는 것(dual-axis)은
 * 금지다(같은 높이가 다른 뜻이 되어 거짓 교차가 생긴다). 남은 정답은 둘 —
 * **작은 배수**, 아니면 공통 기준 대비 지수화. 응답시간은 "몇 ms 냐"가 곧 내용이라
 * 지수로 바꾸면 뜻이 사라진다. 그래서 배수다.
 *
 * 줄마다 **제 축**을 쓰고, 왼쪽에 이름과 **지금 값**을 크게 둔다(직접 라벨 — 범례 상자가
 * 필요 없다). 세로 십자선은 세 줄을 관통해서, 축이 달라도 "같은 시각"은 함께 읽힌다.
 */
export function SmallMultiples({
  series,
  unit = '',
  /** 값이 클수록 나쁜 지표인가 (응답시간·오류 등) — 증감 칩의 좋고 나쁨을 가른다 */
  lowerIsBetter = false,
}: {
  series: Array<LineSeries>
  unit?: string
  lowerIsBetter?: boolean
}) {
  const plotRef = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<number | null>(null)
  const n = series[0].data.length

  const onMove = (e: React.PointerEvent) => {
    const rect = plotRef.current?.getBoundingClientRect()
    if (!rect) return
    const i = Math.round(((e.clientX - rect.left) / rect.width) * (n - 1))
    setHover(Math.min(n - 1, Math.max(0, i)))
  }

  return (
    <div
      className="flex flex-1 flex-col gap-1"
      onPointerMove={onMove}
      onPointerLeave={() => setHover(null)}
    >
      {series.map((s, si) => {
        const vals = s.data.map((d) => d.value)
        /* 줄마다 제 축 — 바닥을 0 이 아니라 **제 최소값 조금 아래**로 둔다.
           dataviz: "bars start at 0 / lines need not". 0 을 강요하면 여기서도 선이 눌린다. */
        const lo = Math.min(...vals)
        const hi = Math.max(...vals)
        const pad = (hi - lo || hi || 1) * 0.35
        const min = Math.max(0, lo - pad)
        const max = hi + pad * 0.4
        const at = (v: number) => 100 - ((v - min) / (max - min || 1)) * 100
        const px = (i: number) => (i / (n - 1)) * 100
        const line = s.data.map((d, i) => `${i === 0 ? 'M' : 'L'}${px(i).toFixed(2)},${at(d.value).toFixed(2)}`).join('')
        const area = `${line}L100,100L0,100Z`
        const shown = hover ?? n - 1
        const first = vals[0]
        const cur = vals[shown]
        const diff = first === 0 ? 0 : Math.round(((cur - first) / first) * 100)

        return (
          /* 좁은 화면에서는 이름 칸을 줄인다 — 393px 에서 8.5rem 을 그대로 두면
             그림에 200px 밖에 안 남는다 (규약 §8 모바일) */
          <div key={s.name} className="grid min-h-0 flex-1 grid-cols-[5.5rem_minmax(0,1fr)] gap-3 pc:grid-cols-[8.5rem_minmax(0,1fr)]">
            <div className="min-w-0 self-center">
              <div className="truncate text-xs text-ink-muted">{s.name}</div>
              <div className="mt-0.5 flex items-baseline gap-1.5">
                <span className="text-xl font-semibold leading-none tabular-nums text-ink">
                  {cur}
                  <span className="ml-0.5 text-xs font-medium text-ink-subtle">{unit}</span>
                </span>
                {diff !== 0 && (
                  <DeltaChip delta={`${diff > 0 ? '+' : ''}${diff}%`} good={lowerIsBetter ? diff < 0 : diff > 0} />
                )}
              </div>
            </div>
            {/* ⚠ `preserveAspectRatio="none"` 로 **세로를 칸에 맞춰 늘린다** — 카드가 커지면
                그림도 커진다(비어 있던 자리가 곧 그림이 된다). 늘어나도 선 굵기가 변하지
                않도록 `non-scaling-stroke` 가 함께 간다. 이 안에는 글자를 넣지 않는다
                (글자는 늘어나면 찌그러진다 — 왼쪽 HTML 이 대신 말한다).
                ⚠⚠ 그리고 svg 는 **절대 위치**여야 한다. 흐름 안에 두면 `h-full` 이 auto
                높이 위에서 풀려서 viewBox 비율(1:1)로 되돌아가고, 카드가 폭 만큼 키가
                커진다 — 실측으로 카드가 505 → **2777px** 이 됐다. 절대 위치면 키 계산에
                끼지 않아, 칸의 키는 flex 가 정하고 그림이 그 키를 따라간다. */}
            <div ref={si === 0 ? plotRef : undefined} className="relative min-h-[44px]">
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="absolute inset-0 block h-full w-full"
                role="img"
                aria-label={`${s.name} 추이`}
              >
                <path d={area} fill={s.color} opacity="0.12" />
                <path
                  d={line}
                  pathLength="1"
                  className="chart-line"
                  fill="none"
                  stroke={s.color}
                  strokeWidth="2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
              {/* 점과 십자선은 HTML — 늘어난 좌표계 안에서 원이 타원이 되지 않는다 */}
              <span
                className="pointer-events-none absolute top-0 h-full w-px bg-divider transition-opacity"
                style={{ left: `${px(shown)}%`, opacity: hover == null ? 0 : 1 }}
              />
              <span
                className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface"
                style={{ left: `${px(shown)}%`, top: `${at(cur)}%`, backgroundColor: s.color }}
              />
            </div>
          </div>
        )
      })}
      <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3 pc:grid-cols-[8.5rem_minmax(0,1fr)]">
        <span />
        {/* ⚠ 가운데 칸은 **가리키는 지점**을 말한다. 손을 안 얹었으면 한가운데 눈금을
            보여 준다 — 예전엔 마지막 값을 넣어서 오른쪽 라벨과 "15시 / 15시"로 겹쳤다. */}
        <span className="flex justify-between text-[10px] text-ink-subtle">
          <span>{series[0].data[0].date}</span>
          <span className={hover == null ? '' : 'font-semibold text-ink'}>
            {series[0].data[hover ?? Math.floor((n - 1) / 2)].date}
          </span>
          <span>{series[0].data[n - 1].date}</span>
        </span>
      </div>
    </div>
  )
}

/* ---- 요일×시간 히트맵: 단일 색상 명도 램프 ---- */
export function TimeHeatmap({
  rows,
  cols,
  values,
  unit,
}: {
  rows: Array<string>
  cols: Array<string>
  values: Array<Array<number>> // rows × cols
  unit?: string
}) {
  const { t } = useI18n()
  const cellUnit = unit ?? t('chart.unit.count', '건')
  const [hover, setHover] = useState<[number, number] | null>(null)
  const flat = values.flat()
  const min = Math.min(...flat)
  const max = Math.max(...flat)
  const span = max - min || 1
  return (
    /* ⚠⚠ **SVG 를 버리고 CSS 격자로 그린다** (2026-08-13, 세 번 고치고 얻은 결론).
       ① `viewBox` + `w-full` → 24칸이 0.7배로 눌려 축 글자가 7.04px 로 그려졌다
       ② 자연 크기로 고정 → 1614px 카드에 357px 차트만 서서 가로 채움 **22%**("횡하다")
       ③ 상자 폭을 재서 칸 폭 계산 → `ResizeObserver` 가 안 도는 자리가 있어 첫 값에 머문다
       셋 다 **SVG 를 늘리려다 생긴 문제**다. 격자는 원래 HTML 이 잘하는 일이다 —
       칸은 `1fr` 로 컨테이너를 따라 늘고, 글자는 진짜 텍스트라 배율을 안 탄다.
       (dataviz `components.md`: "build each in plain HTML") */
    <div>
      <div
        className="grid gap-[3px]"
        style={{ gridTemplateColumns: `auto repeat(${cols.length}, minmax(0, 1fr))` }}
        role="img"
        aria-label={t('chart.aria.timeHeatmap', '요일·시간 분포')}
      >
        {rows.map((r, ri) => (
          <Fragment key={r}>
            <div className="pr-2 text-right text-[10px] leading-[28px] text-ink-subtle">{r}</div>
            {values[ri].map((v, ci) => (
              <div
                key={`${ri}-${ci}`}
                /* 둥근 칸은 '농도'로, 각진 격자는 '표'로 읽힌다 */
                className="h-7 rounded-[4px] transition-[outline-color] outline outline-1 outline-transparent"
                style={{
                  backgroundColor: 'var(--color-primary)',
                  opacity: 0.08 + ((v - min) / span) * 0.86,
                  outlineColor: hover?.[0] === ri && hover[1] === ci ? 'var(--color-ink)' : 'transparent',
                }}
                onPointerEnter={() => setHover([ri, ci])}
                onPointerLeave={() => setHover(null)}
              />
            ))}
          </Fragment>
        ))}
        {/* 가로축 — 첫 칸은 세로축 라벨 자리라 비운다 */}
        <div />
        {cols.map((c) => (
          <div key={c} className="pt-1 text-center text-[10px] text-ink-subtle">
            {c}
          </div>
        ))}
      </div>
      <div className="mt-1.5 text-xs text-ink-subtle">
        {hover ? (
          <>
            <b className="tabular-nums text-ink">{values[hover[0]][hover[1]]}{cellUnit}</b> · {rows[hover[0]]} {cols[hover[1]]}
          </>
        ) : (
          t('chart.heatmap.hint', '칸에 올리면 값이 보입니다 · 짙을수록 많음')
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
  const { t } = useI18n()
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
  const TOP = 6
  // 요일 축은 세 칸만 적는다(월·수·금) — 일곱을 다 적으면 격자보다 글자가 시끄럽다
  const weekdayLabels = [
    { row: 1, label: t('chart.weekday.mon', '월') },
    { row: 3, label: t('chart.weekday.wed', '수') },
    { row: 5, label: t('chart.weekday.fri', '금') },
  ]
  /* ⚠ 축 자리를 **26 으로 박아** 두었더니 EN 에서 'Mon' 앞이 잘려 나갔다 — 한글 한 자에
     맞춘 폭이었다(규약 §4-5 "영문은 1.5~2배, 고정폭 금지", 2026-08-18 EN 실검수).
     글자 폭을 재서 자리를 만든다: 10px 기준 ASCII ≈ 5.8px, 한글 ≈ 10px. */
  const axisTextWidth = Math.max(
    ...weekdayLabels.map((w) =>
      [...w.label].reduce((sum, ch) => sum + (ch.charCodeAt(0) < 128 ? 5.8 : 10), 0),
    ),
  )
  const LEFT = Math.ceil(axisTextWidth) + 10 // 글자 + 격자와의 틈
  const width = LEFT + weeks.length * (CELL + GAP)
  const height = TOP + 7 * (CELL + GAP)

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="block w-full" role="img" aria-label={t('chart.aria.dayHeatmap', '일별 검증 실행 히트맵')}>
        {weekdayLabels.map((w) => (
          <text
            key={w.label}
            x={LEFT - 6}
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
              <span className="font-semibold tabular-nums text-ink">
                {hover.value}K{t('chart.unit.count', '건')}
              </span>{' '}
              · {hover.date}
            </>
          ) : (
            t('chart.heatmap.dayHint', '칸에 올리면 일자별 처리량이 보입니다')
          )}
        </span>
        <span className="flex items-center gap-1">
          {t('chart.heatmap.less', '적음')}
          {HEAT_STEPS.map((o) => (
            <span
              key={o}
              className="h-2.5 w-2.5 rounded-[3px]"
              style={{ backgroundColor: 'var(--color-primary)', opacity: o }}
            />
          ))}
          {t('chart.heatmap.more', '많음')}
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
    /* ⚠ 줄 목록 — 남는 세로는 줄 사이가 먹는다 (StatusStackBar 주석과 같은 규칙) */
    <div className="flex min-h-0 flex-1 flex-col justify-between gap-1">
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

/**
 * 요약 타일 안에 들어가는 **얇은 구성 막대** — 범례 없이 비율만 말한다.
 *
 * ⚠ `StatusStackBar` 는 범례까지 갖춘 위젯이라 타일에 넣으면 카드가 통째로 차트가 된다.
 * 타일에서 필요한 것은 "숫자 하나가 무엇으로 이뤄졌나"뿐이다(규약 §10: 숫자 하나만 서
 * 있으면 판단이 안 된다). 값은 `title` 로 읽히게 두어 **색만으로 말하지 않는다**(§16).
 */
export function MiniStackBar({ data, height = 6 }: { data: Array<StackDatum>; height?: number }) {
  const total = data.reduce((a, d) => a + d.value, 0) || 1
  return (
    <span className="flex w-full gap-[2px] overflow-hidden rounded-full" style={{ height }}>
      {data.map((d, i) => (
        <span
          key={d.label}
          title={`${d.label} ${d.value}`}
          className={`${i === 0 ? 'rounded-l-full' : ''} ${i === data.length - 1 ? 'rounded-r-full' : ''}`}
          style={{ width: `${(d.value / total) * 100}%`, backgroundColor: d.fill }}
        />
      ))}
    </span>
  )
}

export function StatusStackBar({ data }: { data: Array<StackDatum> }) {
  const [hover, setHover] = useState<number | null>(null)
  const total = data.reduce((a, d) => a + d.value, 0)
  return (
    /* ⚠ 줄 목록은 **남는 세로를 줄들이 나눠 갖는다** (2026-08-14 빈 면 쓸기).
       그림처럼 커질 수 없는 물건이라, 카드가 옆 카드에 키를 맞춘 만큼을 줄 사이가 먹는다 —
       아래에 흰 면으로 남기는 것보다 낫다. 안 늘어난 카드에서는 gap 이 바닥이라 그대로다. */
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-5 w-full shrink-0 gap-[2px]">
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
      <div className="mt-4 flex min-h-0 flex-1 flex-col justify-between gap-2">
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
