import { useEffect } from 'react'
import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'

import { applySavedAccent } from '#/lib/accent'
import { I18nProvider } from '#/lib/i18n'

import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'HMG 통합 관리자 포털',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  // 포인트 색상은 계정 설정 — 수화 직후 저장값을 입힌다 (테마 초기화와 같은 시점)
  useEffect(() => applySavedAccent(), [])
  return (
    <html lang="ko" data-theme="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {/* devtools 패널은 걷어냈다 — vite.config.ts 의 로그 에코 사고 주석 참고 */}
        {/* 다국어는 루트에서 — 로그인처럼 셸 밖 화면도 같은 사전을 쓴다 (규약 §4) */}
        <I18nProvider>{children}</I18nProvider>
        <Scripts />
      </body>
    </html>
  )
}
