import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

/* ⚠ View Transition 의 abort 는 오류가 아니다 — 네비게이션이 겹치면 브라우저가
   진행 중인 전환을 InvalidStateError 로 중단하는데, 그 promise 들을 아무도 안 받아
   unhandled rejection 이 됐다. dev 서버의 클라이언트↔서버 로그 에코가 이것을 무한
   증폭해 서버가 먹통이 되는 실사고가 있었다(2026-08-05, 2회). 관문 한 곳에서 삼킨다. */
if (typeof document !== 'undefined' && 'startViewTransition' in document) {
  const orig = document.startViewTransition.bind(document)
  document.startViewTransition = ((cb?: () => void | Promise<void>) => {
    const t = orig(cb)
    t.ready.catch(() => {})
    t.finished.catch(() => {})
    t.updateCallbackDone.catch(() => {})
    return t
  }) as typeof document.startViewTransition
}

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    defaultViewTransition: true,
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
