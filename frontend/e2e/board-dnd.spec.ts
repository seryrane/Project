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

  test('초안 → 검토 중: 검토 시작 패널 — 이 전이가 예전엔 아예 없었다', async ({ page }) => {
    await page.goto('/board')
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})

    await card(page, '차체 구조 안전 기준서').dragTo(lane(page, '검토 중'))
    const modal = page.getByRole('dialog')
    await expect(modal.getByRole('heading', { name: '검토 시작' })).toBeVisible()
    await modal.getByRole('button', { name: '검토 시작', exact: true }).click()
    await expect(lane(page, '검토 중').getByText('차체 구조 안전 기준서'), '검토 중으로 옮겨간다').toBeVisible()
    // 검토 중에서도 상신할 수 있다 — 이어서 승인 대기로
    await card(page, '차체 구조 안전 기준서').dragTo(lane(page, '승인 대기'))
    await expect(page.getByRole('dialog').getByText('결재 상신')).toBeVisible()
  })

  test('레인 상한 — 넘치면 카드 대신 "외 N건" 링크가 목록으로 보낸다', async ({ page }) => {
    await page.goto('/specs')
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
    // 초안을 7건으로 만든다(시드 1 + 등록 6) — ⚠ goto 는 스토어를 초기화하므로 등록 후
    // 보드는 **앱 안 링크**로 간다
    for (let i = 1; i <= 6; i++) {
      await page.getByRole('button', { name: '+ 사양서 등록' }).click()
      const modal = page.getByRole('dialog')
      await modal.getByPlaceholder(/VN9 하이브리드/).fill(`상한 검증용 사양서 ${i}`)
      await modal.getByRole('button', { name: '등록', exact: true }).click()
      // ⚠ 등록은 **새 사양서 상세로 이동**한다(전환 중 html 이 클릭을 막는다) —
      // 상세가 선 것을 확인하고 목록으로 돌아와 다음 등록 (goto 는 스토어를 지우므로 금지)
      await expect(page.getByRole('heading', { name: `상한 검증용 사양서 ${i}` })).toBeVisible()
      await page.getByRole('link', { name: '← 사양서 목록' }).click()
      await expect(page.getByRole('heading', { name: '사양서 관리' })).toBeVisible()
    }
    await page.locator('nav').getByRole('link', { name: '상태 보드' }).click()
    const draftLane = lane(page, '초안')
    /* ⚠ 전체 판에서는 앞 판들이 시드를 옮겨 놓아 초안 수가 달라진다(격리로만 통과하던
       순서 의존을 이렇게 잡았다) — **고정 수를 재지 말고** 상한(6)과 넘침 링크의
       존재만 잰다. 카드는 6장에서 멈추고 나머지는 링크가 받는다. */
    // ⚠ `[href^="/specs/"]` 는 넘침 링크(/specs)까지 문다 — 카드만 세려면 상세 경로(SP-…)로
    await expect(draftLane.locator('li a[href*="/specs/SP-"]')).toHaveCount(6)
    const overflow = draftLane.getByRole('link', { name: /외 \d+건/ })
    await expect(overflow, '넘친 것은 숨기지 않고 목록으로 보낸다').toBeVisible()
    await overflow.click()
    // 상태 필터가 걸린 목록으로 — 보드가 페이징을 재발명하지 않는다
    await expect(page).toHaveURL(/status=/)
    await expect(page.getByRole('heading', { name: '사양서 관리' })).toBeVisible()
  })

  test('필터 — 카테고리 축·내 차례만 스위치가 걸러 세고, 발이 말한다', async ({ page }) => {
    await page.goto('/board')
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
    // 카테고리 축 (§23-10 관문 재사용 — specs 와 같은 그림)
    await page.getByRole('group', { name: '카테고리' }).getByRole('button', { name: /파워트레인/ }).click()
    await expect(lane(page, '승인 대기').getByText('VN7 엔진 사양서')).toBeVisible()
    await expect(page.getByText('전체 4개 중 1개'), '발이 거른 결과를 말한다').toBeVisible()
    // 조건은 주소에 산다 — 새로고침에서 살아남는다
    await expect(page).toHaveURL(/cat=/)
    // 내 차례만 — 결재자의 눈
    await page.getByRole('group', { name: '범위' }).getByRole('switch').click()
    await expect(page).toHaveURL(/mine=/)
  })

  test('빈 레인은 "언제 이 상태가 되는지"를 말한다', async ({ page }) => {
    await page.goto('/board')
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
    // 시드에서 검토 중·승인 완료가 비어 있다 — "없습니다" 대신 오는 길을 말한다
    await expect(lane(page, '검토 중').getByText('초안 카드를 이 열로 끌면 검토가 시작됩니다')).toBeVisible()
    await expect(lane(page, '승인 완료').getByText(/결재 마지막 단계가 승인되면/)).toBeVisible()
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
