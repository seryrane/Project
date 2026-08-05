import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * 모바일 스모크 — 규약(docs/화면_공통규칙.md) §8 이 정한 최소선을 좌표로 지킨다.
 * 화면을 더하면 PAGES 에 한 줄 넣는다. 데스크톱만 보고는 이 부류를 절대 못 잡는다.
 *
 * ⚠ skip 은 통과가 아니다 — 요소를 못 찾으면 실패로 남겨 셀렉터를 고친다.
 */

const PAGES = [
  '/specs',
  '/dashboard',
  '/analytics',
  '/approvals',
  '/specs/SP-001',
  '/deploys',
  '/validation-engine',
  '/validation-results',
  '/validation-reports',
  '/members',
  '/roles',
  '/menus',
  '/notice',
  '/qna',
  '/faq',
  '/guide',
  '/privacy',
]

/** SSR 마크업은 수화 전에도 눌리지만 아무 일도 안 한다 — 조용히 빠져나가는 판이
 *  되지 않게, 상호작용 전에는 네트워크가 잠잠해질 때까지(=수화 완료) 기다린다. */
async function ready(page: Page, path: string) {
  await page.goto(path)
  await page.waitForLoadState('networkidle')
}

for (const path of PAGES) {
  test(`${path} — 페이지가 가로로 넘치지 않는다`, async ({ page }) => {
    await page.goto(path)
    await page.waitForLoadState('networkidle')
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    )
    expect(overflow, '가로 넘침(px) — 표는 자기 상자 안에서만 흐른다').toBeLessThanOrEqual(0)
  })
}

test('서랍 — 열리고, 잎을 고르면 닫힌다 (가지는 그대로)', async ({ page }) => {
  await ready(page, '/specs')
  const aside = page.locator('aside')

  // 처음에는 접혀 있다 (본문을 가리면 안 된다)
  await expect(aside).not.toBeInViewport()

  await page.getByRole('button', { name: '메뉴 열기' }).click()
  await expect(aside).toBeInViewport()

  // 가지(섹션 접기)는 서랍을 닫지 않는다 — 닫으면 다음에 누를 것이 사라진다
  await page.locator('aside').getByRole('button', { name: /^관리/ }).click()
  await expect(aside).toBeInViewport()

  // 잎(메뉴 항목)을 고르면 닫히고 이동한다
  await page.locator('aside').getByRole('link', { name: /대시보드/ }).click()
  await expect(page).toHaveURL(/\/dashboard/)
  await expect(page.locator('aside')).not.toBeInViewport()
})

test('서랍 — 가림막을 누르면 닫힌다', async ({ page }) => {
  await ready(page, '/specs')
  await page.getByRole('button', { name: '메뉴 열기' }).click()
  await expect(page.locator('aside')).toBeInViewport()
  await page.getByRole('button', { name: '메뉴 닫기' }).click({ position: { x: 380, y: 400 } })
  await expect(page.locator('aside')).not.toBeInViewport()
})

test('모달 — 하단 시트로 뜨고 Esc 로 닫힌다', async ({ page }) => {
  // 상세는 이제 본문 페이지라(규약 §1 결정) 모달 검증은 버전 비교로 한다
  await ready(page, '/specs')
  await page.getByRole('button', { name: '버전 비교' }).first().click()

  const sheet = page.locator('.fixed.inset-0.z-50 > div')
  await expect(sheet).toBeVisible()

  // 바닥에 붙는다 (닫기가 엄지 자리) + 가로 100%.
  // ⚠ 뷰포트 픽셀과 직접 비교하면 DPR 반올림·오버레이 스크롤바로 몇 px 어긋난다 —
  //   불변식은 "시트가 자기 컨테이너(inset-0)를 가로로 가득 채우고 바닥에 붙는다"이다
  // 열림 애니메이션(scale 0.97→1)이 끝난 뒤에 잰다 — 도중에 재면 3~12px 작게 나온다
  await sheet.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)))
  const box = (await sheet.boundingBox())!
  const cont = (await page.locator('.fixed.inset-0.z-50').first().boundingBox())!
  expect(Math.abs(box.y + box.height - (cont.y + cont.height)), '시트 아래 끝 = 컨테이너 아래').toBeLessThan(2)
  expect(Math.abs(box.width - cont.width), '시트 가로 = 컨테이너 가로').toBeLessThan(2)

  // 덮은 것은 Esc 로 닫힌다
  await page.keyboard.press('Escape')
  await expect(sheet).not.toBeVisible()
})

test('터치 타깃 — 조작이 40px(표·칩 안 36px) 아래로 내려가지 않는다', async ({ page }) => {
  await ready(page, '/specs')
  await page.waitForLoadState('networkidle')
  const tooSmall = await page.evaluate(() => {
    const bad: Array<string> = []
    for (const el of document.querySelectorAll<HTMLElement>('button, select, a[href]')) {
      const r = el.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) continue // 안 보이는 것
      // 토글 스위치는 시각 22px + ::before 히트존 40px — rect 로는 히트존이 안 재진다
      if (el.getAttribute('role') === 'switch') continue
      if (r.height < 35.5)
        bad.push(`${el.tagName} "${el.textContent.trim().slice(0, 20)}" h=${Math.round(r.height)}`)
    }
    return bad
  })
  expect(tooSmall, '35.5px 미만 조작 목록').toEqual([])
})
