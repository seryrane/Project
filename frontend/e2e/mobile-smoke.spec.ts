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

test('모달 — 하단 시트로 뜨고 Esc 로 닫힌다', async ({ page }) => {
  // 상세는 이제 본문 페이지라(규약 §1 결정) 모달 검증은 버전 비교로 한다
  await ready(page, '/specs')
  await page.getByRole('button', { name: '버전 비교' }).first().click()

  const sheet = page.locator('.fixed.inset-0.z-50 > div')
  await expect(sheet).toBeVisible()

  // 바닥에 붙는다 (닫기가 엄지 자리) + 가로 100%.
  // ⚠ 뷰포트 픽셀과 직접 비교하면 DPR 반올림·오버레이 스크롤바로 몇 px 어긋난다 —
  //   불변식은 "시트가 자기 컨테이너(inset-0)를 가로로 가득 채우고 바닥에 붙는다"이다
  // ⚠ 열림 애니메이션이 끝난 뒤에 잰다 — 도중에 재면 3~12px 작게 나온다.
  //   getAnimations() 는 WAAPI 만 잡아서 motion(rAF 구동) 전환에는 헛대기다 —
  //   구현에 매이지 않게 "치수가 맞을 때까지" 폴링한다
  const cont = (await page.locator('.fixed.inset-0.z-50').first().boundingBox())!
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

test('물어보기 — 떠 있는 버튼으로 열리고 Esc 로 닫힌다', async ({ page }) => {
  // 자리는 어느 화면에서나 같은 패널 하나(정본: 챗봇_표준질의_설계.md §1) — /specs 로 확인
  await ready(page, '/specs')
  const entries = page.getByRole('button', { name: '물어보기' })
  // ⚠ 진입점이 둘이다(헤더 · 떠 있는 버튼) — 이름만으로 집으면 셀렉터가 모호해져 깨진다.
  // 좁은 화면에서 **늘 같은 자리에 있는 쪽**(떠 있는 버튼, DOM 상 뒤)이 이 판의 대상이다.
  await expect(entries).toHaveCount(2)
  await entries.last().click()
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

  test('본문 폭 — 데이터 화면은 1680 까지 펴고, 글 화면은 960 에서 멈춘다', async ({ page }) => {
    await ready(page, '/members')
    const data = (await page.locator('main').boundingBox())!
    // 세로 스크롤바(≈15px)만큼 줄 수 있어 폭 자체가 아니라 "설계서 폭에 닿았는지"를 본다
    expect(data.width, '표 화면은 설계서 폭 1680').toBeGreaterThan(1640)

    await ready(page, '/guide')
    const doc = (await page.locator('main').boundingBox())!
    expect(doc.width, '글 화면은 읽기 폭 960').toBeLessThanOrEqual(960)
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
