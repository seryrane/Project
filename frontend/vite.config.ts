import { defineConfig } from 'vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  // ⚠ @tanstack/devtools-vite 는 걷어냈다 — 클라이언트 콘솔을 서버로, 서버 로그를
  // 다시 클라이언트로 되쏘는 로그 에코가 warn/error 하나를 무한 증폭해 dev 서버를
  // 네 번 죽였다(2026-08-05 실사고 — 최악은 로그 파일 5.4GB). enhancedLogs 옵션으로도
  // 안 꺼져서 플러그인째 제거. 라우터 devtools 패널(__root)도 같이 걷었다.
  plugins: [tailwindcss(), tanstackStart(), viteReact()],
  server: {
    // Forward API calls to the Spring Boot backend during development
    proxy: {
      '/api': 'http://localhost:8080',
    },
    // 임시 외부 확인용 — cloudflared 터널이 보내는 Host 를 허용한다.
    // dev 전용 설정이라 배포에는 영향 없다
    allowedHosts: ['.trycloudflare.com', '.stock-autotrade.com'],
    /**
     * ⚠⚠ **터널 너머의 리뷰어는 옛 화면을 본다** (2026-08-11 실사고).
     * Cloudflare 엣지가 `/src/styles.css` 같은 dev 자산을 **확장자만 보고 캐시**한다.
     * 그러면 브라우저는 **새 마크업 + 옛 CSS** 조합을 받는다 — 이번엔 위젯에 새로 붙인
     * `@container`·`@sm:` 규칙이 옛 CSS 에 없어서 4열이어야 할 KPI 타일이 1열로 펴지고
     * 스파크라인이 카드 폭만큼 부풀었다("위젯이 너무 크다"). 로컬은 멀쩡해서 코드에서
     * 원인을 찾으면 영영 못 찾는다 — 같은 서버인데 **경유지가 다른 것**이 원인이다.
     * no-store 를 붙이면 엣지가 캐시하지 않는다. dev 전용이라 운영 성능과 무관.
     */
    headers: { 'Cache-Control': 'no-store' },
  },
})

export default config
