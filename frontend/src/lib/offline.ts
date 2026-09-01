/**
 * 오프라인 전달본 관문 — "파일만 전달"(URL 없이 더블클릭으로 보는 시안)의 판단은 여기 한 곳.
 *
 * 왜 관문이냐: 전달본은 **핵심 메뉴만** 보인다. 그런데 메뉴를 LNB 에서만 걷으면
 * 대시보드 위젯·알림 벨이 **사라진 화면으로 가는 다리**를 그대로 들고 있게 된다
 * (규약 §17 — 갈 곳 없는 자리를 남기지 않는다). 그래서 "이 경로가 전달본에 있는가"를
 * 묻는 자리를 하나로 모으고, LNB·팔레트·위젯·알림이 모두 같은 답을 본다.
 *
 * ⚠ 평소 빌드(dev·preview·터널)에서는 `VITE_OFFLINE` 이 없으므로 **전부 그대로**다.
 *   `menuVisible()` 은 항상 true 를 돌려주고 화면은 한 줄도 안 바뀐다.
 * ⚠ 값은 **경로(path)로 잇는다** — nav.ts(라벨 정본)와 menus.ts(활성 정본)를 잇는
 *   규칙과 같다(§15 이름 어긋남 방지).
 */

/** 오프라인 전달본으로 빌드되었는가 (scripts/pack-offline.mjs 가 켠다) */
export const OFFLINE = import.meta.env.VITE_OFFLINE === '1'

/** 전달본에 남길 화면 — 두 프로젝트 본류(센터 KPI + 사양서)만 (2026-09-01 사용자 선택) */
const CORE_PATHS: ReadonlySet<string> = new Set([
  '/dashboard',
  // 센터 KPI (ICDAP)
  '/analytics',
  '/kpi-ivi',
  '/kpi-metrics',
  // 사양서 (IDMS)
  '/specs',
  '/board',
  '/approvals',
  '/deploys',
])

/** 이 경로가 전달본에서 보이는가 — 평소 빌드에서는 언제나 true */
export function menuVisible(to?: string): boolean {
  if (!OFFLINE) return true
  if (!to) return true
  return CORE_PATHS.has(to)
}
