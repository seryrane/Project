// 명암(다크/라이트) 관문 — 개인 설정. lib/accent.ts 와 짝이다: 저건 포인트 색상,
// 이건 명암. 둘 다 localStorage 에 저장하고 <html> 데이터셋 속성으로 화면에 입힌다.
import { useEffect, useState } from 'react'

export function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  useEffect(() => {
    const saved = localStorage.getItem('theme')
    if (saved === 'light' || saved === 'dark') {
      setTheme(saved)
      document.documentElement.dataset.theme = saved
    }
  }, [])
  /** 🌙 버튼 좌표를 받으면 그 자리에서 **원이 퍼지며** 새 테마가 드러난다(View Transition).
   *  미지원·reduced-motion·좌표 없음이면 지금처럼 즉시 바뀐다 — 실패해도 잃는 것이 없다.
   *  ⚠ 화면을 실제로 바꾸는 것은 dataset.theme(동기)이다 — setTheme(비동기)은 아이콘용이라
   *  startViewTransition 콜백 안에서 dataset 만 갈면 스냅샷 전/후가 정확히 갈린다. */
  const toggle = (ev?: { clientX: number; clientY: number }) => {
    const next = theme === 'dark' ? 'light' : 'dark'
    const apply = () => {
      setTheme(next)
      document.documentElement.dataset.theme = next
      localStorage.setItem('theme', next)
    }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    // 타입은 있다고 하지만 런타임엔 없을 수 있다 — router.tsx 와 같은 in 검사
    if (!('startViewTransition' in document) || reduce || !ev) {
      apply()
      return
    }
    const root = document.documentElement
    root.classList.add('theme-vt') // 기본 page-in 페이드를 이 동안만 끈다 (styles.css)
    const vt = document.startViewTransition(apply)
    vt.ready
      .then(() => {
        const { clientX: x, clientY: y } = ev
        // 버튼에서 화면 가장 먼 모서리까지 — 원이 화면을 다 덮는 최소 반지름
        const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))
        root.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
          { duration: 420, easing: 'ease-in-out', pseudoElement: '::view-transition-new(root)' },
        )
      })
      .catch(() => {}) // 전환 겹침 abort 는 오류가 아니다 (router.tsx 관문과 같은 이유)
    vt.finished.finally(() => root.classList.remove('theme-vt'))
  }
  return { theme, toggle }
}
