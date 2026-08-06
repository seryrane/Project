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
  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.dataset.theme = next
    localStorage.setItem('theme', next)
  }
  return { theme, toggle }
}
