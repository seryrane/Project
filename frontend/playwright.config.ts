import { defineConfig, devices } from '@playwright/test'

// 모바일 스모크 판 — 규약(docs/화면_공통규칙.md) §8·§14.
// 가로 스크롤·넘침은 데스크톱만 보고는 절대 못 잡는다. 393px 에서 좌표로 잰다.
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
  },
  projects: [
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'] }, // 412×915, 터치. 규약 실측 기준(393px)과 같은 부류
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true, // 떠 있는 dev 서버를 그대로 쓴다
    timeout: 60_000,
  },
})
