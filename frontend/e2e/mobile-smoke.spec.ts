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
  '/alerts',
  '/privacy',
  '/login',
  '/signup',
  '/kpi-ivi',
  '/kpi-metrics',
]

/** SSR 마크업은 수화 전에도 눌리지만 아무 일도 안 한다 — 조용히 빠져나가는 판이
 *  되지 않게, 상호작용 전에는 네트워크가 잠잠해질 때까지(=수화 완료) 기다린다.
 *  ⚠ 외부 임베딩(iframe·Tableau)이 있는 화면은 네트워크가 영영 안 잠잠할 수 있다 —
 *  8초 지나면 수화는 끝났다고 보고 진행한다(무한 대기로 판이 죽는 것보다 낫다). */
async function ready(page: Page, path: string) {
  await page.goto(path)
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
}

for (const path of PAGES) {
  test(`${path} — 페이지가 가로로 넘치지 않는다`, async ({ page }) => {
    await ready(page, path)
    // ⚠ innerWidth 와 비교하면 안 된다 — 모바일 브라우저는 넘친 페이지를 축소해서
    //   innerWidth 도 같이 커지고, 검사는 0 을 보고 통과한다(2026-08-05 실기기에서
    //   상세가 1033px "PC 축소판"으로 보이는데 21건 전부 초록이었다).
    //   기준은 장치 뷰포트 폭 하나다.
    const viewport = page.viewportSize()!
    const scrollW = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(scrollW, `가로 넘침 — 뷰포트 ${viewport.width}px 을 넘으면 안 된다`).toBeLessThanOrEqual(
      viewport.width + 1,
    )
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

  // 잎(메뉴 항목)을 고르면 닫히고 이동한다.
  // ⚠ exact — 이름 일부(/대시보드/)로 집으면 '센터 KPI 대시보드'가 생기는 날
  //   둘이 걸려 회귀처럼 실패한다(느슨한 셀렉터 함정 — 실제로 겪음)
  await page.locator('aside').getByRole('link', { name: '대시보드', exact: true }).click()
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

test('층 — 서랍이 열리면 떠 있는 버튼이 그 아래로 들어간다 (규약 §8 사다리)', async ({ page }) => {
  // ⚠⚠ 이건 **눈으로는 안 보이던 사고**다. 서랍 가림막과 [물어보기]가 둘 다 `z-30` 이라
  //    DOM 순서로 버튼이 가림막 **위**에 있었다 — 서랍이 열려 있는데 버튼이 눌리고,
  //    누르면 서랍 위에 우측패널이 쌓였다(§8 "덮개는 쌓지 않는다"를 스스로 깨는 상태).
  //    화면만 보면 멀쩡해서 2026-08-13 에 층을 재고서야 드러났다.
  await ready(page, '/specs')
  const fab = page.getByRole('button', { name: '물어보기' })
  await expect(fab).toBeVisible()

  await page.getByRole('button', { name: '메뉴 열기' }).click()
  await expect(page.locator('aside')).toBeInViewport()

  // 불변식은 z 값이 아니라 **그 자리를 누르면 무엇이 받는가**이다(값은 또 바뀔 수 있다).
  // 가림막이 받아야 한다 — 버튼이 받으면 서랍 위에 패널이 쌓이는 그 상태다.
  const box = (await fab.boundingBox())!
  const 받는것 = await page.evaluate(
    ([x, y]) => {
      const el = document.elementFromPoint(x, y)
      return el?.getAttribute('aria-label') ?? el?.tagName ?? '(없음)'
    },
    [box.x + box.width / 2, box.y + box.height / 2],
  )
  expect(받는것).toBe('메뉴 닫기')
})

test('모달 — 하단 시트로 뜨고 Esc 로 닫힌다', async ({ page }) => {
  // 상세는 이제 본문 페이지라(규약 §1 결정) 모달 검증은 버전 비교로 한다
  await ready(page, '/specs')
  await page.getByRole('button', { name: '버전 비교' }).first().click()

  // ⚠ **층 이름·클래스로 덮개를 집지 않는다** (2026-08-13). 예전에는 `.fixed.inset-0.z-50`
  //   이었는데, 층 사다리를 이름 토큰(`z-modal`)으로 바꾸자 이 줄만 남아 실패했다 —
  //   화면은 멀쩡한데 테스트가 "모달이 없다"고 말하는 상태다. 덮개의 불변식은 숫자가 아니라
  //   **역할**이다(`role="dialog"`, 관문이 coverProps 로 붙인다). 역할로 집으면 층을 또
  //   바꿔도 안 깨진다.
  const sheet = page.getByRole('dialog')
  await expect(sheet).toBeVisible()

  // 바닥에 붙는다 (닫기가 엄지 자리) + 가로 100%.
  // ⚠ 뷰포트 픽셀과 직접 비교하면 DPR 반올림·오버레이 스크롤바로 몇 px 어긋난다 —
  //   불변식은 "시트가 자기 컨테이너(inset-0)를 가로로 가득 채우고 바닥에 붙는다"이다
  // ⚠ 열림 애니메이션이 끝난 뒤에 잰다 — 도중에 재면 3~12px 작게 나온다.
  //   getAnimations() 는 WAAPI 만 잡아서 motion(rAF 구동) 전환에는 헛대기다 —
  //   구현에 매이지 않게 "치수가 맞을 때까지" 폴링한다
  // 컨테이너(배경막)는 덮개의 부모다 — 여기도 층 클래스 대신 관계로 집는다
  const cont = (await page.locator('[role="dialog"]').locator('xpath=..').boundingBox())!
  await expect
    .poll(async () => {
      const b = await sheet.boundingBox()
      if (!b) return 999
      return Math.max(Math.abs(b.width - cont.width), Math.abs(b.y + b.height - (cont.y + cont.height)))
    }, { message: '시트가 컨테이너를 가로로 채우고 바닥에 붙는다' })
    .toBeLessThan(2)

  // 덮은 것은 Esc 로 닫힌다
  await page.keyboard.press('Escape')
  await expect(sheet).not.toBeVisible()
})

test('우측패널 — 좁은 화면에서 앱 헤더를 덮지 않는다 (규약 §8)', async ({ page }) => {
  // ⚠ 헤더까지 덮으면 **지금 어디인지와 나가는 길이 동시에 사라져** 사람이 브라우저
  //   뒤로가기를 누른다 — 앱을 벗어난다. 패널은 헤더 아래(3.5rem)에서 시작해야 한다.
  await ready(page, '/notice')
  const header = (await page.locator('header').boundingBox())!
  await page.locator('ol li button').first().click()
  const panel = page.getByRole('dialog')
  await expect(panel).toBeVisible()

  const p = (await panel.boundingBox())!
  expect(p.y, '패널은 헤더 아래에서 시작한다').toBeGreaterThanOrEqual(header.y + header.height - 1)
  // 헤더가 실제로 눌리는지까지 본다 — 위에 투명한 것이 덮여 있으면 좌표만 맞고 못 누른다
  await expect(page.getByRole('button', { name: '메뉴 열기' })).toBeVisible()
})

test('우측패널 발 — 본문이 길어도 마무리 조작이 스크롤에 안 밀린다 (규약 §7)', async ({ page }) => {
  // 모달과 **같은 불변식을 관문 둘 다** 지키는지 본다. 방침 전문은 확실히 넘치는 몸이다.
  await ready(page, '/privacy')
  await page.getByRole('button', { name: /처리방침 전문|전문 보기/ }).first().click()
  const panel = page.getByRole('dialog')
  await expect(panel).toBeVisible()

  const close = panel.getByRole('button', { name: '닫기' }).last()
  await expect(close, '열자마자 보인다').toBeInViewport()
  const before = (await close.boundingBox())!

  const body = panel.locator('div.overflow-y-auto')
  await body.evaluate((el) => el.scrollTo(0, el.scrollHeight))
  await expect(body, '몸이 실제로 넘친다').toBeVisible()

  await expect(close, '굴려도 그대로 보인다').toBeInViewport()
  const after = (await close.boundingBox())!
  expect(Math.abs(after.y - before.y), '발은 몸이 굴러도 자리를 안 옮긴다').toBeLessThan(2)
})

test('모달 발 — 내용이 길어도 저장·취소가 스크롤에 안 밀린다 (규약 §7)', async ({ page }) => {
  // ⚠ 관문에 **발 슬롯이 없었다.** 액션 줄을 내용 안에 넣을 수밖에 없어서, 본문을 길게
  //   쓰면 [등록]이 화면 밖으로 나갔다 — 다 채워 놓고 저장 버튼을 찾으러 다시 내려가야 했다.
  await ready(page, '/notice')
  await page.getByRole('button', { name: /공지 작성/ }).click()
  const modal = page.getByRole('dialog')
  await expect(modal).toBeVisible()

  const submit = modal.getByRole('button', { name: '등록' })
  await expect(submit).toBeInViewport()

  // 본문을 길게 채워 몸이 넘치게 만든다.
  // ⚠ 기준값은 **채운 뒤에** 잰다 — 내용이 늘면 모달 자체가 최대 높이까지 자라므로
  //   발도 그만큼 내려간다(정상). 여기서 보려는 것은 "몸을 굴려도 안 움직인다" 하나다
  await modal.locator('textarea').fill('긴 본문\n'.repeat(40))
  // ⚠ 채운 직후에 재면 **모달이 최대 높이까지 자라는 도중**을 잡는다 — 단독 실행에서는
  //   통과하고 전체 실행에서만 2px 차이로 깨지는 경합이 됐다(2026-08-13). 자리가 멎을
  //   때까지 기다린 뒤 기준값을 잡는다.
  let prevY = Number.NaN
  await expect
    .poll(async () => {
      const y = (await submit.boundingBox())!.y
      const settled = Math.abs(y - prevY) < 0.5
      prevY = y
      return settled
    }, { message: '발의 자리가 멎을 때까지' })
    .toBe(true)
  const before = (await submit.boundingBox())!

  // 몸을 끝까지 굴린다 — 발이 몸 안에 있으면 여기서 밀려 나간다
  await modal.locator('div.overflow-y-auto').evaluate((el) => el.scrollTo(0, el.scrollHeight))

  await expect(submit, '발은 붙박이라 굴려도 그대로 보인다').toBeInViewport()
  const after = (await submit.boundingBox())!
  expect(Math.abs(after.y - before.y), '발은 몸이 굴러도 자리를 안 옮긴다').toBeLessThan(2)
})

test('물어보기 — 떠 있는 버튼으로 열리고 Esc 로 닫힌다', async ({ page }) => {
  // 자리는 어느 화면에서나 같은 패널 하나(정본: 챗봇_표준질의_설계.md §1) — /specs 로 확인
  await ready(page, '/specs')
  const entries = page.getByRole('button', { name: '물어보기' })
  // ⚠ 진입점은 **하나**여야 한다 — 예전에는 헤더 💬 와 떠 있는 버튼 둘이었다(그리고 헤더
  //   쪽만 이모지 문자라 같은 기능이 두 모양이었다). 2026-08-13 에 헤더 쪽을 걷었다.
  //   이 숫자가 다시 2가 되면 "옮겼다"고 적어 놓고 안 걷은 그 상태로 돌아간 것이다.
  await expect(entries, '챗봇 진입점은 떠 있는 버튼 하나').toHaveCount(1)
  await entries.click()
  await expect(page.getByRole('heading', { name: '물어보기' })).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(page.getByRole('heading', { name: '물어보기' })).not.toBeVisible()
})

/**
 * 토스트 — 규약 §2. 이 판이 있는 이유는 **한 번 통째로 죽어 있었기 때문**이다:
 * ToastProvider 가 AppShell 안에 있어서, AppShell 을 자식으로 렌더하는 화면 컴포넌트는
 * 트리에서 Provider **위**에 놓였다 → 화면에서 부른 `useToast()` 가 기본값(빈 함수)을
 * 집어 아무 일도 안 했다. 화면은 멀쩡하고 오류도 없어서 **눈으로만 보면 안 잡힌다**
 * (2026-08-11 발견, Provider 를 __root.tsx 로 올려 고침).
 */
test('토스트 — 화면에서 부른 것이 실제로 뜨고, 좁은 화면에서는 아래에 선다', async ({ page }) => {
  await ready(page, '/kpi-metrics')
  const trigger = page.getByRole('button', { name: '+ 지표 추가' })
  await expect(trigger).toHaveCount(1) // 이름 일부로 집으면 버튼이 늘 때 조용히 어긋난다
  await trigger.click()

  const toast = page.locator('[role="status"] > div')
  await expect(toast, '화면발 토스트가 실제로 떠야 한다 — Provider 자리 회귀 감시').toBeVisible()

  const box = (await toast.boundingBox())!
  const vp = page.viewportSize()!
  expect(box.y, '좁은 화면에서 토스트는 아래쪽(주소창·엄지 규칙)').toBeGreaterThan(vp.height / 2)
  // 떠 있는 [물어보기] 버튼을 먹으면 그 버튼을 못 누른다 — 자리를 미리 갈라 뒀다
  const fab = (await page.getByRole('button', { name: '물어보기' }).last().boundingBox())!
  expect(box.y + box.height, '토스트는 떠 있는 버튼 위로 쌓인다').toBeLessThanOrEqual(fab.y + 1)
})

test('토스트 — 같은 말이 연달아 와도 줄이 늘지 않는다 (규약 §2 겹침·모임)', async ({ page }) => {
  await ready(page, '/kpi-metrics')
  const trigger = page.getByRole('button', { name: '+ 지표 추가' })
  for (let i = 0; i < 4; i++) await trigger.click()

  const toasts = page.locator('[role="status"] > div')
  await expect(toasts, '같은 말은 한 줄로 접힌다').toHaveCount(1)
  await expect(toasts.first(), '접힌 개수를 꼬리표로 센다').toContainText('외 3건')
})

/**
 * 포커스 — 2026-08-11 검토에서 잰 상태가 `outline-none` 58곳 · 전역 규칙 0개였다.
 * 규칙은 styles.css 한 줄(`:focus-visible`)이 정본이라, 여기서는 **키보드가 닿는 자리마다
 * 실제로 링이 그려지는지**를 본다 — 화면마다 링을 다시 그리지 않기로 한 판단의 감시자다.
 */
test('포커스 — 키보드가 닿는 자리마다 링이 보인다 (WCAG 2.4.7)', async ({ page }) => {
  await ready(page, '/members')
  const bad: Array<string> = []
  for (let i = 0; i < 15; i++) {
    await page.keyboard.press('Tab')
    const stop = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null
      if (!el || el === document.body) return null
      const cs = getComputedStyle(el)
      return {
        name: `${el.tagName} "${(el.getAttribute('aria-label') ?? el.textContent).trim().slice(0, 16)}"`,
        style: cs.outlineStyle,
        width: parseFloat(cs.outlineWidth),
        // 링을 안 그리는 대신 다른 표시를 쓰는 자리도 있을 수 있어 함께 본다
        shadow: cs.boxShadow,
      }
    })
    if (!stop) continue
    if (stop.style === 'none' || stop.width < 2) bad.push(`${stop.name} outline=${stop.style} ${stop.width}px`)
  }
  expect(bad, '링 없이 지나가는 자리').toEqual([])
})

/** 되돌리기 — 규약 §2 "성공: 토스트(+되돌리기)". 문구로만 안내하던 것을 손잡이로 바꿨다 */
test('토스트 — [되돌리기]를 누르면 방금 한 일이 물러난다', async ({ page }) => {
  await ready(page, '/privacy')
  const sw = page.getByRole('switch', { name: '연락처 마스킹' })
  const before = await sw.getAttribute('aria-checked')
  await sw.click()
  await expect(sw).not.toHaveAttribute('aria-checked', before ?? '')

  const undo = page.getByRole('button', { name: '되돌리기' })
  await expect(undo, '되돌릴 수 있는 일에는 손잡이가 붙는다').toBeVisible()
  await undo.click()
  await expect(sw, '토글이 원래 자리로').toHaveAttribute('aria-checked', before ?? '')
  await expect(undo, '무른 일의 토스트는 남지 않는다').toHaveCount(0)
})

/**
 * 덮개 접근성 — 예전에는 Esc 와 스크롤 잠금만 있었다. 포커스는 뒤 화면에 남아 Tab 이
 * 덮개 뒤를 돌아다녔다(WCAG 2.4.3·2.1.2). 관문 하나(useCover)가 지키는 약속을 여기서 잰다.
 */
test('덮개 — 열면 포커스가 안으로, Tab 은 안에 갇히고, 닫으면 연 버튼으로 돌아온다', async ({
  page,
}) => {
  await ready(page, '/members')
  // ⚠ 여는 자리는 **버튼**이어야 한다 — 표의 행(tr onClick)은 애초에 포커스를 못 받아
  //   "돌아온다"를 잴 수 없다(그 자체가 남은 숙제다)
  const opener = page.getByRole('button', { name: '+ 회원 등록' })
  await opener.click()

  const dialog = page.getByRole('dialog')
  await expect(dialog, 'role=dialog 로 열린다').toBeVisible()
  await expect(dialog).toHaveAttribute('aria-modal', 'true')
  expect(await dialog.evaluate((el) => el.contains(document.activeElement)), '포커스가 덮개 안으로').toBe(
    true,
  )

  // 스무 번 눌러도 덮개 밖으로 새지 않는다
  for (let i = 0; i < 20; i++) await page.keyboard.press('Tab')
  expect(await dialog.evaluate((el) => el.contains(document.activeElement)), 'Tab 이 갇힌다').toBe(true)

  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  expect(await opener.evaluate((el) => el === document.activeElement), '연 버튼으로 돌아온다').toBe(true)
})

/** 보고 있는 상태는 주소에 있다 — 새로고침·뒤로가기·링크 공유에서 살아남는다 */
test('필터 — 주소에 남아 새로고침을 견디고, 뒤로가기로 되돌아간다', async ({ page }) => {
  await ready(page, '/specs')
  await page.getByRole('button', { name: /검토 중/ }).click()
  await expect(page).toHaveURL(/status=/)

  await page.reload()
  await expect(
    page.getByRole('button', { name: /검토 중/ }),
    '새로고침해도 고른 칩이 그대로',
  ).toHaveClass(/text-primary/)

  await page.goBack()
  await expect(page, '뒤로가기는 필터를 벗긴다').not.toHaveURL(/status=/)
})

test.describe('넓은 화면', () => {
  test.use({ viewport: { width: 1280, height: 800 }, isMobile: false })

  test('검색(⌘K) — 덮개 관문을 지난다 (역할·포커스·Esc·복귀)', async ({ page }) => {
    // ⚠ 팔레트만 관문(useCover)을 안 지나고 있었다 — role="dialog" 도 aria-modal 도 없었고
    //   포커스는 뒤 화면에 남아 Tab 이 덮개 뒤를 돌아다녔다(2026-08-13 실측).
    //   관문을 하나 두는 이유가 이것이다: 안 지나는 물건이 하나 생기면 그것만 다르게 군다.
    await ready(page, '/dashboard')
    const opener = page.getByRole('button', { name: '검색' })
    await opener.click()

    const palette = page.getByRole('dialog')
    await expect(palette).toBeVisible()
    // 열자마자 타는 물건이라 포커스는 검색칸에 온다 (몸통에 머무르면 한 번 더 눌러야 한다)
    await expect(palette.locator('input')).toBeFocused()

    // 뒤 화면을 잠근다 — 팔레트는 "끝내고 닫는 것"이라 모달의 몸가짐이 맞다
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden')

    await page.keyboard.press('Escape')
    await expect(palette).not.toBeVisible()
    // 닫으면 연 버튼으로 돌아온다 — 안 그러면 포커스가 문서 맨 앞으로 튕긴다
    await expect(opener).toBeFocused()
    expect(await page.evaluate(() => document.body.style.overflow), '잠금이 풀린다').toBe('')
  })

  test('LNB 하단 페이드 — 아래에 더 있을 때만 걸린다 (규약 §21)', async ({ page }) => {
    // ⚠ 예전에는 마스크가 늘 걸려 있어, 메뉴가 다 보이는 큰 화면에서도 마지막 항목이
    //   흐려졌다. 늘 켜져 있는 신호는 신호가 아니라 흐림이다.
    const masked = () =>
      page.evaluate(() => {
        const nav = document.querySelector<HTMLElement>('nav.scrollbar-hidden')
        return !!nav && getComputedStyle(nav).maskImage !== 'none'
      })

    // 짧은 화면 — 메뉴가 넘친다
    await page.setViewportSize({ width: 1280, height: 560 })
    await ready(page, '/dashboard')
    expect(await masked(), '넘칠 때는 아래에 더 있다고 말한다').toBe(true)

    // 바닥까지 굴리면 더 없다 — 신호를 끈다
    await page.evaluate(() => {
      const nav = document.querySelector<HTMLElement>('nav.scrollbar-hidden')!
      nav.scrollTop = nav.scrollHeight
    })
    await expect.poll(masked, { message: '바닥에서는 페이드가 사라진다' }).toBe(false)

    // 긴 화면 — 메뉴가 다 보인다
    await page.setViewportSize({ width: 1280, height: 1600 })
    await expect.poll(masked, { message: '스크롤이 없으면 페이드도 없다' }).toBe(false)
  })

  test('우측패널 — 가리개가 없고 뒤 화면이 굴러간다 (규약 §1 RIGHT)', async ({ page }) => {
    // ⚠⚠ 이 관문은 **모달처럼 굴고 있었다**: 까만 배경막(black/60+blur)을 깔고 뒤 화면을
    //    잠갔다. 규약은 정반대다 — "가리개는 두지 않는다. 뒤가 읽혀야 대조다"(§1),
    //    "넓은 화면의 RIGHT 패널만 예외로 안 잠근다"(§7). 목록을 훑으며 상세를 보라고
    //    만든 패널이 정작 목록을 가리고 굴리지도 못하게 하고 있었다(2026-08-13 실측).
    await ready(page, '/notice')
    await page.locator('ol li button').first().click()
    const panel = page.getByRole('dialog')
    await expect(panel).toBeVisible()

    // ① 뒤 화면이 굴러간다 — 대조하려면 목록을 훑을 수 있어야 한다
    expect(await page.evaluate(() => document.body.style.overflow), '뒤 화면을 안 잠근다').toBe('')

    // ② 가리개가 없다 — 패널 **바깥** 지점이 뒤 화면을 그대로 보여 주고, 그 자리를 누르면
    //    본문이 받는다(까만 판이나 투명 판이 가로채면 대조가 아니라 모달이다)
    const p = (await panel.boundingBox())!
    const 바깥이_받는것 = await page.evaluate(
      ([x, y]) => {
        const el = document.elementFromPoint(x, y)
        return el?.closest('[role="dialog"]') ? '패널이 가로챈다' : (el?.tagName ?? '(없음)')
      },
      [p.x / 2, p.y + p.height / 2],
    )
    expect(바깥이_받는것, '패널 바깥은 본문이 받는다').not.toBe('패널이 가로챈다')

    // ③ 그래서 **바깥을 눌러도 안 닫힌다** — 뒤를 만지는 것이 목적이라 실수로 닫히면 안 된다
    await page.mouse.click(p.x / 2, p.y + p.height / 2)
    await expect(panel, '바깥 클릭으로는 안 닫힌다').toBeVisible()

    // ④ 닫는 길은 Esc (그리고 ✕)
    await page.keyboard.press('Escape')
    await expect(panel).not.toBeVisible()
  })

  test('팝오버 — 연 버튼에 매달리고, 뒤 화면을 잠그지 않는다 (규약 §1 팝오버)', async ({ page }) => {
    await ready(page, '/dashboard')
    const bell = page.getByRole('button', { name: /^알림/ })
    await bell.click()
    const pop = page.getByRole('dialog', { name: '알림' })
    await expect(pop).toBeVisible()

    // ① 자리는 **연 조작에서 잰다.** 예전에는 화면 끝에서 손으로 잰 `right-24` 라
    //    GNB 에 버튼이 하나 늘면 어긋났다(그 어긋남은 버튼을 늘린 사람 눈에 안 보인다).
    // ⚠ 등장 애니메이션이 끝난 뒤에 잰다 — 도중이면 scale(0.97) 만큼 작게 나온다
    await expect
      .poll(async () => {
        const b = (await bell.boundingBox())!
        const p = (await pop.boundingBox())!
        return Math.abs(p.x + p.width - (b.x + b.width))
      }, { message: '팝오버 오른쪽 끝이 연 버튼의 오른쪽 끝에 맞는다' })
      .toBeLessThan(2)

    // ② 팝오버는 덮개가 아니다 — 잠깐 훑어보는 것에 뒤 화면을 잠그지 않는다
    expect(await page.evaluate(() => document.body.style.overflow), '뒤 화면을 잠그지 않는다').toBe('')

    // ③ Esc 로 닫히고 포커스는 연 버튼으로 돌아온다
    await page.keyboard.press('Escape')
    await expect(pop).not.toBeVisible()
    await expect(bell).toBeFocused()
  })

  test('토스트 — 헤더 바로 아래 우측 상단에 서고, 헤더를 가리지 않는다', async ({ page }) => {
    await ready(page, '/kpi-metrics')
    await page.getByRole('button', { name: '+ 지표 추가' }).click()

    const toast = page.locator('[role="status"] > div')
    await expect(toast).toBeVisible()
    const box = (await toast.boundingBox())!
    const header = (await page.locator('header').boundingBox())!

    expect(box.y, '헤더(h-14)를 덮지 않는다 — 방금 누른 조작이 가려지면 안 된다')
      .toBeGreaterThanOrEqual(header.y + header.height - 1)
    expect(box.y, '그래도 시선이 있는 위쪽이다').toBeLessThan(160)
    expect(1280 - (box.x + box.width), '우측에 붙는다').toBeLessThan(48)
  })
})

/** 본문 폭 — 한 값이 두 일을 하던 자리(예전 max-w-7xl 1280). 설계서 폭은 1680 이고,
 *  글 읽는 화면은 읽기 폭에서 멈춘다. 1920 을 실제로 켜고 잰다 */
test.describe('설계서 폭(1920)', () => {
  test.use({ viewport: { width: 1920, height: 900 }, isMobile: false })

  test('본문 폭 — 설계서 폭으로 통일하고, 읽기 폭은 글 칸이 잡는다', async ({ page }) => {
    await ready(page, '/members')
    const data = (await page.locator('main').boundingBox())!
    // 세로 스크롤바(≈15px)만큼 줄 수 있어 폭 자체가 아니라 "설계서 폭에 닿았는지"를 본다
    expect(data.width, '표 화면은 설계서 폭 1680').toBeGreaterThan(1640)

    // ⚠ 2026-08-13 사용자 결정: **커뮤니티 5개는 폭을 통일한다.** 예전에는 가이드·FAQ·
    //   개인정보만 960 이라 메뉴를 오갈 때 폭이 널뛰었다("QNA 는 꽉 차는데 FAQ 는 좁다").
    //   페이지는 넓히되 **글줄은 안쪽 칸이 잡는다** — 둘을 같이 봐야 결정이 지켜진다.
    await ready(page, '/guide')
    const guide = (await page.locator('main').boundingBox())!
    expect(guide.width, '가이드도 다른 커뮤니티 화면과 같은 폭').toBeGreaterThan(1640)

    // 글 칸은 여전히 읽기 폭에서 멈춘다 — 안 그러면 한 줄이 1400px 를 넘는다
    const prose = (await page.locator('main section').first().boundingBox())!
    expect(prose.width, '글 칸은 읽기 폭 960 에서 멈춘다').toBeLessThanOrEqual(960)
  })

  /** ⚠ 이 판의 요점은 **뷰포트를 1920 으로 고정한 채** 칸 폭만 바꾼다는 것이다 —
   *  두 경우의 열 수가 다르면 안쪽이 뷰포트가 아니라 칸을 보고 있다는 증거다.
   *  칸 크기는 사람이 [위젯 편집]에서 바꾸는 값이라 저장소(dashboard.layout.v1)로 심는다. */
  test('대시보드 위젯 — 칸을 좁히면 안쪽이 칸을 보고 접힌다 (@container)', async ({ page }) => {
    const columns = () =>
      page.evaluate(() => {
        const grid = document.querySelector<HTMLElement>('main [class*="grid-cols-2"]')
        return grid ? getComputedStyle(grid).gridTemplateColumns.split(' ').length : 0
      })

    // ⚠ 배치 정본은 **계정(서버)**이다 — 저장소만 심으면 서버 응답이 덮어써서 판이 거짓말을
    //   한다(처음에 그렇게 새 판이 통과해 버렸다). 서버는 "저장된 배치 없음"으로 세운다.
    await page.route('**/api/me/dashboard-layout', (route) =>
      route.fulfill({ json: { layout: null } }),
    )

    // 전체 칸(3) — 타일 4개가 한 줄에 선다
    await page.addInitScript(() =>
      localStorage.setItem('dashboard.layout.v1', JSON.stringify([{ id: 'kpi', size: 3 }])),
    )
    await ready(page, '/dashboard')
    await expect(page.getByText('총 사양서')).toBeVisible()
    expect(await columns(), '전체 칸에서는 4열').toBe(4)

    // 1칸으로 줄인다 — 뷰포트는 그대로 1920
    await page.addInitScript(() =>
      localStorage.setItem('dashboard.layout.v1', JSON.stringify([{ id: 'kpi', size: 1 }])),
    )
    await ready(page, '/dashboard')
    await expect(page.getByText('총 사양서')).toBeVisible()
    expect(await columns(), '1칸이면 2열 — 뷰포트로 접었다면 여기서도 4열이 나온다').toBe(2)
  })
})

/* 규약 §9 "표는 한 곳에서만 그린다" — 관문(`DataTable`)이 세운 약속을 못 박는다.
   관문이 없던 동안 이것들이 표마다 제각각이었다: 숫자 열 우측 정렬(열셋 중 넷),
   가장자리 그림자(다섯), 빈 상태 행(넷), 머리줄 고정(**0**). */
test.describe('표 관문', () => {
  test.use({ viewport: { width: 1280, height: 800 }, isMobile: false })

  for (const route of ['/alerts', '/kpi-metrics', '/members', '/validation-results', '/privacy']) {
    test(`${route} — 표가 관문의 약속을 지킨다 (규약 §9)`, async ({ page }) => {
      await ready(page, route)
      const table = page.locator('table').first()
      await expect(table).toBeVisible()

      const facts = await table.evaluate((t: HTMLTableElement) => {
        const thead = t.tHead!
        const box = t.closest('.table-scroll')
        const foot = [...document.querySelectorAll<HTMLElement>('div')].find(
          (d) => /^전체 \d+/.test(d.innerText) && d.className.includes('border-t'),
        )
        return {
          stickyHead: getComputedStyle(thead).position,
          hasEdgeShadow: !!box,
          // 숫자 열은 머리글도 그 열을 따른다 (§9)
          numericHeadersRight: [...t.querySelectorAll('tbody tr:first-child td')].every((td, i) => {
            const th = t.querySelectorAll('thead th')[i]
            const cellRight = getComputedStyle(td).textAlign === 'right'
            const headRight = getComputedStyle(th).textAlign === 'right'
            return cellRight === headRight
          }),
          footOutsideScrollBox: foot ? !foot.closest('.table-scroll') : null,
        }
      })

      expect(facts.stickyHead, '머리줄은 고정된다').toBe('sticky')
      expect(facts.hasEdgeShadow, '오른쪽에 열이 더 있다고 가장자리가 말한다 (§8)').toBe(true)
      expect(facts.numericHeadersRight, '숫자 열은 셀과 머리글의 정렬이 같다').toBe(true)
      expect(facts.footOutsideScrollBox, '발은 스크롤 상자 밖 — 가로로 굴려도 안 밀려난다').toBe(true)
    })
  }

  test('빈 상태 — 걸러서 0건이면 "없다"고 말하고 다음 손을 알려 준다 (규약 §3·§9)', async ({ page }) => {
    // ⚠ 지표 관리에는 빈 상태 행이 아예 없었다 — 걸러서 0건이면 머리줄만 남았다
    await ready(page, '/validation-results')
    await page.getByPlaceholder(/검색|Search/).first().fill('존재하지않는검색어zzz')
    const empty = page.getByText('조건에 맞는 실행이 없습니다.')
    await expect(empty, '없다고 말한다').toBeVisible()
    await expect(page.getByText(/전체.*로 두거나|지워 보세요/), '다음 손을 알려 준다').toBeVisible()
  })
})

/* 규약 §9 "목록은 몇 건인지 말하고 끝난다" — 발이 없던 시절 표 열셋이 전부, 필터를 걸어
   줄이 절반이 되어도 아무 말이 없었다. 보는 사람은 그게 전부인지 걸러진 것인지 모른다. */
test('목록 발 — 거르면 "전체 N건 중 M건"으로 바뀐다 (규약 §9)', async ({ page }) => {
  await ready(page, '/alerts')
  const foot = page.getByText(/^전체 \d+건/).first()
  await expect(foot, '거르기 전에는 전체 수만 말한다').toHaveText(/^전체 \d+건$/)

  // 미해결만 보기 — 줄이 줄어든다
  await page.getByRole('switch').first().click()
  await expect(foot, '거른 뒤에는 전체와 거른 수를 함께 말한다').toHaveText(/^전체 \d+건 중 \d+건$/)
})

/* 접어 두기 — 이력 19줄을 다 펴 놓아 /alerts 만 3화면이었다 (2026-08-14).
   ⚠ 여기서 지키는 것은 **두 셈이 안 섞이는 것**이다: 발은 "거르기"를, 단추는 "접기"를
   말한다. 접힌 수를 발에 적었다가 "걸러서 8건인지 접어서 8건인지" 못 가르게 됐었다. */
test('접어 두기 — [더 보기]로 펴고 접어도 발은 거른 수만 말한다 (규약 §9)', async ({ page }) => {
  await ready(page, '/alerts')
  const history = page.locator('section').filter({ hasText: '알림 이력' }).first()
  const rows = history.locator('tbody tr')
  const more = history.getByRole('button', { name: /더 보기|접기/ })
  const foot = history.getByText(/^전체 \d+건/).first()

  const total = Number((await foot.textContent())?.match(/\d+/)?.[0])
  const folded = await rows.count()
  expect(folded, '접힌 채로 열리고, 가진 것보다 적게 보인다').toBeLessThan(total)
  await expect(more, '접혀 있으면 아래 화살표').toHaveAttribute('aria-expanded', 'false')
  await expect(foot, '접었다고 발이 "중 N건"으로 바뀌면 안 된다 — 그건 거르기의 말이다').toHaveText(
    /^전체 \d+건$/,
  )

  await more.click()
  await expect(rows, '펴면 가진 줄이 다 선다').toHaveCount(total)
  await expect(more).toHaveAttribute('aria-expanded', 'true')

  await more.click()
  await expect(rows, '다시 접힌다').toHaveCount(folded)
})

test('위젯 발 — 잘라 보여 주면 몇 건인지 말하고 전체로 가는 길을 준다 (규약 §9)', async ({ page }) => {
  await ready(page, '/dashboard')
  const card = page.locator('section').filter({ hasText: '최근 공지' }).first()
  await expect(
    card.getByText(/^전체 \d+건 중 \d+건$/),
    '카드가 slice 로 자르면 조용히 거짓말을 한다 — 몇 건 중 몇 건인지 적는다',
  ).toBeVisible()
  await expect(card.getByRole('button', { name: /전체 보기/ }), '위젯은 쪽을 나누지 않고 전체 목록으로 보낸다').toBeVisible()
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

/* 등록 → 상신 수명주기 — 목록·상세가 같은 정본(specStore)을 본다.
   ⚠ 이 가드가 없던 동안 셋이 각각 거짓말을 했다 (2026-08-18 실측):
   ① [+ 사양서 등록]은 onClick 이 없어 눌러도 아무 일이 없었다
   ② 카드 [승인 요청]은 토스트만 쏘고 상태는 그대로였다 — "보냈다는데 화면은 그대로"
   ③ 갓 등록한 사양서 상세가 시드의 필드 32개(완료 17…)를 제 것인 양 그렸다.
      "필드 정의를 채워 주세요" 토스트 **옆에서**. */
test('등록·상신 — 셈과 상태가 함께 움직인다 (등록 → 빈 필드표 → 상신 → 승인 대기)', async ({
  page,
}) => {
  await ready(page, '/specs')
  const summary = page.getByText(/총 \d+개 사양서/)
  const counts = async () => {
    const text = (await summary.textContent()) ?? ''
    return {
      total: Number(text.match(/총 (\d+)개/)?.[1]),
      pending: Number(text.match(/(\d+)개 승인 대기/)?.[1]),
    }
  }
  const before = await counts()
  expect(before.total, '시드가 있어야 셈이 늘어난 것을 잴 수 있다').toBeGreaterThan(0)

  await page.getByRole('button', { name: '+ 사양서 등록' }).click()
  const form = page.getByRole('dialog')
  await form.getByPlaceholder(/VN9/).fill('E2E 가드 사양서')
  await form.getByRole('button', { name: '등록', exact: true }).click()

  // 등록의 다음 행동은 언제나 "필드를 채우는 것" — 상세로 보낸다 (규약 §10)
  await expect(page, '등록하면 상세로 간다').toHaveURL(/\/specs\/SP-\d+$/)
  await expect(page.getByRole('heading', { name: /E2E 가드 사양서/ })).toBeVisible()
  await expect(page.getByText('필드 목록 (0개)'), '남의 필드표를 물려받지 않는다').toBeVisible()
  await expect(
    page.getByText('아직 필드가 없습니다.'),
    '빈 자리에는 이유를 적는다 — "걸러서 0건"과는 다른 말이다 (규약 §17)',
  ).toBeVisible()

  // 상신은 확인을 지나야 하고, 지나면 상태가 **진짜로** 바뀐다
  await page.getByRole('button', { name: '승인 요청', exact: true }).click()
  const confirm = page.getByRole('dialog')
  // ⚠ '승인자'로 찾으면 라벨과 Role 이름('사양서 승인자')이 둘 다 걸린다 — 사람 이름으로 잰다
  await expect(confirm.getByText('한동현'), '누구에게 올라가는지 보여 준다').toBeVisible()
  await confirm.getByRole('button', { name: '상신', exact: true }).click()
  // ⚠ 상신 뒤에는 [결재 진행 보기]가 **둘**이다 — 머리의 길과 잠금 띠 안의 길.
  //   둘 다 같은 곳으로 가므로 첫 번째로 잰다(이름으로 통째로 집으면 strict 위반).
  await expect(
    page.getByRole('button', { name: /결재 진행 보기/ }).first(),
    '상신한 것을 또 상신하지 못한다 — 길은 결재 쪽으로 바뀐다',
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: '승인 요청', exact: true }),
    '상신한 문서에는 [승인 요청]이 남아 있지 않다',
  ).toHaveCount(0)

  // 목록으로 — 총 수와 승인 대기 수가 함께 늘어야 한다
  await page.getByRole('link', { name: /사양서 목록/ }).click()
  await expect(summary).toBeVisible()
  const after = await counts()
  expect(after.total, '등록 하나가 총 수를 늘린다').toBe(before.total + 1)
  expect(
    after.pending,
    '상신 하나가 승인 대기 수를 늘린다 — 토스트만 뜨고 셈이 그대로면 안 된다',
  ).toBe(before.pending + 1)
})

/* 결재 중 잠금 + 결재선 — 결재에 올라간 문서는 승인자가 본 그대로 승인돼야 한다.
   ⚠ 이 가드가 없던 동안 승인 대기 문서의 필드를 그 자리에서 계속 고칠 수 있었고,
   결재선은 상신 모달 안에만 글자로 박혀 있어 "지금 누구 차례"를 화면에서 알 수
   없었다 (2026-08-18). 잠그는 것과 **잠근 이유를 적는 것**은 한 쌍이다 (규약 §17). */
test('결재 중 — 편집이 잠기고, 잠긴 이유와 결재선이 함께 선다', async ({ page }) => {
  await ready(page, '/specs/SP-001') // 시드 중 유일한 '승인 대기'

  await expect(page.getByText(/결재 중이라 필드를 고칠 수 없습니다/), '왜 잠겼는지 적는다').toBeVisible()
  await expect(
    page.getByText(/반려되거나 승인이 끝나면 다시 열립니다/),
    '언제 풀리는지도 적는다 — 회색 버튼만 있으면 고장으로 읽힌다',
  ).toBeVisible()

  // 결재선 — 누가·몇 번째·지금 누구 차례
  const line = page.getByText('결재선', { exact: true }).locator('..')
  await expect(line.getByText('한동현'), '1차 결재자가 보인다').toBeVisible()
  await expect(line.getByText('김현대'), '최종 결재자가 보인다').toBeVisible()

  // 고치는 길은 전부 막힌다
  await expect(page.getByRole('button', { name: '임시저장' })).toBeDisabled()
  await expect(page.getByRole('button', { name: '+ 필드 추가' })).toBeDisabled()
  await expect(page.getByRole('button', { name: '엑셀 업로드' })).toBeDisabled()

  // 행을 눌러도 편집 서랍이 열리지 않는다
  await page.locator('tbody tr').first().click()
  await expect(page.getByRole('dialog'), '결재 중에는 편집 서랍이 없다').toHaveCount(0)
})

test('초안 — 결재 전에는 잠기지 않는다 (잠금이 상태를 안 보고 걸리면 아무도 못 고친다)', async ({
  page,
}) => {
  await ready(page, '/specs/SP-004') // 초안
  await expect(page.getByText(/결재 중이라 필드를 고칠 수 없습니다/)).toHaveCount(0)
  await expect(page.getByText('결재선', { exact: true }), '결재 전에는 결재선도 없다').toHaveCount(0)
  await page.locator('tbody tr').first().click()
  await expect(page.getByRole('dialog'), '초안은 행을 누르면 편집이 열린다').toBeVisible()
})

/* 쪽 나누기 — 규약 §9 "21줄부터 쪽을 나눈다".
   ⚠ 감사 로그만은 **서버가 계속 적는** 목록이라 시드 열댓 줄로 시작해 잠금 한 번마다
   자란다. 다른 화면 mock 은 스무 줄을 안 넘어 안 걸렸지만 이 화면은 이미 24건이었고,
   쪽이 없어 한 화면에 다 쏟아지고 있었다(2026-08-18).
   ⚠ 줄 수가 서버 상태에 달렸으므로 **"스무 줄을 넘지 않는다"를 늘 재고**, 쪽 조작은
   실제로 넘쳤을 때만 잰다 — 조건을 못 만든 채 통과시키는 skip 과는 다르다. */
test('감사 로그 — 한 쪽은 스무 줄까지, 넘치면 쪽이 선다 (규약 §9)', async ({ page }) => {
  await ready(page, '/privacy')
  const foot = page.getByText(/^전체 \d+건/).first()
  const total = Number((await foot.textContent())?.match(/전체 (\d+)건/)?.[1])
  expect(total, '발이 전체 수를 말한다').toBeGreaterThan(0)

  const rows = page.locator('tbody tr')
  await expect(rows, '한 쪽은 스무 줄까지').toHaveCount(Math.min(20, total))

  if (total > 20) {
    const first = await rows.first().textContent()
    await expect(page.getByText(/^\d+ \/ \d+$/), '몇 쪽 중 몇 쪽인지 말한다').toBeVisible()
    await page.getByRole('button', { name: '다음' }).click()
    await expect(page.getByText('2 / ' + Math.ceil(total / 20))).toBeVisible()
    expect(await rows.first().textContent(), '쪽을 넘기면 다른 줄이 선다').not.toBe(first)
    await expect(foot, '발은 전체 수를 계속 말한다').toHaveText(new RegExp('^전체 ' + total + '건'))
  }
})

/* ── FR-114 결재 수명주기 ──────────────────────────────────────────────
   요청 → 다단계 검토·승인 → 반려·재요청 · 승인선 설정 · 단계별 알림 · 이력 조회.
   ⚠ 이 판 전까지 흐름은 **반쪽**이었다: 상신은 사양서 상태만 바꾸고 결재함엔 안 생겼고,
   승인 관리의 [승인]은 그 화면 useState 라 사양서로 돌아가면 여전히 '승인 대기'였다.
   즉 결재가 올라가기만 하고 내려오지 않았다 — 그 자리를 좌표로 못 박는다.

   ⚠⚠ **화면 사이는 앱 안에서 옮겨 다닌다**(LNB 링크). `goto` 는 새로고침이라 프로토타입의
   정본(모듈 스코프 스토어)이 초기화된다 — 상신해 놓고 새로고침하면 없던 일이 된다.
   ⚠ 그리고 이 판은 **넓은 화면**에서 잰다: 좁은 화면에서 LNB 는 서랍 안이라 링크가 뷰포트
   밖이다(모바일 규격은 위 스모크가 따로 지킨다). */
test.describe('결재 수명주기 (FR-114)', () => {
  test.use({ viewport: { width: 1280, height: 900 }, isMobile: false })

  /** 사양서 상세에서 상신까지 — 여러 판이 같은 세 걸음을 쓴다 */
  async function submitSpec(page: Page, specId: string) {
    await ready(page, `/specs/${specId}`)
    await page.getByRole('button', { name: /승인 요청|재요청/ }).first().click()
    await page.getByRole('dialog').getByRole('button', { name: '상신', exact: true }).click()
    await expect(page.getByRole('button', { name: /결재 진행 보기/ }).first()).toBeVisible()
  }

  /** ⚠ LNB 링크의 접근성 이름에는 **배지 수가 붙는다**("승인 관리 3") — exact 로 집으면
   *  못 찾는다(2026-08-18). 부분 일치로 잡되 첫 번째만 쓴다(서랍/레일에 같은 링크가 둘). */
  const goto = (page: Page, name: string) => page.getByRole('link', { name }).first().click()

  test('상신 — 사양서 상태와 결재함이 함께 움직인다 (한쪽만 바뀌면 두 화면이 다른 말을 한다)', async ({
    page,
  }) => {
    await submitSpec(page, 'SP-004') // 초안
    await goto(page, '승인 관리')
    await page.getByRole('button', { name: /전체 대기/ }).click()
    await expect(
      page.getByText('차체 구조 안전 기준서', { exact: false }).first(),
      '상신한 건이 결재함에 실제로 서 있다',
    ).toBeVisible()
  })

  test('승인 — 마지막 단계까지 통과하면 사양서가 승인 완료가 된다 (결재가 내려온다)', async ({ page }) => {
    await ready(page, '/approvals')
    // 시드 중 마지막 단계(2/2)인 건 — 승인하면 그 자리에서 끝난다
    await page.getByRole('button', { name: /VN7 엔진 사양서 v2.3/ }).click()
    await page.getByRole('dialog').getByRole('button', { name: /^✓?\s*승인$/ }).click()

    await goto(page, '사양서 관리')
    await expect(
      page.getByRole('button', { name: /^승인 완료\s*1$/ }),
      '승인이 사양서까지 내려와 상태 칩이 함께 센다',
    ).toBeVisible()
    await expect(page.getByRole('button', { name: /^승인 대기\s*1$/ }), '대기 하나가 빠진다').toBeVisible()
  })

  test('반려 — 사유 없이는 못 하고, 사유는 사양서까지 따라간다 (되돌아온 문서는 이유를 안고 온다)', async ({
    page,
  }) => {
    await ready(page, '/approvals')
    await page.getByRole('button', { name: /전기차 배터리 규격서 v1.5/ }).click()
    const dialog = page.getByRole('dialog')
    const reject = dialog.getByRole('button', { name: /반려/ })
    await expect(reject, '사유가 비면 반려는 잠겨 있다 (규약 §2)').toBeDisabled()

    await dialog.getByPlaceholder(/의견/).fill('안전 시험 근거가 빠졌습니다 — 시험성적서를 붙여 주세요.')
    await expect(reject).toBeEnabled()
    await reject.click()

    // ⚠ 새로고침하면 스토어가 초기화된다 — 앱 안에서 사양서로 건너간다
    await goto(page, '사양서 관리')
    await page
      .locator('article')
      .filter({ hasText: '전기차 배터리 규격서' })
      .first()
      .getByRole('button', { name: /상세 보기/ })
      .click()
    await expect(page.getByText(/반려했습니다/), '누가·언제 반려했는지 적힌다').toBeVisible()
    await expect(page.getByText(/안전 시험 근거가 빠졌습니다/), '사유가 그대로 따라온다').toBeVisible()
    await expect(page.getByRole('button', { name: '재요청' }), '다음 손은 재요청이다').toBeVisible()
  })

  test('회수 — 아무도 판단하지 않았을 때만 내릴 수 있다 (⚠ 요구사항 밖 기능)', async ({ page }) => {
    await submitSpec(page, 'SP-004')
    await page.getByRole('button', { name: '요청 회수' }).click()
    await page.getByRole('dialog').getByRole('button', { name: '회수', exact: true }).click()
    await expect(
      page.getByRole('button', { name: '승인 요청', exact: true }),
      '초안으로 돌아온다',
    ).toBeVisible()
  })

  test('결재선 설정 — 최대 3단계, 저장하면 다음 상신부터 그 선을 탄다 (FR-114 ② · ASM-011)', async ({
    page,
  }) => {
    await ready(page, '/approvals')
    await page.getByRole('button', { name: '결재선 설정' }).click()
    const dialog = page.getByRole('dialog')

    await dialog.getByRole('button', { name: '+ 단계 추가' }).click()
    await dialog.getByPlaceholder('결재자 이름').last().fill('최수진')
    await dialog.getByPlaceholder(/단계 이름/).last().fill('최종 승인')
    await expect(
      dialog.getByRole('button', { name: '+ 단계 추가' }),
      '3단계가 차면 더 넣을 수 없다 (ASM-011)',
    ).toHaveCount(0)
    await expect(dialog.getByText(/최대 3단계/), '못 하는 일은 이유를 적는다 (규약 §17)').toBeVisible()
    await dialog.getByRole('button', { name: '저장' }).click()

    // 다음 상신은 세 단계짜리 선을 탄다
    await goto(page, '사양서 관리')
    await page
      .locator('article')
      .filter({ hasText: '차체 구조 안전 기준서' })
      .first()
      .getByRole('button', { name: /상세 보기/ })
      .click()
    await page.getByRole('button', { name: '승인 요청', exact: true }).click()
    await expect(page.getByRole('dialog').getByText('최수진'), '바꾼 결재선이 상신 모달에 선다').toBeVisible()
  })

  test('승인 완료 — 다음 행동은 배포 요청이다 (죽은 [승인 요청]을 다시 내밀지 않는다)', async ({
    page,
  }) => {
    await ready(page, '/approvals')
    await page.getByRole('button', { name: /VN7 엔진 사양서 v2.3/ }).click()
    await page.getByRole('dialog').getByRole('button', { name: /^✓?\s*승인$/ }).click()

    await goto(page, '사양서 관리')
    await page
      .locator('article')
      .filter({ hasText: 'VN7 엔진 사양서' })
      .first()
      .getByRole('button', { name: /상세 보기/ })
      .click()
    await expect(page.getByRole('button', { name: /배포 요청하기/ }), '다음 행동으로 끝난다').toBeVisible()
    await expect(
      page.getByRole('button', { name: '승인 요청', exact: true }),
      '스토어가 안 받는 조작은 화면에도 없다',
    ).toHaveCount(0)
  })

  test('배포 요청 — 배포 목록과 결재함에 **함께** 남는다 (토스트만 쏘고 끝나지 않는다)', async ({
    page,
  }) => {
    await ready(page, '/deploys')
    await page.getByRole('button', { name: /새 배포 요청/ }).click()
    await page.getByRole('dialog').getByRole('button', { name: /배포 승인 요청/ }).click()

    await expect(page.getByText(/DEP-\d{4}-\d+/).first(), '배포 목록에 선다').toBeVisible()
    await goto(page, '승인 관리')
    await page.getByRole('button', { name: /전체 대기/ }).click()
    await expect(page.getByText(/Release .* 배포/).first(), '결재함에도 같은 순간 생긴다').toBeVisible()
  })
})
