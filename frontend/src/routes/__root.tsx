import { useEffect } from 'react'
import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router'

import { ToastProvider } from '#/components/portal/toast'
import { applySavedAccent } from '#/lib/accent'
import { OFFLINE } from '#/lib/offline'
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
  /* ⚠ 문서 뼈대는 **누가 그리느냐가 빌드마다 다르다.**
     평소(서버 렌더)에는 이 셸이 `<html>` 부터 그린다.
     오프라인 전달본은 서버가 없어 `offline/index.html` 이 뼈대를 들고 있으므로,
     여기서 또 `<html>` 을 그리면 문서 안에 문서가 겹친다 — 껍데기만 남긴다. */
  ...(OFFLINE ? { component: RootBody } : { shellComponent: RootDocument }),
})

/** 오프라인 전달본의 뿌리 — 뼈대는 index.html, 여기는 공용 Provider 만 */
function RootBody() {
  useEffect(() => applySavedAccent(), [])
  return (
    <I18nProvider>
      <ToastProvider>
        <Outlet />
      </ToastProvider>
    </I18nProvider>
  )
}

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
        {/* ⚠⚠ **토스트도 루트에서.** 예전에는 `AppShell` 안에 Provider 가 있었는데,
            화면 컴포넌트는 그 AppShell 을 **자식으로 렌더하는 쪽**이라 트리에서 Provider
            **위**에 있었다 — 화면에서 부른 `useToast()` 는 기본값(빈 함수)을 집어서
            **아무 일도 안 했다**. 승인·배포·지표 등 화면발 토스트가 통째로 죽어 있었고,
            살아 보이던 것은 셸 자신이 띄우는 것(알림 모두 읽음)뿐이었다.
            증상은 "토스트가 안 보인다"였지만 원인은 자리도 색도 아니었다 (2026-08-11).
            로그인처럼 셸 밖 화면도 같은 자리를 쓴다 — 다국어와 같은 이유다. */}
        <I18nProvider>
          <ToastProvider>{children}</ToastProvider>
        </I18nProvider>
        <Scripts />
      </body>
    </html>
  )
}
