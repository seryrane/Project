import { chromium } from '@playwright/test'

/**
 * 판을 돌리기 전에 **dev 서버를 데운다.**
 *
 * ⚠⚠ 이것이 없어서 전체 실행에서만 6~10개가 깨졌다(2026-08-27에 원인을 잡음). 실패 이유가
 * 화면이 아니라 **`page.goto` 30초 타임아웃**이었다 — Vite dev 는 라우트를 **처음 열 때**
 * 그 화면의 모듈을 컴파일하는데, 판 여럿이 동시에(worker 2개) 서로 다른 첫 화면을 두드리면
 * 그 첫 컴파일이 한 번에 몰려 30초를 넘긴다. 그래서 **먼저 시작한 판들만** 깨졌고, 하나씩
 * 돌리면 (서버가 이미 데워져 있어) 다 통과해서 "순서 의존"처럼 보였다.
 * `webServer.url` 은 서버가 **응답하는지**만 본다 — 화면이 컴파일됐는지는 안 본다.
 *
 * 그래서 판이 열 화면을 **한 번씩, 직렬로, 넉넉한 시간을 주고** 미리 연다. 브라우저로 여는
 * 이유는 서버 렌더만으로는 **클라이언트 번들이 안 데워지기** 때문이다.
 * ⚠ 화면을 새로 만들어 판이 그 주소를 열면 **여기 목록에도 넣는다** — 안 넣으면 그 판이
 * 첫 컴파일을 혼자 뒤집어쓴다.
 */
const ROUTES = [
  '/dashboard',
  '/approvals',
  '/board',
  '/specs',
  '/specs/SP-001',
  '/members',
  '/menus',
  '/deploys',
  '/alerts',
  '/privacy',
  '/kpi-metrics',
  '/validation-results',
  '/notice',
  '/guide',
]

export default async function globalSetup() {
  const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3000'
  const browser = await chromium.launch({ channel: process.env.PW_CHANNEL })
  const page = await browser.newPage()
  try {
    for (const route of ROUTES) {
      // 컴파일이 끝날 때까지 기다린다 — 여기서 오래 걸리는 것이 정상이고, 그만큼 판이 빨라진다
      await page.goto(baseURL + route, { waitUntil: 'load', timeout: 120_000 })
    }
  } finally {
    await browser.close()
  }
}
