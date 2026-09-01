/**
 * 오프라인 전달본 빌드 — `npm run build:offline`
 *
 * 왜 설정을 따로 두나: 평소 빌드(vite.config.ts)는 **서버가 있는 것을 전제**한다
 * (TanStack Start 가 dist/server/server.js 를 만들고, dist/client 엔 index.html 조차 없다).
 * 그 결과물을 압축해 보내면 받는 쪽은 **백지**를 본다. 전달본은 전제가 다르다:
 *
 *  · 서버 없음        → Start 플러그인을 빼고 순수 브라우저 앱으로 만든다
 *  · 주소창 없음      → 해시 주소(offline/main.tsx)
 *  · 파일 하나        → JS·CSS·글꼴을 전부 한 파일에 넣는다
 *
 * ⚠ `format: 'iife'` 가 핵심이다. `file://` 에서 브라우저는 **모듈 스크립트를 막는다**
 *   (CORS — 로컬 파일은 출처가 없다). 모듈로 내보내면 더블클릭했을 때 아무것도 안 뜬다.
 * ⚠ `assetsInlineLimit` 를 크게 두어 글꼴(woff2)까지 data URI 로 넣는다. 밖에 두면
 *   그 글꼴 요청도 같은 이유로 막혀 **한글만 윈도 기본 글꼴**로 떨어진다.
 */
import { defineConfig } from 'vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  root: 'offline',
  base: './',
  // 화면 곳곳의 관문(lib/offline.ts)이 이 값 하나를 보고 '핵심 메뉴만' 모드로 선다
  define: { 'import.meta.env.VITE_OFFLINE': JSON.stringify('1') },
  plugins: [tailwindcss(), viteReact()],
  build: {
    outDir: '../dist-offline',
    emptyOutDir: true,
    // 글꼴·이미지까지 전부 data URI (100MB 상한 = 사실상 무제한)
    assetsInlineLimit: 100 * 1024 * 1024,
    cssCodeSplit: false,
    modulePreload: { polyfill: false },
    // 화면이 20개라 청크가 갈리면 파일이 갈린다 — 하나로 붙인다
    rollupOptions: {
      output: {
        format: 'iife',
        inlineDynamicImports: true,
        entryFileNames: 'app.js',
        assetFileNames: '[name][extname]',
      },
    },
    // 한 파일이라 경고는 의미가 없다
    chunkSizeWarningLimit: 20000,
    reportCompressedSize: false,
  },
})
