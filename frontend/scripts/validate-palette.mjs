/**
 * 차트 색 검사 — `node scripts/validate-palette.mjs`
 *
 * DESIGN.md 는 "차트 상태 필 팔레트는 CVD 검증 통과본만 사용"이라고 정해 놨는데
 * 정작 **재는 도구가 저장소에 없었다**(2026-08-11). 색을 손볼 때마다 눈으로 판단하면
 * 그 규칙은 문서에만 남는다 — 여기서 숫자로 센다.
 *
 * 무엇을 보나
 *  ① 색맹 3종(적녹 2종·청황 1종)으로 **시뮬레이션**한 뒤 계열끼리 충분히 벌어져 있는가
 *  ② 각 색이 자기 배경(카드 면) 위에서 **덩어리로 보일 만큼** 밝기가 다른가
 *
 * 색맹 시뮬레이션은 Viénot·Brettel·Mollon(1999)의 LMS 투영, 거리는 CIELAB ΔE(CIE76).
 * ΔE 20 은 "색 이름이 달라지는" 대략의 선 — 인접 막대를 가를 수 있는 최소치로 잡았다.
 */

const MIN_DELTA_E = 20 // 계열끼리 (색맹 시뮬레이션 후에도)
const MIN_CONTRAST = 1.9 // 색 vs 카드 면 (덩어리가 면에서 떠 보이는 최소선)

/** styles.css 와 같은 값을 손으로 옮겨 적지 않는다 — 파일에서 읽는다 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const css = readFileSync(join(here, '..', 'src', 'styles.css'), 'utf8')

/** `--color-fill-x: <색>;` 을 테마 블록별로 긁는다 */
function readFills(block) {
  const out = {}
  for (const m of block.matchAll(/--color-fill-([a-z0-9-]+):\s*([^;]+);/g)) {
    out[m[1]] = m[2].trim()
  }
  return out
}
function readSurface(block) {
  const m = /--color-surface:\s*([^;]+);/.exec(block)
  return m ? m[1].trim() : '#ffffff'
}

// ⚠ 주석에도 `[data-theme='light']` 이라는 글자가 나온다 — **규칙이 열리는 자리**로 자른다
const lightStart = css.indexOf("\n[data-theme='light'] {")
const darkBlock = css.slice(0, lightStart)
const lightBlock = css.slice(lightStart)

/* ---- 색 변환 ---------------------------------------------------------- */

const srgbToLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const linearToSrgb = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055)
const clamp01 = (v) => Math.min(1, Math.max(0, v))

function parseColor(str) {
  const s = str.trim()
  if (s.startsWith('#')) {
    const h = s.slice(1)
    const n = h.length === 3 ? h.split('').map((c) => c + c) : [h.slice(0, 2), h.slice(2, 4), h.slice(4, 6)]
    return n.map((x) => parseInt(x, 16) / 255)
  }
  const ok = /^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)$/.exec(s)
  if (ok) return oklchToRgb(+ok[1], +ok[2], +ok[3])
  throw new Error(`모르는 색 형식: ${str}`)
}

function oklchToRgb(L, C, hDeg) {
  const h = (hDeg * Math.PI) / 180
  const a = C * Math.cos(h)
  const b = C * Math.sin(h)
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.291485548 * b
  const l = l_ ** 3
  const m = m_ ** 3
  const s = s_ ** 3
  return [
    linearToSrgb(clamp01(+4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s)),
    linearToSrgb(clamp01(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s)),
    linearToSrgb(clamp01(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)),
  ]
}

/** sRGB → CIELAB (D65) */
function rgbToLab([r, g, b]) {
  const [R, G, B] = [srgbToLinear(r), srgbToLinear(g), srgbToLinear(b)]
  const x = (0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047
  const y = 0.2126 * R + 0.7152 * G + 0.0722 * B
  const z = (0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))]
}

const deltaE = (c1, c2) => {
  const a = rgbToLab(c1)
  const b = rgbToLab(c2)
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
}

const relLum = ([r, g, b]) => 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b)
const contrast = (c1, c2) => {
  const [a, b] = [relLum(c1), relLum(c2)].sort((x, y) => y - x)
  return (a + 0.05) / (b + 0.05)
}

/* ---- 색맹 시뮬레이션 (Viénot 1999) ------------------------------------ */

const MAT = {
  정상: [1, 0, 0, 0, 1, 0, 0, 0, 1],
  // 적색맹(protanopia) · 녹색맹(deuteranopia) · 청색맹(tritanopia)
  적색맹: [0.11238, 0.88762, 0, 0.11238, 0.88762, 0, 0.004, -0.004, 1],
  녹색맹: [0.29275, 0.70725, 0, 0.29275, 0.70725, 0, -0.02234, 0.02234, 1],
  청색맹: [1, 0.14461, -0.14461, 0, 0.85659, 0.14341, 0, 0.85659, 0.14341],
}
function simulate(rgb, kind) {
  if (kind === '정상') return rgb
  const m = MAT[kind]
  const [r, g, b] = rgb.map(srgbToLinear)
  return [
    linearToSrgb(clamp01(m[0] * r + m[1] * g + m[2] * b)),
    linearToSrgb(clamp01(m[3] * r + m[4] * g + m[5] * b)),
    linearToSrgb(clamp01(m[6] * r + m[7] * g + m[8] * b)),
  ]
}

/* ---- 검사 ------------------------------------------------------------- */

let failed = 0
for (const [theme, block] of [
  ['다크', darkBlock],
  ['라이트', lightBlock],
]) {
  const fills = readFills(block)
  const surface = parseColor(readSurface(block))
  const names = Object.keys(fills)
  console.log(`\n== ${theme} (면 ${readSurface(block)}) — 계열 ${names.length}개`)

  for (const n of names) {
    const c = contrast(parseColor(fills[n]), surface)
    const ok = c >= MIN_CONTRAST
    if (!ok) failed++
    console.log(`  ${ok ? '·' : '✗'} ${n.padEnd(9)} 면 대비 ${c.toFixed(2)} ${ok ? '' : `< ${MIN_CONTRAST}`}`)
  }

  for (const kind of Object.keys(MAT)) {
    const worst = []
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        const d = deltaE(
          simulate(parseColor(fills[names[i]]), kind),
          simulate(parseColor(fills[names[j]]), kind),
        )
        worst.push({ pair: `${names[i]}↔${names[j]}`, d })
      }
    }
    worst.sort((a, b) => a.d - b.d)
    const bad = worst.filter((w) => w.d < MIN_DELTA_E)
    failed += bad.length
    const head = bad.length === 0 ? '·' : '✗'
    console.log(
      `  ${head} ${kind.padEnd(4)} 가장 가까운 쌍 ${worst[0].pair} ΔE ${worst[0].d.toFixed(1)}` +
        (bad.length ? `  — 기준 ${MIN_DELTA_E} 미만 ${bad.length}쌍: ${bad.map((b) => b.pair).join(', ')}` : ''),
    )
  }
}

console.log(failed === 0 ? '\n통과 — 색맹 3종에서도 계열이 갈린다' : `\n실패 ${failed}건`)
process.exit(failed === 0 ? 0 : 1)
