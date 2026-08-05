import { chromium, devices } from '@playwright/test'
const browser = await chromium.launch()
const ctx = await browser.newContext({ ...devices['Pixel 7'] })
const page = await ctx.newPage()
for (const p of ['/specs/SP-001', '/deploys']) {
  await page.goto('http://localhost:3000' + p, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  const out = await page.evaluate(() => {
    const doc = document.documentElement
    const rows = []
    for (const el of document.querySelectorAll('main *')) {
      const r = el.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) continue
      if (r.width > doc.clientWidth + 2) {
        const cls = String(el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className)
        rows.push({ w: Math.round(r.width), tag: el.tagName, cls: cls.slice(0, 110) })
      }
    }
    rows.sort((a, b) => a.w - b.w)
    return rows.slice(0, 8)
  })
  console.log('=== ' + p + ' ===')
  for (const r of out) console.log(`  w=${r.w} ${r.tag} .${r.cls}`)
}
await browser.close()
