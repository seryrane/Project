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
  /**
   * 리뷰용 **빌드 서버**(2026-08-20). 터널 너머의 첫 로딩이 18.7초였다 — 코드가 느린 게
   * 아니라 dev 서버가 번들을 안 만들어 **파일 200개를 각각** 왕복하기 때문이다
   * (엣지가 홍콩이라 1건당 0.4~1.2초). 빌드하면 첫 화면이 6~8개로 준다.
   *
   * ⚠ dev(:3000)는 그대로 두고 **:3010** 에 따로 세운다 — 같은 포트를 쓰면 내가 고치는
   *   동안 리뷰어 화면이 죽고, e2e 도 못 돈다.
   * ⚠ `server.*` 설정은 preview 에 **안 따라온다** — 프록시와 호스트 허용을 여기 또 적는다.
   *   빠뜨리면 /api 가 404 로 떨어져 화면이 조용히 mock 으로 돌아가고(무엇이 진짜인지
   *   흐려진다), 터널 호스트는 아예 차단된다.
   * ⚠ no-store 를 여기엔 **안** 붙인다: 빌드 자산은 이름에 해시가 있어 옛것을 물고 올 수
   *   없다(dev 에서 겪은 사고의 원인이 여기엔 없다). 캐시가 살아야 재방문이 빠르다.
   */
  preview: {
    port: 3010,
    proxy: { '/api': 'http://localhost:8080' },
    allowedHosts: ['.trycloudflare.com', '.stock-autotrade.com'],
  },
})

export default config
