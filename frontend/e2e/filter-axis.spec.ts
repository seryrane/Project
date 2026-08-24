import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * 거르는 축 이름표 — 규약 §23-10 을 **좌표로** 지킨다 (관문 `components/portal/FilterAxis`).
 *
 * 이 규칙은 오랫동안 문서에만 있고 코드에는 사양서 화면 하나에만 있었다(지역 함수).
 * 관문으로 올리면서 판을 함께 세운다 — 안 세우면 다음 화면이 또 규칙 밖으로 난다.
 *
 * 재는 것 셋:
 *  ① 축마다 이름표가 **보인다** (묶음 이름으로 집는다 — 화면의 같은 낱말과 안 겹친다)
 *  ② 이름표가 칩 칸을 **안 덮는다** (span 에 overflow-hidden 이 없어 넘치면 겹친다)
 *  ③ 축끼리 **줄이 다르다** (한 덩어리로 흐르면 경계가 사라진다 — 393px 에서 밟은 병)
 */

const AXES = [
  { path: '/specs', labels: ['카테고리', '상태'] },
  { path: '/members', labels: ['상태', '등급'] },
  { path: '/alerts', labels: ['심각도', '해결 여부'] },
] as const

async function ready(page: Page, path: string) {
  await page.goto(path)
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
}

for (const { path, labels } of AXES) {
  test(`${path} — 거르는 축마다 이름표가 자기 줄에 선다 (§23-10)`, async ({ page }) => {
    await ready(page, path)

    const tops: Array<number> = []
    for (const name of labels) {
      const axis = page.getByRole('group', { name, exact: true })
      await expect(axis, `${name} 축이 묶음으로 서 있다`).toBeVisible()

      const label = axis.locator('span').first()
      const field = axis.locator('> div')
      await expect(label).toBeVisible()

      const lb = await label.boundingBox()
      const fb = await field.boundingBox()
      expect(lb, '이름표 좌표를 잰다').not.toBeNull()
      expect(fb, '칩 칸 좌표를 잰다').not.toBeNull()
      // ② 이름표 오른쪽 끝이 칩 칸 왼쪽을 넘지 않는다 — 넘으면 글자가 칩을 덮는다
      expect(lb!.x + lb!.width, `${name} 이름표가 칩 칸을 덮지 않는다`).toBeLessThanOrEqual(fb!.x + 1)

      tops.push(Math.round(lb!.y))
    }

    // ③ 축끼리 세로로 갈린다 — 같은 줄에 있으면 접혔을 때 경계가 사라진다
    expect(new Set(tops).size, '축이 저마다 자기 줄에 있다').toBe(labels.length)
  })
}

test('EN 으로 바꿔도 이름표가 칩을 덮지 않는다 (Category 는 한글보다 넓다)', async ({ page }) => {
  /* 언어 단추는 헤더에 있고 좁은 화면에서는 줄이 접힌다 — 판이 헤더 사정에 흔들리지
     않게 **정본 저장소**(localStorage 'locale')를 미리 심고 들어간다. */
  await page.addInitScript(() => window.localStorage.setItem('locale', 'en'))
  await ready(page, '/specs')

  const axis = page.getByRole('group', { name: 'Category', exact: true })
  await expect(axis, '이름표가 사전을 탄다 — 한국어가 남으면 실패').toBeVisible()

  const lb = await axis.locator('span').first().boundingBox()
  const fb = await axis.locator('> div').boundingBox()
  expect(lb!.x + lb!.width, 'EN 이름표가 칩 칸을 덮지 않는다').toBeLessThanOrEqual(fb!.x + 1)
})
