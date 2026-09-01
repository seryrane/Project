/**
 * 오프라인 전달본 진입점 — 서버 없이 **파일 하나로** 도는 시안.
 *
 * 평소 빌드와 다른 점은 셋뿐이다:
 *  ① 서버 렌더가 없다 — 브라우저가 직접 그린다(뼈대는 offline/index.html).
 *  ② **해시 주소**를 쓴다 — `file://` 에서는 History API(pushState)가 막혀 있어
 *     보통 주소를 쓰면 메뉴를 누르는 순간 화면이 죽는다. `#/dashboard` 로 간다.
 *  ③ 화면 코드는 **한 줄도 다르지 않다** — 같은 routeTree 를 그대로 문다.
 */
import { createRoot } from 'react-dom/client'
import { RouterProvider, createHashHistory, createRouter } from '@tanstack/react-router'

import { routeTree } from '../src/routeTree.gen'
import './styles.offline.css'

/* ⚠ StrictMode 는 일부러 안 쓴다 — 평소(서버 렌더+수화) 동작과 다르게 이중 렌더가 되면
   전달본에서만 나는 깜빡임을 리뷰어가 화면 결함으로 읽는다. 같은 것을 보여야 한다. */
const router = createRouter({
  routeTree,
  history: createHashHistory(),
  scrollRestoration: true,
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
  defaultViewTransition: true,
})

const el = document.getElementById('root')
if (el) createRoot(el).render(<RouterProvider router={router} />)
