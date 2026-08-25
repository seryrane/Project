import { expect, test } from '@playwright/test'

/**
 * 상태 보드 끌어 놓기 — **끌기 = 의도, 패널 = 관문** (2026-08-26 사용자 제안).
 * 끌어 놓아도 상태는 바뀌지 않는다: 그 걸음의 결재 패널이 열리고, 확정해야
 * workflow 를 지나 카드가 움직인다. 흐름에 없는 걸음은 토스트가 이유를 말한다.
 *
 * 레인이 가로로 서는 넓은 화면에서 잰다 (좁은 화면은 세로 스택 — 끌기 무의미).
 */
test.describe('상태 보드 끌어 놓기', () => {
  test.use({ viewport: { width: 1600, height: 1000 }, isMobile: false })

  const card = (page: import('@playwright/test').Page, name: string) =>
    page.locator('a').filter({ hasText: name }).first()
  const lane = (page: import('@playwright/test').Page, status: string) =>
    page.locator('section').filter({ has: page.getByRole('heading', { name: status, exact: true }) }).first()

  test('초안 → 승인 대기: 상신 패널이 열리고, 상신해야 카드가 옮겨간다', async ({ page }) => {
    await page.goto('/board')
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})

    const draft = card(page, '차체 구조 안전 기준서')
    await expect(draft).toBeVisible()
    await draft.dragTo(lane(page, '승인 대기'))

    // 패널이 결재선을 보여 준다 — 놓기만으로는 아무것도 안 바뀐다
    const modal = page.getByRole('dialog')
    await expect(modal.getByText('결재 상신')).toBeVisible()
    await expect(modal.getByText('한동현')).toBeVisible()
    await expect(lane(page, '초안').getByText('차체 구조 안전 기준서'), '확정 전에는 그대로').toBeVisible()

    await modal.getByRole('button', { name: '상신', exact: true }).click()
    await expect(lane(page, '승인 대기').getByText('차체 구조 안전 기준서'), '상신하면 옮겨간다').toBeVisible()
    // 결재함과 같이 움직였다 — 보드가 혼자 세지 않는다
    await expect(card(page, '차체 구조 안전 기준서').getByText('지금 한동현 차례')).toBeVisible()
  })

  test('흐름에 없는 걸음은 토스트가 이유를 말하고 카드는 그대로다', async ({ page }) => {
    await page.goto('/board')
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})

    const deployed = card(page, '자율주행 센서 통합 규격')
    await deployed.dragTo(lane(page, '초안'))
    await expect(page.getByText('배포된 버전은 보드에서 되돌리지 않습니다', { exact: false })).toBeVisible()
    await expect(lane(page, '배포 완료').getByText('자율주행 센서 통합 규격')).toBeVisible()
  })

  test('회수 — 요청자만, 판단 전만 (남의 건은 패널 대신 이유를 말한다)', async ({ page }) => {
    await page.goto('/board')
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})

    // ① 남의 건(SP-002, 요청자 이서연)은 패널이 안 열리고 이유가 나온다 — 관문 규칙 그대로
    await card(page, '전기차 배터리 규격서').dragTo(lane(page, '검토 중'))
    await expect(page.getByText('회수는 요청자만', { exact: false })).toBeVisible()
    await expect(lane(page, '승인 대기').getByText('전기차 배터리 규격서')).toBeVisible()

    // ② 내가 올린 건은 회수된다 — 같은 화면에서 상신(김현대) 후 되돌린다.
    //    ⚠ goto 는 새로고침이라 모듈 스토어가 초기화된다 — 화면 안에서 이어 간다.
    await card(page, '차체 구조 안전 기준서').dragTo(lane(page, '승인 대기'))
    const modal = page.getByRole('dialog')
    await modal.getByRole('button', { name: '상신', exact: true }).click()
    await expect(lane(page, '승인 대기').getByText('차체 구조 안전 기준서')).toBeVisible()

    await card(page, '차체 구조 안전 기준서').dragTo(lane(page, '초안'))
    await expect(page.getByRole('dialog').getByText('결재 회수')).toBeVisible()
    await page.getByRole('dialog').getByRole('button', { name: '회수', exact: true }).click()
    // 회수의 정본은 **초안**으로 돌린다(specStore.withdrawSpec)
    await expect(lane(page, '초안').getByText('차체 구조 안전 기준서'), '회수하면 초안으로 돌아온다').toBeVisible()
  })
})
