import { expect, test } from '@playwright/test'

/**
 * 연속 처리의 자국 — "승인 눌렀는데 안 된 줄 알고 계속 누른다"(2026-08-26 사용자 지적)를
 * 판으로 지킨다. 다음 건이 같은 모달에 바로 서는 구조라, 신호 없는 전환은 연타를 부르고
 * 연타의 두 번째 클릭은 **다음 건을 실수 승인**한다.
 */
test.describe('결재 연속 처리 피드백', () => {
  test.use({ viewport: { width: 1280, height: 900 }, isMobile: false })

  test('승인 직후 — 자국 배너·남은 건수가 서고, 버튼은 잠깐 잠긴다', async ({ page }) => {
    await page.goto('/approvals')
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})

    // 내 차례 첫 건을 연다 (겹친 둘 중 먼저 것 — 이름 일부 셀렉터 함정 회피)
    await page
      .locator('ol > li')
      .filter({ hasText: 'VN7 엔진 사양서 v2.3' })
      .filter({ hasNotText: '출력 재조정' })
      .getByRole('button', { name: '검토하기' })
      .click()
    const modal = page.getByRole('dialog')
    // 제목 옆 상시 카운터
    await expect(modal.getByText('내 차례 4건')).toBeVisible()

    await modal.getByRole('button', { name: '✓ 승인' }).click()

    // ① 자국 배너 — 방금 무엇이 처리됐는지 + 남은 수
    await expect(modal.getByText('승인 처리됨')).toBeVisible()
    await expect(modal.getByText('남은 내 차례 3건')).toBeVisible()
    // ② 모달에는 이미 **다음 건**이 서 있다 (연속 처리)
    await expect(modal.getByText('VN7 엔진 사양서 v2.3 (출력 재조정)')).toBeVisible()
    // ③ 연타 잠금 — 처리 직후에는 승인 버튼이 눌리지 않는다 (0.7초)
    await expect(modal.getByRole('button', { name: '✓ 승인' })).toBeDisabled()
    // 잠금은 풀린다 — 다음 판단을 막는 물건이 아니다
    await expect(modal.getByRole('button', { name: '✓ 승인' })).toBeEnabled({ timeout: 2000 })
  })
})
