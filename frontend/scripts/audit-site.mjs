/**
 * 사이트 점검 — 전 화면 × 라이트/다크 × PC/모바일 을 훑어 **눈으로 놓치는 것**을 잡는다.
 *
 *   node scripts/audit-site.mjs        # dev 서버(:3000)가 떠 있어야 한다
 *
 * 무엇을 재나: ① 글자 대비(WCAG 1.4.3 — 작은 글자 4.5, 큰 글자 3) ② 가로 넘침
 * ③ 콘솔·JS 오류 ④ 라우트에 없는 링크 ⑤ 사실상 빈 화면.
 *
 * ⚠⚠ **색은 정규식으로 파싱하지 않는다** — 이 프로젝트 색은 `oklab()`·`color-mix()` 로도
 * 나온다. 캔버스에 실제로 칠해 픽셀을 읽고, 배경은 조상을 타고 올라가며 **알파를 합성**한다.
 * (흰색을 미리 깔고 재면 반투명 면이 뭉개져 사이드바가 통째로 "대비 1"로 나온다 — 실수 1회.)
 * ⚠ 그라디언트 위 글자는 **건너뛴다**(활성 메뉴 알약·CTA) — 눈으로 볼 자리다.
 * ⚠ 4.5 를 아슬하게 못 넘는 값(4.4~4.49)까지 손대면 화면이 시끄러워진다 — 규약 §23-11
 *   "3:1 은 과교정이었다"를 되풀이하지 말 것. 2.x 대가 진짜 고칠 자리다.
 *
 * 2026-09-02 첫 판: 39판 지적 → 보드 상태 배지·칩(라이트 2.06)과 아바타 이니셜(3.8)을
 * 고쳐 22판. 같은 판에서 토스트가 주 버튼을 덮는 것(103×26px)도 함께 잡혔다.
 */
import { chromium } from '@playwright/test'

const BASE = 'http://localhost:3000'
const ROUTES = [
  '/dashboard','/analytics','/kpi-ivi','/kpi-metrics','/members','/roles','/menus',
  '/specs','/board','/approvals','/deploys','/validation-engine','/validation-results',
  '/validation-reports','/notice','/qna','/faq','/guide','/alerts','/privacy',
  '/login','/signup','/specs/SP-001',
]
const KNOWN = new Set([...ROUTES, '/', '/specs/SP-002', '/specs/SP-003', '/specs/SP-004'])

const AUDIT = () => {
  /* 색은 캔버스에 실제로 칠해 픽셀로 읽는다 — oklab()·color-mix() 는 정규식으로 못 읽는다.
     배경은 조상을 타고 올라가며 **알파를 합성**한다(반투명 면을 흰색으로 가정하면 거짓말이 된다). */
  const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
  const rgba = (c) => { ctx.clearRect(0,0,1,1); ctx.fillStyle = c; ctx.fillRect(0,0,1,1); const d = ctx.getImageData(0,0,1,1).data; return [d[0],d[1],d[2],d[3]/255] }
  const over = (fg, bg) => fg[3] >= 1 ? fg : [0,1,2].map(i => Math.round(fg[i]*fg[3] + bg[i]*(1-fg[3]))).concat(1)
  const L = (c) => { const [r,g,b] = c.slice(0,3).map(v => { v/=255; return v <= 0.03928 ? v/12.92 : ((v+0.055)/1.055)**2.4 }); return 0.2126*r+0.7152*g+0.0722*b }
  const ratio = (a,b) => { const [x,y] = [L(a),L(b)].sort((m,n)=>n-m); return +((x+0.05)/(y+0.05)).toFixed(2) }
  const rootBg = rgba(getComputedStyle(document.body).backgroundColor)
  const bgOf = (el) => {
    const stack = []
    for (let n = el; n; n = n.parentElement) {
      const st = getComputedStyle(n)
      if (st.backgroundImage !== 'none') return null // 그라디언트·이미지 위 — 눈으로 본다
      const c = rgba(st.backgroundColor)
      if (c[3] > 0) { stack.push(c); if (c[3] >= 1) break }
    }
    return stack.reduceRight((acc, c) => over(c, acc), rootBg)
  }
  const low = [], dead = []
  for (const el of document.querySelectorAll('h1,h2,h3,h4,p,span,a,button,li,td,th,label,strong,em,div')) {
    const txt = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(' ').trim()
    if (!txt) continue
    const st = getComputedStyle(el)
    if (st.visibility === 'hidden' || st.display === 'none' || +st.opacity === 0) continue
    const r = el.getBoundingClientRect()
    if (!r.width || !r.height) continue
    const bg = bgOf(el)
    if (!bg) continue
    const fg = over(rgba(st.color), bg)
    const c = ratio(fg, bg)
    const size = parseFloat(st.fontSize), bold = +st.fontWeight >= 700
    const need = (size >= 24 || (size >= 18.66 && bold)) ? 3 : 4.5
    if (c < need) low.push({ t: txt.slice(0,28), c, need, size: Math.round(size), color: st.color })
  }
  for (const a of document.querySelectorAll('a[href]')) {
    const h = a.getAttribute('href')
    if (h.startsWith('http') || h.startsWith('#') || h.startsWith('mailto')) continue
    dead.push({ t: a.textContent.trim().slice(0,24), href: h.split('?')[0] })
  }
  return {
    low: low.slice(0, 8),
    lowCount: low.length,
    links: [...new Set(dead.map(d => d.href))],
    overflow: document.documentElement.scrollWidth,
    textLen: document.body.innerText.length,
  }
}

