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
  },
})

export default config
