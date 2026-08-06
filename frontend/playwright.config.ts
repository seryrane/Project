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
      use: {
        ...devices['Pixel 7'], // 412×915, 터치. 규약 실측 기준(393px)과 같은 부류
        /**
         * ⚠ 번들 브라우저가 **회사 PC 의 애플리케이션 제어 정책에 막힐 수 있다**
         * (2026-08-06 실측: `browserType.launch: spawn UNKNOWN` — 원인은 코드가 아니라
         * `chrome-headless-shell.exe` 가 정책에 차단된 것이었다. 실행 파일은 멀쩡했고,
         * 직접 실행해 보고서야 "애플리케이션 제어 정책에서 이 파일을 차단했습니다"가 나왔다).
         *
         * 그때는 설치된 Chrome 으로 돌린다: `PW_CHANNEL=chrome npm run e2e`.
         * 기본값을 비워 두는 이유 — CI·다른 PC 에서는 번들 브라우저가 정본이다
         * (설치된 Chrome 버전에 따라 결과가 달라지면 회귀를 못 믿는다).
         */
        channel: process.env.PW_CHANNEL,
      },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true, // 떠 있는 dev 서버를 그대로 쓴다
    timeout: 60_000,
  },
})
