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
    // 다음 건의 **실제 제목**이 발에 서 있다 — 수만이 아니라 무엇이 오는지
    await expect(modal.getByText('다음 ▸')).toBeVisible()
    // 뒤에 남은 만큼 종이가 겹쳐 보인다 (최대 2장)
    await expect(page.locator('[data-stack-lip]')).toHaveCount(2)

    await modal.getByRole('button', { name: '✓ 승인' }).click()

    // ① 자국 배너 — 방금 무엇이 처리됐는지 + 남은 수
    await expect(modal.getByText('승인 처리됨')).toBeVisible()
    await expect(modal.getByText('남은 내 차례 3건')).toBeVisible()
    /* ② 모달에는 **다음 건**이 선다 (연속 처리).
       ⚠ 제목으로 가르면 안 된다 — 교체는 **연출이 끝난 뒤**(0.3초)라, 그 사이에는 아직 앞
       건이 서 있고 같은 제목이 겹침 목록·다음 칩에도 나와 strict 위반이 난다(2026-08-27).
       머리의 요청 ID 로 가른다 — 한 건에 하나뿐이고, 롤링 판(아래)이 쓰는 잣대와 같다. */
    await expect(modal.getByText(/^APR-\d{4}-\d+$/).first()).toHaveText('APR-2026-0116')
    // ③ 연타 잠금 — 처리 직후에는 승인 버튼이 눌리지 않는다 (0.7초)
    await expect(modal.getByRole('button', { name: '✓ 승인' })).toBeDisabled()
    // 잠금은 풀린다 — 다음 판단을 막는 물건이 아니다
    await expect(modal.getByRole('button', { name: '✓ 승인' })).toBeEnabled({ timeout: 2000 })
    // 진행이 배지에 분수로 남는다 — 바만으로는 뜻이 안 읽힌다("저 점이 뭔지 불분명")
    await expect(modal.getByText('1/4 처리 · 3건 남음')).toBeVisible()
  })

  test('롤링 — 다음 칩을 누르면 그 건이 앞으로 오고, 지금 건은 큐에 남는다', async ({ page }) => {
    await page.goto('/approvals')
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
    await page
      .locator('ol > li')
      .filter({ hasText: 'VN7 엔진 사양서 v2.3' })
      .filter({ hasNotText: '출력 재조정' })
      .getByRole('button', { name: '검토하기' })
      .click()
    const modal = page.getByRole('dialog')
    // 지금 건 = 0115. 다음 칩(출력 재조정)을 누르면 —
    await modal.getByRole('button', { name: 'VN7 엔진 사양서 v2.3 (출력 재조정)' }).click()
    // 그 건이 앞으로 온다 (머리의 요청 ID 로 가른다 — 제목은 형제 건에도 걸린다)
    await expect(modal.getByText(/^APR-\d{4}-\d+$/).first()).toHaveText('APR-2026-0116')
    // 순환은 목록 순서를 따른다 — 건너뛴 건은 맨 뒤로 돌고, 다음은 그 다음 건이다
    await modal.getByRole('button', { name: 'Release v3.1.1 운영 배포' }).click()
    await expect(modal.getByText(/^APR-\d{4}-\d+$/).first()).toHaveText('APR-2026-0114')
    await modal.getByRole('button', { name: '전기차 배터리 규격서 v1.5' }).click()
    await expect(modal.getByText(/^APR-\d{4}-\d+$/).first()).toHaveText('APR-2026-0113')
    // 한 바퀴 — 건너뛴 첫 건(0115)이 다음 칩으로 돌아왔다
    await expect(modal.getByRole('button', { name: 'VN7 엔진 사양서 v2.3', exact: true })).toBeVisible()
    // 내 차례 수는 그대로 4 — 롤링은 판단이 아니다
    await expect(modal.getByText('내 차례 4건')).toBeVisible()
  })
})
