import { expect, test } from '@playwright/test'

/**
 * 메뉴 활성 관문 (FR-032) — 메뉴 관리의 부제 "정본은 이 목록이다(LNB·팔레트·권한이 함께
 * 본다)"를 판으로 지킨다.
 *
 * ⚠ 이 판이 없던 동안 LNB 는 data/menus 를 한 줄도 안 봤다 — 시드의 FAQ 가 꺼져(취소선)
 * 있는데 LNB 엔 FAQ 가 살아 있었다(2026-08-25 웹 실사). 화면이 지키지 못할 말을 했다.
 *
 * LNB 는 넓은 화면에서 상주하므로 넓은 화면으로 잰다(좁은 화면 LNB 는 서랍 안).
 */
test.describe('메뉴 활성 관문', () => {
  test.use({ viewport: { width: 1280, height: 800 }, isMobile: false })

  test('메뉴를 끄면 LNB 에서 정말 사라지고, 되돌리면 돌아온다 (FR-032)', async ({ page }) => {
    await page.goto('/menus')
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})

    const lnbFaq = page.locator('nav').getByRole('link', { name: 'FAQ', exact: true })
    await expect(lnbFaq, '시드의 FAQ 는 켜져 있다 (minimal 메뉴가 꺼진 시드는 모순)').toBeVisible()

    // 토글은 접근성 이름("FAQ 노출")으로 집는다 — 행 클릭은 설정 패널을 여는 딴 조작이다
    await page.getByRole('switch', { name: /FAQ/ }).first().click()
    await expect(lnbFaq, '끄면 LNB 에서 사라진다 — 정본은 목록이라는 말이 사실이 된다').toBeHidden()

    // 무르기는 토스트 손잡이로 (규약 §2 — 확인 대신 undo)
    await page.getByRole('button', { name: /되돌리기|실행 취소/ }).click()
    await expect(lnbFaq, '되돌리면 LNB 에 돌아온다').toBeVisible()
  })
})