const b = await chromium.launch()
const results = []
for (const [w, h, dev] of [[1440, 900, 'PC'], [393, 852, 'MO']]) {
  for (const theme of ['dark', 'light']) {
    const p = await b.newPage({ viewport: { width: w, height: h } })
    const errs = new Map()
    p.on('pageerror', (e) => errs.set('js: ' + e.message.slice(0,120), 1))
    p.on('console', (m) => { if (m.type() === 'error') errs.set('console: ' + m.text().slice(0,120), 1) })
    await p.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' })
    await p.evaluate((t) => { localStorage.setItem('theme', t); localStorage.setItem('auth.token', 'audit') }, theme)
    for (const route of ROUTES) {
      errs.clear()
      await p.goto(BASE + route, { waitUntil: 'domcontentloaded' })
      await p.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
      await p.waitForTimeout(700)
      const r = await p.evaluate(AUDIT)
      results.push({ dev, theme, route, ...r, errs: [...errs.keys()], w })
    }
    await p.close()
  }
}
await b.close()

const bad = results.filter(r => r.lowCount || r.overflow > r.w || r.errs.length || r.textLen < 200)
console.log(`점검 ${results.length}판 · 지적 ${bad.length}판\n`)
for (const r of bad) {
  const tags = []
  if (r.overflow > r.w) tags.push(`가로넘침 ${r.overflow}>${r.w}`)
  if (r.textLen < 200) tags.push(`글자 ${r.textLen}자(빈 화면?)`)
  if (r.errs.length) tags.push(`오류 ${r.errs.length}`)
  if (r.lowCount) tags.push(`대비미달 ${r.lowCount}`)
  console.log(`■ [${r.dev}/${r.theme}] ${r.route} — ${tags.join(' · ')}`)
  for (const l of r.low) console.log(`    ${l.c} < ${l.need}  "${l.t}"  ${l.size}px ${l.color}`)
  for (const e of r.errs) console.log(`    ${e}`)
}
const allLinks = [...new Set(results.flatMap(r => r.links))]
console.log('\n링크 대상(라우트에 없는 것만):', allLinks.filter(h => !new Set(['/dashboard','/analytics','/kpi-ivi','/kpi-metrics','/members','/roles','/menus','/specs','/board','/approvals','/deploys','/validation-engine','/validation-results','/validation-reports','/notice','/qna','/faq','/guide','/alerts','/privacy','/login','/signup','/']).has(h) && !h.startsWith('/specs/')))
